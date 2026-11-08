"""
Order creation and lifecycle service for the Ryst shop.

All public functions that mutate data must be called inside a request or task
context; create_order already wraps itself in transaction.atomic().
"""
from __future__ import annotations

import re
from decimal import Decimal
from typing import Any

from django.db import transaction
from django.db.models import F
from django.utils import timezone

from shop.models import (
    Coupon,
    Customer,
    Order,
    OrderItem,
    OrderStatusLog,
    Product,
    ProductSize,
    StoreSettings,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# Persian / Arabic digit maps
_FA_DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789")
_AR_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")


def _normalize_phone(raw: str) -> str:
    """
    Convert any representation of an Iranian mobile number to 09xxxxxxxxx.
    Accepts: 09xxxxxxxx, +989xxxxxxxx, 989xxxxxxxx (with/without leading +).
    Raises ValueError with a Persian message on failure.
    """
    if not raw:
        raise ValueError("شماره موبایل الزامی است.")
    s = str(raw).translate(_FA_DIGITS).translate(_AR_DIGITS)
    s = re.sub(r"[\s\-]", "", s)          # strip spaces / dashes
    if s.startswith("+98"):
        s = "0" + s[3:]
    elif s.startswith("98") and len(s) == 12:
        s = "0" + s[2:]
    if not re.fullmatch(r"09[0-9]{9}", s):
        raise ValueError("شماره موبایل باید یک شماره ایرانی معتبر باشد (مثلاً ۰۹۱۲۱۲۳۴۵۶۷).")
    return s


def _validate_postal_code(code: str) -> str:
    """10 digits or empty. Returns cleaned value."""
    code = str(code).strip() if code else ""
    if code and not re.fullmatch(r"\d{10}", code):
        raise ValueError("کد پستی باید ۱۰ رقم باشد.")
    return code


class OrderError(Exception):
    """Business-logic error raised by the order service."""
    def __init__(self, message: str, code: str = "validation", fields: dict | None = None):
        super().__init__(message)
        self.code = code
        self.fields = fields or {}


# ---------------------------------------------------------------------------
# Allowed status transitions
# ---------------------------------------------------------------------------

_STATUS_TRANSITIONS: dict[str, set[str]] = {
    Order.Status.NEW:        {Order.Status.PROCESSING, Order.Status.CANCELLED},
    Order.Status.PROCESSING: {Order.Status.SHIPPED,    Order.Status.CANCELLED},
    Order.Status.SHIPPED:    {Order.Status.DELIVERED,  Order.Status.CANCELLED},
    Order.Status.DELIVERED:  set(),   # final
    Order.Status.CANCELLED:  set(),   # final
}

_PAYMENT_TRANSITIONS: dict[str, set[str]] = {
    Order.PaymentStatus.PENDING:  {Order.PaymentStatus.PAID, Order.PaymentStatus.PENDING},
    Order.PaymentStatus.PAID:     {Order.PaymentStatus.REFUNDED},
    Order.PaymentStatus.REFUNDED: set(),  # final
}


# ---------------------------------------------------------------------------
# Stock helpers
# ---------------------------------------------------------------------------

def release_stock(order: Order) -> None:
    """
    Idempotent. Restore quantities to ProductSize rows, then set
    stock_released=True and roll back coupon used_count.
    """
    if order.stock_released:
        return
    with transaction.atomic():
        # Re-fetch with a lock so concurrent calls don't double-restore
        order = Order.objects.select_for_update().get(pk=order.pk)
        if order.stock_released:
            return
        for item in order.items.select_related("product").all():
            if item.product_id is None:
                continue
            updated = ProductSize.objects.filter(
                product_id=item.product_id,
                us=item.size_us,
            ).update(stock=F("stock") + item.quantity)
            # If the size row was deleted, skip silently
            _ = updated
        # Roll back coupon use
        if order.coupon_code:
            Coupon.objects.filter(
                code=order.coupon_code, used_count__gt=0
            ).update(used_count=F("used_count") - 1)
        order.stock_released = True
        order.save(update_fields=["stock_released"])


# ---------------------------------------------------------------------------
# 1. create_order
# ---------------------------------------------------------------------------

@transaction.atomic
def create_order(data: dict[str, Any], actor: str = "customer") -> Order:
    """
    Validate payload, reserve stock, and persist the order in one transaction.

    ``data`` keys:
        first_name, last_name, phone, email (opt), country (opt),
        city, address, postal_code (opt), delivery_method,
        coupon_code (opt), note (opt),
        items: list of {slug, size_us, quantity}
    """
    errors: dict[str, str] = {}

    # ---- customer fields ---------------------------------------------------
    first_name = str(data.get("first_name", "")).strip()
    last_name  = str(data.get("last_name",  "")).strip()
    email      = str(data.get("email",      "")).strip()
    country    = str(data.get("country",    "Iran")).strip() or "Iran"
    city       = str(data.get("city",       "")).strip()
    address    = str(data.get("address",    "")).strip()
    note       = str(data.get("note",       "")).strip()
    raw_phone  = str(data.get("phone",      "")).strip()

    if not first_name:
        errors["first_name"] = "نام الزامی است."
    if not last_name:
        errors["last_name"] = "نام خانوادگی الزامی است."
    if not city:
        errors["city"] = "شهر الزامی است."
    if not address:
        errors["address"] = "آدرس الزامی است."

    try:
        phone = _normalize_phone(raw_phone)
    except ValueError as exc:
        errors["phone"] = str(exc)
        phone = ""

    try:
        postal_code = _validate_postal_code(data.get("postal_code", ""))
    except ValueError as exc:
        errors["postal_code"] = str(exc)
        postal_code = ""

    # ---- delivery_method ---------------------------------------------------
    delivery_method = str(data.get("delivery_method", "standard")).strip()
    if delivery_method not in {Order.DeliveryMethod.STANDARD, Order.DeliveryMethod.EXPRESS}:
        errors["delivery_method"] = "روش ارسال معتبر نیست (standard یا express)."

    # ---- items -------------------------------------------------------------
    raw_items = data.get("items", [])
    if not isinstance(raw_items, list) or len(raw_items) == 0:
        errors["items"] = "حداقل یک کالا الزامی است."
    elif len(raw_items) > 10:
        errors["items"] = "حداکثر ۱۰ قلم متفاوت در هر سفارش مجاز است."

    if errors:
        raise OrderError("اطلاعات وارد شده معتبر نیست.", code="validation", fields=errors)

    # ---- validate & lock items ---------------------------------------------
    seen_slugs: set[str] = set()
    item_rows: list[dict] = []          # will hold enriched item data

    for idx, raw_item in enumerate(raw_items):
        slug     = str(raw_item.get("slug", "")).strip()
        size_us  = raw_item.get("size_us")
        quantity = raw_item.get("quantity", 1)

        if not slug:
            raise OrderError(f"اسلاگ محصول در ردیف {idx+1} الزامی است.", code="validation")
        if slug in seen_slugs:
            raise OrderError(
                f"محصول «{slug}» بیش از یک بار در سفارش آمده است.", code="validation"
            )
        seen_slugs.add(slug)

        try:
            quantity = int(quantity)
        except (TypeError, ValueError):
            raise OrderError(f"تعداد محصول «{slug}» معتبر نیست.", code="validation")
        if not (1 <= quantity <= 10):
            raise OrderError(
                f"تعداد محصول «{slug}» باید بین ۱ و ۱۰ باشد.", code="validation"
            )

        try:
            size_us = Decimal(str(size_us))
        except Exception:
            raise OrderError(
                f"سایز محصول «{slug}» معتبر نیست.", code="validation"
            )

        # Load active product
        try:
            product = Product.objects.get(slug=slug, is_active=True)
        except Product.DoesNotExist:
            raise OrderError(
                f"محصول «{slug}» یافت نشد یا غیرفعال است.", code="validation"
            )

        # Lock the size row (select_for_update prevents concurrent oversell)
        try:
            size_row = ProductSize.objects.select_for_update().get(
                product=product, us=size_us
            )
        except ProductSize.DoesNotExist:
            raise OrderError(
                f"سایز US {size_us} برای محصول «{product.name}» وجود ندارد.",
                code="validation",
            )

        if not size_row.is_active:
            raise OrderError(
                f"سایز US {size_us} محصول «{product.name}» غیرفعال است.",
                code="validation",
            )
        if size_row.stock < quantity:
            raise OrderError(
                f"موجودی سایز US {size_us} محصول «{product.name}» "
                f"کافی نیست (موجود: {size_row.stock}).",
                code="out_of_stock",
            )

        item_rows.append({
            "product":      product,
            "size_row":     size_row,
            "quantity":     quantity,
            "unit_price":   product.price,   # always taken from DB
            "size_us":      size_row.us,
            "size_eu":      size_row.eu,
        })

    # ---- pricing -----------------------------------------------------------
    subtotal: int = sum(r["unit_price"] * r["quantity"] for r in item_rows)

    # Coupon
    coupon_code  = str(data.get("coupon_code", "")).strip().upper()
    discount_total = 0
    coupon_obj: Coupon | None = None
    if coupon_code:
        try:
            coupon_obj = Coupon.objects.select_for_update().get(
                code=coupon_code, is_active=True
            )
        except Coupon.DoesNotExist:
            raise OrderError("کد تخفیف معتبر نیست یا فعال نیست.", code="invalid_coupon")
        now = timezone.now()
        if coupon_obj.expires_at and coupon_obj.expires_at < now:
            raise OrderError("کد تخفیف منقضی شده است.", code="invalid_coupon")
        if coupon_obj.usage_limit is not None and coupon_obj.used_count >= coupon_obj.usage_limit:
            raise OrderError("ظرفیت استفاده از این کد تخفیف پر شده است.", code="invalid_coupon")
        discount_total = min(subtotal, (subtotal * coupon_obj.percent) // 100)

    # Shipping
    settings = StoreSettings.get()
    if delivery_method == Order.DeliveryMethod.EXPRESS:
        shipping_fee = settings.express_fee
    else:
        shipping_fee = 0 if subtotal >= settings.free_shipping_threshold else settings.standard_fee

    total = subtotal - discount_total + shipping_fee

    # ---- expires_at --------------------------------------------------------
    expires_at = timezone.now() + timezone.timedelta(minutes=settings.pending_order_minutes)

    # ---- Customer upsert ---------------------------------------------------
    customer, _ = Customer.objects.update_or_create(
        phone=phone,
        defaults={
            "first_name": first_name,
            "last_name":  last_name,
            "email":      email,
            "city":       city,
        },
    )

    # ---- Order -------------------------------------------------------------
    order = Order.objects.create(
        customer=customer,
        first_name=first_name,
        last_name=last_name,
        phone=phone,
        email=email,
        country=country,
        city=city,
        address=address,
        postal_code=postal_code,
        delivery_method=delivery_method,
        subtotal=subtotal,
        shipping_fee=shipping_fee,
        discount_total=discount_total,
        total=total,
        coupon_code=coupon_code,
        note=note,
        expires_at=expires_at,
        status=Order.Status.NEW,
        payment_status=Order.PaymentStatus.PENDING,
    )

    # ---- OrderItems + stock decrement --------------------------------------
    for r in item_rows:
        OrderItem.objects.create(
            order=order,
            product=r["product"],
            product_name=r["product"].name,
            product_slug=r["product"].slug,
            size_us=r["size_us"],
            size_eu=r["size_eu"],
            unit_price=r["unit_price"],
            quantity=r["quantity"],
            line_total=r["unit_price"] * r["quantity"],
        )
        # Decrement using F() — the row is already locked
        ProductSize.objects.filter(pk=r["size_row"].pk).update(
            stock=F("stock") - r["quantity"]
        )

    # ---- Coupon used_count -------------------------------------------------
    if coupon_obj is not None:
        Coupon.objects.filter(pk=coupon_obj.pk).update(
            used_count=F("used_count") + 1
        )

    # ---- Audit log ---------------------------------------------------------
    OrderStatusLog.objects.create(
        order=order,
        actor=actor,
        field="status",
        old_value="",
        new_value=order.status,
    )

    return order


# ---------------------------------------------------------------------------
# 2. change_order_status / set_payment_status
# ---------------------------------------------------------------------------

def change_order_status(order: Order, new_status: str, actor: str) -> Order:
    """Transition order.status with validation and audit logging."""
    allowed = _STATUS_TRANSITIONS.get(order.status, set())
    if new_status not in allowed:
        raise OrderError(
            f"انتقال از «{order.status}» به «{new_status}» مجاز نیست.",
            code="validation",
        )
    old_status = order.status
    order.status = new_status
    order.save(update_fields=["status", "updated_at"])

    OrderStatusLog.objects.create(
        order=order, actor=actor, field="status",
        old_value=old_status, new_value=new_status,
    )

    if new_status == Order.Status.CANCELLED:
        release_stock(order)

    return order


def set_payment_status(order: Order, new_status: str, actor: str) -> Order:
    """Transition order.payment_status with validation and audit logging."""
    allowed = _PAYMENT_TRANSITIONS.get(order.payment_status, set())
    if new_status not in allowed:
        raise OrderError(
            f"انتقال پرداخت از «{order.payment_status}» به «{new_status}» مجاز نیست.",
            code="validation",
        )
    old_status = order.payment_status
    order.payment_status = new_status
    update_fields = ["payment_status", "updated_at"]
    if new_status == Order.PaymentStatus.PAID:
        order.paid_at = timezone.now()
        update_fields.append("paid_at")
    order.save(update_fields=update_fields)

    OrderStatusLog.objects.create(
        order=order, actor=actor, field="payment_status",
        old_value=old_status, new_value=new_status,
    )
    return order


# ---------------------------------------------------------------------------
# 3. expire_pending_orders
# ---------------------------------------------------------------------------

def expire_pending_orders() -> int:
    """
    Cancel all orders that are still 'new'+'pending' and past their
    expires_at. Returns the number of orders cancelled.
    """
    now = timezone.now()
    expired_qs = Order.objects.filter(
        status=Order.Status.NEW,
        payment_status=Order.PaymentStatus.PENDING,
        expires_at__lt=now,
    )
    count = 0
    for order in expired_qs:
        try:
            change_order_status(order, Order.Status.CANCELLED, actor="system")
        except OrderError:
            pass   # already cancelled or in a final state — skip
        count += 1
    return count
