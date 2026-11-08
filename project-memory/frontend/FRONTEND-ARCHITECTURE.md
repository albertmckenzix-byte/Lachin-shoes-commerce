# Frontend Architecture

## Stack

React 19, Vite 8, Tailwind CSS 4, React Router 7, i18next/react-i18next, and Framer Motion.

## Observed files and patterns

- `src/api/products.js`: public product fetch functions.
- `src/admin/api.js`: shared admin request helper.
- `src/admin/AuthContext.jsx`: admin session state and login/logout.
- `src/data/products.js`: local product fixture/fallback data; comments identify some values as needing confirmation.
- `src/data/orders.js`: mock order records and local order-related helpers.
- `src/components/checkout/InformationForm.jsx`: checkout customer/address form and client-side validation.
- `src/components/checkout/PaymentOptions.jsx`: payment selection and card-field UI validation.
- Product and cart state also use React Context (inspect the current context files before editing).

## API configuration

`VITE_API_URL` is used as the API origin, with `http://localhost:8000` as the fallback in inspected API helpers.

The public product API helper requests:
- `GET /api/products/`
- `GET /api/products/{slug}/`

The admin helper sends requests to `${API_URL}/api${path}`, JSON-encodes ordinary object bodies, leaves FormData bodies intact, and adds `Authorization: Token <token>` when an admin token exists.

## Session storage

The inspected admin auth context stores a token and username in localStorage under `ryst_admin_session`. Treat this as an existing implementation detail, not a security endorsement. Do not expose tokens in logs or UI.

## Frontend conventions for agents

- Inspect existing components, routes, contexts, and styling before creating alternatives.
- Preserve existing responsive behaviour, accessibility, Persian RTL support, and translations.
- Use the existing API helpers unless there is a clear documented reason not to.
- Keep mock data clearly separated from live API data. Do not silently use fixtures as if they were backend records.
- Handle loading, empty, error, and success states.
- Do not hardcode secrets or production API credentials.
- When changing a request or response shape, update the API contract and coordinate with backend work.

## Verification

Run the scripts defined in the current `package.json` (for example lint/build/test where available). Record commands actually run and their outcomes; do not claim checks passed if they were not run.
