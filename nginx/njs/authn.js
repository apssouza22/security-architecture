/**
 * @param r see http://nginx.org/en/docs/njs/reference.html
 */
function exchangeCodeForToken(r) {
    r.log(r.args.code);
    const code = r.args.code;
    const returnTo = r.args.return_to; // Get the original URL to return to
    
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
            return;
        }
        
        // Set the JWT token as an HTTP-only cookie
        const cookieOptions = 'HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600';
        const authCookie = `Authorization=Bearer ${body.access_token}; ${cookieOptions}`;
        
        // Redirect to the original URL or default location
        const redirectUrl = returnTo || '/';
        
        r.return(302, '', {
            'Set-Cookie': authCookie,
            'Location': redirectUrl
        });
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

/**
 * Handle login redirect with dynamic URL based on the original request
 * @param r see http://nginx.org/en/docs/njs/reference.html
 */
function handleLoginRedirect(r) {
    // Get the original request URI that failed authentication
    const originalUri = r.uri;
    const originalArgs = r.args ? '?' + Object.keys(r.args).map(key => 
        `${encodeURIComponent(key)}=${encodeURIComponent(r.args[key])}`
    ).join('&') : '';

    const originalUrl = `${r.variables.scheme}://${r.variables.host}${originalUri}${originalArgs}`;
    const redirectUri = encodeURIComponent(`http://localhost:8002/auth_redirect?return_to=${encodeURIComponent(originalUrl)}`);

    const clientId = "appTest-login-client";
    const clientSecret = "vCjAY0XKadXE3n4xFUb7MGDvVJ1iVVPY";
    const scope = "openid";
    const responseType = "code";
    const applicationType = "web_app";
    const state = generateRandomState();
    
    const loginUrl = `http://127.0.0.1:9000/realms/tenantA/protocol/openid-connect/auth?` +
        `scope=${scope}&` +
        `response_type=${responseType}&` +
        `client_id=${clientId}&` +
        `redirect_uri=${redirectUri}&` +
        `client_secret=${clientSecret}&` +
        `application-type=${applicationType}&` +
        `state=${state}`;
    
    r.log(`Redirecting to login: ${loginUrl}`);
    r.return(302, loginUrl);
}

/**
 * Generate a random state parameter for OAuth security
 * @returns {string}
 */
function generateRandomState() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Perform authentication check using a authentication service
 * @param r see http://nginx.org/en/docs/njs/reference.html
 */
async function authCheck(r) {
    try {
        let resp = await r.subrequest('/_authn')
        r.log("Auth check status:" + resp.status);

        if (resp.status !== 200) {
            r.return(401, "Unauthorized");
            return
        }
        const response = getResponse(resp, r);
        if(!response) {
            return;
        }

        r.headersOut['X-Auth-Token'] = response.token;
        r.headersOut['X-Upstream-Url'] = response.upstreamUrl;
        r.headersOut['X-Set-Cookie'] = resp.headersOut['Set-Cookie'];

        return r.return(200, "Authorized");

    } catch (e) {
        r.return(500, e);
    }
}

function getResponse(resp, r){
    let response;
    try {
        response = JSON.parse(resp.responseText);
    } catch (e) {
        r.return(500, "Invalid response format");
        return;
    }

    if (!response.token || !response.upstreamUrl) {
        r.return(500, "Missing required response fields");
        return;
    }
    return response;
}

function handleRespHeader(r) {
    // Pass through auth headers from subrequest auth check to client response
    if (r.variables.auth_set_cookie) {
        r.headersOut['set-cookie'] = r.variables.auth_set_cookie;
    }
}


export default {
    exchangeCodeForToken,
    validate,
    handleLoginRedirect,
    handleRespHeader,
    authCheck
};