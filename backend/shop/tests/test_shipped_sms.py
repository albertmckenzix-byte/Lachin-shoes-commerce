from unittest.mock import patch
from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from shop.models import Customer, Order, Product, ProductSize
from shop.services.orders import change_order_status
from shop.services.sms import send_order_shipped_sms


class ShippedSmsTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Admin user
        self.admin = User.objects.create_superuser(
            username="admin", email="admin@lachin.com", password="adminpassword"
        )
        self.admin_token = Token.objects.create(user=self.admin)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.admin_token.key}")

        # Customer & Order
        self.customer = Customer.objects.create(
            phone="09121234567", first_name="حمید", last_name="رضایی", city="تهران"
        )
        self.order = Order.objects.create(
            number=1005,
            customer=self.customer,
            first_name="حمید",
            last_name="رضایی",
            phone="09121234567",
            city="تهران",
            address="خیابان آزادی",
            status=Order.Status.PROCESSING,
            payment_status=Order.PaymentStatus.PAID,
            total=1_200_000,
        )

    @patch("shop.services.sms.send_sms")
    def test_send_order_shipped_sms_content(self, mock_send_sms):
        mock_send_sms.return_value = {"status": "ok"}
        self.order.shipping_tracking_code = "TRACK-9876543210"
        self.order.save()

        send_order_shipped_sms(self.order)
        mock_send_sms.assert_called_once()
        phone_arg, msg_arg = mock_send_sms.call_args[0]
        self.assertEqual(phone_arg, "09121234567")
        self.assertIn("#1005", msg_arg)
        self.assertIn("TRACK-9876543210", msg_arg)

    @patch("shop.services.sms.send_order_shipped_sms")
    def test_change_order_status_triggers_sms(self, mock_shipped_sms):
        change_order_status(self.order, Order.Status.SHIPPED, actor="admin")
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, Order.Status.SHIPPED)
        mock_shipped_sms.assert_called_once_with(self.order)

    @patch("shop.services.sms.send_order_shipped_sms")
    def test_patch_order_to_shipped_triggers_sms(self, mock_shipped_sms):
        res = self.client.patch(
            f"/api/admin/orders/{self.order.number}/",
            {"status": "shipped", "shipping_tracking_code": "POST-112233"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, Order.Status.SHIPPED)
        self.assertEqual(self.order.shipping_tracking_code, "POST-112233")
        mock_shipped_sms.assert_called_once()

    @patch("shop.services.sms.send_order_shipped_sms")
    def test_patch_tracking_code_on_shipped_order_triggers_sms(self, mock_shipped_sms):
        self.order.status = Order.Status.SHIPPED
        self.order.save()

        res = self.client.patch(
            f"/api/admin/orders/{self.order.number}/",
            {"shipping_tracking_code": "NEW-TRACKING-9988"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.shipping_tracking_code, "NEW-TRACKING-9988")
        mock_shipped_sms.assert_called_once()

    @patch("shop.services.sms.send_order_shipped_sms")
    def test_manual_send_shipped_sms_endpoint(self, mock_shipped_sms):
        mock_shipped_sms.return_value = {"status": "simulated"}

        res = self.client.post(
            f"/api/admin/orders/{self.order.number}/send-shipped-sms/",
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertTrue(data["success"])
        mock_shipped_sms.assert_called_once_with(self.order)
