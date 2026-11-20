# Deploy ShopSmart to AWS (single EC2 demo)

This walkthrough deploys the current project as a small, single-machine classroom demo. One Ubuntu EC2 instance runs Nginx, the React build, Express, and PostgreSQL. The browser and API share one HTTPS origin, so the browser sends credentials only over HTTPS and CORS setup stays simple. PostgreSQL listens locally and is never opened to the internet.

```mermaid
flowchart LR
  B[Browser] -->|HTTPS 443| N[Nginx on EC2]
  N -->|static files| F[React build]
  N -->|localhost 3000| A[Express API]
  A -->|localhost 5432| D[(PostgreSQL on EC2)]
  A -. optional server-side .-> G[Gemini API]
```

This layout is for a brief demonstration with fictional accounts and simulated orders. EC2 is a single point of failure and the team owns database backups, OS updates, process monitoring, TLS renewal, and cleanup. A separated Amplify + EC2 + private RDS design is a reasonable next step after learning the end-to-end path. Check the account plan, service eligibility, Region, credits, and expiry in Billing and Cost Management before creating resources; free-tier labels do not guarantee that every resource or transfer is free.

## 1. Prepare the release

1. Commit and push the project to a Git repository the EC2 host can access. Do not commit `.env` files or credentials.
2. Confirm the latest migration is committed. `npm run db:migrate:deploy` applies migrations without deleting existing records. Do not run `npm run db:seed` on a database with data to preserve; the seed script deletes orders and products.
3. Pick a domain name you control. For HTTPS, point its DNS A record to the EC2 Elastic IP after allocation. A public IP alone is not sufficient for the HTTPS sign-in demo.
4. In the AWS console, select the approved Region and launch an Ubuntu Server 24.04 LTS EC2 instance. Choose an instance size allowed by the account and suitable for the short demo. Create or select a key pair and keep its private key securely.
5. Allocate and associate an Elastic IP so the DNS address will not change when the instance restarts. Review the current cost for the address and instance in the selected Region.
6. Attach a security group with inbound TCP 80 and 443 from anywhere. Allow TCP 22 only from your current trusted public IP (or use an approved managed access method). Do not add inbound rules for 3000 or 5432.

AWS references: [EC2 security groups](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/creating-security-group.html), [connect to a Linux EC2 instance](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connect-to-linux-instance.html).

## 2. Connect and install the host software

From PowerShell on Windows, connect using the downloaded key and the EC2 public DNS name (replace both placeholders):

```powershell
ssh -i .\shopsmart-key.pem ubuntu@EC2_PUBLIC_DNS
```

On EC2, install PostgreSQL, Nginx, Git, and Node.js 22 LTS. Use the current Node.js installation instructions for Ubuntu from the official [Node.js download page](https://nodejs.org/en/download):

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y nginx postgresql postgresql-contrib git curl ca-certificates
node --version
npm --version
```

If `node` is missing or older than 20.19, install Node.js 22 LTS using the Node.js page's Linux instructions, then reopen the shell and check `node --version` again. ShopSmart requires Node 20.19 or later.

Create a service account and application directory:

```bash
sudo adduser --system --group --home /var/lib/shopsmart shopsmart
sudo mkdir -p /var/www
sudo mkdir -p /etc/shopsmart
sudo chown root:shopsmart /etc/shopsmart
sudo chmod 750 /etc/shopsmart
```

## 3. Create the local database

```bash
sudo -u postgres psql
```

At the PostgreSQL prompt, create an application role and database. In a second shell, generate a database password with `openssl rand -hex 24`; paste it at the `\password` prompt (the password prompt does not echo typed characters). Save it in your approved secret store for the server environment file in the next step.

```sql
CREATE ROLE shopsmart LOGIN;
\password shopsmart
CREATE DATABASE shopsmart OWNER shopsmart;
\q
```

Keep PostgreSQL bound to localhost. Do not add a public security-group rule for port 5432.

## 4. Download the code and configure secrets

Replace the repository URL below with your Git repository URL. For a private repository, configure a read-only deploy key rather than putting a personal access token in the clone URL.

```bash
sudo -u shopsmart git clone YOUR_REPOSITORY_URL /var/www/shopsmart
cd /var/www/shopsmart
```

Create `/etc/shopsmart/shopsmart.env` with an editor such as `sudo nano /etc/shopsmart/shopsmart.env`. Use your real domain and the database password you just set:

```env
NODE_ENV=production
PORT=3000
HOST=127.0.0.1
DATABASE_URL="postgresql://shopsmart:YOUR_DATABASE_PASSWORD@127.0.0.1:5432/shopsmart?schema=public"
FRONTEND_URL="https://YOUR_DOMAIN"
CORS_ORIGIN="https://YOUR_DOMAIN"
AUTH_SECRET="REPLACE_WITH_A_LONG_RANDOM_SECRET"
GEMINI_MODEL="gemini-2.5-flash"
```

Generate a strong signing secret on the server with `openssl rand -hex 48` and paste its output as `AUTH_SECRET`. Leave `GEMINI_API_KEY` unset for the deterministic catalog assistant, or add an approved provider key here only. Never use a `VITE_` variable for a secret. Restrict the file:

```bash
sudo chown root:shopsmart /etc/shopsmart/shopsmart.env
sudo chmod 640 /etc/shopsmart/shopsmart.env
sudo -u shopsmart ln -s /etc/shopsmart/shopsmart.env /var/www/shopsmart/backend/.env
```

## 5. Build and initialize ShopSmart

Set the public API base URL to the same-origin relative path before building. This setting is compiled into the browser bundle and is public:

```bash
cd /var/www/shopsmart
sudo -u shopsmart env VITE_API_URL=/api npm ci
sudo -u shopsmart env VITE_API_URL=/api npm run db:generate
sudo -u shopsmart env VITE_API_URL=/api npm run db:migrate:deploy
sudo -u shopsmart env VITE_API_URL=/api npm run build
```

For a brand-new disposable demonstration database only, insert the sample catalog with `sudo -u shopsmart npm run db:seed`. Do not rerun it when orders or product changes need to be kept. The first registration through the website creates the fictional customer account; use only fictional name, email, address, and password.

## 6. Run the API as a service

Copy the included systemd service file and start it:

```bash
sudo cp /var/www/shopsmart/deploy/shopsmart.service /etc/systemd/system/shopsmart.service
sudo systemctl daemon-reload
sudo systemctl enable --now shopsmart
sudo systemctl status shopsmart --no-pager
```

The API listens only behind the local Nginx proxy in the intended design. Confirm it locally before configuring the public web server:

```bash
curl http://127.0.0.1:3000/api/health
```

Expected response: `{"status":"ok"}`. This health endpoint checks PostgreSQL too.

## 7. Configure Nginx and HTTPS

First, create the DNS A record for `YOUR_DOMAIN` pointing to the Elastic IP and wait until it resolves. Install the included Nginx site configuration, replace `YOUR_DOMAIN`, enable it, and check the syntax:

```bash
sudo cp /var/www/shopsmart/deploy/nginx-shopsmart.conf /etc/nginx/sites-available/shopsmart
sudo nano /etc/nginx/sites-available/shopsmart
sudo ln -s /etc/nginx/sites-available/shopsmart /etc/nginx/sites-enabled/shopsmart
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Install Certbot using the current instructions at [Certbot](https://certbot.eff.org/instructions). Request a certificate for the domain and allow Certbot to configure the Nginx HTTPS listener and HTTP-to-HTTPS redirect. Test certificate renewal using Certbot's documented dry run. Keep ports 80 and 443 open so validation and renewal can reach the host.

## 8. Verify the hosted customer journey

Open `https://YOUR_DOMAIN` in a fresh browser session and record the date, repository commit, URL, and results. Use fictional data only.

1. Load the home page and directly refresh `/products/1`; both should render the React app.
2. Visit `https://YOUR_DOMAIN/api/health`; expect HTTP 200 and `{"status":"ok"}`.
3. Confirm products load, search works, and cart quantities and totals update.
4. Try checkout while signed out; it should direct you to sign in. Create a fictional account, sign in, and complete a simulated order.
5. Open Account and confirm that the signed-in owner sees the order. Sign out; `GET /api/auth/orders` with no bearer token must return 401.
6. Create a second fictional account and verify its order list does not include the first account's order. The API query scopes records by the signed-in user's ID.
7. Ask a matching and a no-match assistant question. Check that recommendations link to the current catalog. With no provider key configured, the interface should use the built-in deterministic assistant.
8. Restart the API with `sudo systemctl restart shopsmart`, then reload the site and check health and persisted account/order data.
9. Inspect logs with `sudo journalctl -u shopsmart -n 100 --no-pager` and Nginx logs under `/var/log/nginx/`. Do not capture tokens, passwords, or connection strings in evidence.

## 9. Updates, backup, and cleanup

For an update, record the current commit, fetch the reviewed revision, install dependencies, apply committed migrations, rebuild the frontend, and restart the service. Do not run the seed script as an update step. Take and verify a PostgreSQL backup before schema or data changes. Example manual backup:

```bash
sudo -u postgres pg_dump shopsmart > "$HOME/shopsmart-$(date +%F).sql"
```

Copy backups to an approved protected location and set a retention period; an instance-local backup is lost with the instance. Before the class ends, record the resource Region and identifiers, retain any required evidence/backups, then remove the EC2 instance, Elastic IP, volumes, snapshots, DNS records, and any other resources created for the demo. Check Billing and Cost Management after cleanup.

## Alternative: Amplify + EC2 + RDS

For a separated architecture, Amplify can build this npm-workspace monorepo with `frontend` as the app root and `frontend/dist` as the output. Set `VITE_API_URL` to the API's public HTTPS URL ending in `/api`; add an SPA rewrite to `index.html`. Run Express on EC2 behind an HTTPS web endpoint and use private RDS PostgreSQL access restricted to the EC2 security group. This uses more AWS services and network settings. See [Amplify monorepo build settings](https://docs.aws.amazon.com/amplify/latest/userguide/monorepo-configuration.html), [EC2-to-RDS connection](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/ec2-rds-connect.html), and [RDS security groups](https://docs.aws.amazon.com/AmazonRDS/latest/gettingstartedguide/security-groups.html).

## Current status

The repository contains the app, authentication/ownership implementation, migration, EC2 service unit, and Nginx configuration. No AWS account, instance, domain, credentials, or hosted URL were supplied; deployment must be carried out by an account owner. The hosted checks above remain to be completed and recorded against the actual AWS resources.
