from django.db import models

# Order-system models live in a separate file for readability.
# Importing here makes them part of the 'shop' app label.
from shop.orders_models import (  # noqa: F401  – re-exported for migrations
    StoreSettings,
    Coupon,
    Customer,
    Order,
    OrderItem,
    OrderStatusLog,
)


class Product(models.Model):
    BRAND_CHOICES = [
        ('adidas', 'adidas'),
        ('nike', 'nike'),
        ('jordan', 'jordan'),
        ('reebok', 'reebok'),
        ('new-balance', 'new-balance'),
        ('converse', 'converse'),
    ]
    BADGE_CHOICES = [
        ('', 'None'),
        ('SALE', 'SALE'),
        ('BEST_SELLER', 'BEST_SELLER'),
    ]

    slug = models.SlugField(max_length=200, unique=True)
    name = models.CharField(max_length=200)
    maker_brand = models.CharField(max_length=50, choices=BRAND_CHOICES)
    genders = models.JSONField(default=list)
    categories = models.JSONField(default=list)
    tags = models.JSONField(default=list)
    price = models.PositiveIntegerField()
    old_price = models.PositiveIntegerField(null=True, blank=True)
    badge = models.CharField(max_length=20, choices=BADGE_CHOICES, blank=True, default='')
    best_seller = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    description_fa = models.TextField(blank=True)
    description_en = models.TextField(blank=True)
    rating = models.DecimalField(max_digits=3, decimal_places=1, default=4.5)
    review_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    @property
    def total_stock(self):
        return sum(s.stock for s in self.sizes.filter(is_active=True))


class ProductImage(models.Model):
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name='images'
    )
    image = models.ImageField(upload_to='products/')
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['position']

    def __str__(self):
        return f'{self.product.slug} image #{self.position}'


class ProductSize(models.Model):
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name='sizes'
    )
    us = models.DecimalField(max_digits=3, decimal_places=1)
    eu = models.DecimalField(max_digits=3, decimal_places=1)
    cm = models.DecimalField(max_digits=3, decimal_places=1)
    stock = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = [('product', 'us')]
        ordering = ['cm']

    def __str__(self):
        return f'{self.product.slug} US {self.us}'

    @property
    def available(self):
        return self.is_active and self.stock > 0
