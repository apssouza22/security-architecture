import token from './token.js';

/**
 * Validate the request based on the client certificate and OPA policy.
 * @param r see http://nginx.org/en/docs/njs/reference.html
 * @param res
 */
async function validate(r, res) {
    const serviceName = getCommonNameFromCertificate(r);
    if (!serviceName) {
        r.return(403);
        return;
    }
    r.log("Service name: " + serviceName);
    const isAllowed = await isServiceAllowed(r, serviceName);
    if (!isAllowed) {
        r.return(403);
        return;
    }
    token.validateJwtToken(r, (isValid)=>{
        // TODO: perform user authorization using OPA
        r.log("Common: Token is valid: "+isValid);

        r.return(200);
    });

}

async function isServiceAllowed(r, serviceName) {
    const opa_data = {
        "input": {
            "origin": serviceName,
            "destination": r.variables.host,
            "path": r.variables.request_uri,
            "method": r.variables.request_method,
            "token":  r.headersIn.Authorization
        }
    };

    const opts = {
        method: "POST",
        body: JSON.stringify(opa_data)
    };

    const opa = await r.subrequest("/_opa", opts)
    r.log("OPA response: " + opa.responseText);
    let body = JSON.parse(opa.responseText);
    if (!body.result)  {
        return false;
    }

    return body.result.allow;

}

function getCommonNameFromCertificate(r) {
    let cert = r.variables.ssl_client_s_dn;
    if (!cert) {
        return null;
    }

    let match = cert.match(/CN=([^,]*)/);
    if (!match) {
        return null;
    }

    return match[1];
}

export default {
    validate
}