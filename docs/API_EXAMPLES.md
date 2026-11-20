# ShopSmart API examples

Start the application with `npm run dev`, then send these requests through Bruno or another authorized API client.

## Health check

```http
GET http://localhost:3000/api/health
```

## Product list

```http
GET http://localhost:3000/api/products
```

## One product

```http
GET http://localhost:3000/api/products/1
```

## Create a simulated order

Create or sign in to a customer account first, then use the returned bearer token. The account creation example uses fictional classroom data.

```http
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "name": "Ana Reyes",
  "email": "ana@example.com",
  "password": "classroom-demo-password"
}
```

Use the `token` from that response in the order request. Sign-in uses `POST /api/auth/login` with `email` and `password`.

```http
POST http://localhost:3000/api/orders
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "customerName": "Ana Reyes",
  "email": "ana@example.com",
  "address": "Angeles City, Pampanga",
  "items": [
    { "productId": 1, "quantity": 1 },
    { "productId": 2, "quantity": 1 }
  ]
}
```

The server ignores prices from the browser, reads authoritative prices from PostgreSQL, and associates the order with the signed-in account. `GET /api/auth/orders` requires the same bearer token and returns only that account's orders. Requests without a valid token receive HTTP 401.

## Ask the starter assistant

```http
POST http://localhost:3000/api/assistant/questions
Content-Type: application/json

{
  "question": "Which keyboard is below ₱2,000?"
}
```
