# Production launch checklist

- [ ] Confirm legal entity, registered address, GSTIN, invoice series and applicable HSN/SAC/tax treatment.
- [ ] Confirm product catalogue, approved imagery, prices, stock and return/warranty terms.
- [ ] Configure production PostgreSQL, backups, TLS and restricted network access.
- [ ] Configure secure session/authentication provider and admin MFA.
- [ ] Add Razorpay live credentials and webhook endpoint; test signature verification and refund reconciliation.
- [ ] Configure shipping provider, serviceability, rates, labels and tracking.
- [ ] Configure transactional email domain authentication and consent-compliant messaging.
- [ ] Publish privacy, terms, shipping, cancellation, refund and contact policies.
- [ ] Run typecheck, unit, integration, security and end-to-end suites.
- [ ] Perform payment, stock-race, webhook-replay, access-control and restore drills.
- [ ] Verify analytics consent, SEO metadata, sitemap, robots and structured data.
- [ ] Complete accessibility, mobile, performance and cross-browser review.
- [ ] Complete production smoke test and rollback plan.

Do not mark any item complete until evidence has been reviewed.
