from datetime import timedelta
from io import StringIO
from django.contrib.auth.models import User
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from shop.models import Customer, Order, OrderItem, Product, ProductSize


class SchedulerAndExpiryTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Admin user
        self.admin = User.objects.create_superuser(
            username="admin", email="admin@lachin.com", password="adminpassword"
        )
        self.admin_token = Token.objects.create(user=self.admin)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.admin_token.key}")

        # Customer
        self.customer = Customer.objects.create(
            phone="09121112233", first_name="رضا", last_name="کریمی", city="تهران"
        )

        # Product with stock
        self.product = Product.objects.create(
            name="کفش آدیداس سوپراستار",
            slug="adidas-superstar",
            maker_brand="adidas",
            price=2_500_000,
        )
        self.size = ProductSize.objects.create(
            product=self.product,
            us=9.0,
            eu=42.5,
            cm=27.0,
            stock=5,
            is_active=True,
        )

        # Expired order (expired 15 minutes ago)
        self.expired_order = Order.objects.create(
            number=1099,
            customer=self.customer,
            first_name="رضا",
            last_name="کریمی",
            phone="09121112233",
            city="تهران",
            address="خیابان آزادی",
            status=Order.Status.NEW,
            payment_status=Order.PaymentStatus.PENDING,
            total=2_500_000,
            expires_at=timezone.now() - timedelta(minutes=15),
        )
        OrderItem.objects.create(
            order=self.expired_order,
            product=self.product,
            product_name=self.product.name,
            product_slug=self.product.slug,
            size_us=9.0,
            size_eu=42.5,
            unit_price=2_500_000,
            quantity=2,
            line_total=5_000_000,
        )

    def test_admin_expire_pending_orders_endpoint(self):
        res = self.client.post("/api/admin/orders/expire-pending/", format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertGreaterEqual(data["expiredCount"], 1)

        self.expired_order.refresh_from_db()
        self.assertEqual(self.expired_order.status, Order.Status.CANCELLED)

    def test_admin_get_scheduler_status(self):
        res = self.client.get("/api/admin/orders/expire-pending/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertEqual(data["interval_minutes"], 10)

    def test_management_command_expire_pending_orders(self):
        out = StringIO()
        call_command("expire_pending_orders", stdout=out)
        output = out.getvalue()
        self.assertIn("سفارش منقضی لغو و موجودی بازگردانده شد", output)

        self.expired_order.refresh_from_db()
        self.assertEqual(self.expired_order.status, Order.Status.CANCELLED)
