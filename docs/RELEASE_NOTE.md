# ShopSmart release note

**Version:** 1.1.0 AWS demo candidate
**Date:** 2026-11-20
**Deployment:** Not deployed; no AWS resources or hosted URL were provided.

## Included

- React/Vite product catalog, search, cart, and simulated checkout.
- Express API and PostgreSQL persistence through Prisma, with a customer and order-owner migration.
- Account registration/sign-in, hashed passwords, signed expiring sessions, rate-limited account attempts, authenticated checkout, and owner-scoped order history.
- Catalog-grounded assistant with optional server-only Gemini integration and deterministic fallback.
- Single EC2 deployment assets for systemd and Nginx, plus an HTTPS deployment walkthrough.

## Verification status

The previous local release checks and API examples predate the account requirement. Checks have not been run against this update. Account registration, sign-in, order ownership, and the AWS host setup need verification before presenting the hosted app. See [`QUALITY_DEPLOYMENT_RECORD.md`](QUALITY_DEPLOYMENT_RECORD.md) for historical evidence and remaining checks.

## Important limits

Use fictional account and checkout details only. The app collects no payment. The single EC2 layout is a classroom deployment with a single point of failure. The seed command deletes order and product data; do not run it where records must be preserved.

## Local run

Follow [`../README.md`](../README.md). Configure `backend/.env`, run `npm install`, `npm run db:generate`, and `npm run db:migrate`; seed only a new disposable development database. Start with `npm run dev`. The AWS walkthrough is [`DEPLOYMENT_PLAN.md`](DEPLOYMENT_PLAN.md).
