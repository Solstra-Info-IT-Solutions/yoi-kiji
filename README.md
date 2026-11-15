# YOI KIJI — A Quieter Way of Living

A premium home-textile e-commerce platform for the YOI KIJI brand.

## Client-approved brand direction
- Deep green: #0E300E
- Off-white: #E9E9E9
- Typography: Montserrat Light, weight 300
- Collections: Bedsheets, Curtains, Upholstery, Bath Linen, Kitchen Linen
- Bedsheet options: Single, Double, King, Fitted
- Payments: Razorpay
- Shipping partners: Delhivery and Amazon Shipping (ATS), subject to account onboarding

## Implemented application areas
- Editorial homepage and responsive global navigation/footer
- Collection pages, product detail pages and product search
- Customer registration, login, signed HTTP-only sessions, account and saved delivery addresses
- Browser cart with server-side product and price validation
- Checkout address capture, checkout idempotency key and stock reservation
- Razorpay order creation, checkout signature verification, webhook signature verification and payment retry
- Customer order history and printable order summary
- Protected admin dashboard, product drafts/publishing, stock adjustment, bedsheet size variants, order status and refund controls
- Inventory movement audit trail
- Delhivery PIN serviceability adapter\n- Idempotent Resend order confirmation email and opt-in-only WhatsApp Cloud API notifications
- SEO metadata, sitemap, robots rules, PostgreSQL migrations and CI workflow

## Important launch gates
This repository is under active development and is not yet build-verified or production-ready. Checkout deliberately remains disabled until all of these are confirmed:
- Razorpay test/live merchant credentials and webhook secret
- Seller GST registration/tax treatment and product GST rates
- Seller-approved shipping charge or live shipping rate integration
- Delhivery or ATS account credentials and pickup setup
- Actual product catalogue, SKUs, HSN codes, prices, weights, dimensions, inventory and approved product photography
- Legal business details and approved privacy, terms, cancellation, return and shipping policies

Delhivery shipment manifestation is not yet enabled. The client must supply its registered pickup warehouse, origin PIN, account client name, GST details and product HSN data. ATS direct API integration awaits the seller's official Amazon Shipping API package and credentials. The current printable order document is an order summary, not a statutory GST tax invoice.

## Technology
- Next.js App Router, React, TypeScript
- PostgreSQL and Prisma
- Razorpay REST API
- Delhivery server-side serviceability adapter
- Zod request validation and Vitest unit tests

## Local development
1. Use Node.js 22+ and PostgreSQL.
2. Copy .env.example to .env and generate a unique APP_SECRET (32+ characters).
3. Install dependencies: npm install
4. Generate Prisma client: npm run db:generate
5. Apply database migrations: npm run db:migrate
6. Start the app: npm run dev

See docs/architecture.md, docs/operations.md, docs/shipping-integration.md, docs/deployment-hetzner.md and docs/launch-checklist.md.
