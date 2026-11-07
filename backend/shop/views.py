from django.contrib.auth import authenticate
from django.db.models import Count, Q, Sum
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from PIL import Image
from rest_framework import generics, status
from rest_framework.authtoken.models import Token
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import Product, ProductImage
from .permissions import IsStaffUser
from .serializers import (
    AdminLoginSerializer,
    AdminMeSerializer,
    AdminProductImageSerializer,
    AdminProductListSerializer,
    AdminProductSerializer,
    PublicProductSerializer,
)
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
