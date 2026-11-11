from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from shop.models import Customer, OTPCode


class CustomerAuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_send_otp_success(self):
        url = reverse('customer-otp-send')
        resp = self.client.post(url, {'phone': '09121234567'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data.get('success'))

        otp = OTPCode.objects.filter(phone='09121234567', is_used=False).first()
        self.assertIsNotNone(otp)
        self.assertEqual(len(otp.code), 5)

    def test_verify_otp_success(self):
        # 1. Send OTP
        send_url = reverse('customer-otp-send')
        self.client.post(send_url, {'phone': '09121234567'})
        otp = OTPCode.objects.filter(phone='09121234567', is_used=False).first()
        code = otp.code

        # 2. Verify OTP
        verify_url = reverse('customer-otp-verify')
        verify_resp = self.client.post(verify_url, {'phone': '09121234567', 'code': code})
        self.assertEqual(verify_resp.status_code, status.HTTP_200_OK)
        self.assertIn('token', verify_resp.data)
        self.assertIn('customer', verify_resp.data)
        self.assertEqual(verify_resp.data['customer']['phone'], '09121234567')

        # Check OTP is now used
        otp = OTPCode.objects.get(phone='09121234567', code=code)
        self.assertTrue(otp.is_used)

    def test_verify_otp_invalid_code(self):
        send_url = reverse('customer-otp-send')
        self.client.post(send_url, {'phone': '09121234567'})

        verify_url = reverse('customer-otp-verify')
        verify_resp = self.client.post(verify_url, {'phone': '09121234567', 'code': '00000'})
        self.assertEqual(verify_resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', verify_resp.data)

    def test_customer_register_and_me(self):
        reg_url = reverse('customer-register')
        reg_resp = self.client.post(reg_url, {
            'phone': '09129876543',
            'first_name': 'علی',
            'last_name': 'اکبری',
            'email': 'ali@example.com',
            'password': 'password123',
        })
        self.assertEqual(reg_resp.status_code, status.HTTP_201_CREATED)
        token = reg_resp.data['token']

        # Call /api/auth/me/
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        me_url = reverse('customer-me')
        me_resp = self.client.get(me_url)
        self.assertEqual(me_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(me_resp.data['firstName'], 'علی')
        self.assertEqual(me_resp.data['lastName'], 'اکبری')

        # Test patch /api/auth/me/
        patch_resp = self.client.patch(me_url, {'city': 'تهران'})
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_resp.data['city'], 'تهران')

    def test_password_login_success(self):
        # Register user with password
        reg_url = reverse('customer-register')
        self.client.post(reg_url, {
            'phone': '09121112233',
            'first_name': 'رضا',
            'last_name': 'رضایی',
            'password': 'secret_password',
        })

        # Login with password
        login_url = reverse('customer-login')
        login_resp = self.client.post(login_url, {
            'phone': '09121112233',
            'password': 'secret_password',
        })
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        self.assertIn('token', login_resp.data)
        self.assertEqual(login_resp.data['customer']['firstName'], 'رضا')
