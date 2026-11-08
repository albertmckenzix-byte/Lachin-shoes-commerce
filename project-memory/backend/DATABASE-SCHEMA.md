# Database Schema Notes

## Scope and evidence

This is an initial source-level summary of model definitions observed in `backend/shop/orders_models.py` and `backend/shop/sizes.py`. It is not a replacement for Django migrations or a generated ER diagram.

## Observed entities

### StoreSettings

Singleton-style settings record. The model's `get()` method obtains/creates primary key 1. Fields observed include:
- `free_shipping_threshold`
- `standard_fee`
- `express_fee`
- `pending_order_minutes`

### Coupon

Observed fields:
- `code` (unique; uppercased on save)
- `percent` (validated from 1 to 100)
- `is_active`
- `expires_at`
- `usage_limit`
- `used_count`

### Customer

Observed fields:
- `phone` (unique)
- `first_name`, `last_name`, `email`, `city`, `created_at`

The save method normalizes the phone number to digits and prepends a zero when it does not start with zero. Confirm that this normalization matches the intended country/phone policy before changing it.

### Order

Observed fields include:
- Unique human-readable `number` assigned from the primary key.
- Optional foreign key to Customer.
- Snapshot fields for name, phone, email, country, city, address, and postal code.
- Delivery method, subtotal, shipping fee, discount total, total, coupon code.
- Order status and payment status.

Inspect the rest of the model file for order-item relationships and payment fields.

### Shoe sizes

`backend/shop/sizes.py` provides US/EU/CM mappings, including adult and kids entries. Check the product size/stock model and serializers for how these mappings are applied.

## Required follow-up

- Compare model definitions with all migrations.
- Document every model, relationship, constraint, index, and deletion policy.
- Confirm currency and monetary units. Model fields are integer-based, but the unit must be established from product/business requirements.
- Add an ER diagram only after the complete model and migration audit.
