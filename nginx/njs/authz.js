/**
 * Validate the request based on the client certificate and OPA policy.
 * @param r
 * @param res
 */
function validate(r, res) {
     r.log(JSON.stringify(Object.keys(r)));
     res = r
    let dn = r.variables.ssl_client_s_dn;
    if (dn == "-") {
        res.return(403);
        return;
    }

    r.log("Client certificate: " + dn);

    let match = RegExp('CN=([^,]+),?').exec(dn);
    if (match == null) {
        res.return(403);
        return;
    }
    r.log("destination: " + r.variables.host);

    let opa_data = {
        "input": {
            "origin": match[1],
            "destination": r.variables.host,
            "path": r.variables.request_uri,
            "method": r.variables.request_method,
            "token":  r.headersIn.Authorization
        }
    };

    let opts = {
        method: "POST",
        body: JSON.stringify(opa_data)
    };

    r.subrequest("/_opa", opts, function(opa) {
        r.log("OPA response: " + opa.responseText);
        let body = JSON.parse(opa.responseText);
        if (!body.result)  {
            r.return(403);
            return;
        }

        if (!body.result.allow) {
            r.return(403);
            return;
        }

        r.return(200);
    });
}
export default {
    validate
}