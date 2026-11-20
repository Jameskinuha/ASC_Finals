# ShopSmart quality and deployment record

**Release candidate:** AWS-ready code, deployment not yet performed
**Updated:** 2026-11-20
**Deployment walkthrough:** [`DEPLOYMENT_PLAN.md`](DEPLOYMENT_PLAN.md)

## Implemented features

| Area | Implementation | Verification status |
| --- | --- | --- |
| Catalog and search | Express/Prisma product reads; React search, category, and sort controls. | Previously exercised locally; hosted check remains. |
| Cart and checkout | Client cart; simulated order write with server-side price calculation, stock validation, and transactional decrement. | Earlier local API smoke check passed before account requirement; authenticated checkout needs a fresh check. |
| Customer accounts | Registration/sign-in, scrypt password hashes, signed 12-hour bearer token, and rate limit. | Implemented; not yet exercised after this change. |
| Order privacy | Authenticated checkout associates the order with the signed-in user; order history filters by owner. | Implemented; guest/owner/second-user checks remain. |
| Assistant | Selects in-stock catalog candidates; optional server-side Gemini draft is validated with deterministic fallback. | Earlier local response observed; provider versus fallback was not distinguished. |
| AWS deployment | Single EC2 service unit, Nginx reverse proxy and SPA fallback, HTTPS walkthrough, local PostgreSQL. | Not deployed; no AWS account, host, domain, or hosted URL was supplied. |

## Previous local evidence

Before the account and AWS changes in this release candidate, the project recorded a successful `npm run check` (frontend/backend lint, 4 frontend tests, 15 backend tests, and frontend build). Earlier local requests returned six seeded products, an assistant answer, HTTP 422 for invalid checkout, HTTP 409 for over-stock checkout, and a successful fictional simulated order. That order flow was unauthenticated. These results are historical and do not verify the new account flow or deployment.

No checks were run after the account, migration, and AWS deployment changes in this update. Run the project checks and complete the actual hosted journey in [`DEPLOYMENT_PLAN.md`](DEPLOYMENT_PLAN.md) before claiming the release is verified.

## Known limits and data handling

- This is a classroom demo, not a production commerce system. It has no payment processing, password reset, administrator role, or account deletion flow.
- Bearer tokens are stored in browser local storage and expire after 12 hours. Use fictional classroom credentials and HTTPS.
- Cart state is in memory and is lost after a page reload.
- Checkout stores the entered delivery address. Do not enter real personal data.
- The optional assistant provider is called only by the server and receives selected public product fields and the question. Leave the key unset for the deterministic assistant.
- The seed command deletes all products and orders. Use it only on a fresh disposable database.
- The single EC2 setup is a single point of failure. Back up PostgreSQL and remove demo resources after class.

## Evidence still to collect

Record the AWS account plan and redacted credit status, Region and resource inventory, HTTPS URLs, repository commit, guest/owner/second-user order access results, checkout and assistant outcomes, restart result, and cleanup date. Never include private keys, database URLs, passwords, bearer tokens, or provider keys in evidence.
