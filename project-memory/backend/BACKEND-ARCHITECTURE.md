# Backend Architecture

## Stack observed

Python, Django 5.2, Django REST Framework, and SQLite in the inspected settings. Pillow is used for image handling.

## Observed source areas

- `backend/shop/models.py` imports order-system models from `backend/shop/orders_models.py` so they share the Django app label.
- `backend/shop/orders_models.py` defines store settings, coupons, customers, orders, and related order data (inspect the complete file for all fields and relationships).
- `backend/shop/permissions.py` defines `IsStaffUser`, requiring an authenticated user whose `is_staff` flag is true.
- `backend/shop/sizes.py` contains a shoe size conversion table and lookup structures.
- Django REST Framework token authentication is expected by the frontend admin client.

## Domain model observations

The inspected order models include:
- Singleton-style `StoreSettings` with free-shipping threshold, standard/express fee, and pending-order timeout fields.
- `Coupon` with percentage, active flag, expiry, usage limit, and usage count.
- `Customer` with phone-based identity and contact/address-related fields.
- `Order` with customer snapshot fields, delivery method, monetary totals, coupon code, order status, and payment status.

These are source observations. Check migrations, serializers, views, URL routes, and tests to determine which models and behaviours are exposed and working.

## Backend rules

- Treat the backend as authoritative for all business-critical validation and calculations.
- Use database transactions for order creation and stock changes where appropriate.
- Validate stock at the moment of purchase; avoid overselling under concurrent requests.
- Enforce staff permissions on every protected endpoint.
- Do not trust frontend-supplied totals, discounts, coupon validity, or payment state.
- Avoid logging personal data, credentials, tokens, or payment details.
- Add/update migrations and tests whenever models or business rules change.
- Keep API behaviour documented in `../integration/API-CONTRACTS.md`.

## Unknowns to verify

Deployment configuration, production database, CORS/CSRF configuration, media storage, payment gateway, customer authentication strategy, and order notification mechanisms have not yet been fully audited.
