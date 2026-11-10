"""
Tests for online payment (Zarinpal + mock gateway). The real gateway is never
contacted: shop.services.payments._post_json is patched.
"""
from datetime import timedelta
from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from shop.models import Order
from shop.services.orders import change_order_status, create_order, set_payment_status
from shop.services.payments import (
    ERROR,
    FAILED,
    PAID,
    PAID_BUT_CANCELLED,
    UNKNOWN,
    PaymentError,
    handle_callback,
    start_payment,
)
from shop.tests.test_orders import base_data, make_product, make_size, make_store_settings

POST = "shop.services.payments._post_json"
AUTHORITY = "A00000000000000000000000000000000001"

GATEWAY = override_settings(
    PAYMENT_GATEWAY="zarinpal",
    ZARINPAL_MERCHANT_ID="11111111-2222-3333-4444-555555555555",
    ZARINPAL_SANDBOX=False,
    FRONTEND_URL="http://front.test",
    BACKEND_URL="http://api.test",
)


def request_ok(authority=AUTHORITY):
    return {"data": {"code": 100, "message": "Success", "authority": authority,
                     "fee_type": "Merchant", "fee": 0}, "errors": []}


def verify_ok(code=100, ref_id=123456789):
    return {"data": {"code": code, "message": "Verified", "card_pan": "603799******1234",
                     "ref_id": ref_id, "fee_type": "Merchant", "fee": 0}, "errors": []}


GATEWAY_ERROR = {"data": [], "errors": {"code": -9, "message": "Validation error"}}


def make_order():
    make_store_settings(free_shipping_threshold=5_000_000, standard_fee=0,
                        express_fee=500_000, pending_order_minutes=30)
    product = make_product(price=1_000_000)
    make_size(product, us=9.0, stock=5)
    return create_order(base_data(), actor="customer")


@GATEWAY
class StartPaymentTests(TestCase):

    def setUp(self):
        self.order = make_order()

    def test_sends_amount_in_rial_and_stores_authority(self):
        with patch(POST, return_value=request_ok()) as post:
            url = start_payment(self.order)

        endpoint, payload = post.call_args[0]
        self.assertEqual(endpoint, "https://payment.zarinpal.com/pg/v4/payment/request.json")
        self.assertEqual(payload["merchant_id"], "11111111-2222-3333-4444-555555555555")
        self.assertEqual(payload["amount"], self.order.total * 10)
        self.assertEqual(payload["callback_url"], "http://api.test/api/payments/callback/")
        self.assertEqual(payload["metadata"]["order_id"], str(self.order.number))
        self.assertEqual(payload["metadata"]["mobile"], "09121234567")
        self.assertEqual(url, f"https://www.zarinpal.com/pg/StartPay/{AUTHORITY}")

        self.order.refresh_from_db()
        self.assertEqual(self.order.payment_authority, AUTHORITY)

    @override_settings(ZARINPAL_SANDBOX=True)
    def test_sandbox_uses_sandbox_urls(self):
        with patch(POST, return_value=request_ok()) as post:
            url = start_payment(self.order)
        self.assertEqual(post.call_args[0][0],
                         "https://sandbox.zarinpal.com/pg/v4/payment/request.json")
        self.assertEqual(url, f"https://sandbox.zarinpal.com/pg/StartPay/{AUTHORITY}")

    def test_extends_expiry_while_customer_is_on_gateway(self):
        Order.objects.filter(pk=self.order.pk).update(
            expires_at=timezone.now() + timedelta(minutes=1))
        with patch(POST, return_value=request_ok()):
            start_payment(self.order)
        self.order.refresh_from_db()
        self.assertGreater(self.order.expires_at, timezone.now() + timedelta(minutes=25))

    def test_paid_order_cannot_be_paid_again(self):
        set_payment_status(self.order, Order.PaymentStatus.PAID, actor="admin")
        with patch(POST) as post:
            with self.assertRaises(PaymentError) as ctx:
                start_payment(self.order)
        self.assertEqual(ctx.exception.code, "not_payable")
        post.assert_not_called()

    def test_cancelled_order_cannot_be_paid(self):
        change_order_status(self.order, Order.Status.CANCELLED, actor="admin")
        with patch(POST) as post:
            with self.assertRaises(PaymentError) as ctx:
                start_payment(self.order)
        self.assertEqual(ctx.exception.code, "not_payable")
        post.assert_not_called()

    def test_gateway_rejection_does_not_store_authority(self):
        with patch(POST, return_value=GATEWAY_ERROR):
            with self.assertRaises(PaymentError) as ctx:
                start_payment(self.order)
        self.assertEqual(ctx.exception.code, "rejected")
        self.order.refresh_from_db()
        self.assertEqual(self.order.payment_authority, "")

    @override_settings(ZARINPAL_MERCHANT_ID="")
    def test_missing_merchant_id_is_reported(self):
        with self.assertRaises(PaymentError) as ctx:
            start_payment(self.order)
        self.assertEqual(ctx.exception.code, "not_configured")

    def test_unreachable_gateway_is_reported(self):
        with patch(POST, side_effect=PaymentError("down", code="unreachable")):
            with self.assertRaises(PaymentError) as ctx:
                start_payment(self.order)
        self.assertEqual(ctx.exception.code, "unreachable")


@GATEWAY
class CallbackTests(TestCase):

    def setUp(self):
        self.order = make_order()
        with patch(POST, return_value=request_ok()):
            start_payment(self.order)

    def test_successful_payment_is_verified_and_recorded(self):
        with patch(POST, return_value=verify_ok()) as post:
            order, outcome = handle_callback(AUTHORITY, "OK")

        self.assertEqual(outcome, PAID)
        endpoint, payload = post.call_args[0]
        self.assertEqual(endpoint, "https://payment.zarinpal.com/pg/v4/payment/verify.json")
        self.assertEqual(payload["authority"], AUTHORITY)
        self.assertEqual(payload["amount"], self.order.total * 10)   # amount comes from our DB

        order.refresh_from_db()
        self.assertEqual(order.payment_status, Order.PaymentStatus.PAID)
        self.assertIsNotNone(order.paid_at)
        self.assertEqual(order.payment_ref_id, "123456789")
        self.assertEqual(order.payment_card_pan, "603799******1234")
        log = order.logs.filter(field="payment_status", new_value="paid").get()
        self.assertEqual(log.actor, "gateway")

    def test_already_verified_code_101_counts_as_paid(self):
        with patch(POST, return_value=verify_ok(code=101)):
            _, outcome = handle_callback(AUTHORITY, "OK")
        self.assertEqual(outcome, PAID)

    def test_callback_opened_twice_verifies_once(self):
        with patch(POST, return_value=verify_ok()) as post:
            handle_callback(AUTHORITY, "OK")
            _, outcome = handle_callback(AUTHORITY, "OK")
        self.assertEqual(outcome, PAID)
        self.assertEqual(post.call_count, 1)
        self.assertEqual(self.order.logs.filter(new_value="paid").count(), 1)

    def test_customer_cancelled_keeps_order_pending_without_verifying(self):
        with patch(POST) as post:
            order, outcome = handle_callback(AUTHORITY, "NOK")
        self.assertEqual(outcome, FAILED)
        post.assert_not_called()
        order.refresh_from_db()
        self.assertEqual(order.payment_status, Order.PaymentStatus.PENDING)

    def test_unverified_payment_stays_pending(self):
        with patch(POST, return_value=GATEWAY_ERROR):
            order, outcome = handle_callback(AUTHORITY, "OK")
        self.assertEqual(outcome, FAILED)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, Order.PaymentStatus.PENDING)

    def test_gateway_down_during_verify_is_an_error_not_a_payment(self):
        with patch(POST, side_effect=PaymentError("down", code="unreachable")):
            order, outcome = handle_callback(AUTHORITY, "OK")
        self.assertEqual(outcome, ERROR)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, Order.PaymentStatus.PENDING)

    def test_unknown_or_empty_authority(self):
        self.assertEqual(handle_callback("does-not-exist", "OK"), (None, UNKNOWN))
        self.assertEqual(handle_callback("", "OK"), (None, UNKNOWN))

    def test_payment_after_order_was_cancelled_is_still_recorded(self):
        change_order_status(self.order, Order.Status.CANCELLED, actor="system")
        with patch(POST, return_value=verify_ok()):
            order, outcome = handle_callback(AUTHORITY, "OK")
        self.assertEqual(outcome, PAID_BUT_CANCELLED)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, Order.PaymentStatus.PAID)   # money must not be lost
        self.assertEqual(order.status, Order.Status.CANCELLED)


@GATEWAY
class PaymentApiTests(APITestCase):

    def setUp(self):
        cache.clear()   # reset throttle counters
        self.order = make_order()
        self.pay_url = f"/api/orders/{self.order.number}/pay/"

    def test_wrong_or_missing_token_is_404(self):
        self.assertEqual(self.client.post(self.pay_url, {"token": "nope"}, format="json").status_code, 404)
        self.assertEqual(self.client.post(self.pay_url, {}, format="json").status_code, 404)

    def test_pay_returns_gateway_url(self):
        with patch(POST, return_value=request_ok()):
            response = self.client.post(
                self.pay_url, {"token": str(self.order.public_token)}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["redirectUrl"],
                         f"https://www.zarinpal.com/pg/StartPay/{AUTHORITY}")

    def test_paid_order_returns_409(self):
        set_payment_status(self.order, Order.PaymentStatus.PAID, actor="admin")
        response = self.client.post(
            self.pay_url, {"token": str(self.order.public_token)}, format="json")
        self.assertEqual(response.status_code, 409)

    @override_settings(ZARINPAL_MERCHANT_ID="")
    def test_unconfigured_gateway_returns_503(self):
        response = self.client.post(
            self.pay_url, {"token": str(self.order.public_token)}, format="json")
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.data["code"], "not_configured")

    def test_callback_redirects_to_storefront_with_outcome(self):
        with patch(POST, return_value=request_ok()):
            self.client.post(self.pay_url, {"token": str(self.order.public_token)}, format="json")
        with patch(POST, return_value=verify_ok()):
            response = self.client.get(
                "/api/payments/callback/", {"Authority": AUTHORITY, "Status": "OK"})
        self.assertEqual(response.status_code, 302)
        self.assertEqual(
            response["Location"],
            f"http://front.test/order/{self.order.number}?token={self.order.public_token}&payment=paid",
        )

    def test_callback_with_unknown_authority_goes_to_home(self):
        response = self.client.get("/api/payments/callback/", {"Authority": "x", "Status": "OK"})
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], "http://front.test/")


@override_settings(DEBUG=True, PAYMENT_GATEWAY="mock",
                   FRONTEND_URL="http://front.test", BACKEND_URL="http://api.test")
class MockGatewayTests(APITestCase):

    def setUp(self):
        cache.clear()
        self.order = make_order()

    def test_full_flow_without_real_gateway(self):
        token = str(self.order.public_token)
        response = self.client.post(f"/api/orders/{self.order.number}/pay/", {"token": token}, format="json")
        redirect_url = response.data["redirectUrl"]
        self.assertTrue(redirect_url.startswith("http://api.test/api/payments/mock/mock-"))

        page = self.client.get(redirect_url.replace("http://api.test", ""))
        self.assertEqual(page.status_code, 200)
        self.assertContains(page, "Status=OK")

        authority = redirect_url.rstrip("/").rsplit("/", 1)[1]
        done = self.client.get("/api/payments/callback/", {"Authority": authority, "Status": "OK"})
        self.assertEqual(done.status_code, 302)
        self.assertIn("payment=paid", done["Location"])
        self.order.refresh_from_db()
        self.assertEqual(self.order.payment_status, Order.PaymentStatus.PAID)

    @override_settings(DEBUG=False)
    def test_mock_gateway_is_refused_outside_debug(self):
        with self.assertRaises(PaymentError) as ctx:
            start_payment(self.order)
        self.assertEqual(ctx.exception.code, "not_configured")
        self.assertEqual(self.client.get("/api/payments/mock/mock-abc/").status_code, 404)
