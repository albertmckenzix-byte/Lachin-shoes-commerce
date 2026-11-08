# Frontend ↔ Backend API Contracts

## Contract status

This document records only endpoint details directly observed in the inspected frontend client. It is intentionally incomplete until backend URL patterns, views, serializers, and tests are fully audited.

## Base URL

Frontend reads `VITE_API_URL`, falling back to `http://localhost:8000`.

## Public product endpoints observed in frontend

| Method | Path | Frontend function | Notes |
|---|---|---|---|
| GET | `/api/products/` | `fetchProducts()` | Expects a successful JSON response. |
| GET | `/api/products/{slug}/` | `fetchProduct(slug)` | Returns null to caller on HTTP 404. |

The exact response schema, filtering, pagination, and error format must be confirmed from backend serializers/views.

## Admin API client behaviour observed

The admin helper at `src/admin/api.js`:
- Builds URL as `${API_URL}/api${path}`.
- Adds `Authorization: Token <token>` if a token is stored.
- JSON-encodes object request bodies.
- Does not JSON-encode FormData.
- Redirects to `/admin/login` after HTTP 401.
- Attempts to parse JSON response text and extracts DRF-style error details.

The admin auth context calls:
- `POST /api/admin/login/`
- `POST /api/admin/logout/`

Login response is expected by the frontend to contain `token` and `username`.

## Contracts to complete

For each endpoint, document:
- Method and exact path.
- Authentication and permission requirements.
- Query parameters and pagination.
- Request JSON / multipart schema.
- Successful response schema and status code.
- Validation and error response shape.
- Side effects and transaction/stock behaviour.
- Frontend caller/component.

At minimum, audit products, product administration, sizes/stock, categories/brands if present, customers, orders, coupons, store settings, login, and logout.

## Change coordination

Before changing a shared contract, inspect both callers and backend implementation. Update this file in the same change as the implementation. If a contract change is breaking, explicitly coordinate frontend and backend updates and record migration/compatibility notes.
