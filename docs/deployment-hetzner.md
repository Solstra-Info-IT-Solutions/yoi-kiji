# Hetzner deployment

This is a Docker Compose deployment baseline for a Hetzner Cloud VM. It is not a production sign-off by itself; TLS, firewalling, backups, monitoring and recovery testing remain mandatory.

## VM baseline
- Ubuntu LTS VM with a supported Docker Engine and Docker Compose plugin.
- Restrict inbound traffic to SSH and the reverse-proxy ports (80/443). Do not expose PostgreSQL publicly.
- Configure SSH keys, disable password SSH where possible, enable unattended security updates and a host firewall.
- Point the approved YOI KIJI domain to the VM.

## Configure secrets
1. Copy .env.example to .env on the server.
2. Set POSTGRES_PASSWORD to a long random secret.
3. Set APP_SECRET to a different random value of at least 32 characters.
4. Set NEXT_PUBLIC_SITE_URL to the canonical HTTPS domain.
5. Add only client-issued Razorpay, email, WhatsApp and courier credentials.
6. Confirm seller GST, shipping rate and tax configuration before setting checkout activation flags.

Do not commit the server .env file.

## Start
```bash
docker compose build
docker compose up -d
docker compose logs -f app
```

The application container runs Prisma migrations before starting Next.js. Check /api/health and inspect logs after startup.

Configure a host cron job every 10 minutes to call POST /api/cron/expire-orders with Authorization: Bearer $CRON_SECRET. This releases stock reservations for unpaid checkouts after 30 minutes. Keep the secret only in the server environment and never expose it to the browser.

## Production requirements
- Put Caddy, Traefik or Nginx in front of the app for HTTPS and security headers.
- Keep port 3000 private behind the reverse proxy; expose only 80/443 publicly.
- Configure PostgreSQL backups to encrypted off-host storage and test restores.
- Configure log rotation, uptime monitoring, alerting and disk-space alerts.
- Use separate staging and production credentials and databases.
- Complete payment and shipping end-to-end tests before opening orders.
- Have a documented rollback and incident response procedure.
