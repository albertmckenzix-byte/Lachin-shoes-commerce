"""
Tests for the order creation service and public order endpoints.
"""
from decimal import Decimal

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient, APITestCase

from shop.models import (
    Coupon,
    Customer,
    Order,
    OrderItem,
    Product,
    ProductSize,
    StoreSettings,
)
from shop.services.orders import (
    OrderError,
    change_order_status,
    create_order,
    expire_pending_orders,
    release_stock,
)


# ---------------------------------------------------------------------------
# Fixtures helpers
# ---------------------------------------------------------------------------

def make_product(slug="air-max", price=1_000_000, is_active=True):
    return Product.objects.create(
        slug=slug,
        name=f"Shoe {slug}",
        maker_brand="nike",
        price=price,
        is_active=is_active,
    )


def make_size(product, us=9.0, eu=43.0, cm=27.0, stock=5, is_active=True):
    return ProductSize.objects.create(
        product=product,
        us=Decimal(str(us)),
        eu=Decimal(str(eu)),
        cm=Decimal(str(cm)),
        stock=stock,
        is_active=is_active,
    )


def base_data(slug="air-max", size_us=9.0, quantity=1, **extra):
    payload = {
        "first_name": "علی",
        "last_name": "رضایی",
        "phone": "09121234567",
        "city": "تهران",
        "address": "خیابان آزادی",
        "delivery_method": "standard",
        "items": [{"slug": slug, "size_us": size_us, "quantity": quantity}],
    }
    payload.update(extra)
    return payload


def make_store_settings(**kwargs):
    """Create/update StoreSettings singleton with given overrides."""
    obj = StoreSettings.get()
    for k, v in kwargs.items():
        setattr(obj, k, v)
    obj.save()
    return obj


# ---------------------------------------------------------------------------
# 1. create_order  — service-layer tests
# ---------------------------------------------------------------------------

class CreateOrderServiceTests(TestCase):

    def setUp(self):
        make_store_settings(
            free_shipping_threshold=5_000_000,
            standard_fee=0,
            express_fee=500_000,
            pending_order_minutes=30,
        )
        self.product = make_product()
        self.size = make_size(self.product, stock=5)

    # --- happy path ---------------------------------------------------------

    def test_successful_order_reduces_stock(self):
        order = create_order(base_data())
        self.size.refresh_from_db()
        self.assertEqual(self.size.stock, 4)
        self.assertEqual(order.subtotal, 1_000_000)
        self.assertEqual(order.total, 1_000_000)   # standard_fee=0
        self.assertIsNotNone(order.number)
        self.assertGreaterEqual(order.number, 1001)

    def test_client_sent_prices_are_ignored(self):
        """Payload with injected price fields must NOT affect subtotal."""
        data = base_data()
        data["unit_price"] = 1          # evil injection
        data["subtotal"]   = 1
        data["total"]      = 1
        order = create_order(data)
        self.assertEqual(order.subtotal, 1_000_000)   # taken from DB

    def test_quantity_2_reduces_stock_by_2(self):
        order = create_order(base_data(quantity=2))
        self.size.refresh_from_db()
        self.assertEqual(self.size.stock, 3)
        self.assertEqual(order.subtotal, 2_000_000)

    # --- stock exhaustion ---------------------------------------------------

    def test_buying_more_than_stock_fails_atomically(self):
        with self.assertRaises(OrderError) as ctx:
            create_order(base_data(quantity=10))   # only 5 in stock
        self.assertEqual(ctx.exception.code, "out_of_stock")
        # Stock must be untouched
        self.size.refresh_from_db()
        self.assertEqual(self.size.stock, 5)
        # No order created
        self.assertEqual(Order.objects.count(), 0)

    def test_race_last_item_second_order_fails(self):
        """
        Simulate two sequential orders competing for the last 1 unit.
        First should succeed; second should fail with out_of_stock.
        """
        self.size.stock = 1
        self.size.save()

        order1 = create_order(base_data())
        self.size.refresh_from_db()
        self.assertEqual(self.size.stock, 0)

        with self.assertRaises(OrderError) as ctx:
            create_order(base_data(slug="air-max"))
        self.assertEqual(ctx.exception.code, "out_of_stock")
        # Only 1 order in DB
        self.assertEqual(Order.objects.count(), 1)

    # --- inactive size / product --------------------------------------------

    def test_inactive_size_rejected(self):
        self.size.is_active = False
        self.size.save()
        with self.assertRaises(OrderError):
            create_order(base_data())
        self.assertEqual(Order.objects.count(), 0)

    def test_inactive_product_rejected(self):
        self.product.is_active = False
        self.product.save()
        with self.assertRaises(OrderError):
            create_order(base_data())
        self.assertEqual(Order.objects.count(), 0)

    # --- phone validation ---------------------------------------------------

    def test_invalid_phone_rejected(self):
        with self.assertRaises(OrderError) as ctx:
            create_order(base_data(phone="123"))
        self.assertIn("phone", ctx.exception.fields)

    def test_persian_digit_phone_accepted(self):
        order = create_order(base_data(phone="۰۹۱۲۱۲۳۴۵۶۷"))
        self.assertEqual(order.phone, "09121234567")

    def test_plus98_phone_normalised(self):
        order = create_order(base_data(phone="+989121234567"))
        self.assertEqual(order.phone, "09121234567")

    # --- coupon -------------------------------------------------------------

    def test_coupon_percent_applied(self):
        Coupon.objects.create(code="SAVE20", percent=20, is_active=True)
        order = create_order(base_data(coupon_code="SAVE20"))
        expected_discount = 1_000_000 * 20 // 100
        self.assertEqual(order.discount_total, expected_discount)
        self.assertEqual(order.total, 1_000_000 - expected_discount)

    def test_expired_coupon_rejected(self):
        Coupon.objects.create(
            code="OLD10", percent=10, is_active=True,
            expires_at=timezone.now() - timezone.timedelta(days=1),
        )
        with self.assertRaises(OrderError) as ctx:
            create_order(base_data(coupon_code="OLD10"))
        self.assertEqual(ctx.exception.code, "invalid_coupon")

    def test_usage_limit_exhausted_rejected(self):
        Coupon.objects.create(
            code="MAXED", percent=10, is_active=True,
            usage_limit=2, used_count=2,
        )
        with self.assertRaises(OrderError) as ctx:
            create_order(base_data(coupon_code="MAXED"))
        self.assertEqual(ctx.exception.code, "invalid_coupon")

    def test_coupon_used_count_incremented(self):
        coupon = Coupon.objects.create(code="INC10", percent=10, is_active=True)
        create_order(base_data(coupon_code="INC10"))
        coupon.refresh_from_db()
        self.assertEqual(coupon.used_count, 1)

    # --- shipping -----------------------------------------------------------

    def test_express_shipping_charged(self):
        order = create_order(base_data(delivery_method="express"))
        self.assertEqual(order.shipping_fee, 500_000)
        self.assertEqual(order.total, 1_000_000 + 500_000)

    def test_free_shipping_above_threshold(self):
        product = make_product(slug="expensive", price=6_000_000)
        make_size(product, us=9.0, eu=43.0, cm=27.0, stock=5)
        order = create_order(base_data(slug="expensive", delivery_method="standard"))
        self.assertEqual(order.shipping_fee, 0)

    # --- items validation ---------------------------------------------------

    def test_zero_items_rejected(self):
        data = base_data()
        data["items"] = []
        with self.assertRaises(OrderError):
            create_order(data)

    def test_11_items_rejected(self):
        data = base_data()
        data["items"] = [{"slug": "air-max", "size_us": 9.0, "quantity": 1}] * 11
        with self.assertRaises(OrderError):
            create_order(data)

    # --- order number -------------------------------------------------------

    def test_order_number_is_1000_plus_pk(self):
        order = create_order(base_data())
        self.assertEqual(order.number, 1000 + order.pk)

    # --- order log ----------------------------------------------------------

    def test_status_log_created(self):
        order = create_order(base_data())
        self.assertEqual(order.logs.count(), 1)
        log = order.logs.first()
        self.assertEqual(log.field, "status")
        self.assertEqual(log.new_value, Order.Status.NEW)


# ---------------------------------------------------------------------------
# 2. release_stock / cancel / idempotency
# ---------------------------------------------------------------------------

class ReleaseStockTests(TestCase):

    def setUp(self):
        make_store_settings()
        self.product = make_product()
        self.size = make_size(self.product, stock=5)
        self.order = create_order(base_data())
        self.size.refresh_from_db()

    def test_cancel_restores_stock(self):
        self.assertEqual(self.size.stock, 4)
        change_order_status(self.order, Order.Status.CANCELLED, actor="test")
        self.size.refresh_from_db()
        self.assertEqual(self.size.stock, 5)

    def test_release_stock_idempotent(self):
        """Calling release_stock twice must not add stock twice."""
        change_order_status(self.order, Order.Status.CANCELLED, actor="test")
        self.size.refresh_from_db()
        stock_after_first = self.size.stock

        # Call release_stock a second time directly
        self.order.refresh_from_db()
        release_stock(self.order)
        self.size.refresh_from_db()
        self.assertEqual(self.size.stock, stock_after_first)

    def test_coupon_used_count_decremented_on_cancel(self):
        coupon = Coupon.objects.create(code="DEC10", percent=10, is_active=True)
        order = create_order(base_data(coupon_code="DEC10"))
        coupon.refresh_from_db()
        self.assertEqual(coupon.used_count, 1)

        change_order_status(order, Order.Status.CANCELLED, actor="test")
        coupon.refresh_from_db()
        self.assertEqual(coupon.used_count, 0)


# ---------------------------------------------------------------------------
# 3. expire_pending_orders
# ---------------------------------------------------------------------------

class ExpirePendingOrdersTests(TestCase):

    def setUp(self):
        make_store_settings(pending_order_minutes=30)
        self.product = make_product()
        self.size = make_size(self.product, stock=5)

    def test_expire_cancels_old_pending_orders_and_restores_stock(self):
        order = create_order(base_data())
        # Artificially push expires_at into the past
        Order.objects.filter(pk=order.pk).update(
            expires_at=timezone.now() - timezone.timedelta(minutes=1)
        )
        self.size.refresh_from_db()
        stock_before = self.size.stock   # should be 4

        count = expire_pending_orders()
        self.assertEqual(count, 1)

        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.CANCELLED)
        self.size.refresh_from_db()
        self.assertEqual(self.size.stock, stock_before + 1)

    def test_non_expired_orders_not_touched(self):
        order = create_order(base_data())
        # expires_at is in the future (default)
        count = expire_pending_orders()
        self.assertEqual(count, 0)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.NEW)


# ---------------------------------------------------------------------------
# 4. Status / payment transitions
# ---------------------------------------------------------------------------

class StatusTransitionTests(TestCase):

    def setUp(self):
        make_store_settings()
        product = make_product()
        make_size(product, stock=5)
        self.order = create_order(base_data())

    def test_valid_transitions(self):
        change_order_status(self.order, Order.Status.PROCESSING, actor="admin")
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, Order.Status.PROCESSING)

    def test_invalid_transition_raises(self):
        with self.assertRaises(OrderError):
            change_order_status(self.order, Order.Status.DELIVERED, actor="admin")

    def test_delivered_is_final(self):
        change_order_status(self.order, Order.Status.PROCESSING, actor="admin")
        change_order_status(self.order, Order.Status.SHIPPED, actor="admin")
        change_order_status(self.order, Order.Status.DELIVERED, actor="admin")
        with self.assertRaises(OrderError):
            change_order_status(self.order, Order.Status.CANCELLED, actor="admin")

    def test_payment_paid_sets_paid_at(self):
        from shop.services.orders import set_payment_status
        set_payment_status(self.order, Order.PaymentStatus.PAID, actor="gateway")
        self.order.refresh_from_db()
        self.assertIsNotNone(self.order.paid_at)
        self.assertEqual(self.order.payment_status, Order.PaymentStatus.PAID)


# ---------------------------------------------------------------------------
# 5. HTTP endpoint tests
# ---------------------------------------------------------------------------

class OrderAPITests(APITestCase):

    def setUp(self):
        self.client = APIClient()
        make_store_settings(
            free_shipping_threshold=5_000_000,
            standard_fee=0,
            express_fee=500_000,
            pending_order_minutes=30,
        )
        self.product = make_product()
        self.size = make_size(self.product, stock=5)

    def _post_order(self, data=None):
        payload = base_data() if data is None else data
        return self.client.post("/api/orders/", payload, format="json")

    def test_create_order_returns_201(self):
        resp = self._post_order()
        self.assertEqual(resp.status_code, 201, resp.json())
        body = resp.json()
        self.assertIn("number", body)
        self.assertIn("token", body)
        self.assertEqual(body["status"], "new")
        self.assertEqual(body["paymentStatus"], "pending")

    def test_client_sent_price_ignored_via_api(self):
        data = base_data()
        data["unit_price"] = 1
        data["subtotal"]   = 1
        resp = self._post_order(data)
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.json()["subtotal"], 1_000_000)

    def test_out_of_stock_returns_400_with_code(self):
        # quantity=6 passes serializer max_value=10 but exceeds stock of 5
        data = base_data(quantity=6)
        resp = self._post_order(data)
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.json()["code"], "out_of_stock")

    def test_invalid_phone_returns_400(self):
        resp = self._post_order(base_data(phone="bad"))
        self.assertEqual(resp.status_code, 400)

    def test_get_order_with_correct_token(self):
        order = create_order(base_data())
        url = f"/api/orders/{order.number}/?token={order.public_token}"
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["number"], order.number)
        # No address or phone in public response
        self.assertNotIn("address", body)
        self.assertNotIn("phone", body)

    def test_get_order_wrong_token_returns_404(self):
        order = create_order(base_data())
        url = f"/api/orders/{order.number}/?token=00000000-0000-0000-0000-000000000000"
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 404)

    def test_missing_token_returns_404(self):
        order = create_order(base_data())
        resp = self.client.get(f"/api/orders/{order.number}/")
        self.assertEqual(resp.status_code, 404)

    def test_coupon_check_valid(self):
        Coupon.objects.create(code="TEST20", percent=20, is_active=True)
        resp = self.client.post(
            "/api/coupons/check/",
            {"code": "TEST20", "subtotal": 1_000_000},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertTrue(body["valid"])
        self.assertEqual(body["percent"], 20)
        self.assertEqual(body["discount"], 200_000)

    def test_coupon_check_invalid_returns_valid_false(self):
        resp = self.client.post(
            "/api/coupons/check/",
            {"code": "NOPE", "subtotal": 1_000_000},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(resp.json()["valid"])

    def test_inactive_product_returns_400(self):
        self.product.is_active = False
        self.product.save()
        resp = self._post_order()
        self.assertEqual(resp.status_code, 400)

    def test_inactive_size_returns_400(self):
        self.size.is_active = False
        self.size.save()
        resp = self._post_order()
        self.assertEqual(resp.status_code, 400)
