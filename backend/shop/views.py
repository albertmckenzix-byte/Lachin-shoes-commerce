from django.conf import settings
from django.contrib.auth import authenticate
from django.db.models import Count, Max, Q, Sum
from django.db.models.functions import Coalesce
from django.http import HttpResponseRedirect
from django.shortcuts import get_object_or_404
from django.utils import timezone
from PIL import Image
from rest_framework import generics, status
from rest_framework.authtoken.models import Token
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, ScopedRateThrottle
from rest_framework.views import APIView

from .models import Coupon, Customer, Order, Product, ProductImage, ProductSize, StoreSettings
from .permissions import IsStaffUser
from .serializers import (
    AdminCouponCreateUpdateSerializer,
    AdminCouponSerializer,
    AdminCustomerSerializer,
    AdminLoginSerializer,
    AdminMeSerializer,
    AdminOrderSerializer,
    AdminProductImageSerializer,
    AdminProductListSerializer,
    AdminProductSerializer,
    AdminStoreSettingsSerializer,
    CouponCheckSerializer,
    CreateOrderSerializer,
    OrderDetailPublicSerializer,
    OrderPublicSerializer,
    PublicProductSerializer,
)
from .services.orders import (
    OrderError,
    change_order_status,
    create_order,
    set_payment_status,
)
from .services.payment import PaymentError, request_payment, verify_payment
from .sizes import SIZE_TABLE

LOGIN_ERROR = 'نام کاربری یا رمز عبور اشتباه است'


def _active_product_queryset():
    return Product.objects.filter(is_active=True).prefetch_related(
        'images', 'sizes'
    )


class ProductListView(generics.ListAPIView):
    serializer_class = PublicProductSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        return _active_product_queryset()


class ProductDetailView(generics.RetrieveAPIView):
    serializer_class = PublicProductSerializer
    permission_classes = [AllowAny]
    lookup_field = 'slug'
    pagination_class = None

    def get_queryset(self):
        return _active_product_queryset()


class AdminLoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    def post(self, request):
        serializer = AdminLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(
            username=serializer.validated_data['username'],
            password=serializer.validated_data['password'],
        )
        if user is None or not user.is_staff:
            return Response(
                {'detail': LOGIN_ERROR},
                status=status.HTTP_400_BAD_REQUEST,
            )
        token, _ = Token.objects.get_or_create(user=user)
        return Response({'token': token.key, 'username': user.username})


class AdminLogoutView(APIView):
    permission_classes = [IsStaffUser]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response({'detail': 'خروج با موفقیت انجام شد.'})


class AdminMeView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request):
        return Response(AdminMeSerializer(request.user).data)


class AdminProductListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsStaffUser]
    pagination_class = None

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return AdminProductListSerializer
        return AdminProductSerializer

    def get_queryset(self):
        qs = Product.objects.prefetch_related('images').annotate(
            _total_stock=Coalesce(
                Sum('sizes__stock', filter=Q(sizes__is_active=True)), 0
            ),
            _size_count=Count('sizes', distinct=True),
        )

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(name__icontains=search) | Q(slug__icontains=search)
            )

        brand = self.request.query_params.get('brand')
        if brand:
            qs = qs.filter(maker_brand=brand)

        product_status = self.request.query_params.get('status')
        if product_status == 'inactive':
            qs = qs.filter(is_active=False)
        elif product_status == 'out':
            qs = qs.filter(is_active=True, _total_stock=0)
        elif product_status == 'low':
            qs = qs.filter(
                is_active=True, _total_stock__gt=0, _total_stock__lt=25
            )
        elif product_status == 'active':
            qs = qs.filter(is_active=True, _total_stock__gte=25)

        return qs.order_by('-created_at')

    def create(self, request, *args, **kwargs):
        serializer = AdminProductSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AdminProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AdminProductSerializer
    permission_classes = [IsStaffUser]
    queryset = Product.objects.prefetch_related('images', 'sizes')


class AdminSizeTableView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request):
        return Response(SIZE_TABLE)


MAX_IMAGES_PER_PRODUCT = 6
MAX_IMAGE_SIZE = 5 * 1024 * 1024
ALLOWED_IMAGE_FORMATS = {'JPEG', 'PNG', 'WEBP'}


class AdminProductImageUploadView(APIView):
    permission_classes = [IsStaffUser]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        product = get_object_or_404(Product, pk=pk)
        upload = request.FILES.get('image')
        if upload is None:
            return Response(
                {'detail': 'فایلی ارسال نشده است.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if upload.size > MAX_IMAGE_SIZE:
            return Response(
                {'detail': 'حجم تصویر باید حداکثر ۵ مگابایت باشد.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            with Image.open(upload) as img:
                img.verify()
                fmt = img.format
        except Exception:
            return Response(
                {'detail': 'فایل تصویری معتبر نیست.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if fmt not in ALLOWED_IMAGE_FORMATS:
            return Response(
                {'detail': 'فقط تصاویر JPEG، PNG و WebP مجاز هستند.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if product.images.count() >= MAX_IMAGES_PER_PRODUCT:
            return Response(
                {'detail': 'حداکثر ۶ تصویر برای هر محصول مجاز است.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        upload.seek(0)
        last_position = product.images.order_by('-position').values_list(
            'position', flat=True
        ).first()
        image = ProductImage.objects.create(
            product=product,
            image=upload,
            position=0 if last_position is None else last_position + 1,
        )
        return Response(
            AdminProductImageSerializer(
                image, context={'request': request}
            ).data,
            status=status.HTTP_201_CREATED,
        )


class AdminProductImageDeleteView(APIView):
    permission_classes = [IsStaffUser]

    def delete(self, request, pk, image_id):
        product = get_object_or_404(Product, pk=pk)
        image = get_object_or_404(
            ProductImage, pk=image_id, product=product
        )
        image.image.delete(save=False)
        image.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminProductImageReorderView(APIView):
    permission_classes = [IsStaffUser]

    def post(self, request, pk):
        product = get_object_or_404(Product, pk=pk)
        order = request.data.get('order')
        if not isinstance(order, list) or not all(
            isinstance(i, int) for i in order
        ):
            return Response(
                {'detail': 'ترتیب تصاویر نامعتبر است.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        images = list(product.images.all())
        image_ids = {img.pk for img in images}
        if set(order) != image_ids or len(order) != len(image_ids):
            return Response(
                {'detail': 'لیست تصاویر ارسالی با تصاویر محصول مطابقت ندارد.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        by_id = {img.pk: img for img in images}
        for position, image_id in enumerate(order):
            by_id[image_id].position = position
        ProductImage.objects.bulk_update(
            [by_id[i] for i in order], ['position']
        )
        images = sorted(
            product.images.all(), key=lambda i: i.position
        )
        return Response(
            AdminProductImageSerializer(
                images, many=True, context={'request': request}
            ).data
        )


# =============================================================================
# Order throttles
# =============================================================================

class OrderCreateThrottle(AnonRateThrottle):
    """10 order requests per minute per IP."""
    rate = "10/minute"
    scope = "order_create"


class CouponCheckThrottle(AnonRateThrottle):
    """20 coupon checks per minute per IP."""
    rate = "20/minute"
    scope = "coupon_check"


# =============================================================================
# Order views
# =============================================================================

class OrderCreateView(APIView):
    """
    POST /api/orders/
    AllowAny, no CSRF (authentication_classes=[]).
    Validates payload, calls create_order(), returns 201 on success.
    """
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [OrderCreateThrottle]

    def post(self, request):
        serializer = CreateOrderSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"detail": "اطلاعات وارد شده معتبر نیست.",
                 "code": "validation",
                 "fields": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            order = create_order(serializer.validated_data, actor="customer")
        except OrderError as exc:
            return Response(
                {"detail": str(exc), "code": exc.code, "fields": exc.fields},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            OrderPublicSerializer(order).data,
            status=status.HTTP_201_CREATED,
        )


class OrderDetailPublicView(APIView):
    """
    GET /api/orders/<number>/?token=<public_token>
    Returns limited public view only when the token matches the order.
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, number):
        token = request.query_params.get("token", "")
        order = get_object_or_404(Order, number=number)
        if str(order.public_token) != str(token):
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(
            OrderDetailPublicSerializer(order).data
        )


class CouponCheckView(APIView):
    """
    POST /api/coupons/check/
    { code, subtotal } -> { valid, percent, discount }
    """
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [CouponCheckThrottle]

    def post(self, request):
        serializer = CouponCheckSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"detail": "داده‌های ارسالی معتبر نیستند.", "code": "validation",
                 "fields": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )
        code     = serializer.validated_data["code"].strip().upper()
        subtotal = serializer.validated_data["subtotal"]

        from django.utils import timezone as tz
        now = tz.now()
        try:
            coupon = Coupon.objects.get(code=code, is_active=True)
        except Coupon.DoesNotExist:
            return Response({"valid": False, "percent": 0, "discount": 0})

        if coupon.expires_at and coupon.expires_at < now:
            return Response({"valid": False, "percent": 0, "discount": 0})
        if coupon.usage_limit is not None and coupon.used_count >= coupon.usage_limit:
            return Response({"valid": False, "percent": 0, "discount": 0})

        discount = min(subtotal, (subtotal * coupon.percent) // 100)
        return Response({"valid": True, "percent": coupon.percent, "discount": discount})


# =============================================================================
# Admin Order & Customer & Dashboard views
# =============================================================================

class AdminOrderListView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request):
        qs = Order.objects.all().prefetch_related("items", "logs").select_related("customer")
        status_param = request.query_params.get("status")
        if status_param and status_param != "all":
            qs = qs.filter(status=status_param)
        payment_status_param = request.query_params.get("payment_status")
        if payment_status_param and payment_status_param != "all":
            qs = qs.filter(payment_status=payment_status_param)
        q = request.query_params.get("q", "").strip()
        if q:
            clean_q = "".join(c for c in q if c.isdigit())
            q_filter = (
                Q(first_name__icontains=q)
                | Q(last_name__icontains=q)
                | Q(phone__icontains=q)
            )
            if clean_q:
                try:
                    num_val = int(clean_q)
                    q_filter |= Q(number=num_val) | Q(pk=num_val)
                except ValueError:
                    pass
            qs = qs.filter(q_filter)
        return Response(AdminOrderSerializer(qs, many=True).data)


class AdminOrderDetailView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request, number):
        order = get_object_or_404(
            Order.objects.prefetch_related("items", "logs"),
            number=number,
        )
        return Response(AdminOrderSerializer(order).data)

    def patch(self, request, number):
        order = get_object_or_404(Order, number=number)
        actor = request.user.username or "admin"

        new_status = request.data.get("status")
        if new_status and new_status != order.status:
            try:
                order = change_order_status(order, new_status, actor=actor)
            except OrderError as exc:
                return Response(
                    {"detail": str(exc), "code": exc.code},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        new_payment = request.data.get("payment_status")
        if new_payment and new_payment != order.payment_status:
            try:
                order = set_payment_status(order, new_payment, actor=actor)
            except OrderError as exc:
                return Response(
                    {"detail": str(exc), "code": exc.code},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if "note" in request.data:
            order.note = request.data["note"]
            order.save(update_fields=["note", "updated_at"])

        return Response(AdminOrderSerializer(order).data)


class AdminOrderCreateView(APIView):
    permission_classes = [IsStaffUser]

    def post(self, request):
        serializer = CreateOrderSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"detail": "اطلاعات سفارش نامعتبر است.", "fields": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            actor = request.user.username or "admin"
            order = create_order(serializer.validated_data, actor=actor)
        except OrderError as exc:
            return Response(
                {"detail": str(exc), "code": exc.code, "fields": exc.fields},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(AdminOrderSerializer(order).data, status=status.HTTP_201_CREATED)


class AdminCustomerListView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request):
        qs = Customer.objects.annotate(
            orders_count=Count("orders"),
            total_spent=Coalesce(
                Sum("orders__total", filter=Q(orders__payment_status="paid")), 0
            ),
            last_order_date=Max("orders__created_at"),
        ).prefetch_related("orders")

        q = request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(
                Q(first_name__icontains=q)
                | Q(last_name__icontains=q)
                | Q(phone__icontains=q)
                | Q(city__icontains=q)
            )
        city = request.query_params.get("city")
        if city and city != "all" and city != "همه شهرها":
            qs = qs.filter(city=city)

        return Response(AdminCustomerSerializer(qs, many=True).data)


class AdminDashboardView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request):
        now = timezone.now()
        paid_orders = Order.objects.filter(payment_status="paid")
        total_revenue = paid_orders.aggregate(s=Sum("total"))["s"] or 0
        total_orders = Order.objects.count()
        paid_count = paid_orders.count()
        total_customers = Customer.objects.count()
        avg_order_value = int(total_revenue // paid_count) if paid_count > 0 else 0

        orders_by_status = {
            "new": Order.objects.filter(status="new").count(),
            "processing": Order.objects.filter(status="processing").count(),
            "shipped": Order.objects.filter(status="shipped").count(),
            "delivered": Order.objects.filter(status="delivered").count(),
            "cancelled": Order.objects.filter(status="cancelled").count(),
        }

        days_sales = []
        for i in range(6, -1, -1):
            day_start = (now - timezone.timedelta(days=i)).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            day_end = day_start + timezone.timedelta(days=1)
            day_rev = (
                Order.objects.filter(
                    payment_status="paid",
                    created_at__gte=day_start,
                    created_at__lt=day_end,
                ).aggregate(s=Sum("total"))["s"]
                or 0
            )
            day_orders_count = Order.objects.filter(
                created_at__gte=day_start, created_at__lt=day_end
            ).count()
            days_sales.append({
                "date": day_start.strftime("%Y-%m-%d"),
                "revenue": day_rev,
                "orders": day_orders_count,
            })

        recent = (
            Order.objects.all()
            .prefetch_related("items", "logs")
            .select_related("customer")[:8]
        )
        recent_serialized = AdminOrderSerializer(recent, many=True).data

        low_stock_sizes = (
            ProductSize.objects.filter(is_active=True, stock__lte=3)
            .select_related("product")[:10]
        )
        low_stock_list = [
            {
                "id": s.id,
                "productName": s.product.name,
                "productSlug": s.product.slug,
                "sizeUs": float(s.us),
                "sizeEu": float(s.eu),
                "stock": s.stock,
            }
            for s in low_stock_sizes
        ]

        return Response({
            "totalRevenue": total_revenue,
            "totalOrders": total_orders,
            "totalCustomers": total_customers,
            "avgOrderValue": avg_order_value,
            "ordersByStatus": orders_by_status,
            "salesByDay": days_sales,
            "recentOrders": recent_serialized,
            "lowStock": low_stock_list,
        })


# =============================================================================
# Payment gateway views
# =============================================================================

class PaymentRequestView(APIView):
    """
    POST /api/orders/<number>/pay/?token=<public_token>
    Initiates payment request with bank gateway or sandbox simulator.
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, number):
        token = request.query_params.get("token") or request.data.get("token")
        order = get_object_or_404(Order, number=number)
        if str(order.public_token) != str(token):
            return Response(
                {"detail": "توکن امنیتی سفارش نامعتبر است."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            result = request_payment(order)
            return Response(result, status=status.HTTP_200_OK)
        except PaymentError as exc:
            return Response(
                {"detail": str(exc), "code": exc.code},
                status=status.HTTP_400_BAD_REQUEST,
            )


class PaymentVerifyView(APIView):
    """
    GET /api/payment/verify/?Authority=...&Status=...
    Callback endpoint called by the bank (or simulator).
    Verifies transaction and redirects user back to the order-success page.
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        authority = request.query_params.get("Authority", "").strip()
        status_param = request.query_params.get("Status", "").strip()

        try:
            result = verify_payment(authority, status_param)
            order = result["order"]
            if result.get("success"):
                ref_id = result.get("ref_id", "")
                redirect_url = (
                    f"{settings.FRONTEND_URL}/order-success/{order.number}?"
                    f"token={order.public_token}&payment=success&ref_id={ref_id}"
                )
            else:
                redirect_url = (
                    f"{settings.FRONTEND_URL}/order-success/{order.number}?"
                    f"token={order.public_token}&payment=failed"
                )
            return HttpResponseRedirect(redirect_url)
        except PaymentError as exc:
            return Response(
                {"detail": str(exc), "code": exc.code},
                status=status.HTTP_400_BAD_REQUEST,
            )


# =============================================================================
# Store Settings Views
# =============================================================================

class AdminSettingsView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request):
        settings_obj = StoreSettings.get()
        serializer = AdminStoreSettingsSerializer(settings_obj)
        return Response(serializer.data)

    def patch(self, request):
        settings_obj = StoreSettings.get()
        serializer = AdminStoreSettingsSerializer(
            settings_obj, data=request.data, partial=True
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)


class PublicSettingsView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        settings_obj = StoreSettings.get()
        serializer = AdminStoreSettingsSerializer(settings_obj)
        return Response(serializer.data)


# =============================================================================
# Coupon Admin Views
# =============================================================================

class AdminCouponListCreateView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request):
        status_param = request.query_params.get("status", "all").strip().lower()
        search_param = request.query_params.get("search", "").strip()
        try:
            page = max(1, int(request.query_params.get("page", 1)))
        except (ValueError, TypeError):
            page = 1

        qs = Coupon.objects.all().order_by("-id")
        if search_param:
            if search_param.isdigit():
                qs = qs.filter(
                    Q(code__icontains=search_param) | Q(percent=int(search_param))
                )
            else:
                qs = qs.filter(code__icontains=search_param)

        now = timezone.now()
        all_coupons = list(qs)

        def compute_status(c):
            if not c.is_active:
                return "inactive"
            if c.expires_at and c.expires_at < now:
                return "expired"
            if c.usage_limit is not None and c.used_count >= c.usage_limit:
                return "exhausted"
            return "active"

        # Counts and summary
        total = len(all_coupons)
        active_count = sum(1 for c in all_coupons if compute_status(c) == "active")
        inactive_count = sum(1 for c in all_coupons if compute_status(c) == "inactive")
        expired_or_full_count = sum(
            1 for c in all_coupons if compute_status(c) in ("expired", "exhausted")
        )
        total_uses = sum(c.used_count for c in all_coupons)

        counts = {
            "all": total,
            "active": active_count,
            "inactive": inactive_count,
            "expired": expired_or_full_count,
        }
        summary = {
            "total": total,
            "active": active_count,
            "totalUses": total_uses,
            "expiredOrFull": expired_or_full_count,
        }

        # Filter by status
        if status_param == "active":
            filtered = [c for c in all_coupons if compute_status(c) == "active"]
        elif status_param == "inactive":
            filtered = [c for c in all_coupons if compute_status(c) == "inactive"]
        elif status_param == "expired":
            filtered = [
                c for c in all_coupons if compute_status(c) in ("expired", "exhausted")
            ]
        else:
            filtered = all_coupons

        page_size = 10
        total_items = len(filtered)
        start = (page - 1) * page_size
        end = start + page_size
        page_items = filtered[start:end]

        return Response({
            "results": AdminCouponSerializer(page_items, many=True).data,
            "counts": counts,
            "summary": summary,
            "page": page,
            "pageSize": page_size,
            "total": total_items,
            "totalPages": max(1, (total_items + page_size - 1) // page_size),
        })

    def post(self, request):
        serializer = AdminCouponCreateUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        coupon = serializer.save()
        return Response(AdminCouponSerializer(coupon).data, status=status.HTTP_201_CREATED)


class AdminCouponDetailView(APIView):
    permission_classes = [IsStaffUser]

    def patch(self, request, pk):
        coupon = get_object_or_404(Coupon, pk=pk)
        serializer = AdminCouponCreateUpdateSerializer(
            coupon, data=request.data, partial=True
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        coupon = serializer.save()
        return Response(AdminCouponSerializer(coupon).data)
