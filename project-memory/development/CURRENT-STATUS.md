# Current Development Status

> Last reviewed: initial shared-memory setup. This is a source inspection snapshot, not a live CI or runtime report.

## Confirmed/observed

- React/Vite frontend exists.
- Django/DRF backend exists.
- Public product fetch helpers call list and slug-detail endpoints.
- Frontend admin auth flow calls login/logout endpoints and stores token/username in localStorage.
- Backend has a staff-only permission class.
- Backend order-related models are defined in `backend/shop/orders_models.py`.
- Frontend includes local product fixture data.
- Frontend includes mock order data in `src/data/orders.js`.
- Checkout information and payment UI components include client-side validation.

## Integration gaps visible from inspected files

- Checkout UI contains simulated/client-side payment behaviour; a complete server-side order/payment flow has not been verified.
- Admin order data includes mock/local data; complete API-backed order management has not been verified.
- Product fallback/fixture data contains TODO comments for real prices and product metadata.
- The exact backend endpoint coverage and response contracts still need a complete audit.

## Next audit tasks

1. Inspect all Django URL patterns, views, serializers, models, and migrations.
2. Map every frontend route/page and data source (live API vs fixture/local state).
3. Trace checkout from cart through order creation and payment status.
4. Trace admin product/order/customer CRUD through actual API calls.
5. Confirm size/stock representation end-to-end.
6. Run frontend build/lint/tests and backend tests; record actual outcomes.
7. Confirm environment variables, CORS, media/static configuration, and deployment setup.

## Update protocol

After each significant task, update this file with:
- What changed.
- Which files were changed.
- Whether work is frontend, backend, or integration.
- Tests/checks run and results.
- Remaining blockers and next concrete step.

Never mark an item complete based only on a code stub, model definition, UI, or agent assertion.
