# A lens authorization app workflow example

This code shows you examples of how to setup your backend authorization app workflow.
Note you have to add your own logic into this repo it is not just fork and run unless
you want to sponsor everyone.

# Setup repo

The API needs to have `.env` file which holds the private key within it. Note if your using vercel
you can put your private key in the vercel environment variable. Note you can also use more secure 
approach's of key management like using AWS secrets but for this example we keeping it simple.

```bash
cp .env.example .env
```

Then fill out the details in it:

```bash
PRIVATE_KEY=INSERT_PRIVATE_KEY
APP=INSERT_APP
ENVIRONMENT=MAINNET|TESTNET
SHARED_SECRET=INSERT_SECRET
```

The `SHARED_SECRET` is required on the verify operation so people can not just call it directly and use the signed
sources. It has to be 10 characters or over.

# Running

To start it up just run:

```bash
npm start
```

It will start on localhost:3003

# API Documentation: Authentication and App verification Service

This documentation provides examples for interacting with the API using `curl`.

## Endpoints

### Authorize

URL: POST /authorize

Request

```bash
curl -X POST http://localhost:3003/authorize \
-H "Content-Type: application/json" \
-d '{
  "account": "0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db",
  "signedBy": "0x78731D3Ca6b7E34aC0F824c42a7cC18A495cabaB"
}'
```

Note the response is hard coded as sponsored false to avoid any funds being spent without
you adding your own custom logic in.

```json
{
  "allowed": true,
  "sponsored": false,
  "appVerificationEndpoint": "http://localhost:3003/verify-operation"
}
```

### App verification

URL: POST /:YOUR_SHARED_SECRET/verify-operation

This endpoint is used to sign verification request from Lens API.
It's returned by the `/authorize` endpoint as `appVerificationEndpoint`.

The shared secret is really important to keep your endpoint protected.

Request

```bash
curl -X POST http://localhost:3003/REPLACE_SHARED_SECRET/verify-operation \
-H "Content-Type: application/json" \
-d '{
  "nonce": "42",
  "deadline": "1630000000",
  "operation": "Post",
  "validator": "0x78731D3Ca6b7E34aC0F824c42a7cC18A495cabaB",
  "account": "0x4F10f685B6BF165e86f41CDf4a906B17F295C235"
}'
```

Example Response
```json
{
  "allowed": true,
  "signature": "0x0e50ac31b7f12aaa50a599bd1dfa5629352cdaf71600bf53dff788c56db398f133fa20efd732980fdb855c300d2052884d30fa6bc149e93f302391b0914069b31b"
}
```
