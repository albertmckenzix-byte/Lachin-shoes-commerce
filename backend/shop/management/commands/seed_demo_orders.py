"""
Management command to seed demo orders for testing the admin dashboard.
Only runs when DEBUG=True.
"""
import random
from decimal import Decimal
from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

from shop.models import Product, ProductSize, Order, Customer
from shop.services.orders import create_order, change_order_status, set_payment_status

# Persian names
FIRST_NAMES = [
    "علی", "رضا", "محمد", "حسین", "مهدی", "امیر", "سامان", "پرهام",
    "سینا", "کیان", "آرین", "ایمان", "بهنام", "عرفان", "فرهاد",
    "سارا", "مریم", "زهرا", "فاطمه", "نازنین", "سپهر", "الناز",
    "روکسانا", "محدثه", "آتنا", "ترانه", "نسترن", "میترا",
]

LAST_NAMES = [
    "رضایی", "محمدی", "حسینی", "کریمی", "احمدی", "جعفری", "رستمی",
    "باهنر", "نوری", "صادقی", "موسوی", "قاسمی", "تقوی", "یوسفی",
    "کاظمی", "عباسی", "پورمحمد", "شریفی", "کمالی", "مرادی",
]

# Iranian cities
CITIES = [
    "تهران", "اصفهان", "مشهد", "شیراز", "تبریز", "کرج", "قم",
    "اهواز", "رشت", "کرمانشاه", "همدان", "ارومیه", "زنجان",
    "ساری", "یزد", "اراک", "قزوین", "اردبیل", "بندرعباس",
    "سنندج", "کرمان", "زاهدان", "شهرکرد", "البرز", "ایلام",
]

# Addresses
ADDRESSES = [
    "خیابان آزادی، کوچه گل، پلاک 12",
    "خیابان ولیعصر، نرسیده به میدان ونک، ساختمان سرو، طبقه 3",
    "خیابان شریعتی، تقاطع مطهری، پلاک 45",
    "خیابان انقلاب، خیابان کارگر، کوچه بهار، پلاک 8",
    "بولوار شهید بهشتی، خیابان فردوسی، پلاک 23",
    "خیابان طالقانی، میدان ونک، خیابان فلسطین، پلاک 67",
    "خیابان سعدی، بازار، سرای علوی، دکه 14",
    "خیابان جمهوری، نرسیده به میدان حسن‌آباد، پلاک 19",
    "خیابان امام خمینی، چهارراه سلطنت‌آباد، پلاک 33",
    "خیابان ولیعصر، میدان ونک، خیابان زاکانی، پلاک 11",
]


class Command(BaseCommand):
    help = 'Seed demo orders for dashboard testing (DEBUG mode only)'

    def handle(self, *args, **options):
        if not settings.DEBUG:
            self.stdout.write(
                self.style.ERROR('This command only runs in DEBUG mode.')
            )
            return

        # Check if products exist
        if Product.objects.count() == 0:
            self.stdout.write(
                self.style.ERROR('No products found. Run seed_products first.')
            )
            return

        # Get active products with sizes
        products = list(Product.objects.filter(
            is_active=True
        ).prefetch_related('sizes'))

        if not products:
            self.stdout.write(
                self.style.ERROR('No active products with sizes found.')
            )
            return

        # Generate customers
        self.stdout.write('Creating demo customers...')
        customers = []
        for i in range(40):
            first_name = random.choice(FIRST_NAMES)
            last_name = random.choice(LAST_NAMES)
            phone = f"09{random.randint(10, 99)}{random.randint(1000000, 9999999)}"
            city = random.choice(CITIES)

            customer, created = Customer.objects.get_or_create(
                phone=phone,
                defaults={
                    'first_name': first_name,
                    'last_name': last_name,
                    'city': city,
                }
            )
            customers.append(customer)

        self.stdout.write(f'Created {len(customers)} customers.')

        # Generate orders over the last 30 days
        self.stdout.write('Creating demo orders...')
        tehran_tz = timezone.get_default_timezone()
        now = timezone.now()

        orders_created = 0
        for i in range(60):
            # Random date in last 30 days
            days_ago = random.randint(0, 29)
            hours_ago = random.randint(0, 23)
            minutes_ago = random.randint(0, 59)
            order_date = now - timedelta(
                days=days_ago,
                hours=hours_ago,
                minutes=minutes_ago
            )

            # Pick random customer
            customer = random.choice(customers)

            # Pick random product and size
            product = random.choice(products)
            active_sizes = [s for s in product.sizes.all() if s.is_active and s.stock > 0]
            if not active_sizes:
                continue

            size = random.choice(active_sizes)
            quantity = random.randint(1, min(3, size.stock))

            # Build order data
            order_data = {
                'first_name': customer.first_name,
                'last_name': customer.last_name,
                'phone': customer.phone,
                'email': '',
                'city': customer.city,
                'address': random.choice(ADDRESSES),
                'postal_code': '',
                'delivery_method': random.choice(['standard', 'express']),
                'coupon_code': '',
                'note': f'سفارش آزمایشی #{i+1}',
                'items': [{
                    'slug': product.slug,
                    'size_us': float(size.us),
                    'quantity': quantity,
                }],
            }

            try:
                with transaction.atomic():
                    # Create order
                    order = create_order(order_data, actor='demo_seed')

                    # Tag as demo order
                    order.note = f'[DEMO] {order.note}'
                    order.save(update_fields=['note'])

                    # Set created_at to the random date
                    order.created_at = order_date
                    order.save(update_fields=['created_at'])

                    # Random status and payment status
                    status_choice = random.choice(
                        ['new', 'processing', 'shipped', 'delivered', 'cancelled']
                    )
                    payment_choice = random.choice(
                        ['pending', 'paid', 'paid', 'paid']  # Weighted towards paid
                    )

                    # If cancelled, skip payment status
                    if status_choice == 'cancelled':
                        change_order_status(order, status_choice, actor='demo_seed')
                    else:
                        change_order_status(order, status_choice, actor='demo_seed')
                        if payment_choice == 'paid':
                            set_payment_status(order, payment_choice, actor='demo_seed')

                    orders_created += 1

            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(f'Failed to create order {i+1}: {e}')
                )
                continue

        self.stdout.write(
            self.style.SUCCESS(f'Successfully created {orders_created} demo orders.')
        )
        self.stdout.write('Run clear_demo_orders to remove them.')
