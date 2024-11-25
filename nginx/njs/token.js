/**
 * Validate token using the embedded certificate in the token.
 * Token can contain the certificate in the x5c header.
 * We can use the certificate to validate the token signature after validating the certificate against the trusted CA.
 * @param header
 * @param r
 * @param callbackFn
 * @returns {boolean}
 */
function validateUsingEmbeddedCert(header, r, callbackFn) {
    if (header.x5c) {
        const leafCert = header.x5c[0];
        // TODO: validate the certificate against the trusted CA
        // TODO: validate the token signature with the certificate
        r.log("Validate the token signature with: " + leafCert);
        callbackFn(true);
        return true
    }
    return false
}

/**
 * Validate token using the thumbprint and trust store. The token can contain the thumbprint of the certificate in the x5t header.
 * We can use the thumbprint to lookup the certificate in the trust store and validate the token signature with the certificate.
 *
 * @param header
 * @param r
 * @param callbackFn
 * @returns {boolean}
 */
function validateUsingThumbprintAndTrustStore(header, r, callbackFn) {
    if (header.x5t) {
        // The token can contain the certificate thumbprint embedded in the x5t header. We could use the thumbprint to lookup the certificate
        const thumbprint = header.x5t;
        const x5cCert = getCertFromTrustStore(thumbprint);
        const pemCert = convertCertToPEM(x5cCert);
        // TODO: validate the token signature with the certificate
        r.log("Validate the token signature with: " + pemCert);
        callbackFn(true);
        return true
    }
    return false;
}

/**
 * Validate token using the IDP certificates. The token can contain the key id in the header.
 * We can use the key id to lookup the certificate in the IDP certs endpoint and validate the token signature with the certificate.
 * @param r
 * @param header
 * @param callbackFn
 */
function validateUsingIdpCerts(r, header, callbackFn) {
    r.subrequest("/_keycloak_certs", {method: "GET"}, function (resp) {
        const certs = JSON.parse(resp.responseText);
        const cert = certs.keys.find(key => key.kid === header.kid);
        if (!cert) {
            r.return(500, 'Certificate not found');
            return;
        }
        const x5cCert = cert.x5c[0];
        const pemCert = convertCertToPEM(x5cCert);
        r.log("Validate the token signature with: " + pemCert);
        callbackFn(true);
    });
}

/**
 * Validate the JWT token.
 * @param r
 * @param callback
 */
function validateJwtToken(r, callback) {
    const token = r.headersIn.Authorization;
    if(!token) {
        r.return(401, "Token not found");
        return false;
    }
    const tokenParts = token.split('.');
    const decodedHeader = Buffer.from(tokenParts[0], 'base64').toString('utf-8');
    const decodedPayload = Buffer.from(tokenParts[1], 'base64').toString('utf-8');
    const header = JSON.parse(decodedHeader);
    let callbackFn = callback;
    if(!callback){
        callbackFn = function(isValid) {
            r.log("Token is valid: " + isValid);
        }
    }

    if(validateUsingEmbeddedCert(header, r, callbackFn)) {
        return true;
    }

    if(validateUsingThumbprintAndTrustStore(header, r, callbackFn)) {
        return true;
    }
    return validateUsingIdpCerts(r, header, callbackFn);
}

function getCertFromTrustStore(thumbprint) {
    const trustedCerts = {
        'abcd1234abcd1234abcd1234abcd1234abcd1234': "x5c cert value 1",
        'efgh5678efgh5678efgh5678efgh5678efgh5678': "x5c cert value 2"
    };
    return trustedCerts[thumbprint];
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
