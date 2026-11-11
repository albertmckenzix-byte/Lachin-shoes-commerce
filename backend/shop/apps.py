from django.apps import AppConfig


class ShopConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'shop'

    def ready(self):
        # Start the background task scheduler
        from shop.services.scheduler import start_order_expiry_scheduler
        start_order_expiry_scheduler(interval_minutes=10)
