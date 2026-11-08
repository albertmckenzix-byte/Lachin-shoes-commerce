from django.urls import path

from .views import (
    AdminLoginView,
    AdminLogoutView,
    AdminMeView,
    AdminProductDetailView,
    AdminProductImageDeleteView,
    AdminProductImageReorderView,
    AdminProductImageUploadView,
    AdminProductListCreateView,
    AdminSizeTableView,
    CouponCheckView,
    OrderCreateView,
    OrderDetailPublicView,
    ProductDetailView,
    ProductListView,
)

urlpatterns = [
    path('products/', ProductListView.as_view(), name='product-list'),
    path('products/<slug:slug>/', ProductDetailView.as_view(), name='product-detail'),
    path('admin/login/', AdminLoginView.as_view(), name='admin-login'),
    path('admin/logout/', AdminLogoutView.as_view(), name='admin-logout'),
    path('admin/me/', AdminMeView.as_view(), name='admin-me'),
    path('admin/products/', AdminProductListCreateView.as_view(), name='admin-product-list'),
    path('admin/products/<int:pk>/', AdminProductDetailView.as_view(), name='admin-product-detail'),
    path('admin/products/<int:pk>/images/', AdminProductImageUploadView.as_view(), name='admin-product-images'),
    path('admin/products/<int:pk>/images/reorder/', AdminProductImageReorderView.as_view(), name='admin-product-images-reorder'),
    path('admin/products/<int:pk>/images/<int:image_id>/', AdminProductImageDeleteView.as_view(), name='admin-product-image-delete'),
    path('admin/sizes/', AdminSizeTableView.as_view(), name='admin-size-table'),
    # Order endpoints
    path('orders/', OrderCreateView.as_view(), name='order-create'),
    path('orders/<int:number>/', OrderDetailPublicView.as_view(), name='order-detail'),
    path('coupons/check/', CouponCheckView.as_view(), name='coupon-check'),
]
