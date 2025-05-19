# Northflank Deployment for Syndicate Backend

This document explains the Northflank deployment configuration for the Syndicate backend service.

## Main Entry Point

The backend service uses `index.js` as its main entry point. This file contains the full implementation of the backend with support for:

- CSRF protection
- Lens Protocol authentication
- Environment-specific configuration
- Proper CORS handling

Note that `simple-server.js` is an alternative, simplified implementation that can be used for testing but is not the main server file.

## Northflank Setup

The backend service is configured to be deployed on Northflank with the following settings:

- **Service Name**: syndicate-backend
- **Type**: Node.js service
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Port**: 3003
- **Health Check Endpoint**: `/health`

## Environment Variables

The following environment variables need to be configured in Northflank:

- `PORT`: 3003 (HTTP port for the server)
- `PRIVATE_KEY`: Your private key for signing transactions
- `SHARED_SECRET`: Secret token used for API authentication
- `FRONTEND_URL`: URL of the frontend service (for CORS)
- `NODE_ENV`: Set to "production" for production deployments
- `LENS_MAINNET_RPC_URL`: RPC URL for Lens Chain Mainnet
- `LENS_TESTNET_RPC_URL`: RPC URL for Lens Chain Testnet
- `BASE_RPC_URL`: RPC URL for Base Chain

## Deployment Process

Northflank will automatically:

1. Monitor the repository for new commits
2. Build the backend service using `npm install`
3. Start the service using `npm start`
4. Monitor the `/health` endpoint to ensure the service is running properly

## Health Check

The `/health` endpoint returns:

```json
{
  "status": "healthy",
  "timestamp": "2025-04-15T12:34:56.789Z",
  "version": "1.0.0"
}
```

## Local Testing

To test the Northflank configuration locally:

```bash
# Install dependencies
npm install

# Start the server
npm start
```

Then visit http://localhost:3003/health to verify the health check endpoint is working correctly.

## Troubleshooting

If the service fails to start or the health check fails, check:

1. Environment variables are correctly set
2. The server starts without errors locally
3. The `/health` endpoint is accessible
4. Logs in the Northflank console for error messages
