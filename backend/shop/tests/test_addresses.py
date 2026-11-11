from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from shop.models import Customer, CustomerAddress


class CustomerAddressTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Customer 1
        self.user1 = User.objects.create_user(username="09121111111", password="password123")
        self.customer1 = Customer.objects.create(
            user=self.user1,
            phone="09121111111",
            first_name="علی",
            last_name="محمدی",
            city="تهران",
        )
        self.token1 = Token.objects.create(user=self.user1)

        # Customer 2
        self.user2 = User.objects.create_user(username="09122222222", password="password123")
        self.customer2 = Customer.objects.create(
            user=self.user2,
            phone="09122222222",
            first_name="سارا",
            last_name="رضایی",
            city="اصفهان",
        )
        self.token2 = Token.objects.create(user=self.user2)

    def test_addresses_require_auth(self):
        res = self.client.get("/api/customer/addresses/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        res = self.client.post("/api/customer/addresses/", {})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_and_list_address(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token1.key}")

        payload = {
            "title": "خانه",
            "recipientName": "علی محمدی",
            "recipientPhone": "09121111111",
            "province": "تهران",
            "city": "تهران",
            "address": "خیابان ولیعصر، کوچه نصر، پلاک ۱۲",
            "buildingNumber": "12",
            "unit": "4",
            "postalCode": "1234567890",
        }
        res = self.client.post("/api/customer/addresses/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        data = res.json()
        self.assertEqual(data["title"], "خانه")
        self.assertEqual(data["recipientName"], "علی محمدی")
        self.assertEqual(data["postalCode"], "1234567890")
        self.assertTrue(data["isDefault"], "First address should default to isDefault=True")

        # List
        res_list = self.client.get("/api/customer/addresses/")
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)
        self.assertEqual(res_list.json()["count"], 1)

    def test_default_address_switch(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token1.key}")

        addr1 = CustomerAddress.objects.create(
            customer=self.customer1,
            title="خانه",
            recipient_name="علی محمدی",
            recipient_phone="09121111111",
            province="تهران",
            city="تهران",
            address="خیابان آزادی",
            is_default=True,
        )

        payload2 = {
            "title": "محل کار",
            "recipientName": "علی محمدی",
            "recipientPhone": "09121111111",
            "province": "تهران",
            "city": "تهران",
            "address": "میدان ونک، برج نگار",
            "isDefault": True,
        }
        res = self.client.post("/api/customer/addresses/", payload2, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        addr1.refresh_from_db()
        self.assertFalse(addr1.is_default)

        # Set addr1 back to default via endpoint
        res_def = self.client.post(f"/api/customer/addresses/{addr1.id}/set-default/")
        self.assertEqual(res_def.status_code, status.HTTP_200_OK)
        addr1.refresh_from_db()
        self.assertTrue(addr1.is_default)

    def test_update_and_delete_address(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token1.key}")

        addr = CustomerAddress.objects.create(
            customer=self.customer1,
            title="خانه",
            recipient_name="علی محمدی",
            recipient_phone="09121111111",
            province="تهران",
            city="تهران",
            address="خیابان آزادی",
            is_default=True,
        )

        res_patch = self.client.patch(
            f"/api/customer/addresses/{addr.id}/",
            {"title": "منزل پدری", "buildingNumber": "45"},
            format="json",
        )
        self.assertEqual(res_patch.status_code, status.HTTP_200_OK)
        addr.refresh_from_db()
        self.assertEqual(addr.title, "منزل پدری")
        self.assertEqual(addr.building_number, "45")

        res_del = self.client.delete(f"/api/customer/addresses/{addr.id}/")
        self.assertEqual(res_del.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(CustomerAddress.objects.filter(pk=addr.id).exists())

    def test_isolation_between_customers(self):
        # Customer 1 address
        addr1 = CustomerAddress.objects.create(
            customer=self.customer1,
            title="خانه ۱",
            recipient_name="علی محمدی",
            recipient_phone="09121111111",
            province="تهران",
            city="تهران",
            address="تهران خیابان آزادی",
        )

        # Customer 2 tries to access customer 1's address
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token2.key}")
        res_get = self.client.get(f"/api/customer/addresses/{addr1.id}/")
        self.assertEqual(res_get.status_code, status.HTTP_404_NOT_FOUND)

        res_del = self.client.delete(f"/api/customer/addresses/{addr1.id}/")
        self.assertEqual(res_del.status_code, status.HTTP_404_NOT_FOUND)

    def test_validation(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token1.key}")

        # Invalid postal code (not 10 digits)
        payload = {
            "recipientName": "علی",
            "recipientPhone": "09121111111",
            "province": "تهران",
            "city": "تهران",
            "address": "آدرس تستی",
            "postalCode": "123",
        }
        res = self.client.post("/api/customer/addresses/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("postal_code", res.json()["errors"])
