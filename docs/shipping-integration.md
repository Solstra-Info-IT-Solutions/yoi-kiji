# Shipping integration status

## Delhivery
The codebase includes a server-side PIN serviceability adapter. It calls the Delhivery Express API using a private account token and a configured base URL. The official integration documentation describes separate staging and production hosts, Token authentication, a mandatory serviceability check before shipment creation, and account-specific registered pickup warehouses.

Documentation:
- https://delhivery-express-api-doc.readme.io/reference/1-pincode-servicability-api
- https://delhivery-express-api.readme.io/reference/7-steps-of-integration
- https://delhivery-express-api.readme.io/reference/order-creation-api

Before enabling live shipment booking, obtain the client's staging and production API tokens, registered client name, pickup warehouse name, origin PIN, pickup/return address, seller GSTIN and product HSN codes. The manifest API requires shipment and GST data and the pickup location must match the registered warehouse name exactly. Complete Delhivery staging UAT before switching to production.

## Amazon Shipping (ATS)
ATS is treated as Amazon Shipping. The seller must provide the account-specific integration guide, API credentials, registered pickup location, pickup preference and any required account settings. Public third-party setup guidance is not sufficient to implement a production-safe direct API connector. Keep ATS disabled until the seller shares the official integration package.

## Checkout policy
- Never use a guessed shipping charge. Configure SHIPPING_FLAT_RATE_PAISE only if the seller explicitly approves a flat shipping rate.
- Prefer live serviceability and rate quotation before charging the customer.
- Store carrier, shipment reference/AWB, tracking URL and shipment status on the order.
- Do not manifest a shipment until seller, warehouse, HSN and shipment package details are complete.
- Delhivery's shipping charge estimates may be approximate; final carrier billing can differ.
