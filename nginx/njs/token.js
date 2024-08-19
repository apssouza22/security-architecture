const crypto = require('crypto');

function validateJwtToken(r) {
    for (const prop in crypto) {
        r.log(prop);
    }
    const token = r.headersIn.Authorization;
    const tokenParts = token.split('.');
    const decodedHeader = Buffer.from(tokenParts[0], 'base64').toString('utf-8');
    const decodedPayload = Buffer.from(tokenParts[1], 'base64').toString('utf-8');
    const header = JSON.parse(decodedHeader);
    let x5cCert = null;

    if (header.x5t) {
        // We could use the thumbprint to lookup the certificate
        const thumbprint = header.x5t;
        x5cCert = getX5cCertByThumbprint(thumbprint);
    }

    const opts = {
        method: "GET"
    };

    r.subrequest("/_keycloak_certs", opts, function (resp) {
        const certs = JSON.parse(resp.responseText);
        const cert = certs.keys.find(key => key.kid === header.kid);
        if (!cert) {
            r.return(500, 'Certificate not found');
            return;
        }
        x5cCert = cert.x5c[0];
        const pemCert = convertCertToPEM(x5cCert);
        r.return(200, "Validate the token signature with: " + pemCert);
    });
}

function getX5cCertByThumbprint(thumbprint) {
    const trustedThumbprints = {
        'abcd1234abcd1234abcd1234abcd1234abcd1234': "x5c value"
    };
    return trustedThumbprints[thumbprint];
}

function convertCertToPEM(cert) {
    const pemCert = cert.match(/.{1,64}/g).join('\n');
    return `-----BEGIN CERTIFICATE-----\n${pemCert}\n-----END CERTIFICATE-----\n`;
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