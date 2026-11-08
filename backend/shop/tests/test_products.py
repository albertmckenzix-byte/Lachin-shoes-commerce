from decimal import Decimal
from io import BytesIO

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient, APITestCase
from openpyxl import load_workbook

from shop.models import Customer, Order, Product, ProductSize, StoreSettings
from shop.services.orders import create_order, set_payment_status

STAFF_PASSWORD = 'staff-pass-123'
USER_PASSWORD = 'user-pass-123'


def make_customer(phone="09121234567", first_name="علی", last_name="رضایی", city="تهران"):
    return Customer.objects.create(
        phone=phone,
        first_name=first_name,
        last_name=last_name,
        city=city,
    )


def make_product(slug="air-max", price=1_000_000, is_active=True):
    return Product.objects.create(
        slug=slug,
        name=f"Shoe {slug}",
        maker_brand="nike",
        price=price,
        is_active=is_active,
    )


def make_size(product, us=9.0, eu=43.0, cm=27.0, stock=5, is_active=True):
    return ProductSize.objects.create(
        product=product,
        us=Decimal(str(us)),
        eu=Decimal(str(eu)),
        cm=Decimal(str(cm)),
        stock=stock,
        is_active=is_active,
    )


def base_data(slug="air-max", size_us=9.0, quantity=1, **extra):
    payload = {
        "first_name": "علی",
        "last_name": "رضایی",
        "phone": "09121234567",
        "city": "تهران",
        "address": "خیابان آزادی",
        "delivery_method": "standard",
        "items": [{"slug": slug, "size_us": size_us, "quantity": quantity}],
    }
    # Update with extra, but allow phone to be overridden
    for key, value in extra.items():
        payload[key] = value
    return payload


def make_store_settings(**kwargs):
    """Create/update StoreSettings singleton with given overrides."""
    obj = StoreSettings.get()
    for k, v in kwargs.items():
        setattr(obj, k, v)
    obj.save()
    return obj


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


# =============================================================================
# Admin customer API tests
# =============================================================================

class AdminCustomerAPITests(APITestCase):
    """Tests for admin customer endpoints."""

    def setUp(self):
        self.client = APIClient()
        make_store_settings(
            free_shipping_threshold=5_000_000,
            standard_fee=0,
            express_fee=500_000,
            pending_order_minutes=30,
        )

        # Create staff user
        self.staff = User.objects.create_user(
            username='admin', password='admin123', is_staff=True
        )
        self.client.force_authenticate(user=self.staff)

    def _create_order_for_customer(self, customer, slug="air-max"):
        """Helper to create an order for a customer."""
        product = make_product(slug=slug)
        make_size(product, stock=5)
        order = create_order(
            {
                "first_name": customer.first_name,
                "last_name": customer.last_name,
                "phone": customer.phone,
                "city": customer.city,
                "address": "خیابان آزادی",
                "delivery_method": "standard",
                "items": [{"slug": slug, "size_us": 9.0, "quantity": 1}],
            },
            actor="admin"
        )
        return order

    def test_admin_customers_list_requires_auth(self):
        self.client.force_authenticate(user=None)
        resp = self.client.get('/api/admin/customers/')
        self.assertEqual(resp.status_code, 401)

    def test_admin_customers_list_returns_paginated_data(self):
        make_customer(phone="09121234567")
        make_customer(phone="09121234568")

        resp = self.client.get('/api/admin/customers/')
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertIn('results', body)
        self.assertEqual(len(body['results']), 2)
        self.assertIn('counts', body)
        self.assertIn('cities', body)

    def test_admin_customers_list_masks_phone(self):
        customer = make_customer(phone="09121234567")
        resp = self.client.get('/api/admin/customers/')
        self.assertEqual(resp.status_code, 200)
        phone = resp.json()['results'][0]['phone']
        self.assertEqual(phone, '0912***4567')

    def test_admin_customers_list_search_filter(self):
        make_customer(phone="09121234567", first_name="علی", last_name="رضایی")
        make_customer(phone="09121234568", first_name="رضا", last_name="محمدی")

        resp = self.client.get('/api/admin/customers/?search=علی')
        self.assertEqual(len(resp.json()['results']), 1)
        resp = self.client.get('/api/admin/customers/?search=0912')
        self.assertEqual(len(resp.json()['results']), 2)

    def test_admin_customers_list_city_filter(self):
        make_customer(phone="09121234567", city="تهران")
        make_customer(phone="09121234568", city="اصفهان")

        resp = self.client.get('/api/admin/customers/?city=تهران')
        self.assertEqual(len(resp.json()['results']), 1)

    def test_admin_customers_list_type_filter(self):
        customer1 = make_customer(phone="09121234567")
        customer2 = make_customer(phone="09121234568")

        # One order for customer1
        self._create_order_for_customer(customer1, slug="air-max")
        # Two orders for customer2
        self._create_order_for_customer(customer2, slug="air-max-2")
        self._create_order_for_customer(customer2, slug="air-max-3")

        resp = self.client.get('/api/admin/customers/?type=new')
        results = resp.json()['results']
        new_customers = [r for r in results if r['type'] == 'new']
        self.assertEqual(len(new_customers), 1)

        resp = self.client.get('/api/admin/customers/?type=returning')
        results = resp.json()['results']
        returning_customers = [r for r in results if r['type'] == 'returning']
        self.assertEqual(len(returning_customers), 1)

    def test_admin_customers_list_ordering(self):
        customer1 = make_customer(phone="09121234567")
        customer2 = make_customer(phone="09121234568")

        self._create_order_for_customer(customer1, slug="air-max")
        self._create_order_for_customer(customer2, slug="air-max-2")

        resp = self.client.get('/api/admin/customers/?ordering=last_order')
        self.assertEqual(resp.status_code, 200)

    def test_admin_customers_list_counts(self):
        customer1 = make_customer(phone="09121234567")
        customer2 = make_customer(phone="09121234568")

        self._create_order_for_customer(customer1, slug="air-max")
        self._create_order_for_customer(customer2, slug="air-max-2")
        self._create_order_for_customer(customer2, slug="air-max-3")

        resp = self.client.get('/api/admin/customers/')
        counts = resp.json()['counts']
        self.assertEqual(counts['all'], 2)
        self.assertEqual(counts['new'], 1)
        self.assertEqual(counts['returning'], 1)

    def test_admin_customers_list_cities(self):
        make_customer(phone="09121234567", city="تهران")
        make_customer(phone="09121234568", city="اصفهان")
        make_customer(phone="09121234569", city="شیراز")

        resp = self.client.get('/api/admin/customers/')
        cities = resp.json()['cities']
        self.assertEqual(len(cities), 3)
        self.assertIn('تهران', cities)

    def test_admin_customer_detail_shows_full_phone(self):
        customer = make_customer(phone="09121234567")
        resp = self.client.get(f'/api/admin/customers/{customer.id}/')
        self.assertEqual(resp.status_code, 200)
        phone = resp.json()['phone']
        self.assertEqual(phone, '09121234567')

    def test_admin_customer_detail_includes_orders(self):
        customer = make_customer(phone="09121234567")
        self._create_order_for_customer(customer, slug="air-max")
        self._create_order_for_customer(customer, slug="air-max-2")

        resp = self.client.get(f'/api/admin/customers/{customer.id}/')
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertIn('orders', body)
        self.assertEqual(len(body['orders']), 2)

    def test_admin_customer_create(self):
        resp = self.client.post(
            '/api/admin/customers/create/',
            {
                'first_name': 'محمد',
                'last_name': 'احمدی',
                'phone': '09129876543',
                'email': 'mohammad@example.com',
                'city': 'مشهد',
            },
            format='json'
        )
        self.assertEqual(resp.status_code, 201)
        body = resp.json()
        self.assertEqual(body['name'], 'محمد احمدی')
        self.assertEqual(body['phone'], '09129876543')

    def test_admin_customer_update(self):
        customer = make_customer(phone="09121234567")
        resp = self.client.patch(
            f'/api/admin/customers/{customer.id}/update/',
            {
                'first_name': 'علی',
                'last_name': 'کریمی',
                'email': 'ali@example.com',
                'city': 'تبریز',
            },
            format='json'
        )
        self.assertEqual(resp.status_code, 200)
        customer.refresh_from_db()
        self.assertEqual(customer.first_name, 'علی')
        self.assertEqual(customer.city, 'تبریز')

    def test_admin_customer_export_returns_xlsx(self):
        make_customer(phone="09121234567")
        resp = self.client.get('/api/admin/customers/export/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(
            resp['Content-Type'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        self.assertIn('attachment', resp['Content-Disposition'])

    def test_admin_customer_export_with_filters(self):
        make_customer(phone="09121234567", city="تهران")
        make_customer(phone="09121234568", city="اصفهان")

        resp = self.client.get('/api/admin/customers/export/?city=تهران')
        self.assertEqual(resp.status_code, 200)

        # Verify Excel file is valid
        wb = load_workbook(BytesIO(resp.content))
        ws = wb.active
        # Should have header row + 1 data row
        self.assertEqual(ws.max_row, 2)
