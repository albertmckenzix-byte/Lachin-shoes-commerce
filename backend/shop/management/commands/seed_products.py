from decimal import Decimal

from django.core.management.base import BaseCommand

from shop.models import Product, ProductSize
from shop.sizes import SIZE_TABLE_BY_US

PRODUCTS = [
    {
        'slug': 'air-jordan-1-mid-linen',
        'name': 'Air Jordan 1 Mid Linen',
        'maker_brand': 'jordan',
        'genders': ['men', 'women'],
        'categories': ['limited-edition'],
        'tags': [],
        'price': 12500000,
        'old_price': None,
        'badge': '',
        'best_seller': False,
        'description_fa': 'آیر جردن ۱ مید مدل لینن، کاندیدای شماره یک موسیقی و استایل روزمره با رنگ‌بندی روشن و محدود.',
        'description_en': 'The Air Jordan 1 Mid in Linen is the top pick for music and street style with its bright, limited colorway.',
        'sizes': {'7': 6, '8': 6, '8.5': 6, '9': 6, '9.5': 6, '10': 6, '10.5': 6, '11': 6},
    },
    {
        'slug': 'jordan-4-retro-oxidized-green',
        'name': 'Jordan 4 Retro Oxidized Green',
        'maker_brand': 'jordan',
        'genders': ['men'],
        'categories': ['limited-edition', 'best-sellers'],
        'tags': [],
        'price': 21000000,
        'old_price': None,
        'badge': 'BEST_SELLER',
        'best_seller': True,
        'description_fa': 'جردن ۴ رترو اکسیدایز گرین با ترکیب رنگ تماماً مشکی و سبز اکسید، یکی از محبوب‌ترین‌های تاریخ بسکتبال است.',
        'description_en': 'The Jordan 4 Retro "Oxidized Green" blends black and green perfectly and is one of the most beloved sneakers ever made.',
        'sizes': {'7': 5, '8': 4, '8.5': 4, '9': 0, '9.5': 2, '10': 5},
    },
    {
        'slug': 'new-balance-740-v2-trainers',
        'name': 'New Balance 740 V2 Trainers',
        'maker_brand': 'new-balance',
        'genders': ['men', 'women'],
        'categories': ['performance-series'],
        'tags': [],
        'price': 10000000,
        'old_price': None,
        'badge': '',
        'best_seller': True,
        'description_fa': 'نیوبالانس ۷۴۰ نسخه ۲ با پشتیبانی عالی از قوس پا، گزینه‌ای راحت و سبک برای دویدن روزمره.',
        'description_en': 'The New Balance 740 V2 is a comfortable, lightweight everyday runner with excellent arch support.',
        'sizes': {
            '6.5': 7, '7': 7, '7.5': 7, '8': 7, '8.5': 7,
            '9': 7, '9.5': 7, '10': 7, '10.5': 7,
        },
    },
    {
        'slug': 'nike-sportswear-older-kids-air-force-1-lv8',
        'name': 'Nike Sportswear Older Kids Air Force 1 LV8',
        'maker_brand': 'nike',
        'genders': ['men', 'women'],
        'categories': ['kids'],
        'tags': [],
        'price': 8500000,
        'old_price': 10000000,
        'badge': 'SALE',
        'best_seller': True,
        'description_fa': 'نایکی ایر فورس ۱ مدل LV8 مخصوص کودکان بزرگ‌تر، طراحی کلاسیک و راحت با تخفیف ویژه.',
        'description_en': 'The Nike Air Force 1 LV8 for older kids features the classic, comfortable design now on sale.',
        'sizes': {'3.5': 2, '4': 2, '4.5': 2, '5': 2, '5.5': 2, '6': 2, '6.5': 0},
    },
    {
        'slug': 'reebok-dmx-1200-grey-blue',
        'name': 'Reebok DMX 1200 Grey Blue',
        'maker_brand': 'reebok',
        'genders': ['men', 'women'],
        'categories': ['performance-series', 'best-sellers'],
        'tags': [],
        'price': 11000000,
        'old_price': 13000000,
        'badge': 'SALE',
        'best_seller': True,
        'description_fa': 'ریباک DMX 1200 با رنگ‌بندی خاکستری-آبی و پد DMX تحتانی، مناسب استفاده روزمره و ورزشی.',
        'description_en': 'The Reebok DMX 1200 in grey-blue with its signature DMX cushioning, perfect for everyday and athletic wear.',
        'sizes': {'7': 5, '8': 5, '8.5': 5, '9': 5, '9.5': 5, '10': 5, '10.5': 5},
    },
]


class Command(BaseCommand):
    help = 'Seed the database with sample products and sizes (idempotent).'

    def handle(self, *args, **options):
        product_count = 0
        size_count = 0

        for data in PRODUCTS:
            data = dict(data)
            sizes = data.pop('sizes')
            product, created = Product.objects.update_or_create(
                slug=data['slug'], defaults=data
            )
            product_count += 1

            for us, stock in sizes.items():
                row = SIZE_TABLE_BY_US.get(us)
                if row is None:
                    self.stderr.write(self.style.WARNING(
                        f'No size table entry for US {us} (product {product.slug})'
                    ))
                    continue
                _, created = ProductSize.objects.update_or_create(
                    product=product,
                    us=Decimal(row['us']),
                    defaults={
                        'eu': Decimal(row['eu']),
                        'cm': Decimal(row['cm']),
                        'stock': stock,
                    },
                )
                size_count += 1

            self.stdout.write(
                f'{"Created" if created else "Updated"} product: {product.name}'
            )

        self.stdout.write(self.style.SUCCESS(
            f'Seeded {product_count} products and {size_count} sizes.'
        ))
