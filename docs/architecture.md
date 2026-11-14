# Architecture

## Initial application shape
The first delivery is a Next.js App Router application with strict TypeScript, Prisma, and PostgreSQL. Server-side business logic belongs in server-only modules; browser components must never receive secrets or privileged database access.

## Planned bounded contexts
- Catalog: categories, product content, variants, media, search and merchandising.
- Identity: customer sessions, role-based access, account recovery and address book.
- Cart and checkout: server-priced cart, stock reservation, shipping/tax calculation, idempotent order creation.
- Payments: Razorpay order creation, signature verification, webhook signature verification, replay protection and reconciliation.
- Fulfilment: inventory ledger, packing, shipment tracking, cancellation and returns.
- Administration: least-privilege roles, audit trail, catalog and stock management, order operations.
- Documents and communications: GST-aware invoice snapshots, transactional email and consent-based WhatsApp updates.

## Security invariants
1. Never trust client-supplied prices, discounts, tax, inventory, roles or payment status.
2. Verify payment signatures on the server and verify raw-body webhook signatures before processing.
3. Make checkout and webhook handlers idempotent.
4. Record immutable order-line price/tax snapshots at purchase time.
5. Enforce authorization on every admin operation and scope customer reads to the authenticated user.
6. Keep credentials in environment variables or a managed secret store.
7. Maintain an auditable inventory movement history before enabling stock mutations.

## Data and money
Money is stored as integer paise in INR. Tax rates are represented in basis points. GST place-of-supply, intra/inter-state tax splitting, HSN/SAC, seller registration details, invoice numbering and legal invoice content must be validated against the seller's actual registrations and tax advice before production.

## Deployment
The app is designed for a managed Next.js runtime or Node.js deployment, with managed PostgreSQL, automated backups, TLS, health checks, structured logs and error monitoring. Production region, data retention, recovery objectives and compliance requirements remain deployment decisions.
