# Lachin Shoes Commerce — Project Overview

## Product

Lachin Shoes Commerce is an e-commerce storefront and administration application for a shoe retailer. The repository contains a React-based customer-facing frontend and a Django REST Framework backend.

The interface includes Persian-language content and English/Persian internationalisation. Confirm current product, currency, shipping, and business rules with the owner before changing commercial behaviour.

## Main application areas observed

- Customer storefront and product catalogue.
- Product detail pages and size selection.
- Shopping cart.
- Checkout and payment-method UI.
- Admin authentication and administration screens.
- Product and order management interfaces.
- Persian/English translations and right-to-left layout support.

## Development split

- **Kilo Code:** primarily responsible for frontend work.
- **Google Antigravity:** primarily responsible for backend work.
- Both agents share this repository and this memory. Either agent may inspect adjacent layers when needed to ensure end-to-end correctness.

## Important integration principle

The frontend and backend must agree on endpoint paths, HTTP methods, request/response fields, validation errors, authentication, pagination, and money/size representations. Document and coordinate contract changes before or alongside implementation.

## Current confidence

This overview is based on source files inspected while setting up this memory. It is not a complete audit of every route, component, model, migration, or runtime flow. See [Current Status](development/CURRENT-STATUS.md) and [Known Issues](development/KNOWN-ISSUES.md).
