function extractPayload(token) {
    const tokenParts = token.split('.');
    const decodedHeader = Buffer.from(tokenParts[0], 'base64').toString('utf-8');
    const decodedPayload = Buffer.from(tokenParts[1], 'base64').toString('utf-8');
    return [JSON.parse(decodedPayload), JSON.parse(decodedHeader), tokenParts[2]];
}


/**
 * @param r see http://nginx.org/en/docs/njs/reference.html
 */
function exchangeCodeForToken(r) {
    r.log(r.args.code);
    const code = r.args.code;
    r.log(code);
    const postData = `grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent("http://localhost:8002/auth_redirect")}&client_id=appTest-login-client&client_secret=vCjAY0XKadXE3n4xFUb7MGDvVJ1iVVPY`;
    r.log(postData)
    let opts = {
        method: "POST",
        body: postData,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        }
    };

    r.subrequest("/_keycloak_token", opts, function (resp) {
        let body = JSON.parse(resp.responseText);
        if(body.access_token) {
            body.decoded_access_token = extractPayload(body.access_token)
        }
        validateJwtToken(r, body.access_token);
        r.return(200, JSON.stringify(body));
    });
}

/**
 * @param r see http://nginx.org/en/docs/njs/reference.html
 * @param token
 */
function validateJwtToken(r, token) {
    const parsed = extractPayload(token);
    const payload = parsed[0];
    const header = parsed[1];
    const signature = parsed[2];

    console.log("header", header);
    console.log("payload", payload);
    //Get the certs from http://localhost:9000/realms/tenantA/protocol/openid-connect/certs
    //Loop over the certs and verify the kid = header.kid
    //Convert the cert to a PEM format
    //Verify the signature with the cert
}

export default {
    exchangeCodeForToken
};