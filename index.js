import 'dotenv/config';

import express from "express";
import bodyParser from "body-parser";

import {privateKeyToAccount} from "viem/accounts";
import {checksumAddress} from "viem";

const app = express();
app.use(bodyParser.json());

app.get('/', function (_, res) {
    res.json({ online: true });
});

// Authorize endpoint
app.post('/authorize', async (req, res) => {
    const { account, signedBy } = req.body;

    if (!account || !signedBy) {
        return res.status(400).json({ allowed: false, reason: 'Missing account or signedBy field' });
    }

    console.log(`[${req.method}] ${req.originalUrl}: Received auth request for ${account}, signed by ${signedBy}.`);

    // TODO: INTEGRATOR ADD ANY OF YOUR CUSTOM LOGIC TO VALIDATE WHO IS SPONSORED OR ALLOWED TO LOGIN

    // in vercel `protocol` is `http`, but `x-forwarded-proto` is `https`
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const fullDomain = `${protocol}://${host}`;

    res.json({
        allowed: true,
        sponsored: false,
        appVerificationEndpoint: `${fullDomain}/verify-operation`
    });
});

// Verification endpoint
app.post('/:sharedSecret/verify-operation', async (req, res) => {
    let { sharedSecret } = req.params;
    if (sharedSecret !== SHARED_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const { deadline, nonce, operation, account, validator } = req.body;

    const missingFields = ['deadline', 'nonce', 'operation', 'account', 'validator'].filter(field => !req.body[field]);
    if (missingFields.length > 0) {
        return res.json({allowed: false, reason: `Missing ${missingFields.join(', ')} field(s)`});
    }

    console.log(`[${req.method}] ${req.originalUrl}: Recieved operation verification request for ${operation} from ${account}`);

    const typedData = {
        domain: {
            name: 'Lens Source',
            version: '1',
            chainId: CHAIN_ID,
            verifyingContract: checksumAddress(APP)
        },
        types: {
            SourceStamp: [
                { name: 'source', type: 'address' },
                { name: 'originalMsgSender', type: 'address' },
                { name: 'validator', type: 'address' },
                { name: 'nonce', type: 'uint256' },
                { name: 'deadline', type: 'uint256' }
            ]
        },
        primaryType: 'SourceStamp',
        message: {
            source: checksumAddress(APP),
            originalMsgSender: checksumAddress(account),
            validator: checksumAddress(validator),
            nonce: nonce,
            deadline: deadline
        }
    };

    const signature = await PK_ACCOUNT.signTypedData(typedData);

    res.json({ allowed: true, signature });
});

const PORT = process.env.PORT || 3003;
let APP = '';
let PK_ACCOUNT;
let CHAIN_ID = ''
let SHARED_SECRET = '';
app.listen(PORT, () => {
    let secret = process.env.SHARED_SECRET;
    if (!secret || secret.toString().length < 10) {
        throw new Error("The shared secret must be 10 characters or over")
    }
    SHARED_SECRET = secret;
    try {
        APP = checksumAddress(process.env.APP)
    } catch(_) {
        throw new Error("App is not a valid EVM address")
    }

    try {
        PK_ACCOUNT = privateKeyToAccount(process.env.PRIVATE_KEY);
    } catch(_) {
        throw new Error("Private key is not valid")
    }

    const blockchain_environment = process.env.ENVIRONMENT.toString().toLowerCase();
    if (blockchain_environment === "mainnet") {
        CHAIN_ID = 232;
    } else if (blockchain_environment === "testnet") {
        CHAIN_ID = 37111;
    } else {
        throw new Error("ENVIRONMENT should be MAINNET or TESTNET")
    }

    console.log(`Server running on port ${PORT}`);
});
