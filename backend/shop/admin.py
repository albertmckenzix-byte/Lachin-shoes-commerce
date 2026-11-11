from django.contrib import admin

from .models import (
    Product, ProductImage, ProductSize,
    StoreSettings, Coupon, Customer, CustomerAddress,
    Order, OrderItem, OrderStatusLog,
)


# ---------------------------------------------------------------------------
# Existing product admin (unchanged)
# ---------------------------------------------------------------------------

class ProductSizeInline(admin.TabularInline):
    model = ProductSize
    extra = 1


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'slug', 'maker_brand', 'price', 'old_price',
        'badge', 'best_seller', 'is_active', 'created_at',
    )
    search_fields = ('name', 'slug', 'maker_brand')
    list_filter = ('maker_brand', 'badge', 'best_seller', 'is_active')
    prepopulated_fields = {'slug': ('name',)}
    inlines = [ProductSizeInline, ProductImageInline]


@admin.register(ProductSize)
class ProductSizeAdmin(admin.ModelAdmin):
    list_display = ('product', 'us', 'eu', 'cm', 'stock', 'is_active')
    search_fields = ('product__name', 'product__slug')
    list_filter = ('is_active',)


@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ('product', 'image', 'position')
    search_fields = ('product__name', 'product__slug')


# ---------------------------------------------------------------------------
# StoreSettings  (singleton — no add/delete buttons needed)
# ---------------------------------------------------------------------------

@admin.register(StoreSettings)
class StoreSettingsAdmin(admin.ModelAdmin):
    list_display = (
        'free_shipping_threshold', 'standard_fee',
        'express_fee', 'pending_order_minutes',
    )

    def has_add_permission(self, request):
        return not StoreSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


# ---------------------------------------------------------------------------
# Coupon
# ---------------------------------------------------------------------------

@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ('code', 'percent', 'is_active', 'expires_at', 'usage_limit', 'used_count')
    list_filter = ('is_active',)
    search_fields = ('code',)


# ---------------------------------------------------------------------------
# Customer & Saved Addresses
# ---------------------------------------------------------------------------

class CustomerAddressInline(admin.StackedInline):
    model = CustomerAddress
    extra = 0
    fields = (
        'title', 'recipient_name', 'recipient_phone',
        'province', 'city', 'address', 'building_number', 'unit',
        'postal_code', 'is_default'
    )


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ('phone', 'first_name', 'last_name', 'email', 'city', 'created_at')
    search_fields = ('phone', 'first_name', 'last_name', 'email')
    list_filter = ('city',)
    readonly_fields = ('created_at',)
    inlines = [CustomerAddressInline]


@admin.register(CustomerAddress)
class CustomerAddressAdmin(admin.ModelAdmin):
    list_display = (
        'title', 'customer', 'recipient_name', 'recipient_phone',
        'province', 'city', 'is_default', 'created_at'
    )
    search_fields = ('title', 'customer__phone', 'recipient_name', 'recipient_phone', 'city', 'address')
    list_filter = ('province', 'is_default', 'created_at')


# ---------------------------------------------------------------------------
# Order  (with read-only inlines for items and log)
# ---------------------------------------------------------------------------

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = (
        'product', 'product_name', 'product_slug',
        'size_us', 'size_eu', 'unit_price', 'quantity', 'line_total',
    )
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


class OrderStatusLogInline(admin.TabularInline):
    model = OrderStatusLog
    extra = 0
    readonly_fields = ('actor', 'field', 'old_value', 'new_value', 'created_at')
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        'number', 'first_name', 'last_name', 'phone',
        'status', 'payment_status', 'total', 'created_at',
    )
    list_filter = ('status', 'payment_status', 'delivery_method')
    search_fields = ('number', 'first_name', 'last_name', 'phone', 'coupon_code')
    readonly_fields = (
        'number', 'public_token', 'created_at', 'updated_at',
        'paid_at', 'expires_at', 'stock_released',
    )
    inlines = [OrderItemInline, OrderStatusLogInline]
    date_hierarchy = 'created_at'


# ---------------------------------------------------------------------------
# OrderItem  (standalone — read-only)
# ---------------------------------------------------------------------------

@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = (
        'order', 'product_name', 'product_slug',
        'size_us', 'size_eu', 'unit_price', 'quantity', 'line_total',
    )
    search_fields = ('product_name', 'product_slug', 'order__number')
    readonly_fields = (
        'order', 'product', 'product_name', 'product_slug',
        'size_us', 'size_eu', 'unit_price', 'quantity', 'line_total',
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


# ---------------------------------------------------------------------------
# OrderStatusLog  (standalone — read-only)
# ---------------------------------------------------------------------------

@admin.register(OrderStatusLog)
class OrderStatusLogAdmin(admin.ModelAdmin):
    list_display = ('order', 'actor', 'field', 'old_value', 'new_value', 'created_at')
    list_filter = ('field', 'actor')
    search_fields = ('order__number', 'actor', 'old_value', 'new_value')
    readonly_fields = ('order', 'actor', 'field', 'old_value', 'new_value', 'created_at')

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
