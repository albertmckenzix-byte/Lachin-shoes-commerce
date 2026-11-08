"""
Management command: expire_pending_orders
Cancels all orders that are status=new, payment_status=pending
and whose expires_at is in the past. Run via cron / scheduler.
"""
from django.core.management.base import BaseCommand

from shop.services.orders import expire_pending_orders


class Command(BaseCommand):
    help = "Cancel all expired pending orders and release their stock."

    def handle(self, *args, **options):
        count = expire_pending_orders()
        if count:
            self.stdout.write(
                self.style.SUCCESS(f"{count} سفارش منقضی لغو و موجودی بازگردانده شد.")
            )
        else:
            self.stdout.write(self.style.WARNING("هیچ سفارش منقضی‌ای یافت نشد."))
