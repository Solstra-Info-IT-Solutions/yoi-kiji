# Vercel + Neon deployment runbook

This repository is a single Next.js application. Deploy the storefront, admin dashboard, and server-side API routes together as one Vercel project. Neon hosts PostgreSQL; there is no separate backend service to deploy.

## Before production deployment

- Use a Vercel Pro or Enterprise team for this commercial e-commerce project. Vercel Hobby is limited to personal, non-commercial use.
- Connect the GitHub repository `Solstra-Info-IT-Solutions/yoi-kiji` to one Vercel project.
- Use the repository root as the project root, Next.js as the framework, Node.js 22, and the standard Next.js build command `npm run build`.
- Set the Vercel Function region to the closest available region to the Neon database and primary customers. For an India-focused audience, compare Vercel Mumbai (`bom1`) with the regions available in Neon before selecting.
- Create a Neon production project and keep separate database branches for production and non-production environments where practical.

## Database connection variables

The Prisma schema uses two connection URLs:

- `DATABASE_URL`: application runtime connection. In Neon, use the pooled connection string whose hostname contains `-pooler`. Add `sslmode=require` and, where required by the Prisma 6/PgBouncer configuration, `pgbouncer=true`.
- `DIRECT_URL`: direct, non-pooled Neon connection string. Prisma Migrate uses this connection for schema changes.

Set both variables in Vercel for Production, Preview, and Development as appropriate. Do not commit real connection strings or paste them into source control. Keep local values in the ignored `.env` file.

## Application secrets and configuration

Set the following in Vercel Environment Variables. Use encrypted/sensitive values for secrets.

Required for secure application operation:
- `DATABASE_URL`
- `DIRECT_URL`
- `APP_SECRET` — long random secret, at least 32 characters.
- `CRON_SECRET` — separate long random secret for the scheduled order-expiry endpoint.
- `NEXT_PUBLIC_SITE_URL` — final HTTPS production domain.

Media:
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Payments (keep test and live credentials separated):
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`

Optional integrations, only after onboarding:
- Resend: `EMAIL_FROM`, `EMAIL_API_KEY`
- WhatsApp: `WHATSAPP_API_VERSION`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_ORDER_TEMPLATE_NAME`
- Delhivery / Amazon Shipping: provider URLs, tokens, account and pickup details from the seller's approved courier accounts.

Never expose server secrets with a `NEXT_PUBLIC_` prefix.

## Migration and release sequence

1. Confirm the Neon production database and verify both connection URLs.
2. Set the production environment variables in Vercel.
3. From a trusted local environment or CI job configured with the production `DIRECT_URL`, run `npm run db:deploy` to apply committed Prisma migrations.
4. Run `npx prisma migrate status` and verify the migration status and database connectivity.
5. Deploy the merged `main` branch to Vercel.
6. Verify homepage, product/category pages, customer authentication, admin authentication, cart, checkout, payment webhooks, media signing, and the order-expiry cron endpoint.
7. Configure the custom domain and HTTPS, then update Razorpay webhook URLs and allowed callback URLs.

Do not run production migrations automatically in every Preview build. Preview deployments should use an isolated Neon branch/database.

## Production launch is not yet approved

A successful build is not the same as a production-ready store. Before accepting live orders, complete Razorpay test-mode and live-mode verification, shipping account onboarding and shipment tests, seller/GST/invoice configuration, return/refund policy, transactional email, Cloudinary upload tests, and end-to-end checkout tests. The existing shipping integration is not yet full live Delhivery/Amazon Shipping booking.
