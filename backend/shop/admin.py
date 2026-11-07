from django.contrib import admin

from .models import Product, ProductImage, ProductSize


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
