# YOI KIJI — A Quieter Way of Living

A premium home-textile commerce platform with a deep-green visual identity and considered product discovery.

## Client-approved brand direction
- Primary brand green: `#0E300E`
- Off-white: `#E9E9E9`
- Product categories: Bedsheets, Curtains, Upholstery, Bath Linen, Kitchen Linen.
- Bedsheet variant labels: Single, Double, King, Fitted.
- Proposed payment provider: Razorpay.
- Shipping partners under consideration: Delhivery and ATS.

## Product principles
- Premium, editorial storefront with responsive and accessible layouts.
- Clear product information, variant selection, cart and checkout.
- Secure customer identity, order lifecycle, inventory controls and auditable administration.
- India-ready commerce foundations: INR, GST-aware tax modelling, Razorpay payment verification, shipping integrations and invoice generation.
- Never expose secrets in source control. Demo data and non-live integrations must be clearly identified.

## Technology baseline
- Next.js App Router, React, TypeScript
- PostgreSQL and Prisma
- Razorpay payment adapter (credentials and webhook secret supplied only through environment variables)
- Shipping adapters for Delhivery / ATS (contract, account and API credentials required)
- Automated unit, integration and end-to-end tests

## Repository status
Brand palette and initial category taxonomy have been applied to the storefront. Product variant and fulfillment data foundations are represented in the Prisma schema. The project is not yet build-verified or production-ready. Payment, shipping, legal, tax and business-specific settings require client confirmation and secure credentials.

## Local development
1. Install Node.js 22 or later and PostgreSQL.
2. Copy `.env.example` to `.env` and configure local values.
3. Install dependencies with `npm install`.
4. Generate Prisma Client with `npm run db:generate`.
5. Apply migrations with `npm run db:migrate`.
6. Start the application with `npm run dev`.

See [docs/architecture.md](docs/architecture.md) and [docs/launch-checklist.md](docs/launch-checklist.md).
