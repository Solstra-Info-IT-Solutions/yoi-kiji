# Store operations and environment configuration

## Required environment variables
- `DATABASE_URL`: PostgreSQL connection string.
- `APP_SECRET`: at least 32 random characters, unique per environment.
- `NEXT_PUBLIC_SITE_URL`: canonical public origin.
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`: use test credentials for acceptance testing, then live credentials after merchant activation.
- `RAZORPAY_WEBHOOK_SECRET`: configure the webhook endpoint `/api/payments/razorpay/webhook` for payment captured and payment failed events.
- `GST_PRICES_INCLUDE_TAX=true`: set only after the seller confirms that catalogue prices include GST and the tax advisor confirms the calculation basis.
- `SELLER_LEGAL_NAME`, `SELLER_GSTIN`, `SELLER_ADDRESS`, `SELLER_STATE_CODE`, `SELLER_ORIGIN_PIN`: seller and invoice/shipping origin data; configure only from client-confirmed business records.
- `SHIPPING_FLAT_RATE_PAISE`: temporary server-side shipping charge in paise. Do not set to zero unless free shipping is an approved business rule.
- Delhivery and ATS credentials are intentionally not assumed. Obtain the current API contract, account identifiers, pickup location, serviceability rules, rate rules and label requirements from the client's courier accounts before enabling live bookings.

## First administrator
Public registration always creates a CUSTOMER. Never accept a role from a registration request. Promote the first verified business administrator directly in the database after registration, for example:
```sql
UPDATE "User" SET "role" = 'ADMIN' WHERE "email" = 'verified-admin@example.com';
```
Use the client's verified admin email; do not commit account credentials.

## Catalogue operations
Create product drafts from `/admin/products` after signing in as ADMIN. Products are not visible on the storefront until activated. Product variants can be created through `POST /api/admin/products/:id/variants`; for bedsheets use the exact client-approved labels Single, Double, King and Fitted and add actual dimensions, fabric, SKU, price and stock as product data is supplied.

## Payment and fulfillment safety
- Checkout recalculates prices and tax from PostgreSQL; never trust browser totals.
- Checkout reserves stock transactionally and requires Razorpay plus a configured server-side shipping charge.
- Configure webhook events and verify the endpoint using Razorpay test mode before launch.
- Delhivery and ATS carrier credentials and API contracts are not included in source control. Until one is configured and end-to-end tested, shipment booking and live rates are not available.
- GST invoice output is currently an order-summary print view, not a statutory GST tax invoice. Obtain the seller's GSTIN, legal name/address, HSN/SAC, invoice series and tax treatment before generating statutory invoices.
- Complete return/refund, privacy, terms and shipping policies before opening production orders.
