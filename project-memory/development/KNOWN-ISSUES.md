# Known Issues, Risks, and Verification Gaps

This list is an initial set of observations and items requiring validation. Re-check current code before acting.

## Observed risks

1. **Mock orders in frontend:** `src/data/orders.js` contains sample order records. Confirm which admin screens still consume these records before replacing them.
2. **Local product fixtures:** `src/data/products.js` contains hardcoded product examples and TODO comments for real prices/brand/gender metadata. Ensure fixtures are not mistaken for production catalogue data.
3. **Checkout/payment integration:** Checkout components validate card-like fields in the browser. Never collect or process raw card details directly unless an approved compliant payment integration is explicitly designed. Confirm intended payment provider and actual backend flow.
4. **Client-side totals:** All order totals, discounts, coupon rules, shipping, and stock must be recalculated and validated on the server.
5. **Admin token storage:** Admin token is stored in localStorage. Treat XSS exposure as a security consideration; do not log or expose the token. Review auth/session strategy before production.
6. **Phone normalization:** Customer model prepends a leading zero to digit-only values that do not begin with zero. Confirm this is intentional for the supported phone-number region.
7. **Currency units:** Integer money fields are present, but the exact unit (for example rial/toman) must be confirmed and documented consistently.

## Not yet verified

- Full test coverage and test results.
- Production deployment and environment configuration.
- Payment gateway integration and webhook verification.
- CORS/CSRF/security headers and allowed hosts.
- Media upload/storage lifecycle.
- Concurrent stock reservation/decrement behaviour.
- Order cancellation, refund, and status transition rules.
- Customer account/login strategy.
- Email/SMS notifications and background jobs.

## Reporting format

For each resolved item, record the evidence, code paths, tests, and date in the development log. Do not remove unresolved risks merely because an implementation was added; verify the behaviour.
