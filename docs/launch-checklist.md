# Production launch checklist

## Brand and catalogue
- [ ] Approve final YOI KIJI logo, typography and usage rules.
- [ ] Confirm final brand palette: deep green #0E300E and off-white #E9E9E9.
- [ ] Confirm category names and descriptions: Bedsheets, Curtains, Upholstery, Bath Linen, Kitchen Linen.
- [ ] Confirm bedsheet option labels and their exact dimensions: Single, Double, King, Fitted.
- [ ] Confirm product HSN, GST rate, price tax basis, package weight and dimensions for each SKU.
- [ ] Supply approved product photography, SKU, material, dimensions, care instructions, prices and stock.
- [ ] Confirm whether products have colour, fabric, size or other selectable variants.

## Business, tax and policies
- [ ] Confirm legal entity, registered address, GSTIN, invoice series and applicable HSN/SAC/tax treatment.
- [ ] Confirm approved prices, return/warranty terms and product claims.
- [ ] Publish privacy, terms, shipping, cancellation, refund and contact policies.

## Infrastructure and security
- [ ] Configure production PostgreSQL, backups, TLS and restricted network access.
- [ ] Configure secure session/authentication provider and admin MFA.
- [ ] Keep all production credentials in encrypted environment variables, never source control.

## Payments and fulfillment
- [ ] Add Razorpay live credentials and webhook endpoint; test signature verification, duplicate webhook handling and refund reconciliation.
- [ ] Complete Delhivery and/or ATS commercial onboarding and API access.
- [ ] Register and verify Delhivery pickup warehouse, seller GSTIN and origin PIN; obtain official ATS API integration package if ATS is selected.
- [ ] Configure serviceability, shipping rates, labels, pickup, cancellation and tracking.
- [ ] Confirm which shipping provider is primary and the fallback rules.

## Quality and launch
- [ ] Run typecheck, unit, integration, security and end-to-end suites.
- [ ] Perform payment, stock-race, webhook-replay, access-control and restore drills.
- [ ] Verify analytics consent, SEO metadata, sitemap, robots and structured data.
- [ ] Complete accessibility, mobile, performance and cross-browser review.
- [ ] Complete production smoke test and rollback plan.

Do not mark any item complete until evidence has been reviewed. No payment or shipping integration should be described as live until credentials, account approval and end-to-end tests are complete.
