# Lens Authentication Workflow Example App

This code provides examples of how to set up your backend authorization app workflow. Note that you need to add your own logic to this repository; it is not a simple fork-and-run solution unless you intend to authorize and sponsor everyone.

## Setup repo

The API requires a `.env` file that contains the private key. If you are using Vercel, you can store your private key in the Vercel environment variables. For a more secure approach, consider using key management services like AWS Secrets Manager. However, for this example, we are keeping it simple.

```bash
cp .env.example .env
```

Then, fill out the details in the `.env` file:

```bash
PRIVATE_KEY=INSERT_PRIVATE_KEY
ENVIRONMENT=MAINNET|TESTNET
SHARED_SECRET=INSERT_SECRET
```

The `SHARED_SECRET` is required to ensure that the request is coming from the Lens API. You can use any random string, but it should be kept secret.

## Running

To start the application, simply run:

```bash
npm start
```

The application will start on `http://localhost:3003` unless a different port is specified via the `PORT` environment variable.

## API Documentation

This documentation provides examples for interacting with the API using `curl`.

## Authorize Endpoint

URL: `POST /authorize`

**Request:**

```bash
curl -X POST http://localhost:3003/authorize \
     -H "Authorization: Bearer <YOUR_SHARED_SECRET>" \
     -H "Content-Type: application/json" \
     -d '{
      "account": "0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db",
      "signedBy": "0x78731D3Ca6b7E34aC0F824c42a7cC18A495cabaB"
     }'
```

**Response:**

```json
{
  "allowed": true,
  "sponsored": false,
  "signingKey": "<PRIVATE_KEY>"
}
```

> [!NOTE]
> The response is hard-coded with `"sponsored": false` to prevent any Sponsorship funds from being accidentally spent without you adding your own custom logic.
