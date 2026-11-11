from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from shop.models import Customer, Product, WishlistItem


class CustomerWishlistTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.product1 = Product.objects.create(
            slug="jordan-4-retro",
            name="ایر جردن ۴ رترو",
            maker_brand="jordan",
            price=6500000,
        )
        self.product2 = Product.objects.create(
            slug="air-jordan-1-mid",
            name="ایر جردن ۱ مید",
            maker_brand="jordan",
            price=4800000,
        )
        self.customer = Customer.objects.create(
            phone="09123334455", first_name="سامان", last_name="کریمی"
        )
        self.user = User.objects.create_user(username="09123334455")
        self.customer.user = self.user
        self.customer.save()

    def test_unauthenticated_forbidden(self):
        url = reverse("customer-wishlist-list")
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_wishlist_toggle_add_and_remove(self):
        self.client.force_authenticate(user=self.user)
        toggle_url = reverse("customer-wishlist-toggle")

        # 1. Add product1 to favorites
        resp1 = self.client.post(toggle_url, {"slug": self.product1.slug})
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)
        self.assertTrue(resp1.data["isFavorite"])
        self.assertEqual(resp1.data["count"], 1)
        self.assertTrue(
            WishlistItem.objects.filter(
                customer=self.customer, product=self.product1
            ).exists()
        )

        # 2. Add product2 to favorites
        resp2 = self.client.post(toggle_url, {"slug": self.product2.slug})
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertTrue(resp2.data["isFavorite"])
        self.assertEqual(resp2.data["count"], 2)

        # 3. List favorites
        list_url = reverse("customer-wishlist-list")
        list_resp = self.client.get(list_url)
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(list_resp.data["count"], 2)
        slugs = [p["slug"] for p in list_resp.data["results"]]
        self.assertIn("jordan-4-retro", slugs)
        self.assertIn("air-jordan-1-mid", slugs)

        # 4. Remove product1 by toggling again
        resp3 = self.client.post(toggle_url, {"slug": self.product1.slug})
        self.assertEqual(resp3.status_code, status.HTTP_200_OK)
        self.assertFalse(resp3.data["isFavorite"])
        self.assertEqual(resp3.data["count"], 1)
        self.assertFalse(
            WishlistItem.objects.filter(
                customer=self.customer, product=self.product1
            ).exists()
        )

    def test_wishlist_sync_from_guest(self):
        self.client.force_authenticate(user=self.user)
        sync_url = reverse("customer-wishlist-sync")

        resp = self.client.post(
            sync_url, {"slugs": [self.product1.slug, self.product2.slug]}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["count"], 2)
        self.assertEqual(
            WishlistItem.objects.filter(customer=self.customer).count(), 2
        )
