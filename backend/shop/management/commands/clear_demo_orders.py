"""
Management command to clear demo orders created by seed_demo_orders.
Only removes orders tagged with [DEMO] in the note field.
Restores stock for orders that haven't been released yet.
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from shop.models import Order
from shop.services.orders import release_stock


class Command(BaseCommand):
    help = 'Clear demo orders created by seed_demo_orders (restores stock)'

    def handle(self, *args, **options):
        # Find demo orders (tagged with [DEMO])
        demo_orders = Order.objects.filter(note__startswith='[DEMO]')

        if not demo_orders.exists():
            self.stdout.write('No demo orders found.')
            return

        count = demo_orders.count()
        self.stdout.write(f'Found {count} demo orders.')

        # Restore stock for orders that haven't been released
        stock_restored = 0
        for order in demo_orders:
            if not order.stock_released:
                try:
                    release_stock(order)
                    stock_restored += 1
                except Exception as e:
                    self.stdout.write(
                        self.style.WARNING(f'Failed to restore stock for order {order.number}: {e}')
                    )

        # Delete demo orders
        with transaction.atomic():
            demo_orders.delete()

        self.stdout.write(
            self.style.SUCCESS(
                f'Deleted {count} demo orders. Stock restored for {stock_restored} orders.'
            )
        )
