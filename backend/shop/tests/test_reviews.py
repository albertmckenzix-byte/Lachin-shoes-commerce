from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from shop.models import Customer, Order, OrderItem, Product, ProductReview


class ProductReviewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.product = Product.objects.create(
            slug="nike-air-max",
            name="نایک ایر مکس",
            maker_brand="nike",
            price=3500000,
            rating=5.0,
            review_count=0,
        )
        self.staff_user = User.objects.create_user(
            username="admin", password="password", is_staff=True
        )

    def test_get_empty_reviews(self):
        url = reverse("product-reviews", kwargs={"slug": self.product.slug})
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["totalReviews"], 0)
        self.assertEqual(resp.data["results"], [])

    def test_post_review_and_auto_rating_update(self):
        url = reverse("product-reviews", kwargs={"slug": self.product.slug})
        
        # 1. Post a 5-star review
        resp1 = self.client.post(url, {
            "name": "علی رضایی",
            "rating": 5,
            "title": "عالی و راحت",
            "comment": "کتونی بسیار نرم و با کیفیتی بود، کاملاً راضی‌ام.",
        })
        self.assertEqual(resp1.status_code, status.HTTP_201_CREATED)

        self.product.refresh_from_db()
        self.assertEqual(self.product.review_count, 1)
        self.assertEqual(self.product.rating, 5.0)

        # 2. Post a 3-star review
        resp2 = self.client.post(url, {
            "name": "مریم احمدی",
            "rating": 3,
            "title": "متوسط",
            "comment": "قالبش یکم باریکه، ولی ظاهرش خوبه.",
        })
        self.assertEqual(resp2.status_code, status.HTTP_201_CREATED)

        self.product.refresh_from_db()
        self.assertEqual(self.product.review_count, 2)
        # Average of 5 and 3 is 4.0
        self.assertEqual(self.product.rating, 4.0)

        # 3. Check public review list
        get_resp = self.client.get(url)
        self.assertEqual(get_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(get_resp.data["totalReviews"], 2)
        self.assertEqual(get_resp.data["averageRating"], 4.0)
        self.assertEqual(get_resp.data["distribution"]["5"], 1)
        self.assertEqual(get_resp.data["distribution"]["3"], 1)

    def test_verified_buyer_flag(self):
        # Create customer and paid order with this product
        customer = Customer.objects.create(
            phone="09120000000", first_name="محسن", last_name="کمالی"
        )
        user = User.objects.create_user(username="09120000000")
        customer.user = user
        customer.save()

        order = Order.objects.create(
            customer=customer,
            first_name="محسن",
            last_name="کمالی",
            phone="09120000000",
            city="تهران",
            address="خیابان آزادی",
            total=3500000,
            payment_status=Order.PaymentStatus.PAID,
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            product_name=self.product.name,
            product_slug=self.product.slug,
            size_us=9.0,
            size_eu=42.5,
            unit_price=3500000,
            quantity=1,
            line_total=3500000,
        )

        # Log in as user and submit review
        self.client.force_authenticate(user=user)
        url = reverse("product-reviews", kwargs={"slug": self.product.slug})
        resp = self.client.post(url, {
            "rating": 5,
            "title": "خرید عالی",
            "comment": "واقعاً از خرید این کفش راضی هستم.",
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(resp.data["isVerifiedBuyer"])
        self.assertEqual(resp.data["name"], "محسن کمالی")

    def test_admin_review_management(self):
        # Create review
        review = ProductReview.objects.create(
            product=self.product,
            name="تست",
            rating=1,
            comment="بد بود",
            status="approved",
        )
        self.product.refresh_from_db()
        self.assertEqual(self.product.rating, 1.0)

        # Admin rejects review
        self.client.force_authenticate(user=self.staff_user)
        detail_url = reverse("admin-reviews-detail", kwargs={"pk": review.pk})
        patch_resp = self.client.patch(detail_url, {
            "status": "rejected",
            "adminReply": "با تشکر، جهت پیگیری با پشتیبانی تماس بگیرید.",
        })
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_resp.data["status"], "rejected")

        # After rejection, product rating recalculates (no approved reviews left -> 5.0 default, count 0)
        self.product.refresh_from_db()
        self.assertEqual(self.product.review_count, 0)
        self.assertEqual(self.product.rating, 5.0)
