from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from shop.models import Coupon, Order, Product, ProductSize, StoreSettings
from shop.services.orders import create_order


class StoreSettingsAndCouponsTests(APITestCase):
    def setUp(self):
        # Create staff user
        self.staff_user = User.objects.create_user(
            username="adminuser", password="adminpassword123", is_staff=True
        )
        self.staff_token = Token.objects.create(user=self.staff_user)

        # Create normal non-staff user
        self.normal_user = User.objects.create_user(
            username="normaluser", password="normalpassword123", is_staff=False
        )
        self.normal_token = Token.objects.create(user=self.normal_user)

        # Ensure StoreSettings is reset
        self.settings = StoreSettings.get()
        self.settings.free_shipping_threshold = 5_000_000
        self.settings.standard_fee = 0
        self.settings.express_fee = 500_000
        self.settings.pending_order_minutes = 30
        self.settings.save()

        # Create a test product
        self.product = Product.objects.create(
            slug="jordan-test-shoe",
            name="Jordan Test Shoe",
            maker_brand="jordan",
            price=1_000_000,
            is_active=True,
        )
        ProductSize.objects.create(
            product=self.product,
            us=9.0,
            eu=42.5,
            cm=27.0,
            stock=10,
            is_active=True,
        )

    # -------------------------------------------------------------------------
    # Store Settings Tests
    # -------------------------------------------------------------------------

    def test_settings_permissions(self):
        # Anonymous users denied on admin endpoint
        res = self.client.get("/api/admin/settings/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        res = self.client.patch("/api/admin/settings/", {"standardFee": 10000}, format="json")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        # Non-staff users denied
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.normal_token.key}")
        res = self.client.get("/api/admin/settings/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        res = self.client.patch("/api/admin/settings/", {"standardFee": 10000}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_settings_get_and_patch_staff(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.staff_token.key}")

        # GET
        res = self.client.get("/api/admin/settings/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("freeShippingThreshold", res.data)
        self.assertIn("standardFee", res.data)
        self.assertIn("expressFee", res.data)
        self.assertIn("pendingOrderMinutes", res.data)
        self.assertEqual(res.data["freeShippingThreshold"], 5_000_000)

        # PATCH
        patch_payload = {
            "freeShippingThreshold": 6_000_000,
            "standardFee": 40_000,
            "expressFee": 600_000,
            "pendingOrderMinutes": 45,
        }
        res = self.client.patch("/api/admin/settings/", patch_payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["freeShippingThreshold"], 6_000_000)
        self.assertEqual(res.data["standardFee"], 40_000)
        self.assertEqual(res.data["expressFee"], 600_000)
        self.assertEqual(res.data["pendingOrderMinutes"], 45)

        # Verify DB updated
        s = StoreSettings.get()
        self.assertEqual(s.free_shipping_threshold, 6_000_000)
        self.assertEqual(s.standard_fee, 40_000)
        self.assertEqual(s.express_fee, 600_000)
        self.assertEqual(s.pending_order_minutes, 45)

    def test_settings_validation_bounds(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.staff_token.key}")

        # Negative freeShippingThreshold
        res = self.client.patch("/api/admin/settings/", {"freeShippingThreshold": -100}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Negative standardFee
        res = self.client.patch("/api/admin/settings/", {"standardFee": -1}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Negative expressFee
        res = self.client.patch("/api/admin/settings/", {"expressFee": -1}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Zero is allowed for all fees
        res = self.client.patch(
            "/api/admin/settings/",
            {"freeShippingThreshold": 0, "standardFee": 0, "expressFee": 0},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # pendingOrderMinutes < 5
        res = self.client.patch("/api/admin/settings/", {"pendingOrderMinutes": 4}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # pendingOrderMinutes > 1440
        res = self.client.patch("/api/admin/settings/", {"pendingOrderMinutes": 1441}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Non-integer / float rejected
        res = self.client.patch("/api/admin/settings/", {"pendingOrderMinutes": 15.5}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_public_settings_endpoint(self):
        # Public GET without token
        self.client.credentials()
        res = self.client.get("/api/settings/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["freeShippingThreshold"], 5_000_000)

        # Admin PATCH
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.staff_token.key}")
        res_patch = self.client.patch("/api/admin/settings/", {"freeShippingThreshold": 8_000_000}, format="json")
        self.assertEqual(res_patch.status_code, status.HTTP_200_OK)

        # Immediately reflected on public endpoint
        self.client.credentials()
        res = self.client.get("/api/settings/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["freeShippingThreshold"], 8_000_000)

    def test_settings_changes_affect_new_orders_only(self):
        # Configure initial settings: standard fee = 30,000, threshold = 10,000,000
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.staff_token.key}")
        res_patch = self.client.patch(
            "/api/admin/settings/",
            {"freeShippingThreshold": 10_000_000, "standardFee": 30_000},
            format="json",
        )
        self.assertEqual(res_patch.status_code, status.HTTP_200_OK)

        order_data_1 = {
            "first_name": "علی",
            "last_name": "احمدی",
            "phone": "09121111111",
            "city": "تهران",
            "address": "خیابان آزادی پلاک ۱",
            "delivery_method": "standard",
            "items": [{"slug": self.product.slug, "size_us": 9.0, "quantity": 1}],
        }
        order1 = create_order(order_data_1)
        self.assertEqual(order1.shipping_fee, 30_000)
        self.assertEqual(order1.total, 1_030_000)

        # Now change settings: standard fee = 70,000
        res_patch2 = self.client.patch("/api/admin/settings/", {"standardFee": 70_000}, format="json")
        self.assertEqual(res_patch2.status_code, status.HTTP_200_OK)

        # Order 1 must NOT be changed
        order1.refresh_from_db()
        self.assertEqual(order1.shipping_fee, 30_000)
        self.assertEqual(order1.total, 1_030_000)

        # New Order 2 must use the new 70,000 standard fee
        order_data_2 = {
            "first_name": "رضا",
            "last_name": "محمدی",
            "phone": "09122222222",
            "city": "تهران",
            "address": "خیابان انقلاب پلاک ۲",
            "delivery_method": "standard",
            "items": [{"slug": self.product.slug, "size_us": 9.0, "quantity": 1}],
        }
        order2 = create_order(order_data_2)
        self.assertEqual(order2.shipping_fee, 70_000)
        self.assertEqual(order2.total, 1_070_000)

    # -------------------------------------------------------------------------
    # Coupon Tests
    # -------------------------------------------------------------------------

    def test_coupon_permissions(self):
        # Anonymous users denied
        res = self.client.get("/api/admin/coupons/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        res = self.client.post("/api/admin/coupons/", {"code": "TEST10", "percent": 10}, format="json")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        # Non-staff users denied
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.normal_token.key}")
        res = self.client.get("/api/admin/coupons/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        res = self.client.post("/api/admin/coupons/", {"code": "TEST10", "percent": 10}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_coupon_create_validation_and_uniqueness(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.staff_token.key}")

        # Valid create
        res = self.client.post(
            "/api/admin/coupons/",
            {"code": "summer20", "percent": 20, "usageLimit": 50},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["code"], "SUMMER20")
        self.assertEqual(res.data["percent"], 20)
        self.assertEqual(res.data["usageLimit"], 50)
        self.assertEqual(res.data["status"], "active")

        # Duplicate code case-insensitive
        res = self.client.post(
            "/api/admin/coupons/",
            {"code": "SuMmEr20", "percent": 30},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Invalid characters
        res = self.client.post(
            "/api/admin/coupons/",
            {"code": "DISCOUNT 10!", "percent": 10},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Code too short (<3)
        res = self.client.post("/api/admin/coupons/", {"code": "AB", "percent": 10}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Code too long (>32)
        res = self.client.post(
            "/api/admin/coupons/", {"code": "A" * 33, "percent": 10}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Percent bounds: 0 rejected, 101 rejected, non-integer rejected
        res = self.client.post("/api/admin/coupons/", {"code": "PZERO", "percent": 0}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        res = self.client.post("/api/admin/coupons/", {"code": "P101", "percent": 101}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        res = self.client.post("/api/admin/coupons/", {"code": "PFLOAT", "percent": 12.5}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # expiresAt in the past for new coupon rejected
        past_date = (timezone.now() - timezone.timedelta(days=1)).isoformat()
        res = self.client.post(
            "/api/admin/coupons/",
            {"code": "PASTDATE", "percent": 10, "expiresAt": past_date},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_coupon_status_precedence_and_filters(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.staff_token.key}")

        now = timezone.now()
        past = now - timezone.timedelta(days=2)
        future = now + timezone.timedelta(days=10)

        # 1. Inactive coupon
        c_inactive = Coupon.objects.create(
            code="INACTIVE10", percent=10, is_active=False
        )
        # 2. Expired coupon
        c_expired = Coupon.objects.create(
            code="EXPIRED10", percent=10, is_active=True, expires_at=past
        )
        # 3. Exhausted coupon
        c_exhausted = Coupon.objects.create(
            code="FULL10", percent=10, is_active=True, usage_limit=5, used_count=5
        )
        # 4. Active coupon
        c_active = Coupon.objects.create(
            code="ACTIVE10", percent=10, is_active=True, expires_at=future, usage_limit=100, used_count=2
        )

        # GET all
        res = self.client.get("/api/admin/coupons/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["counts"]["all"], 4)
        self.assertEqual(res.data["counts"]["active"], 1)
        self.assertEqual(res.data["counts"]["inactive"], 1)
        self.assertEqual(res.data["counts"]["expired"], 2)  # expired + exhausted
        self.assertEqual(res.data["summary"]["totalUses"], 7)

        # GET status=active
        res = self.client.get("/api/admin/coupons/?status=active")
        self.assertEqual(len(res.data["results"]), 1)
        self.assertEqual(res.data["results"][0]["code"], "ACTIVE10")

        # GET status=inactive
        res = self.client.get("/api/admin/coupons/?status=inactive")
        self.assertEqual(len(res.data["results"]), 1)
        self.assertEqual(res.data["results"][0]["code"], "INACTIVE10")

        # GET status=expired (should include expired and exhausted)
        res = self.client.get("/api/admin/coupons/?status=expired")
        self.assertEqual(len(res.data["results"]), 2)
        codes = {item["code"] for item in res.data["results"]}
        self.assertEqual(codes, {"EXPIRED10", "FULL10"})

        # Search filter
        res = self.client.get("/api/admin/coupons/?search=FULL")
        self.assertEqual(len(res.data["results"]), 1)
        self.assertEqual(res.data["results"][0]["code"], "FULL10")

    def test_coupon_patch_rules_and_lock_after_use(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.staff_token.key}")

        coupon = Coupon.objects.create(
            code="UNUSED10", percent=10, is_active=True, usage_limit=10, used_count=0
        )

        # Toggle isActive
        res = self.client.patch(f"/api/admin/coupons/{coupon.id}/", {"isActive": False}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(res.data["isActive"])
        self.assertEqual(res.data["status"], "inactive")

        # Code can be edited while used_count == 0
        res = self.client.patch(f"/api/admin/coupons/{coupon.id}/", {"code": "RENAMED10"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["code"], "RENAMED10")

        # Now simulate used_count > 0
        coupon.refresh_from_db()
        coupon.used_count = 5
        coupon.save()

        # Changing code must be rejected
        res = self.client.patch(f"/api/admin/coupons/{coupon.id}/", {"code": "TRYCHANGE10"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # usageLimit lower than used_count must be rejected
        res = self.client.patch(f"/api/admin/coupons/{coupon.id}/", {"usageLimit": 4}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # usageLimit >= used_count accepted
        res = self.client.patch(f"/api/admin/coupons/{coupon.id}/", {"usageLimit": 8}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["usageLimit"], 8)

    def test_public_coupon_check_rejects_inactive_expired_exhausted(self):
        self.client.credentials()
        now = timezone.now()

        # Inactive
        Coupon.objects.create(code="INACT", percent=15, is_active=False)
        res = self.client.post("/api/coupons/check/", {"code": "INACT", "subtotal": 1_000_000}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(res.data["valid"])

        # Expired
        Coupon.objects.create(
            code="EXPD",
            percent=15,
            is_active=True,
            expires_at=now - timezone.timedelta(days=1),
        )
        res = self.client.post("/api/coupons/check/", {"code": "EXPD", "subtotal": 1_000_000}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(res.data["valid"])

        # Exhausted
        Coupon.objects.create(
            code="FULL",
            percent=15,
            is_active=True,
            usage_limit=3,
            used_count=3,
        )
        res = self.client.post("/api/coupons/check/", {"code": "FULL", "subtotal": 1_000_000}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(res.data["valid"])

        # Valid active
        Coupon.objects.create(
            code="VALID15",
            percent=15,
            is_active=True,
            usage_limit=10,
            used_count=2,
        )
        res = self.client.post("/api/coupons/check/", {"code": "VALID15", "subtotal": 1_000_000}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["valid"])
        self.assertEqual(res.data["percent"], 15)
        self.assertEqual(res.data["discount"], 150_000)

