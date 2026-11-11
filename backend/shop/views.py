import random
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db.models import Avg, Count, Max, Q, Sum
from django.db.models.functions import Coalesce
from django.http import HttpResponseRedirect
from django.shortcuts import get_object_or_404
from django.utils import timezone
from PIL import Image
from rest_framework import generics, status
from rest_framework.authtoken.models import Token
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, ScopedRateThrottle
from rest_framework.views import APIView

from .models import (
    Coupon,
    Customer,
    OTPCode,
    Order,
    OrderItem,
    Product,
    ProductImage,
    ProductReview,
    ProductSize,
    StoreSettings,
    WishlistItem,
    update_product_rating_stats,
)
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
    AdminProductReviewSerializer,
    AdminProductSerializer,
    AdminStoreSettingsSerializer,
    CouponCheckSerializer,
    CreateOrderSerializer,
    CreateProductReviewSerializer,
    CustomerPasswordLoginSerializer,
    CustomerProfileSerializer,
    CustomerRegisterSerializer,
    OrderDetailPublicSerializer,
    OrderPublicSerializer,
    ProductReviewSerializer,
    PublicProductSerializer,
    SendOtpSerializer,
    VerifyOtpSerializer,
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


# =============================================================================
# Customer Authentication Views (OTP, Register, Password Login, Profile)
# =============================================================================

class CustomerSendOtpView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SendOtpSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        phone = serializer.validated_data["phone"]
        code = f"{random.randint(10000, 99999)}"
        now = timezone.now()
        expires_at = now + timedelta(minutes=2)

        # Invalidate previous unused codes for this phone
        OTPCode.objects.filter(phone=phone, is_used=False).update(is_used=True)
        OTPCode.objects.create(phone=phone, code=code, expires_at=expires_at)

        from .services.sms import send_otp_sms
        send_otp_sms(phone, code)

        res = {
            "success": True,
            "message": "کد تأیید با موفقیت ارسال شد.",
            "expiresIn": 120,
            "isNewUser": not Customer.objects.filter(phone=phone).exists(),
        }
        if settings.DEBUG:
            res["code"] = code
        return Response(res, status=status.HTTP_200_OK)


class CustomerVerifyOtpView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyOtpSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        phone = serializer.validated_data["phone"]
        code = serializer.validated_data["code"]
        now = timezone.now()

        otp = OTPCode.objects.filter(
            phone=phone, code=code, is_used=False, expires_at__gte=now
        ).first()
        if not otp:
            return Response(
                {"error": "کد تأیید وارد شده نامعتبر است یا منقضی شده است."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        otp.is_used = True
        otp.save(update_fields=["is_used"])

        user, _ = User.objects.get_or_create(username=phone)
        token, _ = Token.objects.get_or_create(user=user)

        customer, _ = Customer.objects.get_or_create(phone=phone)
        if customer.user != user:
            customer.user = user
            customer.save(update_fields=["user"])

        is_complete = bool(customer.first_name and customer.last_name)
        return Response(
            {
                "token": token.key,
                "customer": CustomerProfileSerializer(customer).data,
                "isNewUser": not is_complete,
            },
            status=status.HTTP_200_OK,
        )


class CustomerRegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = CustomerRegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        data = serializer.validated_data
        phone = data["phone"]

        user, _ = User.objects.get_or_create(username=phone)
        if data.get("password"):
            user.set_password(data["password"])
            user.save()
        token, _ = Token.objects.get_or_create(user=user)

        customer, _ = Customer.objects.get_or_create(phone=phone)
        customer.user = user
        customer.first_name = data["first_name"]
        customer.last_name = data["last_name"]
        if data.get("email"):
            customer.email = data["email"]
        customer.save()

        return Response(
            {
                "token": token.key,
                "customer": CustomerProfileSerializer(customer).data,
            },
            status=status.HTTP_201_CREATED,
        )


class CustomerPasswordLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = CustomerPasswordLoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        phone = serializer.validated_data["phone"]
        password = serializer.validated_data["password"]

        user = authenticate(username=phone, password=password)
        if not user:
            return Response(
                {"error": "شماره موبایل یا کلمه عبور اشتباه است."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        token, _ = Token.objects.get_or_create(user=user)
        customer, _ = Customer.objects.get_or_create(phone=phone)
        if customer.user != user:
            customer.user = user
            customer.save(update_fields=["user"])

        return Response(
            {
                "token": token.key,
                "customer": CustomerProfileSerializer(customer).data,
            }
        )


class CustomerMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        customer = getattr(request.user, "customer_profile", None)
        if not customer:
            customer, _ = Customer.objects.get_or_create(
                phone=request.user.username, defaults={"user": request.user}
            )
        return Response(CustomerProfileSerializer(customer).data)

    def patch(self, request):
        customer = getattr(request.user, "customer_profile", None)
        if not customer:
            customer, _ = Customer.objects.get_or_create(
                phone=request.user.username, defaults={"user": request.user}
            )
        for field in ["firstName", "first_name"]:
            if field in request.data:
                customer.first_name = str(request.data[field]).strip()
        for field in ["lastName", "last_name"]:
            if field in request.data:
                customer.last_name = str(request.data[field]).strip()
        if "email" in request.data:
            customer.email = str(request.data["email"]).strip()
        if "city" in request.data:
            customer.city = str(request.data["city"]).strip()
        customer.save()
        return Response(CustomerProfileSerializer(customer).data)


class CustomerLogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response({"success": True})


class CustomerOrdersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        customer = getattr(request.user, "customer_profile", None)
        if not customer:
            customer = Customer.objects.filter(phone=request.user.username).first()
        if not customer:
            return Response({"results": []})
        orders = Order.objects.filter(customer=customer).order_by("-created_at")
        from .serializers import AdminOrderSerializer
        return Response({"results": AdminOrderSerializer(orders, many=True).data})



# =============================================================================
# Product Reviews Views
# =============================================================================

class ProductReviewListCreateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        product = get_object_or_404(Product, slug=slug, is_active=True)
        approved_reviews = product.reviews.filter(status="approved").order_by("-created_at")
        total = approved_reviews.count()
        avg = round(approved_reviews.aggregate(Avg("rating"))["rating__avg"] or 5.0, 1) if total > 0 else 5.0

        distribution = {
            "5": approved_reviews.filter(rating=5).count(),
            "4": approved_reviews.filter(rating=4).count(),
            "3": approved_reviews.filter(rating=3).count(),
            "2": approved_reviews.filter(rating=2).count(),
            "1": approved_reviews.filter(rating=1).count(),
        }

        serializer = ProductReviewSerializer(approved_reviews, many=True)
        return Response({
            "totalReviews": total,
            "averageRating": avg,
            "distribution": distribution,
            "results": serializer.data,
        })

    def post(self, request, slug):
        product = get_object_or_404(Product, slug=slug, is_active=True)
        serializer = CreateProductReviewSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = request.user if request.user.is_authenticated else None
        customer = getattr(user, "customer_profile", None) if user else None

        name = serializer.validated_data.get("name", "").strip()
        if not name and customer:
            name = f"{customer.first_name} {customer.last_name}".strip() or customer.phone
        if not name:
            name = "کاربر مهمان"

        # Check if buyer is verified
        is_verified_buyer = False
        if customer:
            is_verified_buyer = OrderItem.objects.filter(
                order__customer=customer,
                order__payment_status=Order.PaymentStatus.PAID,
                product=product,
            ).exists()
        elif user:
            is_verified_buyer = OrderItem.objects.filter(
                order__customer__user=user,
                order__payment_status=Order.PaymentStatus.PAID,
                product=product,
            ).exists()

        review = ProductReview.objects.create(
            product=product,
            user=user,
            customer=customer,
            name=name,
            rating=serializer.validated_data["rating"],
            title=serializer.validated_data.get("title", ""),
            comment=serializer.validated_data["comment"],
            is_verified_buyer=is_verified_buyer,
            status="approved",
        )

        update_product_rating_stats(product)
        return Response(ProductReviewSerializer(review).data, status=status.HTTP_201_CREATED)


class AdminProductReviewListView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request):
        status_filter = request.query_params.get("status", "all").strip().lower()
        search = request.query_params.get("search", "").strip()

        qs = ProductReview.objects.select_related("product").order_by("-created_at")
        if status_filter in ["pending", "approved", "rejected"]:
            qs = qs.filter(status=status_filter)
        if search:
            qs = qs.filter(
                Q(name__icontains=search)
                | Q(comment__icontains=search)
                | Q(title__icontains=search)
                | Q(product__name__icontains=search)
            )

        serializer = AdminProductReviewSerializer(qs, many=True)
        return Response(serializer.data)


class AdminProductReviewDetailView(APIView):
    permission_classes = [IsStaffUser]

    def patch(self, request, pk):
        review = get_object_or_404(ProductReview, pk=pk)
        serializer = AdminProductReviewSerializer(review, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        updated = serializer.save()
        update_product_rating_stats(updated.product)
        return Response(AdminProductReviewSerializer(updated).data)

    def delete(self, request, pk):
        review = get_object_or_404(ProductReview, pk=pk)
        product = review.product
        review.delete()
        update_product_rating_stats(product)
        return Response({"success": True}, status=status.HTTP_204_NO_CONTENT)


# =============================================================================
# Customer Wishlist Views (Favorites)
# =============================================================================

class CustomerWishlistListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        customer = getattr(request.user, "customer_profile", None)
        if not customer:
            customer, _ = Customer.objects.get_or_create(
                phone=request.user.username, defaults={"user": request.user}
            )
        items = (
            WishlistItem.objects.filter(customer=customer)
            .select_related("product")
            .prefetch_related("product__images", "product__sizes")
        )
        products = [item.product for item in items if item.product.is_active]
        serializer = PublicProductSerializer(products, many=True)
        return Response({"count": len(products), "results": serializer.data})


class CustomerWishlistToggleView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        customer = getattr(request.user, "customer_profile", None)
        if not customer:
            customer, _ = Customer.objects.get_or_create(
                phone=request.user.username, defaults={"user": request.user}
            )
        slug = request.data.get("slug")
        product_id = request.data.get("product_id") or request.data.get("id")

        product = None
        if slug:
            product = Product.objects.filter(slug=slug, is_active=True).first()
        elif product_id:
            product = Product.objects.filter(pk=product_id, is_active=True).first()

        if not product:
            return Response(
                {"error": "محصول مورد نظر یافت نشد."}, status=status.HTTP_404_NOT_FOUND
            )

        existing = WishlistItem.objects.filter(customer=customer, product=product).first()
        if existing:
            existing.delete()
            is_fav = False
        else:
            WishlistItem.objects.create(customer=customer, product=product)
            is_fav = True

        count = WishlistItem.objects.filter(customer=customer).count()
        return Response({
            "isFavorite": is_fav,
            "count": count,
            "product": PublicProductSerializer(product).data,
        })


class CustomerWishlistSyncView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        customer = getattr(request.user, "customer_profile", None)
        if not customer:
            customer, _ = Customer.objects.get_or_create(
                phone=request.user.username, defaults={"user": request.user}
            )
        slugs = request.data.get("slugs", [])
        product_ids = request.data.get("product_ids", [])

        qs = Product.objects.filter(is_active=True).filter(
            Q(slug__in=slugs) | Q(id__in=product_ids)
        )
        for prod in qs:
            WishlistItem.objects.get_or_create(customer=customer, product=prod)

        items = (
            WishlistItem.objects.filter(customer=customer)
            .select_related("product")
            .prefetch_related("product__images", "product__sizes")
        )
        products = [item.product for item in items if item.product.is_active]
        serializer = PublicProductSerializer(products, many=True)
        return Response({"count": len(products), "results": serializer.data})
