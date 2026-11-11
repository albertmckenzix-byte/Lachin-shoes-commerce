from decimal import Decimal
import re

from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import serializers

from .models import (
    Coupon,
    Customer,
    CustomerAddress,
    Order,
    OrderItem,
    OrderStatusLog,
    Product,
    ProductImage,
    ProductReview,
    ProductSize,
    StoreSettings,
)
from .sizes import SIZE_TABLE_SET


class PublicProductSerializer(serializers.ModelSerializer):
    makerBrand = serializers.CharField(source='maker_brand')
    oldPrice = serializers.IntegerField(source='old_price', allow_null=True)
    badge = serializers.SerializerMethodField()
    bestSeller = serializers.BooleanField(source='best_seller')
    descriptionFa = serializers.CharField(source='description_fa')
    descriptionEn = serializers.CharField(source='description_en')
    rating = serializers.SerializerMethodField()
    reviewCount = serializers.IntegerField(source='review_count')
    images = serializers.SerializerMethodField()
    sizes = serializers.SerializerMethodField()
    availableSizes = serializers.SerializerMethodField()
    totalStock = serializers.IntegerField(source='total_stock', read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'slug', 'name', 'makerBrand', 'genders', 'categories',
            'tags', 'price', 'oldPrice', 'badge', 'bestSeller',
            'descriptionFa', 'descriptionEn', 'rating', 'reviewCount',
            'images', 'sizes', 'availableSizes', 'totalStock',
        ]

    def get_badge(self, obj):
        if obj.badge == 'BEST_SELLER':
            return 'BEST SELLER'
        return obj.badge or None

    def get_rating(self, obj):
        return float(obj.rating)

    def get_images(self, obj):
        request = self.context.get('request')
        urls = []
        for image in obj.images.all():
            url = image.image.url
            if request is not None:
                url = request.build_absolute_uri(url)
            urls.append(url)
        return urls

    def get_sizes(self, obj):
        return [
            {
                'us': float(size.us),
                'eu': float(size.eu),
                'cm': float(size.cm),
                'stock': size.stock,
                'available': size.available,
            }
            for size in obj.sizes.all()
        ]

    def get_availableSizes(self, obj):
        return [float(size.us) for size in obj.sizes.all() if size.available]


class AdminLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


class AdminMeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'is_staff']


class AdminProductSizeSerializer(serializers.Serializer):
    us = serializers.DecimalField(
        max_digits=3, decimal_places=1, coerce_to_string=False
    )
    eu = serializers.DecimalField(
        max_digits=3, decimal_places=1, coerce_to_string=False
    )
    cm = serializers.DecimalField(
        max_digits=3, decimal_places=1, coerce_to_string=False
    )
    stock = serializers.IntegerField(min_value=0, max_value=10000)
    is_active = serializers.BooleanField(required=False, default=True)


class AdminProductImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ['id', 'url', 'position']

    def get_url(self, obj):
        request = self.context.get('request')
        url = obj.image.url
        if request is not None:
            url = request.build_absolute_uri(url)
        return url


class AdminProductListSerializer(serializers.ModelSerializer):
    total_stock = serializers.SerializerMethodField()
    size_count = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    images = AdminProductImageSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'slug', 'name', 'maker_brand', 'price', 'old_price',
            'badge', 'best_seller', 'is_active', 'rating', 'created_at',
            'total_stock', 'size_count', 'status', 'images',
        ]

    def _stock(self, obj):
        return getattr(obj, '_total_stock', None) or obj.total_stock

    def get_total_stock(self, obj):
        return int(self._stock(obj))

    def get_size_count(self, obj):
        return getattr(obj, '_size_count', None) or obj.sizes.count()

    def get_status(self, obj):
        if not obj.is_active:
            return 'inactive'
        stock = self._stock(obj)
        if stock == 0:
            return 'out'
        if stock < 25:
            return 'low'
        return 'active'


class AdminProductSerializer(serializers.ModelSerializer):
    slug = serializers.SlugField(
        max_length=200, required=False, allow_blank=True
    )
    sizes = AdminProductSizeSerializer(many=True, required=False)
    images = AdminProductImageSerializer(many=True, read_only=True)
    total_stock = serializers.IntegerField(read_only=True)
    size_count = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'slug', 'name', 'maker_brand', 'genders', 'categories',
            'tags', 'price', 'old_price', 'badge', 'best_seller',
            'is_active', 'description_fa', 'description_en', 'rating',
            'review_count', 'created_at', 'updated_at', 'sizes', 'images',
            'total_stock', 'size_count', 'status',
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'images',
            'total_stock', 'size_count', 'status',
        ]

    def get_size_count(self, obj):
        return len(obj.sizes.all())

    def get_status(self, obj):
        if not obj.is_active:
            return 'inactive'
        stock = obj.total_stock
        if stock == 0:
            return 'out'
        if stock < 25:
            return 'low'
        return 'active'

    def validate_slug(self, value):
        qs = Product.objects.all()
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if value and qs.filter(slug=value).exists():
            raise serializers.ValidationError('این اسلاگ قبلاً استفاده شده است.')
        return value

    def validate(self, attrs):
        price = attrs.get('price', getattr(self.instance, 'price', None))
        old_price = attrs.get(
            'old_price', getattr(self.instance, 'old_price', None)
        )
        if price is not None and price <= 0:
            raise serializers.ValidationError(
                {'price': 'قیمت باید بزرگتر از صفر باشد.'}
            )
        if old_price is not None and price is not None and old_price <= price:
            raise serializers.ValidationError(
                {'old_price': 'قیمت قبلی باید بزرگتر از قیمت فعلی باشد.'}
            )

        name = attrs.get('name', getattr(self.instance, 'name', None))
        slug = attrs.get('slug')
        if not slug and name:
            slug = slugify(name)
        if slug:
            existing = Product.objects.filter(slug=slug)
            if self.instance:
                existing = existing.exclude(pk=self.instance.pk)
            if existing.exists():
                raise serializers.ValidationError(
                    {'slug': 'این اسلاگ قبلاً استفاده شده است.'}
                )
            attrs['slug'] = slug

        if 'sizes' in attrs:
            seen = set()
            for size in attrs['sizes']:
                us = Decimal(str(size['us']))
                if us in seen:
                    raise serializers.ValidationError(
                        {'sizes': f'سایز US {us} تکراری است.'}
                    )
                seen.add(us)
                key = (
                    Decimal(str(size['us'])),
                    Decimal(str(size['eu'])),
                    Decimal(str(size['cm'])),
                )
                if key not in SIZE_TABLE_SET:
                    raise serializers.ValidationError(
                        {'sizes': (
                            f'سایز US {size["us"]} / EU {size["eu"]} / '
                            f'cm {size["cm"]} در جدول سایزها وجود ندارد.'
                        )}
                    )
        return attrs

    def _replace_sizes(self, product, sizes_data):
        with transaction.atomic():
            existing = {s.us: s for s in product.sizes.all()}
            seen = set()
            for data in sizes_data:
                us = Decimal(str(data['us']))
                seen.add(us)
                defaults = {
                    'eu': Decimal(str(data['eu'])),
                    'cm': Decimal(str(data['cm'])),
                    'stock': data['stock'],
                    'is_active': data.get('is_active', True),
                }
                obj = existing.get(us)
                if obj is None:
                    ProductSize.objects.create(
                        product=product, us=us, **defaults
                    )
                else:
                    for field, value in defaults.items():
                        setattr(obj, field, value)
                    obj.save()
            for us, obj in existing.items():
                if us not in seen:
                    obj.delete()

    def create(self, validated_data):
        sizes_data = validated_data.pop('sizes', [])
        product = Product.objects.create(**validated_data)
        if sizes_data:
            self._replace_sizes(product, sizes_data)
        return product

    def update(self, instance, validated_data):
        sizes_data = validated_data.pop('sizes', None)
        product = super().update(instance, validated_data)
        if sizes_data is not None:
            self._replace_sizes(product, sizes_data)
        return product

# =============================================================================
# Order serializers  (appended to serializers.py)
# =============================================================================

class OrderItemInputSerializer(serializers.Serializer):
    slug     = serializers.SlugField()
    size_us  = serializers.DecimalField(max_digits=3, decimal_places=1, coerce_to_string=False)
    quantity = serializers.IntegerField(min_value=1, max_value=10)


class CreateOrderSerializer(serializers.Serializer):
    first_name      = serializers.CharField(max_length=100)
    last_name       = serializers.CharField(max_length=100)
    phone           = serializers.CharField(max_length=20)
    email           = serializers.EmailField(required=False, allow_blank=True, default="")
    country         = serializers.CharField(max_length=100, required=False, default="Iran")
    province        = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    city            = serializers.CharField(max_length=100)
    address         = serializers.CharField()
    postal_code     = serializers.CharField(max_length=20, required=False, allow_blank=True, default="")
    delivery_method = serializers.ChoiceField(choices=["standard", "express"], default="standard")
    coupon_code     = serializers.CharField(max_length=50, required=False, allow_blank=True, default="")
    note            = serializers.CharField(required=False, allow_blank=True, default="")
    items           = OrderItemInputSerializer(many=True)

    def validate_items(self, value):
        if len(value) == 0:
            raise serializers.ValidationError("حداقل یک کالا الزامی است.")
        if len(value) > 10:
            raise serializers.ValidationError("حداکثر ۱۰ قلم در هر سفارش مجاز است.")
        return value


class OrderPublicSerializer(serializers.ModelSerializer):
    """Minimal response after a successful order creation."""
    shippingFee   = serializers.IntegerField(source="shipping_fee")
    discountTotal = serializers.IntegerField(source="discount_total")
    paymentStatus = serializers.CharField(source="payment_status")
    token         = serializers.UUIDField(source="public_token")

    class Meta:
        model  = Order
        fields = ["number", "total", "subtotal", "shippingFee", "discountTotal",
                  "status", "paymentStatus", "token"]


class OrderItemPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model  = OrderItem
        fields = ["product_name", "product_slug", "size_us", "size_eu", "quantity", "line_total"]


class OrderDetailPublicSerializer(serializers.ModelSerializer):
    """Safe public view — no address / phone."""
    paymentStatus  = serializers.CharField(source="payment_status")
    deliveryMethod = serializers.CharField(source="delivery_method")
    shippingFee    = serializers.IntegerField(source="shipping_fee")
    discountTotal  = serializers.IntegerField(source="discount_total")
    transactionId  = serializers.CharField(source="transaction_id")
    shippingTrackingCode = serializers.CharField(source="shipping_tracking_code")
    createdAt      = serializers.DateTimeField(source="created_at")
    items          = OrderItemPublicSerializer(many=True, read_only=True)

    class Meta:
        model  = Order
        fields = [
            "number", "status", "paymentStatus", "deliveryMethod",
            "subtotal", "shippingFee", "discountTotal", "total",
            "transactionId", "shippingTrackingCode",
            "createdAt", "items"
        ]


class CouponCheckSerializer(serializers.Serializer):
    code     = serializers.CharField(max_length=50)
    subtotal = serializers.IntegerField(min_value=0)


class AdminOrderStatusLogSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at")

    class Meta:
        model = OrderStatusLog
        fields = ["id", "actor", "field", "old_value", "new_value", "createdAt"]


class AdminOrderItemSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="product_name")
    productId = serializers.CharField(source="product_slug")
    price = serializers.IntegerField(source="unit_price")
    qty = serializers.IntegerField(source="quantity")
    lineTotal = serializers.IntegerField(source="line_total")
    size = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            "id", "name", "productId", "size_us", "size_eu", "size",
            "price", "qty", "lineTotal"
        ]

    def get_size(self, obj):
        return f"US {obj.size_us}"


class AdminOrderSerializer(serializers.ModelSerializer):
    orderNumber = serializers.SerializerMethodField()
    customer = serializers.SerializerMethodField()
    items = AdminOrderItemSerializer(many=True, read_only=True)
    logs = AdminOrderStatusLogSerializer(many=True, read_only=True)
    paymentStatus = serializers.CharField(source="payment_status")
    deliveryMethod = serializers.CharField(source="delivery_method")
    shippingFee = serializers.IntegerField(source="shipping_fee")
    discountTotal = serializers.IntegerField(source="discount_total")
    shippingTrackingCode = serializers.CharField(source="shipping_tracking_code", required=False, allow_blank=True)
    createdAt = serializers.DateTimeField(source="created_at")
    updatedAt = serializers.DateTimeField(source="updated_at")

    class Meta:
        model = Order
        fields = [
            "id", "number", "orderNumber", "customer", "items", "logs",
            "delivery_method", "deliveryMethod", "subtotal",
            "shipping_fee", "shippingFee", "discount_total", "discountTotal",
            "total", "coupon_code", "status", "payment_status", "paymentStatus",
            "payment_method", "shipping_tracking_code", "shippingTrackingCode", "note", "stock_released", "createdAt", "updatedAt"
        ]

    def get_orderNumber(self, obj):
        return f"#{obj.number or obj.pk}"

    def get_customer(self, obj):
        return {
            "id": obj.customer_id,
            "name": f"{obj.first_name} {obj.last_name}".strip(),
            "first_name": obj.first_name,
            "last_name": obj.last_name,
            "phone": obj.phone,
            "email": obj.email,
            "country": obj.country,
            "city": obj.city,
            "address": obj.address,
            "postal_code": obj.postal_code,
        }


class AdminCustomerSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    ordersCount = serializers.SerializerMethodField()
    totalSpent = serializers.SerializerMethodField()
    lastOrderDate = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source="created_at")
    address = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = [
            "id", "name", "first_name", "last_name", "phone", "email",
            "city", "address", "ordersCount", "totalSpent", "lastOrderDate",
            "createdAt"
        ]

    def get_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()

    def get_ordersCount(self, obj):
        return getattr(obj, "orders_count", obj.orders.count())

    def get_totalSpent(self, obj):
        if hasattr(obj, "total_spent"):
            return obj.total_spent or 0
        from django.db.models import Sum
        total = obj.orders.filter(payment_status="paid").aggregate(s=Sum("total"))["s"]
        return total or 0

    def get_lastOrderDate(self, obj):
        if hasattr(obj, "last_order_date"):
            return obj.last_order_date
        last = obj.orders.order_by("-created_at").first()
        return last.created_at if last else None

    def get_address(self, obj):
        last = obj.orders.order_by("-created_at").first()
        return last.address if last else obj.city


class AdminStoreSettingsSerializer(serializers.ModelSerializer):
    freeShippingThreshold = serializers.IntegerField(
        source="free_shipping_threshold",
        required=False,
        min_value=0,
        error_messages={
            "invalid": "حداقل خرید برای ارسال رایگان باید یک عدد صحیح باشد.",
            "min_value": "حداقل خرید برای ارسال رایگان نمی‌تواند منفی باشد.",
        },
    )
    standardFee = serializers.IntegerField(
        source="standard_fee",
        required=False,
        min_value=0,
        error_messages={
            "invalid": "هزینه ارسال عادی باید یک عدد صحیح باشد.",
            "min_value": "هزینه ارسال عادی نمی‌تواند منفی باشد.",
        },
    )
    expressFee = serializers.IntegerField(
        source="express_fee",
        required=False,
        min_value=0,
        error_messages={
            "invalid": "هزینه ارسال اکسپرس باید یک عدد صحیح باشد.",
            "min_value": "هزینه ارسال اکسپرس نمی‌تواند منفی باشد.",
        },
    )
    pendingOrderMinutes = serializers.IntegerField(
        source="pending_order_minutes",
        required=False,
        min_value=5,
        max_value=1440,
        error_messages={
            "invalid": "مهلت پرداخت سفارش باید یک عدد صحیح باشد.",
            "min_value": "مهلت پرداخت سفارش باید حداقل ۵ دقیقه باشد.",
            "max_value": "مهلت پرداخت سفارش نمی‌تواند بیشتر از ۱۴۴۰ دقیقه (۲۴ ساعت) باشد.",
        },
    )

    class Meta:
        model = StoreSettings
        fields = [
            "freeShippingThreshold",
            "standardFee",
            "expressFee",
            "pendingOrderMinutes",
        ]

    def to_internal_value(self, data):
        mapping = {
            "free_shipping_threshold": "freeShippingThreshold",
            "standard_fee": "standardFee",
            "express_fee": "expressFee",
            "pending_order_minutes": "pendingOrderMinutes",
        }
        normalized = dict(data)
        for snake, camel in mapping.items():
            if snake in normalized and camel not in normalized:
                normalized[camel] = normalized[snake]
        for key in ["freeShippingThreshold", "standardFee", "expressFee", "pendingOrderMinutes"]:
            if key in normalized:
                v = normalized[key]
                if isinstance(v, float) and not v.is_integer():
                    raise serializers.ValidationError({key: "مقدار باید یک عدد صحیح باشد."})
        return super().to_internal_value(normalized)


class AdminCouponSerializer(serializers.ModelSerializer):
    isActive = serializers.BooleanField(source="is_active")
    expiresAt = serializers.DateTimeField(source="expires_at", allow_null=True)
    usageLimit = serializers.IntegerField(source="usage_limit", allow_null=True)
    usedCount = serializers.IntegerField(source="used_count", read_only=True)
    status = serializers.SerializerMethodField()

    class Meta:
        model = Coupon
        fields = [
            "id",
            "code",
            "percent",
            "isActive",
            "expiresAt",
            "usageLimit",
            "usedCount",
            "status",
        ]

    def get_status(self, obj):
        if not obj.is_active:
            return "inactive"
        now = timezone.now()
        if obj.expires_at and obj.expires_at < now:
            return "expired"
        if obj.usage_limit is not None and obj.used_count >= obj.usage_limit:
            return "exhausted"
        return "active"


class AdminCouponCreateUpdateSerializer(serializers.ModelSerializer):
    code = serializers.CharField(
        max_length=32,
        min_length=3,
        required=False,
        error_messages={
            "max_length": "طول کد تخفیف حداکثر ۳۲ کاراکتر است.",
            "min_length": "طول کد تخفیف حداقل ۳ کاراکتر است.",
            "blank": "کد تخفیف الزامی است.",
        },
    )
    percent = serializers.IntegerField(
        required=False,
        min_value=1,
        max_value=100,
        error_messages={
            "invalid": "درصد تخفیف باید یک عدد صحیح باشد.",
            "min_value": "درصد تخفیف باید عددی بین ۱ تا ۱۰۰ باشد.",
            "max_value": "درصد تخفیف باید عددی بین ۱ تا ۱۰۰ باشد.",
        },
    )
    isActive = serializers.BooleanField(source="is_active", required=False)
    expiresAt = serializers.DateTimeField(source="expires_at", required=False, allow_null=True)
    usageLimit = serializers.IntegerField(source="usage_limit", required=False, allow_null=True, min_value=1)

    class Meta:
        model = Coupon
        fields = ["code", "percent", "isActive", "expiresAt", "usageLimit"]

    def to_internal_value(self, data):
        mapping = {
            "is_active": "isActive",
            "expires_at": "expiresAt",
            "usage_limit": "usageLimit",
        }
        normalized = dict(data)
        for snake, camel in mapping.items():
            if snake in normalized and camel not in normalized:
                normalized[camel] = normalized[snake]
        if "percent" in normalized:
            v = normalized["percent"]
            if isinstance(v, float) and not v.is_integer():
                raise serializers.ValidationError({"percent": "درصد تخفیف باید یک عدد صحیح باشد."})
        return super().to_internal_value(normalized)

    def validate_code(self, value):
        code = value.strip().upper()
        if not (3 <= len(code) <= 32):
            raise serializers.ValidationError("طول کد تخفیف باید بین ۳ تا ۳۲ کاراکتر باشد.")
        if not re.match(r"^[A-Z0-9_-]+$", code):
            raise serializers.ValidationError("کد تخفیف فقط می‌تواند شامل حروف انگلیسی، اعداد، خط تیره (-) و زیرخط (_) باشد.")

        qs = Coupon.objects.filter(code__iexact=code)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("این کد تخفیف قبلاً ثبت شده است و تکراری است.")

        if self.instance and self.instance.used_count > 0 and self.instance.code.upper() != code:
            raise serializers.ValidationError("امکان تغییر کد تخفیفی که حداقل یک‌بار استفاده شده است وجود ندارد.")

        return code

    def validate_expiresAt(self, value):
        if value is not None:
            if self.instance is None and value < timezone.now():
                raise serializers.ValidationError("تاریخ انقضا نمی‌تواند در گذشته باشد.")
        return value

    def validate_usageLimit(self, value):
        if value is not None:
            if value < 1:
                raise serializers.ValidationError("سقف تعداد استفاده باید حداقل ۱ باشد.")
            if self.instance and value < self.instance.used_count:
                raise serializers.ValidationError(
                    f"سقف تعداد استفاده نمی‌تواند کمتر از تعداد استفاده‌شده ({self.instance.used_count}) باشد."
                )
        return value

    def validate(self, attrs):
        if self.instance is None:
            if "code" not in attrs:
                raise serializers.ValidationError({"code": "کد تخفیف الزامی است."})
            if "percent" not in attrs:
                raise serializers.ValidationError({"percent": "درصد تخفیف الزامی است."})
        return attrs


# =============================================================================
# Customer Auth Serializers
# =============================================================================

class SendOtpSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=20)

    def validate_phone(self, value):
        from shop.services.orders import _normalize_phone
        try:
            return _normalize_phone(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc))


class VerifyOtpSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=20)
    code = serializers.CharField(max_length=10)

    def validate_phone(self, value):
        from shop.services.orders import _normalize_phone
        try:
            return _normalize_phone(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc))

    def validate_code(self, value):
        clean = "".join(c for c in str(value) if c.isdigit())
        if not clean:
            raise serializers.ValidationError("کد تأیید باید عددی باشد.")
        return clean


class CustomerRegisterSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=20)
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    password = serializers.CharField(max_length=128, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)

    def validate_phone(self, value):
        from shop.services.orders import _normalize_phone
        try:
            return _normalize_phone(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc))

    def validate_first_name(self, value):
        val = value.strip()
        if not val:
            raise serializers.ValidationError("نام الزامی است.")
        return val

    def validate_last_name(self, value):
        val = value.strip()
        if not val:
            raise serializers.ValidationError("نام خانوادگی الزامی است.")
        return val


class CustomerPasswordLoginSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=20)
    password = serializers.CharField(max_length=128)

    def validate_phone(self, value):
        from shop.services.orders import _normalize_phone
        try:
            return _normalize_phone(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc))


class CustomerProfileSerializer(serializers.ModelSerializer):
    firstName = serializers.CharField(source="first_name")
    lastName = serializers.CharField(source="last_name")

    class Meta:
        model = Customer
        fields = [
            "id",
            "phone",
            "firstName",
            "lastName",
            "email",
            "city",
            "created_at",
        ]
        read_only_fields = ["id", "phone", "created_at"]


class CustomerAddressSerializer(serializers.ModelSerializer):
    title = serializers.CharField(max_length=50, required=False, default="خانه")
    recipient_name = serializers.CharField(max_length=150, required=True)
    recipient_phone = serializers.CharField(max_length=15, required=True)
    province = serializers.CharField(max_length=100, required=True)
    city = serializers.CharField(max_length=100, required=True)
    address = serializers.CharField(required=True)
    building_number = serializers.CharField(max_length=20, required=False, allow_blank=True, default="")
    unit = serializers.CharField(max_length=20, required=False, allow_blank=True, default="")
    postal_code = serializers.CharField(max_length=10, required=False, allow_blank=True, default="")
    is_default = serializers.BooleanField(required=False, default=False)

    class Meta:
        model = CustomerAddress
        fields = [
            "id",
            "title",
            "recipient_name",
            "recipient_phone",
            "province",
            "city",
            "address",
            "building_number",
            "unit",
            "postal_code",
            "is_default",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, "copy") else dict(data)
        mappings = {
            "recipientName": "recipient_name",
            "recipientPhone": "recipient_phone",
            "buildingNumber": "building_number",
            "postalCode": "postal_code",
            "isDefault": "is_default",
        }
        for camel, snake in mappings.items():
            if camel in data and snake not in data:
                data[snake] = data[camel]
        return super().to_internal_value(data)

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret["recipientName"] = instance.recipient_name
        ret["recipientPhone"] = instance.recipient_phone
        ret["buildingNumber"] = instance.building_number
        ret["postalCode"] = instance.postal_code
        ret["isDefault"] = instance.is_default
        return ret

    def validate_recipient_phone(self, value):
        digits = "".join(c for c in str(value) if c.isdigit())
        if digits.startswith("98") and len(digits) == 12:
            digits = "0" + digits[2:]
        elif digits and not digits.startswith("0"):
            digits = "0" + digits
        if not re.fullmatch(r"09\d{9}", digits):
            raise serializers.ValidationError("شماره موبایل تحویل‌گیرنده معتبر نیست (مثال: ۰۹۱۲۱۲۳۴۵۶۷).")
        return digits

    def validate_postal_code(self, value):
        if not value:
            return ""
        digits = "".join(c for c in str(value) if c.isdigit())
        if len(digits) != 10:
            raise serializers.ValidationError("کد پستی باید ۱۰ رقم باشد.")
        return digits



# =============================================================================
# Product Review Serializers
# =============================================================================

class ProductReviewSerializer(serializers.ModelSerializer):
    isVerifiedBuyer = serializers.BooleanField(source="is_verified_buyer")
    adminReply = serializers.CharField(source="admin_reply", allow_blank=True)
    createdAt = serializers.DateTimeField(source="created_at")

    class Meta:
        model = ProductReview
        fields = [
            "id",
            "name",
            "rating",
            "title",
            "comment",
            "isVerifiedBuyer",
            "adminReply",
            "createdAt",
        ]


class CreateProductReviewSerializer(serializers.ModelSerializer):
    name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    title = serializers.CharField(max_length=150, required=False, allow_blank=True)
    comment = serializers.CharField(min_length=3)
    rating = serializers.IntegerField(min_value=1, max_value=5)

    class Meta:
        model = ProductReview
        fields = ["name", "title", "comment", "rating"]


class AdminProductReviewSerializer(serializers.ModelSerializer):
    productName = serializers.CharField(source="product.name", read_only=True)
    productSlug = serializers.CharField(source="product.slug", read_only=True)
    isVerifiedBuyer = serializers.BooleanField(source="is_verified_buyer", read_only=True)
    adminReply = serializers.CharField(source="admin_reply", allow_blank=True, required=False)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = ProductReview
        fields = [
            "id",
            "product",
            "productName",
            "productSlug",
            "name",
            "rating",
            "title",
            "comment",
            "isVerifiedBuyer",
            "status",
            "adminReply",
            "createdAt",
        ]
