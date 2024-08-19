const https = require('https');
const crypto = require('crypto');


async function validateJwtToken(r) {
    const token = request.headersIn.Authorization;
    const parsed = extractPayload(token);
    const payload = parsed[0];
    const header = parsed[1];
    const signature = parsed[2];

    r.log("token header: " + header);
    r.log("token payload: ", payload);
    let x5cCert = null;
    if (header.x5t) {
        // Another way to get the cert based in thumbprint within the token. That is used when we have all the certs available in the token
        const thumbprint = header.x5t;
        x5cCert= getX5cCertByThumbprint(thumbprint);
    }
    if (!x5cCert) {
        const certs = await getCerts('http://localhost:9000/realms/tenantA/protocol/openid-connect/certs');
        const cert = certs.keys.find(key => key.kid === header.kid);
        if (!cert) {
            throw new Error('Certificate not found');
        }
        x5cCert = cert.x5c[0]
    }

    const pemCert = convertCertToPEM(x5cCert);
    const isValid = verifySignature(Buffer.from(header).toString('base64'), Buffer.from(payload).toString('base64'), signature, pemCert);

    if (isValid) {
        r.log('Token is valid');
    } else {
        r.log('Token is invalid');
    }
}

function getX5cCertByThumbprint(thumbprint) {
    const trustedThumbprints = [
        {'abcd1234abcd1234abcd1234abcd1234abcd1234' : "x5c value"},

    ];

    return  trustedThumbprints[thumbprint]
}


function getCerts(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve(JSON.parse(data));
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

function convertCertToPEM(cert) {
    const pemCert = cert.match(/.{1,64}/g).join('\n');
    return `-----BEGIN CERTIFICATE-----\n${pemCert}\n-----END CERTIFICATE-----\n`;
}

function verifySignature(header, payload, signature, cert) {
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(`${header}.${payload}`);
    verify.end();
    return verify.verify(cert, signature, 'base64');
}

function extractPayload(token) {
    const tokenParts = token.split('.');
    const decodedHeader = Buffer.from(tokenParts[0], 'base64').toString('utf-8');
    const decodedPayload = Buffer.from(tokenParts[1], 'base64').toString('utf-8');
    return [JSON.parse(decodedPayload), JSON.parse(decodedHeader), tokenParts[2]];
}

export default {
    validateJwtToken
};