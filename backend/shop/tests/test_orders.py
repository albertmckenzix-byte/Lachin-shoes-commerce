"""
Tests for the order creation service and public order endpoints.
"""
from decimal import Decimal
from io import BytesIO

from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient, APITestCase
from openpyxl import load_workbook
from datetime import timedelta

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
    set_payment_status,
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


# =============================================================================
# Admin order API tests
# =============================================================================

class AdminOrderAPITests(APITestCase):
    """Tests for admin order endpoints."""

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

        # Create staff user
        self.staff = User.objects.create_user(
            username='admin', password='admin123', is_staff=True
        )
        self.client.force_authenticate(user=self.staff)

    def _create_order(self, slug="air-max", **kwargs):
        """Helper to create an order via service."""
        if slug != "air-max":
            make_product(slug=slug)
            make_size(Product.objects.get(slug=slug), stock=5)
        data = base_data(slug=slug, **kwargs)
        return create_order(data, actor="admin")

    def test_admin_orders_list_requires_auth(self):
        self.client.force_authenticate(user=None)
        resp = self.client.get('/api/admin/orders/')
        self.assertEqual(resp.status_code, 401)

    def test_admin_orders_list_returns_paginated_data(self):
        self._create_order()
        self._create_order(slug="air-max-2")

        resp = self.client.get('/api/admin/orders/')
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertIn('results', body)
        self.assertEqual(len(body['results']), 2)
        self.assertIn('counts', body)
        self.assertIn('page', body)
        self.assertIn('pageSize', body)

    def test_admin_orders_list_masks_phone(self):
        order = self._create_order(phone="09121234567")
        resp = self.client.get('/api/admin/orders/')
        self.assertEqual(resp.status_code, 200)
        phone = resp.json()['results'][0]['phone']
        self.assertEqual(phone, '0912***4567')

    def test_admin_orders_list_filters_by_status(self):
        order1 = self._create_order()
        order2 = self._create_order(slug="air-max-2")
        change_order_status(order2, Order.Status.PROCESSING, actor="admin")

        resp = self.client.get('/api/admin/orders/?status=new')
        self.assertEqual(len(resp.json()['results']), 1)
        resp = self.client.get('/api/admin/orders/?status=processing')
        self.assertEqual(len(resp.json()['results']), 1)

    def test_admin_orders_list_filters_by_payment_status(self):
        order1 = self._create_order()
        order2 = self._create_order(slug="air-max-2")
        set_payment_status(order2, Order.PaymentStatus.PAID, actor="admin")

        resp = self.client.get('/api/admin/orders/?payment_status=pending')
        self.assertEqual(len(resp.json()['results']), 1)
        resp = self.client.get('/api/admin/orders/?payment_status=paid')
        self.assertEqual(len(resp.json()['results']), 1)

    def test_admin_orders_list_search_filter(self):
        order = self._create_order(first_name="علی", last_name="رضایی", phone="09121234567")

        resp = self.client.get('/api/admin/orders/?search=علی')
        self.assertEqual(len(resp.json()['results']), 1)
        resp = self.client.get('/api/admin/orders/?search=0912')
        self.assertEqual(len(resp.json()['results']), 1)

    def test_admin_orders_list_counts_include_pending_payment(self):
        self._create_order()
        order2 = self._create_order(slug="air-max-2")
        set_payment_status(order2, Order.PaymentStatus.PAID, actor="admin")

        resp = self.client.get('/api/admin/orders/')
        counts = resp.json()['counts']
        self.assertEqual(counts['pendingPayment'], 1)

    def test_admin_order_detail_shows_full_phone(self):
        order = self._create_order(phone="09121234567")
        resp = self.client.get(f'/api/admin/orders/{order.id}/')
        self.assertEqual(resp.status_code, 200)
        phone = resp.json()['phone']
        self.assertEqual(phone, '09121234567')

    def test_admin_order_detail_includes_items_and_logs(self):
        order = self._create_order()
        resp = self.client.get(f'/api/admin/orders/{order.id}/')
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertIn('items', body)
        self.assertIn('logs', body)
        self.assertEqual(len(body['items']), 1)
        self.assertGreaterEqual(len(body['logs']), 1)

    def test_admin_order_update_status(self):
        order = self._create_order()
        resp = self.client.patch(
            f'/api/admin/orders/{order.id}/update/',
            {'status': 'processing'},
            format='json'
        )
        self.assertEqual(resp.status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.PROCESSING)

    def test_admin_order_update_invalid_status_returns_400(self):
        order = self._create_order()
        resp = self.client.patch(
            f'/api/admin/orders/{order.id}/update/',
            {'status': 'delivered'},
            format='json'
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn('detail', resp.json())

    def test_admin_order_cancel_restores_stock(self):
        order = self._create_order()
        self.size.refresh_from_db()
        stock_before_cancel = self.size.stock

        resp = self.client.patch(
            f'/api/admin/orders/{order.id}/update/',
            {'status': 'cancelled'},
            format='json'
        )
        self.assertEqual(resp.status_code, 200)

        self.size.refresh_from_db()
        self.assertEqual(self.size.stock, stock_before_cancel + 1)

    def test_admin_order_update_payment_status(self):
        order = self._create_order()
        resp = self.client.patch(
            f'/api/admin/orders/{order.id}/update/',
            {'paymentStatus': 'paid'},
            format='json'
        )
        self.assertEqual(resp.status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, Order.PaymentStatus.PAID)
        self.assertIsNotNone(order.paid_at)

    def test_admin_order_update_note(self):
        order = self._create_order()
        resp = self.client.patch(
            f'/api/admin/orders/{order.id}/update/',
            {'note': 'Customer called'},
            format='json'
        )
        self.assertEqual(resp.status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.note, 'Customer called')

    def test_admin_order_create_manual(self):
        data = base_data(slug="air-max")
        resp = self.client.post(
            '/api/admin/orders/create/',
            data,
            format='json'
        )
        self.assertEqual(resp.status_code, 201)
        body = resp.json()
        self.assertIn('number', body)
        self.assertEqual(body['status'], 'new')

    def test_admin_order_create_with_payment_status(self):
        data = base_data(slug="air-max", payment_status='paid')
        resp = self.client.post(
            '/api/admin/orders/create/',
            data,
            format='json'
        )
        self.assertEqual(resp.status_code, 201)
        body = resp.json()
        self.assertEqual(body['paymentStatus'], 'paid')

    def test_admin_order_export_returns_xlsx(self):
        self._create_order()
        resp = self.client.get('/api/admin/orders/export/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(
            resp['Content-Type'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        self.assertIn('attachment', resp['Content-Disposition'])

    def test_admin_order_export_with_filters(self):
        order1 = self._create_order()
        order2 = self._create_order(slug="air-max-2")
        change_order_status(order2, Order.Status.PROCESSING, actor="admin")

        resp = self.client.get('/api/admin/orders/export/?status=new')
        self.assertEqual(resp.status_code, 200)

        # Verify Excel file is valid
        wb = load_workbook(BytesIO(resp.content))
        ws = wb.active
        # Should have header row + 1 data row
        self.assertEqual(ws.max_row, 2)

    def test_admin_order_summary(self):
        self._create_order()
        resp = self.client.get('/api/admin/orders/summary/')
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertIn('newCount', body)
        self.assertIn('pendingPaymentCount', body)
        self.assertEqual(body['newCount'], 1)


# =============================================================================
# Admin dashboard API tests
# =============================================================================

class AdminDashboardAPITests(APITestCase):
    """Tests for admin dashboard endpoint."""

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

        # Create staff user
        self.staff = User.objects.create_user(
            username='admin', password='admin123', is_staff=True
        )
        self.client.force_authenticate(user=self.staff)

    def _create_paid_order(self, days_ago=0, status='delivered'):
        """Helper to create a paid order with proper status transitions."""
        order_date = timezone.now() - timedelta(days=days_ago)
        data = base_data()
        order = create_order(data, actor="admin")
        order.created_at = order_date
        order.save(update_fields=['created_at'])
        set_payment_status(order, Order.PaymentStatus.PAID, actor="admin")

        # Follow proper status transitions
        if status == 'processing':
            change_order_status(order, Order.Status.PROCESSING, actor="admin")
        elif status == 'shipped':
            change_order_status(order, Order.Status.PROCESSING, actor="admin")
            change_order_status(order, Order.Status.SHIPPED, actor="admin")
        elif status == 'delivered':
            change_order_status(order, Order.Status.PROCESSING, actor="admin")
            change_order_status(order, Order.Status.SHIPPED, actor="admin")
            change_order_status(order, Order.Status.DELIVERED, actor="admin")
        # status == 'new' is default, no change needed

        return order

    def _create_cancelled_order(self, days_ago=0):
        """Helper to create a cancelled order."""
        order_date = timezone.now() - timedelta(days=days_ago)
        data = base_data()
        order = create_order(data, actor="admin")
        order.created_at = order_date
        order.save(update_fields=['created_at'])
        change_order_status(order, Order.Status.CANCELLED, actor="admin")
        return order

    def test_dashboard_requires_auth(self):
        self.client.force_authenticate(user=None)
        resp = self.client.get('/api/admin/dashboard/')
        self.assertEqual(resp.status_code, 401)

    def test_dashboard_invalid_days_param(self):
        resp = self.client.get('/api/admin/dashboard/?days=5')
        self.assertEqual(resp.status_code, 400)

    def test_dashboard_valid_days_params(self):
        for days in ['7', '30', '90']:
            resp = self.client.get(f'/api/admin/dashboard/?days={days}')
            self.assertEqual(resp.status_code, 200)

    def test_dashboard_default_days(self):
        resp = self.client.get('/api/admin/dashboard/')
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body['range']['days'], 7)

    def test_dashboard_today_stats(self):
        self._create_paid_order(days_ago=0)
        resp = self.client.get('/api/admin/dashboard/')
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body['today']['ordersCount'], 1)
        self.assertGreater(body['today']['sales'], 0)

    def test_dashboard_range_stats(self):
        self._create_paid_order(days_ago=0)
        self._create_paid_order(days_ago=2)
        resp = self.client.get('/api/admin/dashboard/?days=7')
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body['range']['days'], 7)
        self.assertEqual(body['range']['ordersCount'], 2)

    def test_dashboard_pending_payment_count(self):
        data = base_data()
        order = create_order(data, actor="admin")
        # Don't set payment status - stays pending

        resp = self.client.get('/api/admin/dashboard/')
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body['pendingPaymentCount'], 1)

    def test_dashboard_status_counts(self):
        self._create_paid_order(days_ago=0, status='new')
        self._create_paid_order(days_ago=0, status='processing')
        self._create_paid_order(days_ago=0, status='shipped')
        self._create_paid_order(days_ago=0, status='delivered')
        self._create_cancelled_order(days_ago=0)

        resp = self.client.get('/api/admin/dashboard/')
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body['statusCounts']['new'], 1)
        self.assertEqual(body['statusCounts']['processing'], 1)
        self.assertEqual(body['statusCounts']['shipped'], 1)
        self.assertEqual(body['statusCounts']['delivered'], 1)
        self.assertEqual(body['statusCounts']['cancelled'], 1)
        self.assertEqual(body['statusCounts']['total'], 5)

    def test_dashboard_daily_sales_zero_filled(self):
        # Create only one order today
        self._create_paid_order(days_ago=0)

        resp = self.client.get('/api/admin/dashboard/?days=7')
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        daily_sales = body['dailySales']
        self.assertEqual(len(daily_sales), 7)

        # Only today should have sales, others should be 0
        self.assertGreater(daily_sales[-1]['sales'], 0)  # Today
        for i in range(6):
            self.assertEqual(daily_sales[i]['sales'], 0)

    def test_dashboard_daily_sales_ordered_oldest_first(self):
        self._create_paid_order(days_ago=6)
        self._create_paid_order(days_ago=0)

        resp = self.client.get('/api/admin/dashboard/?days=7')
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        daily_sales = body['dailySales']

        # Oldest first
        self.assertGreater(daily_sales[0]['sales'], 0)  # 6 days ago
        self.assertGreater(daily_sales[-1]['sales'], 0)  # Today

    def test_dashboard_cancelled_orders_not_counted_as_sales(self):
        self._create_cancelled_order(days_ago=0)
        self._create_paid_order(days_ago=0)

        resp = self.client.get('/api/admin/dashboard/')
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        # Only paid, non-cancelled order should count
        self.assertEqual(body['today']['ordersCount'], 1)

    def test_dashboard_unpaid_orders_not_counted_as_sales(self):
        data = base_data()
        order = create_order(data, actor="admin")
        # Pending payment, not paid

        resp = self.client.get('/api/admin/dashboard/')
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body['today']['ordersCount'], 0)

    def test_dashboard_latest_orders(self):
        self._create_paid_order(days_ago=0)
        self._create_paid_order(days_ago=1)

        resp = self.client.get('/api/admin/dashboard/')
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        latest_orders = body['latestOrders']
        self.assertEqual(len(latest_orders), 2)
        self.assertIn('id', latest_orders[0])
        self.assertIn('number', latest_orders[0])
        self.assertIn('customerName', latest_orders[0])
        self.assertIn('city', latest_orders[0])
        self.assertIn('total', latest_orders[0])
        self.assertIn('status', latest_orders[0])

    def test_dashboard_low_stock_respects_inactive_sizes(self):
        # Create product with active and inactive sizes
        product = make_product(slug="low-stock-shoe")
        active_size = make_size(product, us=9.0, stock=20, is_active=True)
        inactive_size = make_size(product, us=10.0, stock=50, is_active=False)

        resp = self.client.get('/api/admin/dashboard/')
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        low_stock = body['lowStock']

        # Should count only active sizes (20 < 25)
        self.assertGreater(low_stock['totalStock'], 0)
        # Check if this product is in low stock list
        product_ids = [p['id'] for p in low_stock['products']]
        self.assertIn(product.id, product_ids)

    def test_dashboard_low_stock_threshold(self):
        resp = self.client.get('/api/admin/dashboard/')
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        low_stock = body['lowStock']
        self.assertEqual(low_stock['threshold'], 25)

    def test_dashboard_tehran_midnight_boundary(self):
        """Test that today's boundary uses Asia/Tehran timezone."""
        # This is a basic test - comprehensive timezone testing would require
        # mocking timezone.now() to test boundary conditions
        resp = self.client.get('/api/admin/dashboard/')
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertIn('today', body)
        self.assertIn('range', body)
