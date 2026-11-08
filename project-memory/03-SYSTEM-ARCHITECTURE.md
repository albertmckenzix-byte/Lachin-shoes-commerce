# System Architecture

## High-level view

```text
Browser
  |
  v
React + Vite frontend
  |-- Storefront / catalogue / product details
  |-- Cart and checkout UI
  |-- Admin UI
  |
  | HTTP requests (VITE_API_URL)
  v
Django + Django REST Framework
  |-- API routing and views
  |-- Product and order domain models
  |-- Admin authentication/permissions
  |
  v
Database (SQLite in inspected settings)
```

## Responsibilities

### Frontend

- Render responsive storefront and admin interfaces.
- Manage client-side interaction, cart state, form state, and translations.
- Call backend endpoints through the existing API helpers.
- Display loading, empty, validation, success, and error states.
- Avoid treating mock or fallback data as persisted backend data.

### Backend

- Own persistent business data and authoritative validation.
- Enforce stock, pricing, coupon, shipping, order, and permission rules.
- Expose documented API contracts.
- Never trust client-submitted totals, discounts, stock availability, or payment status.

## Integration rules

1. Backend response shapes must match the frontend's actual data needs.
2. The backend recalculates order totals from trusted product/stock/pricing data.
3. Product size and stock availability must be validated server-side at order creation.
4. Admin-only endpoints must enforce permissions server-side.
5. Keep secrets and credentials out of frontend bundles and committed files.
6. Coordinate changes to shared contracts through `integration/API-CONTRACTS.md`.

## Diagram is conceptual

This is a logical architecture diagram, not a complete inventory of deployed infrastructure. Verify production hosting, database, static/media storage, payment provider, email/SMS services, and deployment pipeline before documenting them as implemented.
