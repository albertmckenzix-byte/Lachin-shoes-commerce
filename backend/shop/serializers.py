from decimal import Decimal

from django.contrib.auth.models import User
from django.db import transaction
from django.utils.text import slugify
from rest_framework import serializers

from .models import (
    Coupon,
    Customer,
    Order,
    OrderItem,
    OrderStatusLog,
    Product,
    ProductImage,
    ProductSize,
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
    createdAt = serializers.DateTimeField(source="created_at")
    updatedAt = serializers.DateTimeField(source="updated_at")

    class Meta:
        model = Order
        fields = [
            "id", "number", "orderNumber", "customer", "items", "logs",
            "delivery_method", "deliveryMethod", "subtotal",
            "shipping_fee", "shippingFee", "discount_total", "discountTotal",
            "total", "coupon_code", "status", "payment_status", "paymentStatus",
            "payment_method", "note", "stock_released", "createdAt", "updatedAt"
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
