"""
Order-system models for the Ryst shop.
Imported by shop/models.py so they participate in the same app label.
"""
import uuid

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


# ---------------------------------------------------------------------------
# 1. StoreSettings  (singleton)
# ---------------------------------------------------------------------------

class StoreSettings(models.Model):
    """
    One-row singleton that stores shop-wide configuration.
    Use StoreSettings.get() everywhere instead of .objects.first().
    """
    free_shipping_threshold = models.PositiveBigIntegerField(default=5_000_000)
    standard_fee = models.PositiveBigIntegerField(default=0)
    express_fee = models.PositiveBigIntegerField(default=500_000)
    pending_order_minutes = models.PositiveIntegerField(default=30)

    class Meta:
        verbose_name = "Store Settings"
        verbose_name_plural = "Store Settings"

    def __str__(self):
        return "Store Settings"

    @classmethod
    def get(cls):
        """Return the singleton row, creating it with defaults if absent."""
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def save(self, *args, **kwargs):
        """Enforce singleton: always use pk=1."""
        self.pk = 1
        super().save(*args, **kwargs)


# ---------------------------------------------------------------------------
# 2. Coupon
# ---------------------------------------------------------------------------

class Coupon(models.Model):
    code = models.CharField(max_length=50, unique=True)
    percent = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(100)]
    )
    is_active = models.BooleanField(default=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    usage_limit = models.PositiveIntegerField(null=True, blank=True)
    used_count = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.code} ({self.percent}%)"

    def save(self, *args, **kwargs):
        self.code = self.code.upper()
        super().save(*args, **kwargs)


# ---------------------------------------------------------------------------
# 3. Customer
# ---------------------------------------------------------------------------

class Customer(models.Model):
    """
    Customer record identified by phone number.
    Optionally attached to a Django auth User for token-based authentication.
    """
    user = models.OneToOneField(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="customer_profile",
    )
    phone = models.CharField(max_length=15, unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.phone})"

    def save(self, *args, **kwargs):
        """Normalize phone to digits only, keeping the leading zero."""
        digits = "".join(c for c in (self.phone or "") if c.isdigit())
        if digits and not digits.startswith("0"):
            digits = "0" + digits
        self.phone = digits
        super().save(*args, **kwargs)


# ---------------------------------------------------------------------------
# 3.5. OTPCode
# ---------------------------------------------------------------------------

class OTPCode(models.Model):
    """
    Stores 5-digit verification codes sent to customers via SMS.
    Valid for a short duration (typically 2 minutes).
    """
    phone = models.CharField(max_length=15, db_index=True)
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["phone", "is_used", "expires_at"]),
        ]

    def __str__(self):
        return f"OTP for {self.phone}: {self.code}"

    @property
    def is_valid(self):
        from django.utils import timezone
        return not self.is_used and timezone.now() <= self.expires_at


# ---------------------------------------------------------------------------
# 4. Order
# ---------------------------------------------------------------------------

class Order(models.Model):
    class DeliveryMethod(models.TextChoices):
        STANDARD = "standard", "Standard"
        EXPRESS = "express", "Express"

    class Status(models.TextChoices):
        NEW = "new", "New"
        PROCESSING = "processing", "Processing"
        SHIPPED = "shipped", "Shipped"
        DELIVERED = "delivered", "Delivered"
        CANCELLED = "cancelled", "Cancelled"

    class PaymentStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        REFUNDED = "refunded", "Refunded"

    # Unique human-readable number (1000 + pk), assigned on first save
    number = models.PositiveIntegerField(unique=True, null=True, blank=True)

    customer = models.ForeignKey(
        Customer, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="orders"
    )

    # Snapshot of customer details at purchase time
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=15)
    email = models.EmailField(blank=True)
    country = models.CharField(max_length=100, default="Iran")
    city = models.CharField(max_length=100)
    address = models.TextField()
    postal_code = models.CharField(max_length=20, blank=True)

    # Delivery & pricing
    delivery_method = models.CharField(
        max_length=10, choices=DeliveryMethod.choices,
        default=DeliveryMethod.STANDARD
    )
    subtotal = models.PositiveBigIntegerField(default=0)
    shipping_fee = models.PositiveBigIntegerField(default=0)
    discount_total = models.PositiveBigIntegerField(default=0)
    total = models.PositiveBigIntegerField(default=0)
    coupon_code = models.CharField(max_length=50, blank=True)

    # Status
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.NEW
    )
    payment_status = models.CharField(
        max_length=20, choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING
    )
    payment_method = models.CharField(max_length=50, default="online")
    payment_authority = models.CharField(max_length=100, blank=True, default="", db_index=True)
    transaction_id = models.CharField(max_length=100, blank=True, default="")
    shipping_tracking_code = models.CharField(max_length=100, blank=True, default="")
    note = models.TextField(blank=True)

    # Guards & identifiers
    stock_released = models.BooleanField(default=False)
    public_token = models.UUIDField(unique=True, default=uuid.uuid4, editable=False)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["payment_status"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["phone"]),
        ]

    def __str__(self):
        return f"Order #{self.number or self.pk}"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new and self.number is None:
            # Assign human-readable number after pk is known
            Order.objects.filter(pk=self.pk).update(number=1000 + self.pk)
            self.number = 1000 + self.pk


# ---------------------------------------------------------------------------
# 5. OrderItem
# ---------------------------------------------------------------------------

class OrderItem(models.Model):
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name="items"
    )
    product = models.ForeignKey(
        "shop.Product", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="order_items"
    )
    # Snapshots so the line survives product changes/deletions
    product_name = models.CharField(max_length=200)
    product_slug = models.SlugField(max_length=200)
    size_us = models.DecimalField(max_digits=3, decimal_places=1)
    size_eu = models.DecimalField(max_digits=3, decimal_places=1)
    unit_price = models.PositiveBigIntegerField()
    quantity = models.PositiveSmallIntegerField(default=1)
    line_total = models.PositiveBigIntegerField()

    def __str__(self):
        return f"{self.product_name} ×{self.quantity} (Order #{self.order.number or self.order_id})"


# ---------------------------------------------------------------------------
# 6. OrderStatusLog  (audit trail)
# ---------------------------------------------------------------------------

class OrderStatusLog(models.Model):
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name="logs"
    )
    actor = models.CharField(max_length=150)          # "system", "customer", or admin username
    field = models.CharField(max_length=30)           # "status" or "payment_status"
    old_value = models.CharField(max_length=50, blank=True)
    new_value = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return (
            f"Order #{self.order.number or self.order_id} | "
            f"{self.field}: {self.old_value} → {self.new_value} by {self.actor}"
        )
