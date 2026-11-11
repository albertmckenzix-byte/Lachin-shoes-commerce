"""
Management command: expire_pending_orders
Cancels all orders that are status=new, payment_status=pending
and whose expires_at is in the past.
Can be run once (e.g. via cron / scheduler),
or continuously with --watch (e.g. as a systemd service / docker daemon).
"""
import time
from django.core.management.base import BaseCommand
from django.utils import timezone

from shop.services.orders import expire_pending_orders


class Command(BaseCommand):
    help = "Cancel all expired pending orders and release their stock."

    def add_arguments(self, parser):
        parser.add_argument(
            "--watch",
            action="store_true",
            help="Run continuously as a foreground daemon service.",
        )
        parser.add_argument(
            "--interval",
            type=int,
            default=600,
            help="Interval in seconds between runs when in --watch mode (default: 600s = 10 minutes).",
        )

    def handle(self, *args, **options):
        watch_mode = options.get("watch", False)
        interval = options.get("interval", 600)

        if not watch_mode:
            count = expire_pending_orders()
            if count:
                self.stdout.write(
                    self.style.SUCCESS(f"{count} سفارش منقضی لغو و موجودی بازگردانده شد.")
                )
            else:
                self.stdout.write(self.style.WARNING("هیچ سفارش منقضی‌ای یافت نشد."))
            return

        self.stdout.write(
            self.style.SUCCESS(
                f"سرویس زمان‌بند لغو سفارشات منقضی شروع به کار کرد (فاصله زمانی: {interval} ثانیه)..."
            )
        )
        try:
            while True:
                count = expire_pending_orders()
                now_str = timezone.now().strftime("%Y-%m-%d %H:%M:%S")
                if count:
                    self.stdout.write(
                        self.style.SUCCESS(f"[{now_str}] {count} سفارش منقضی لغو شد.")
                    )
                time.sleep(interval)
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING("\nسرویس زمان‌بند متوقف شد."))
