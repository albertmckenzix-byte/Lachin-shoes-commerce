"""
Payment gateway service for Lachin Shoes.
Integrates with Zarinpal API v4 with automated local simulator support for development.
"""
from __future__ import annotations

import json
import logging
import uuid
import urllib.parse
import urllib.request
from typing import Any

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from shop.models import Order, OrderStatusLog
from shop.services.sms import send_order_paid_sms

logger = logging.getLogger(__name__)


class PaymentError(Exception):
    def __init__(self, message: str, code: str = "payment_error"):
        super().__init__(message)
        self.code = code


def request_payment(order: Order) -> dict[str, Any]:
    """
    Initiate payment for an existing order.
    Returns payment_url and authority.
    """
    if order.payment_status == Order.PaymentStatus.PAID:
        raise PaymentError("این سفارش قبلاً پرداخت شده است.", code="already_paid")
    if order.status == Order.Status.CANCELLED:
        raise PaymentError("این سفارش لغو شده است و امکان پرداخت آن وجود ندارد.", code="cancelled")

    amount = order.total  # in Tomans
    merchant_id = getattr(settings, "ZARINPAL_MERCHANT_ID", "").strip()
    callback_url = f"{settings.BACKEND_URL}/api/payment/verify/"

    # If no real merchant ID configured or sandbox mock requested, use Simulator
    if not merchant_id or merchant_id.lower() in {"mock", "test", "sandbox"}:
        authority = f"SIM-{order.number}-{uuid.uuid4().hex[:8]}"
        order.payment_authority = authority
        order.save(update_fields=["payment_authority", "updated_at"])

        simulator_url = (
            f"{settings.FRONTEND_URL}/payment/simulator?"
            f"authority={authority}&amount={amount}&orderNumber={order.number}&token={order.public_token}"
        )
        return {
            "payment_url": simulator_url,
            "authority": authority,
            "simulated": True,
        }

    # Real Zarinpal API v4
    is_sandbox = getattr(settings, "ZARINPAL_SANDBOX", True)
    req_url = (
        "https://sandbox.zarinpal.com/pg/v4/payment/request.json"
        if is_sandbox
        else "https://api.zarinpal.com/pg/v4/payment/request.json"
    )
    start_pay_base = (
        "https://sandbox.zarinpal.com/pg/StartPay/"
        if is_sandbox
        else "https://www.zarinpal.com/pg/StartPay/"
    )

    payload = {
        "merchant_id": merchant_id,
        "amount": amount,
        "currency": "IRT",  # Tomans
        "description": f"پرداخت سفارش #{order.number} فروشگاه کفش لاچین",
        "callback_url": callback_url,
        "metadata": {
            "mobile": order.phone,
            "email": order.email or "",
        },
    }

    try:
        data_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            req_url,
            data=data_bytes,
            headers={"Content-Type": "application/json", "Accept": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=15) as res:
            res_body = json.loads(res.read().decode("utf-8"))
            data = res_body.get("data", {})
            errors = res_body.get("errors")

            if errors or not data or data.get("code") != 100:
                err_msg = str(errors) if errors else "خطا در اتصال به درگاه زرین‌پال"
                raise PaymentError(f"درگاه بانکی با خطا مواجه شد: {err_msg}")

            authority = data["authority"]
            order.payment_authority = authority
            order.save(update_fields=["payment_authority", "updated_at"])

            return {
                "payment_url": f"{start_pay_base}{authority}",
                "authority": authority,
                "simulated": False,
            }
    except Exception as exc:
        logger.error(f"Zarinpal request failed for order #{order.number}: {exc}")
        if isinstance(exc, PaymentError):
            raise
        raise PaymentError("برقراری ارتباط با درگاه پرداخت بانکی امکان‌پذیر نیست.")


def verify_payment(authority: str, status_param: str) -> dict[str, Any]:
    """
    Verify payment callback from bank or simulator.
    Updates order, status, logs and sends notification.
    """
    if not authority:
        raise PaymentError("شناسه پیگیری پرداخت (Authority) نامعتبر است.")

    try:
        order = Order.objects.get(payment_authority=authority)
    except Order.DoesNotExist:
        raise PaymentError("سفارش مرتبط با این تراکنش یافت نشد.")

    # User cancelled or payment failed at gateway
    if str(status_param).upper() != "OK":
        OrderStatusLog.objects.create(
            order=order,
            actor="bank",
            field="payment_status",
            old_value=order.payment_status,
            new_value="failed",
        )
        return {
            "success": False,
            "order": order,
            "detail": "پرداخت توسط کاربر لغو شد یا در درگاه بانکی ناموفق بود.",
        }

    # Already paid
    if order.payment_status == Order.PaymentStatus.PAID:
        return {
            "success": True,
            "order": order,
            "ref_id": order.transaction_id,
            "already_paid": True,
        }

    # Simulated verification
    if authority.startswith("SIM-"):
        ref_id = f"REF-{timezone.now().strftime('%Y%m%d')}-{order.number}"
        return _apply_successful_payment(order, ref_id)

    # Real Zarinpal verification
    merchant_id = getattr(settings, "ZARINPAL_MERCHANT_ID", "")
    is_sandbox = getattr(settings, "ZARINPAL_SANDBOX", True)
    verify_url = (
        "https://sandbox.zarinpal.com/pg/v4/payment/verify.json"
        if is_sandbox
        else "https://api.zarinpal.com/pg/v4/payment/verify.json"
    )

    payload = {
        "merchant_id": merchant_id,
        "amount": order.total,
        "authority": authority,
    }

    try:
        data_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            verify_url,
            data=data_bytes,
            headers={"Content-Type": "application/json", "Accept": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=15) as res:
            res_body = json.loads(res.read().decode("utf-8"))
            data = res_body.get("data", {})
            errors = res_body.get("errors")

            if errors or not data or data.get("code") not in {100, 101}:
                err_msg = str(errors) if errors else "تراکنش توسط بانک تایید نشد."
                return {
                    "success": False,
                    "order": order,
                    "detail": f"اعتبارسنجی پرداخت ناموفق بود ({err_msg}).",
                }

            ref_id = str(data.get("ref_id"))
            return _apply_successful_payment(order, ref_id)
    except Exception as exc:
        logger.error(f"Zarinpal verify error: {exc}")
        return {
            "success": False,
            "order": order,
            "detail": "خطا در تایید تراکنش بانکی.",
        }


@transaction.atomic
def _apply_successful_payment(order: Order, ref_id: str) -> dict[str, Any]:
    old_payment_status = order.payment_status
    order.payment_status = Order.PaymentStatus.PAID
    order.paid_at = timezone.now()
    order.transaction_id = ref_id

    # If new, advance to processing
    if order.status == Order.Status.NEW:
        order.status = Order.Status.PROCESSING

    order.save(update_fields=["payment_status", "status", "paid_at", "transaction_id", "updated_at"])

    OrderStatusLog.objects.create(
        order=order,
        actor="bank",
        field="payment_status",
        old_value=old_payment_status,
        new_value=Order.PaymentStatus.PAID,
    )

    try:
        send_order_paid_sms(order)
    except Exception as exc:
        logger.warning(f"SMS notification after payment failed: {exc}")

    return {
        "success": True,
        "order": order,
        "ref_id": ref_id,
        "already_paid": False,
    }
