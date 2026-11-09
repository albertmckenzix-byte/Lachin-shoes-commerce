"""
Management command: seed_settings
Creates the StoreSettings singleton and the RYST10 coupon if they don't exist.
Usage: python manage.py seed_settings
"""
from django.core.management.base import BaseCommand

from shop.models import Coupon, StoreSettings


class Command(BaseCommand):
    help = "Create the StoreSettings singleton and seed the RYST10 coupon."

    def handle(self, *args, **options):
        # --- StoreSettings singleton ---
        settings_obj = StoreSettings.get()
        self.stdout.write(
            self.style.SUCCESS(
                f"StoreSettings OK  "
                f"(free_shipping_threshold={settings_obj.free_shipping_threshold}, "
                f"standard_fee={settings_obj.standard_fee}, "
                f"express_fee={settings_obj.express_fee}, "
                f"pending_order_minutes={settings_obj.pending_order_minutes})"
            )
        )

        # --- Coupons ---
        for code in ["RYST10", "LACHIN10"]:
            coupon, created = Coupon.objects.get_or_create(
                code=code,
                defaults={"percent": 10, "is_active": True},
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Coupon {code} created (10% off, active)."))
            else:
                self.stdout.write(self.style.WARNING(f"Coupon {code} already exists — skipped."))
