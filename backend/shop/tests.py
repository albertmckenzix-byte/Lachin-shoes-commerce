from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient, APITestCase

from .models import Product, ProductSize

STAFF_PASSWORD = 'staff-pass-123'
USER_PASSWORD = 'user-pass-123'


class AdminAPITestCase(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff = User.objects.create_user(
            username='shopadmin', password=STAFF_PASSWORD, is_staff=True
        )
        self.user = User.objects.create_user(
            username='customer', password=USER_PASSWORD, is_staff=False
        )
        self.client.force_authenticate(user=self.staff)

    def make_product(self, **kwargs):
        defaults = {
            'slug': 'test-shoe',
            'name': 'Test Shoe',
            'maker_brand': 'nike',
            'price': 1000000,
        }
        defaults.update(kwargs)
        return Product.objects.create(**defaults)


class AdminAuthTests(AdminAPITestCase):
    def test_anonymous_access_rejected(self):
        self.client.force_authenticate(user=None)
        self.assertEqual(
            self.client.get('/api/admin/products/').status_code, 401
        )
        self.assertEqual(
            self.client.get('/api/admin/me/').status_code, 401
        )
        self.assertEqual(
            self.client.get('/api/admin/sizes/').status_code, 401
        )

    def test_non_staff_cannot_login(self):
        self.client.force_authenticate(user=None)
        resp = self.client.post('/api/admin/login/', {
            'username': 'customer', 'password': USER_PASSWORD,
        })
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(
            resp.json()['detail'], 'نام کاربری یا رمز عبور اشتباه است'
        )

    def test_wrong_password_rejected(self):
        self.client.force_authenticate(user=None)
        resp = self.client.post('/api/admin/login/', {
            'username': 'shopadmin', 'password': 'wrong',
        })
        self.assertEqual(resp.status_code, 400)

    def test_staff_login_returns_token(self):
        self.client.force_authenticate(user=None)
        resp = self.client.post('/api/admin/login/', {
            'username': 'shopadmin', 'password': STAFF_PASSWORD,
        })
        self.assertEqual(resp.status_code, 200)
        self.assertIn('token', resp.json())
        self.assertEqual(resp.json()['username'], 'shopadmin')

    def test_me_returns_current_admin(self):
        resp = self.client.get('/api/admin/me/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()['username'], 'shopadmin')

    def test_non_staff_token_rejected(self):
        self.client.force_authenticate(user=self.user)
        self.assertEqual(
            self.client.get('/api/admin/products/').status_code, 403
        )


class AdminProductTests(AdminAPITestCase):
    def test_create_product_with_sizes(self):
        resp = self.client.post('/api/admin/products/', {
            'name': 'Cool New Shoe',
            'maker_brand': 'jordan',
            'genders': ['men'],
            'price': 5000000,
            'sizes': [
                {'us': 7, 'eu': 40, 'cm': 25, 'stock': 5},
                {'us': 8, 'eu': 41, 'cm': 26, 'stock': 0, 'is_active': False},
            ],
        }, format='json')
        self.assertEqual(resp.status_code, 201, resp.json())
        product = Product.objects.get(slug='cool-new-shoe')
        self.assertEqual(product.sizes.count(), 2)
        self.assertEqual(product.total_stock, 5)

    def test_update_replaces_sizes_and_stock(self):
        product = self.make_product()
        ProductSize.objects.create(
            product=product, us=7, eu=40, cm=25, stock=3
        )
        ProductSize.objects.create(
            product=product, us=8, eu=41, cm=26, stock=4
        )
        resp = self.client.patch(
            f'/api/admin/products/{product.pk}/',
            {'sizes': [
                {'us': 7, 'eu': 40, 'cm': 25, 'stock': 9},
                {'us': 9, 'eu': 42.5, 'cm': 27, 'stock': 2},
            ]},
            format='json',
        )
        self.assertEqual(resp.status_code, 200, resp.json())
        product.refresh_from_db()
        self.assertEqual(product.sizes.count(), 2)
        self.assertEqual(
            product.sizes.get(us=7).stock, 9
        )
        self.assertFalse(product.sizes.filter(us=8).exists())
        self.assertTrue(product.sizes.filter(us=9).exists())

    def test_negative_stock_rejected(self):
        resp = self.client.post('/api/admin/products/', {
            'name': 'Bad Stock Shoe',
            'maker_brand': 'nike',
            'price': 100,
            'sizes': [
                {'us': 7, 'eu': 40, 'cm': 25, 'stock': -1},
            ],
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_duplicate_us_sizes_rejected(self):
        resp = self.client.post('/api/admin/products/', {
            'name': 'Dup Shoe',
            'maker_brand': 'nike',
            'price': 100,
            'sizes': [
                {'us': 7, 'eu': 40, 'cm': 25, 'stock': 1},
                {'us': 7, 'eu': 40, 'cm': 25, 'stock': 2},
            ],
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_unknown_size_rejected(self):
        resp = self.client.post('/api/admin/products/', {
            'name': 'Odd Shoe',
            'maker_brand': 'nike',
            'price': 100,
            'sizes': [
                {'us': 99, 'eu': 99, 'cm': 99, 'stock': 1},
            ],
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_list_filters_and_status(self):
        self.make_product(slug='p1', name='Alpha', price=100,
                          is_active=True)
        ProductSize.objects.create(
            product=Product.objects.get(slug='p1'),
            us=7, eu=40, cm=25, stock=50,
        )
        self.make_product(slug='p2', name='Beta', maker_brand='adidas',
                          price=200, is_active=False)
        resp = self.client.get('/api/admin/products/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 2)
        resp = self.client.get('/api/admin/products/?search=alpha')
        self.assertEqual(len(resp.json()), 1)
        resp = self.client.get('/api/admin/products/?brand=adidas')
        self.assertEqual(len(resp.json()), 1)
        resp = self.client.get('/api/admin/products/?status=inactive')
        self.assertEqual(len(resp.json()), 1)
        resp = self.client.get('/api/admin/products/?status=active')
        rows = resp.json()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['status'], 'active')
        self.assertEqual(rows[0]['total_stock'], 50)
        self.assertEqual(rows[0]['size_count'], 1)


class AdminImageTests(AdminAPITestCase):
    def test_invalid_image_type_rejected(self):
        product = self.make_product()
        bad = SimpleUploadedFile(
            'evil.txt', b'this is not an image', content_type='text/plain'
        )
        resp = self.client.post(
            f'/api/admin/products/{product.pk}/images/',
            {'image': bad}, format='multipart',
        )
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(product.images.count(), 0)
