/**
 * @param r see http://nginx.org/en/docs/njs/reference.html
 */
function exchangeCodeForToken(r) {
    r.log(r.args.code);
    const code = r.args.code;
    const postData = `grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent("http://localhost:8002/auth_redirect")}&client_id=appTest-login-client&client_secret=vCjAY0XKadXE3n4xFUb7MGDvVJ1iVVPY`;
    r.log(postData)
    let opts = {
        method: "POST",
        body: postData,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        }
    };

    r.subrequest("/token", opts, function (resp) {
        let body = JSON.parse(resp.responseText);
        r.log(resp.responseText);
        if(!body.access_token) {
            r.return(403, "Invalid code");
        }
        r.return(200, JSON.stringify(body));
    });
}


/**
 * @param r see http://nginx.org/en/docs/njs/reference.html
 */
function validate(r) {
    const token = r.headersIn.Authorization;
    if(!token) {
        r.return(401);
        return;
    }

    const parsed = extractPayload(token);
    const payload = parsed[0];
    const header = parsed[1];
    const signature = parsed[2];

    console.log("header", header);
    console.log("payload", payload);
    console.log("Signature", signature);

    //Get the certs from http://localhost:9000/realms/tenantA/protocol/openid-connect/certs
    //Loop over the certs and verify the kid = header.kid
    //Convert the cert to a PEM format
    //Verify the signature with the cert

    r.return(200);
}

function extractPayload(token) {
    const tokenParts = token.split('.');
    const decodedHeader = Buffer.from(tokenParts[0], 'base64').toString('utf-8');
    const decodedPayload = Buffer.from(tokenParts[1], 'base64').toString('utf-8');
    return [JSON.parse(decodedPayload), JSON.parse(decodedHeader), tokenParts[2]];
}


export default {
    exchangeCodeForToken,
    validate
};