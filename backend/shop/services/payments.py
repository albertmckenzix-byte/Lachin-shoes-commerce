"""
Online payment for orders (Zarinpal v4 + a DEBUG-only mock gateway).

Flow
----
1. ``start_payment(order)``  -> asks the gateway for an *authority*, stores it
   on the order and returns the URL the customer must be redirected to.
2. The gateway sends the customer back to ``/api/payments/callback/``
   (``Authority`` + ``Status`` query params).
3. ``handle_callback(authority, status)`` verifies the payment with the
   gateway server-to-server. The amount that is verified always comes from our
   database, never from the request.

Amounts: the store works in Toman, the gateway in Rial (1 Toman = 10 Rial).
"""
import json
import re
import urllib.error
import urllib.request
import uuid
from datetime import timedelta
from typing import Optional

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from ..models import Order, StoreSettings
from .orders import OrderError, set_payment_status

TOMAN_TO_RIAL = 10
HTTP_TIMEOUT_SECONDS = 15

# Outcomes returned by handle_callback()
PAID = "paid"
PAID_BUT_CANCELLED = "paid_cancelled"   # money received but the order had already expired
FAILED = "failed"                       # cancelled by the customer or rejected by the gateway
ERROR = "error"                         # gateway unreachable / unexpected answer
UNKNOWN = "unknown"                     # authority does not belong to any order


class PaymentError(Exception):
    """Raised for problems with starting or verifying a payment."""

    def __init__(self, message: str, code: str = "gateway"):
        super().__init__(message)
        self.code = code


# ---------------------------------------------------------------------------
# Gateways
# ---------------------------------------------------------------------------

def _post_json(url: str, payload: dict) -> dict:
    """POST JSON and return the decoded JSON answer (also for HTTP 4xx bodies)."""
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=HTTP_TIMEOUT_SECONDS) as response:
            raw = response.read()
    except urllib.error.HTTPError as exc:
        raw = exc.read()
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        raise PaymentError("ارتباط با درگاه پرداخت برقرار نشد.", code="unreachable") from exc
    try:
        body = json.loads(raw.decode("utf-8"))
    except (ValueError, UnicodeDecodeError) as exc:
        raise PaymentError("پاسخ درگاه پرداخت نامعتبر است.", code="bad_response") from exc
    if not isinstance(body, dict):
        raise PaymentError("پاسخ درگاه پرداخت نامعتبر است.", code="bad_response")
    return body


def _gateway_error(body: dict) -> str:
    errors = body.get("errors")
    if isinstance(errors, dict) and errors.get("message"):
        return str(errors["message"])
    if isinstance(errors, list) and errors and isinstance(errors[0], dict):
        return str(errors[0].get("message", ""))
    return ""


class ZarinpalGateway:
    """Zarinpal v4 REST API (https://payment.zarinpal.com/pg/v4/...)."""

    def __init__(self):
        self.merchant_id = getattr(settings, "ZARINPAL_MERCHANT_ID", "")
        if not self.merchant_id:
            raise PaymentError("درگاه پرداخت هنوز تنظیم نشده است.", code="not_configured")
        if getattr(settings, "ZARINPAL_SANDBOX", False):
            self.api_base = "https://sandbox.zarinpal.com/pg/v4/payment"
            self.pay_base = "https://sandbox.zarinpal.com/pg/StartPay"
        else:
            self.api_base = "https://payment.zarinpal.com/pg/v4/payment"
            self.pay_base = "https://www.zarinpal.com/pg/StartPay"

    def request(self, *, amount_rial: int, callback_url: str, description: str,
                order_id: str, mobile: str = "", email: str = "") -> str:
        metadata = {"order_id": order_id}
        if re.fullmatch(r"09\d{9}", mobile or ""):
            metadata["mobile"] = mobile
        if email:
            metadata["email"] = email
        body = _post_json(f"{self.api_base}/request.json", {
            "merchant_id": self.merchant_id,
            "amount": amount_rial,
            "callback_url": callback_url,
            "description": description,
            "metadata": metadata,
        })
        data = body.get("data")
        if not isinstance(data, dict) or data.get("code") != 100 or not data.get("authority"):
            detail = _gateway_error(body)
            raise PaymentError(
                "درگاه پرداخت درخواست را نپذیرفت." + (f" ({detail})" if detail else ""),
                code="rejected",
            )
        return str(data["authority"])

    def pay_url(self, authority: str) -> str:
        return f"{self.pay_base}/{authority}"

    def verify(self, *, authority: str, amount_rial: int) -> dict:
        body = _post_json(f"{self.api_base}/verify.json", {
            "merchant_id": self.merchant_id,
            "amount": amount_rial,
            "authority": authority,
        })
        data = body.get("data")
        # 100 = verified now, 101 = already verified earlier
        if not isinstance(data, dict) or data.get("code") not in (100, 101):
            raise PaymentError("پرداخت تأیید نشد.", code="not_verified")
        return {
            "ref_id": str(data.get("ref_id", "")),
            "card_pan": str(data.get("card_pan", "") or ""),
        }


class MockGateway:
    """
    Local testing gateway: shows a tiny page with "pay" / "cancel" links.
    Only usable with DEBUG=True (never in production).
    """

    def __init__(self):
        if not settings.DEBUG:
            raise PaymentError("درگاه آزمایشی فقط در حالت توسعه (DEBUG) فعال است.",
                               code="not_configured")

    def request(self, *, amount_rial: int, callback_url: str, description: str,
                order_id: str, mobile: str = "", email: str = "") -> str:
        return f"mock-{uuid.uuid4().hex}"

    def pay_url(self, authority: str) -> str:
        return f"{settings.BACKEND_URL.rstrip('/')}/api/payments/mock/{authority}/"

    def verify(self, *, authority: str, amount_rial: int) -> dict:
        return {"ref_id": str(uuid.uuid4().int % 10**9), "card_pan": "603799******1234"}


def get_gateway():
    name = getattr(settings, "PAYMENT_GATEWAY", "zarinpal")
    if name == "mock":
        return MockGateway()
    if name == "zarinpal":
        return ZarinpalGateway()
    raise PaymentError("درگاه پرداخت نامعتبر تنظیم شده است.", code="not_configured")


# ---------------------------------------------------------------------------
# Service functions
# ---------------------------------------------------------------------------

def callback_url() -> str:
    return f"{settings.BACKEND_URL.rstrip('/')}/api/payments/callback/"


def start_payment(order: Order) -> str:
    """Create a payment session for ``order`` and return the gateway URL."""
    gateway = get_gateway()
    with transaction.atomic():
        order = Order.objects.select_for_update().get(pk=order.pk)
        if (order.status != Order.Status.NEW
                or order.payment_status != Order.PaymentStatus.PENDING):
            raise PaymentError("این سفارش قابل پرداخت نیست.", code="not_payable")
        if order.total <= 0:
            raise PaymentError("مبلغ سفارش معتبر نیست.", code="not_payable")

        authority = gateway.request(
            amount_rial=order.total * TOMAN_TO_RIAL,
            callback_url=callback_url(),
            description=f"سفارش شماره {order.number}",
            order_id=str(order.number),
            mobile=order.phone,
            email=order.email,
        )

        # Keep the stock reserved while the customer is on the gateway page.
        minutes = StoreSettings.get().pending_order_minutes
        hold_until = timezone.now() + timedelta(minutes=minutes)
        if order.expires_at is None or order.expires_at < hold_until:
            order.expires_at = hold_until
        order.payment_authority = authority
        order.save(update_fields=["payment_authority", "expires_at", "updated_at"])
    return gateway.pay_url(authority)


def handle_callback(authority: str, status: str) -> tuple[Optional[Order], str]:
    """
    Process the customer's return from the gateway.
    Returns ``(order, outcome)``; safe to call more than once for the same payment.
    """
    if not authority:
        return None, UNKNOWN
    order = Order.objects.filter(payment_authority=authority).first()
    if order is None:
        return None, UNKNOWN

    if order.payment_status == Order.PaymentStatus.PAID:
        return order, PAID                      # callback opened twice
    if status != "OK":
        return order, FAILED                    # customer cancelled; order stays pending

    try:
        result = get_gateway().verify(
            authority=authority,
            amount_rial=order.total * TOMAN_TO_RIAL,   # amount always from our DB
        )
    except PaymentError as exc:
        return order, FAILED if exc.code == "not_verified" else ERROR

    with transaction.atomic():
        order = Order.objects.select_for_update().get(pk=order.pk)
        if order.payment_status == Order.PaymentStatus.PENDING:
            try:
                set_payment_status(order, Order.PaymentStatus.PAID, actor="gateway")
            except OrderError:
                return order, ERROR
            order.payment_ref_id = result["ref_id"]
            order.payment_card_pan = result["card_pan"]
            order.save(update_fields=["payment_ref_id", "payment_card_pan", "updated_at"])

    if order.status == Order.Status.CANCELLED:
        return order, PAID_BUT_CANCELLED
    return order, PAID
