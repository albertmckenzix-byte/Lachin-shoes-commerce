from django.contrib.auth import authenticate
from django.db.models import Count, Q, Sum, Max, F, CharField, Value
from django.db.models.functions import Coalesce, Concat
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.conf import settings
from PIL import Image
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment
from rest_framework import generics, status
from rest_framework.authtoken.models import Token
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, ScopedRateThrottle
from rest_framework.views import APIView
import jdatetime
from datetime import datetime, timedelta
import pytz

from .models import Coupon, Customer, Order, Product, ProductImage
from .permissions import IsStaffUser
from .serializers import (
    AdminCustomerCreateSerializer,
    AdminCustomerDetailSerializer,
    AdminCustomerListSerializer,
    AdminCustomerUpdateSerializer,
    AdminLoginSerializer,
    AdminMeSerializer,
    AdminOrderCreateSerializer,
    AdminOrderDetailSerializer,
    AdminOrderListSerializer,
    AdminOrderUpdateSerializer,
    AdminProductImageSerializer,
    AdminProductListSerializer,
    AdminProductSerializer,
    CouponCheckSerializer,
    CreateOrderSerializer,
    OrderDetailPublicSerializer,
    OrderPublicSerializer,
    PublicProductSerializer,
)
from .services.orders import OrderError, change_order_status, create_order, set_payment_status
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
# Public settings endpoint
# =============================================================================

class SettingsView(APIView):
    """
    GET /api/settings/
    Returns public store settings.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        settings = StoreSettings.get()
        return Response({
            'freeShippingThreshold': settings.free_shipping_threshold,
            'standardFee': settings.standard_fee,
            'expressFee': settings.express_fee,
        })


# =============================================================================
# Admin dashboard view
# =============================================================================

class AdminDashboardView(APIView):
    """
    GET /api/admin/dashboard/?days=7
    Returns dashboard statistics for the admin panel.
    """
    permission_classes = [IsStaffUser]

    def get(self, request):
        # Validate days parameter
        days_param = request.query_params.get('days', '7')
        if days_param not in ['7', '30', '90']:
            return Response(
                {"detail": "days must be one of 7, 30, or 90"},
                status=status.HTTP_400_BAD_REQUEST
            )
        days = int(days_param)

        # Asia/Tehran timezone
        tehran_tz = pytz.timezone('Asia/Tehran')
        now_tehran = timezone.now().astimezone(tehran_tz)
        today_start = now_tehran.replace(hour=0, minute=0, second=0, microsecond=0)

        # Base queryset for sales (paid and not cancelled)
        sales_qs = Order.objects.filter(
            payment_status='paid'
        ).exclude(status='cancelled')

        # Today's stats
        today_sales_qs = sales_qs.filter(created_at__gte=today_start)
        today_sales = today_sales_qs.aggregate(
            sales=Coalesce(Sum('total'), 0),
            ordersCount=Count('id')
        )
        today_data = {
            'sales': today_sales['sales'] or 0,
            'ordersCount': today_sales['ordersCount'] or 0,
        }

        # Range stats
        range_start = today_start - timedelta(days=days-1)
        range_sales_qs = sales_qs.filter(created_at__gte=range_start)
        range_sales = range_sales_qs.aggregate(
            sales=Coalesce(Sum('total'), 0),
            ordersCount=Count('id')
        )
        range_data = {
            'days': days,
            'ordersCount': range_sales['ordersCount'] or 0,
            'sales': range_sales['sales'] or 0,
        }

        # Pending payment count
        pending_payment_count = Order.objects.filter(
            payment_status='pending'
        ).count()

        # Status counts
        status_counts_qs = Order.objects.aggregate(
            new=Count('id', filter=Q(status='new')),
            processing=Count('id', filter=Q(status='processing')),
            shipped=Count('id', filter=Q(status='shipped')),
            delivered=Count('id', filter=Q(status='delivered')),
            cancelled=Count('id', filter=Q(status='cancelled')),
            total=Count('id')
        )
        status_counts = {
            'new': status_counts_qs['new'] or 0,
            'processing': status_counts_qs['processing'] or 0,
            'shipped': status_counts_qs['shipped'] or 0,
            'delivered': status_counts_qs['delivered'] or 0,
            'cancelled': status_counts_qs['cancelled'] or 0,
            'total': status_counts_qs['total'] or 0,
        }

        # Daily sales (zero-filled, no gaps)
        daily_sales = []
        for i in range(days):
            day_date = range_start + timedelta(days=i)
            day_end = day_date + timedelta(days=1)
            day_sales = sales_qs.filter(
                created_at__gte=day_date,
                created_at__lt=day_end
            ).aggregate(sales=Coalesce(Sum('total'), 0))
            daily_sales.append({
                'date': day_date.isoformat(),
                'sales': day_sales['sales'] or 0,
            })

        # Latest 5 orders
        latest_orders = Order.objects.select_related('customer').order_by('-created_at')[:5]
        latest_orders_data = []
        for order in latest_orders:
            latest_orders_data.append({
                'id': order.id,
                'number': order.number,
                'customerName': f"{order.first_name} {order.last_name}",
                'city': order.city,
                'total': order.total,
                'status': order.status,
            })

        # Low stock products (threshold 25, active sizes only)
        low_stock_threshold = 25
        low_stock_products = Product.objects.filter(
            is_active=True
        ).prefetch_related('sizes').annotate(
            _active_stock=Coalesce(
                Sum('sizes__stock', filter=Q(sizes__is_active=True)),
                0
            )
        ).filter(
            _active_stock__lt=low_stock_threshold
        ).order_by('_active_stock')[:10]

        low_stock_data = {
            'threshold': low_stock_threshold,
            'totalStock': low_stock_products.count(),
            'products': []
        }
        for product in low_stock_products:
            first_image = product.images.first()
            image_url = None
            if first_image:
                image_url = request.build_absolute_uri(first_image.image.url)
            low_stock_data['products'].append({
                'id': product.id,
                'name': product.name,
                'slug': product.slug,
                'totalStock': product._active_stock,
                'image': image_url,
            })

        return Response({
            'today': today_data,
            'range': range_data,
            'pendingPaymentCount': pending_payment_count,
            'statusCounts': status_counts,
            'dailySales': daily_sales,
            'latestOrders': latest_orders_data,
            'lowStock': low_stock_data,
        })


# =============================================================================
# Admin order views
# =============================================================================

class AdminOrderListView(generics.ListAPIView):
    """
    GET /api/admin/orders/
    Paginated list of orders with filters.
    """
    permission_classes = [IsStaffUser]
    serializer_class = AdminOrderListSerializer

    def get_queryset(self):
        qs = Order.objects.select_related('customer')

        # Status filter
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)

        # Payment status filter
        payment_status = self.request.query_params.get('payment_status')
        if payment_status:
            qs = qs.filter(payment_status=payment_status)

        # Search filter (order number, customer name, phone)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(number__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(phone__icontains=search)
            )

        # Date filters (Asia/Tehran timezone)
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if date_from:
            dt = parse_datetime(date_from)
            if dt:
                qs = qs.filter(created_at__gte=dt)
        if date_to:
            dt = parse_datetime(date_to)
            if dt:
                qs = qs.filter(created_at__lte=dt)

        return qs.order_by('-created_at')

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        # Apply pagination
        page = int(request.query_params.get('page', 1))
        page_size = min(int(request.query_params.get('page_size', 20)), 100)
        start = (page - 1) * page_size
        end = start + page_size
        page_queryset = queryset[start:end]

        serializer = self.get_serializer(page_queryset, many=True)

        # Compute counts
        base_qs = self.get_queryset()
        counts = {
            'all': base_qs.count(),
            'new': base_qs.filter(status='new').count(),
            'processing': base_qs.filter(status='processing').count(),
            'shipped': base_qs.filter(status='shipped').count(),
            'delivered': base_qs.filter(status='delivered').count(),
            'cancelled': base_qs.filter(status='cancelled').count(),
        }

        # Pending payment count (ignoring status filter)
        search = request.query_params.get('search')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        payment_pending_qs = Order.objects.select_related('customer')
        if search:
            payment_pending_qs = payment_pending_qs.filter(
                Q(number__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(phone__icontains=search)
            )
        if date_from:
            dt = parse_datetime(date_from)
            if dt:
                payment_pending_qs = payment_pending_qs.filter(created_at__gte=dt)
        if date_to:
            dt = parse_datetime(date_to)
            if dt:
                payment_pending_qs = payment_pending_qs.filter(created_at__lte=dt)
        counts['pendingPayment'] = payment_pending_qs.filter(
            payment_status='pending'
        ).count()

        return Response({
            'results': serializer.data,
            'count': queryset.count(),
            'page': page,
            'pageSize': page_size,
            'counts': counts,
        })


class AdminOrderDetailView(generics.RetrieveAPIView):
    """
    GET /api/admin/orders/<id>/
    Full order detail.
    """
    permission_classes = [IsStaffUser]
    serializer_class = AdminOrderDetailSerializer
    queryset = Order.objects.prefetch_related('items', 'logs').select_related('customer')
    lookup_field = 'id'


class AdminOrderUpdateView(generics.UpdateAPIView):
    """
    PATCH /api/admin/orders/<id>/
    Update order status, payment status, or note.
    """
    permission_classes = [IsStaffUser]
    serializer_class = AdminOrderUpdateSerializer
    queryset = Order.objects.all()
    lookup_field = 'id'

    def patch(self, request, *args, **kwargs):
        order = self.get_object()
        serializer = self.get_serializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        actor = request.user.username

        if 'status' in serializer.validated_data:
            new_status = serializer.validated_data['status']
            try:
                change_order_status(order, new_status, actor=actor)
            except OrderError as exc:
                return Response(
                    {"detail": str(exc), "code": exc.code},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if 'paymentStatus' in serializer.validated_data:
            new_payment_status = serializer.validated_data['paymentStatus']
            try:
                set_payment_status(order, new_payment_status, actor=actor)
            except OrderError as exc:
                return Response(
                    {"detail": str(exc), "code": exc.code},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if 'note' in serializer.validated_data:
            order.note = serializer.validated_data['note']
            order.save(update_fields=['note'])

        order.refresh_from_db()
        return Response(AdminOrderDetailSerializer(order).data)


class AdminOrderCreateView(APIView):
    """
    POST /api/admin/orders/
    Manual order creation by admin.
    """
    permission_classes = [IsStaffUser]

    def post(self, request):
        serializer = AdminOrderCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"detail": "اطلاعات وارد شده معتبر نیست.",
                 "code": "validation",
                 "fields": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            order = create_order(
                serializer.validated_data,
                actor=request.user.username
            )
        except OrderError as exc:
            return Response(
                {"detail": str(exc), "code": exc.code, "fields": exc.fields},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Override payment status if specified
        if serializer.validated_data.get('payment_status') != 'pending':
            try:
                set_payment_status(
                    order,
                    serializer.validated_data['payment_status'],
                    actor=request.user.username
                )
            except OrderError as exc:
                return Response(
                    {"detail": str(exc), "code": exc.code},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        order.refresh_from_db()
        return Response(
            AdminOrderDetailSerializer(order).data,
            status=status.HTTP_201_CREATED,
        )


class AdminOrderExportView(APIView):
    """
    GET /api/admin/orders/export/
    Export orders to Excel with same filters.
    """
    permission_classes = [IsStaffUser]

    def get(self, request):
        # Build queryset with same filters as list view
        qs = Order.objects.select_related('customer').prefetch_related('items')

        status = request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)

        payment_status = request.query_params.get('payment_status')
        if payment_status:
            qs = qs.filter(payment_status=payment_status)

        search = request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(number__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(phone__icontains=search)
            )

        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        if date_from:
            dt = parse_datetime(date_from)
            if dt:
                qs = qs.filter(created_at__gte=dt)
        if date_to:
            dt = parse_datetime(date_to)
            if dt:
                qs = qs.filter(created_at__lte=dt)

        qs = qs.order_by('-created_at')

        # Create Excel workbook
        wb = Workbook()
        ws = wb.active
        ws.title = "سفارشات"

        # Set RTL and Persian font
        ws.sheet_properties.pageSetUpPr.paperSize = None
        ws.right_to_left = True

        # Headers
        headers = [
            "شماره", "تاریخ", "مشتری", "تلفن", "شهر", "آدرس",
            "مبلغ", "وضعیت", "پرداخت", "اقلام"
        ]
        ws.append(headers)

        # Style headers
        header_font = Font(name='Calibri', bold=True, size=11)
        for col in range(1, len(headers) + 1):
            ws.cell(row=1, column=col).font = header_font
            ws.cell(row=1, column=col).alignment = Alignment(horizontal='center')

        # Data rows
        for order in qs:
            # Convert to Jalali date
            jd = jdatetime.datetime.fromgregorian(datetime=order.created_at)
            date_str = jd.strftime('%Y/%m/%d')

            # Build items string
            items_str = ", ".join([
                f"{item.product_name} ({item.size_us}) ×{item.quantity}"
                for item in order.items.all()
            ])

            row = [
                order.number or '',
                date_str,
                f"{order.first_name} {order.last_name}",
                order.phone,
                order.city,
                order.address,
                order.total,
                order.status,
                order.payment_status,
                items_str,
            ]
            ws.append(row)

        # Auto-adjust column widths
        for col in ws.columns:
            max_length = 0
            column = col[0].column_letter
            for cell in col:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            ws.column_dimensions[column].width = adjusted_width

        # Prepare response
        from django.http import HttpResponse
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="orders.xlsx"'
        wb.save(response)
        return response


class AdminOrderSummaryView(APIView):
    """
    GET /api/admin/orders/summary/
    Returns { newCount, pendingPaymentCount } for sidebar badge.
    """
    permission_classes = [IsStaffUser]

    def get(self, request):
        new_count = Order.objects.filter(status='new').count()
        pending_payment_count = Order.objects.filter(
            payment_status='pending'
        ).count()
        return Response({
            'newCount': new_count,
            'pendingPaymentCount': pending_payment_count,
        })


# =============================================================================
# Admin customer views
# =============================================================================

class AdminCustomerListView(generics.ListAPIView):
    """
    GET /api/admin/customers/
    Paginated list of customers with filters.
    """
    permission_classes = [IsStaffUser]
    serializer_class = AdminCustomerListSerializer

    def get_queryset(self):
        # Annotate with order counts and total spent
        qs = Customer.objects.annotate(
            orders_count=Count('orders'),
            total_spent=Coalesce(
                Sum(
                    'orders__total',
                    filter=Q(orders__payment_status='paid') & ~Q(orders__status='cancelled')
                ),
                0
            ),
            last_order_at=Coalesce(
                Max('orders__created_at'),
                None
            )
        )

        # Search filter (name or phone)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(phone__icontains=search)
            )

        # City filter
        city = self.request.query_params.get('city')
        if city:
            qs = qs.filter(city__icontains=city)

        # Type filter (new = exactly one order, returning = more than one)
        customer_type = self.request.query_params.get('type')
        if customer_type == 'new':
            qs = qs.filter(orders_count=1)
        elif customer_type == 'returning':
            qs = qs.filter(orders_count__gt=1)

        # Ordering
        ordering = self.request.query_params.get('ordering', 'last_order')
        if ordering == 'last_order':
            qs = qs.order_by('-last_order_at')
        elif ordering == 'total_spent':
            qs = qs.order_by('-total_spent')
        elif ordering == 'orders_count':
            qs = qs.order_by('-orders_count')
        else:
            qs = qs.order_by('-last_order_at')

        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        # Apply pagination
        page = int(request.query_params.get('page', 1))
        page_size = min(int(request.query_params.get('page_size', 20)), 100)
        start = (page - 1) * page_size
        end = start + page_size
        page_queryset = queryset[start:end]

        serializer = self.get_serializer(page_queryset, many=True)

        # Compute counts
        base_qs = Customer.objects.annotate(
            orders_count=Count('orders')
        )
        counts = {
            'all': base_qs.count(),
            'new': base_qs.filter(orders_count=1).count(),
            'returning': base_qs.filter(orders_count__gt=1).count(),
        }

        # Get distinct cities
        cities = list(Customer.objects.values_list('city', flat=True).distinct().order_by('city'))

        return Response({
            'results': serializer.data,
            'count': queryset.count(),
            'page': page,
            'pageSize': page_size,
            'counts': counts,
            'cities': cities,
        })


class AdminCustomerDetailView(generics.RetrieveAPIView):
    """
    GET /api/admin/customers/<id>/
    Full customer detail with orders.
    """
    permission_classes = [IsStaffUser]
    serializer_class = AdminCustomerDetailSerializer
    queryset = Customer.objects.prefetch_related('orders__items')
    lookup_field = 'id'


class AdminCustomerCreateView(generics.CreateAPIView):
    """
    POST /api/admin/customers/
    Create a customer manually.
    """
    permission_classes = [IsStaffUser]
    serializer_class = AdminCustomerCreateSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        customer = Customer.objects.create(
            first_name=serializer.validated_data['first_name'],
            last_name=serializer.validated_data['last_name'],
            phone=serializer.validated_data['phone'],
            email=serializer.validated_data.get('email', ''),
            city=serializer.validated_data.get('city', ''),
        )

        return Response(
            AdminCustomerDetailSerializer(customer).data,
            status=status.HTTP_201_CREATED,
        )


class AdminCustomerUpdateView(generics.UpdateAPIView):
    """
    PATCH /api/admin/customers/<id>/
    Update customer information.
    """
    permission_classes = [IsStaffUser]
    serializer_class = AdminCustomerUpdateSerializer
    queryset = Customer.objects.all()
    lookup_field = 'id'

    def patch(self, request, *args, **kwargs):
        customer = self.get_object()
        serializer = self.get_serializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        if 'first_name' in serializer.validated_data:
            customer.first_name = serializer.validated_data['first_name']
        if 'last_name' in serializer.validated_data:
            customer.last_name = serializer.validated_data['last_name']
        if 'email' in serializer.validated_data:
            customer.email = serializer.validated_data['email']
        if 'city' in serializer.validated_data:
            customer.city = serializer.validated_data['city']

        customer.save()
        return Response(AdminCustomerDetailSerializer(customer).data)


class AdminCustomerExportView(APIView):
    """
    GET /api/admin/customers/export/
    Export customers to Excel.
    """
    permission_classes = [IsStaffUser]

    def get(self, request):
        # Build queryset with same filters as list view
        qs = Customer.objects.annotate(
            orders_count=Count('orders'),
            total_spent=Coalesce(
                Sum(
                    'orders__total',
                    filter=Q(orders__payment_status='paid') & ~Q(orders__status='cancelled')
                ),
                0
            ),
            last_order_at=Coalesce(
                Max('orders__created_at'),
                None
            )
        )

        search = request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(phone__icontains=search)
            )

        city = request.query_params.get('city')
        if city:
            qs = qs.filter(city__icontains=city)

        customer_type = request.query_params.get('type')
        if customer_type == 'new':
            qs = qs.filter(orders_count=1)
        elif customer_type == 'returning':
            qs = qs.filter(orders_count__gt=1)

        ordering = request.query_params.get('ordering', 'last_order')
        if ordering == 'last_order':
            qs = qs.order_by('-last_order_at')
        elif ordering == 'total_spent':
            qs = qs.order_by('-total_spent')
        elif ordering == 'orders_count':
            qs = qs.order_by('-orders_count')
        else:
            qs = qs.order_by('-last_order_at')

        # Create Excel workbook
        wb = Workbook()
        ws = wb.active
        ws.title = "مشتریان"

        # Set RTL
        ws.right_to_left = True

        # Headers
        headers = [
            "نام", "تلفن", "ایمیل", "شهر", "تعداد سفارش", "مجموع خرید", "آخرین سفارش"
        ]
        ws.append(headers)

        # Style headers
        header_font = Font(name='Calibri', bold=True, size=11)
        for col in range(1, len(headers) + 1):
            ws.cell(row=1, column=col).font = header_font
            ws.cell(row=1, column=col).alignment = Alignment(horizontal='center')

        # Data rows
        for customer in qs:
            last_order_date = ''
            if customer.last_order_at:
                jd = jdatetime.datetime.fromgregorian(datetime=customer.last_order_at)
                last_order_date = jd.strftime('%Y/%m/%d')

            row = [
                f"{customer.first_name} {customer.last_name}",
                customer.phone,
                customer.email,
                customer.city,
                customer.orders_count,
                customer.total_spent,
                last_order_date,
            ]
            ws.append(row)

        # Auto-adjust column widths
        for col in ws.columns:
            max_length = 0
            column = col[0].column_letter
            for cell in col:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            ws.column_dimensions[column].width = adjusted_width

        # Prepare response
        from django.http import HttpResponse
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="customers.xlsx"'
        wb.save(response)
        return response
