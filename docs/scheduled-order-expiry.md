# Scheduled unpaid-order expiry

The application already exposes an authenticated, idempotent order-expiry endpoint at:

`POST /api/cron/expire-orders`

This GitHub Actions workflow invokes it every 15 minutes. It uses GitHub-hosted runners, so it does not depend on Vercel Cron plan limits and does not require a new application deployment to schedule the job after this workflow is merged.

## Required GitHub Actions repository secrets

Configure these under **Repository → Settings → Secrets and variables → Actions → New repository secret**:

- `CRON_TARGET_URL`: the HTTPS origin of the deployed storefront, without a path (for example, `https://shop.example.com`). Do not include the endpoint path.
- `CRON_SECRET`: the exact same high-entropy value configured as the application's `CRON_SECRET` environment variable.

Never commit either value or place them in workflow YAML. Keep the application's `CRON_SECRET` configured in the hosting environment. Use a dedicated secret with at least 32 random characters.

## Operation

- The workflow runs every 15 minutes and can also be started manually from the Actions tab.
- The endpoint authenticates with a constant-time bearer-token comparison.
- Each order is conditionally claimed inside a database transaction before coupon and inventory reservations are released. Concurrent or repeated invocations therefore cannot release the same reservation twice.
- GitHub scheduled workflows can start later than the exact cron minute. This is a recovery process, not a real-time payment or checkout dependency.
- Monitor the **Expire unpaid orders** workflow in GitHub Actions. A failed run should be investigated; do not disable the endpoint's authentication.

## Safe rollout

1. Merge this workflow and documentation.
2. Add both GitHub repository secrets and confirm the hosting environment has the matching `CRON_SECRET`.
3. Manually run **Expire unpaid orders** once and verify its JSON response and resulting order/inventory records in the intended environment.
4. Confirm the scheduled run succeeds before considering the scheduler operational.

No database schema changes or migrations are required. No deployment is initiated by this change.
