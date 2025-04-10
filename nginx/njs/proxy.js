import qs from "querystring";

/**
 *
 * @param r see http://nginx.org/en/docs/njs/reference.html
 */
function getUpstreamUrl(r) {
    r.log("Retrieving upstream url" );
    let backendUrl = r.headersIn['X-Backend-URL'];
    let args = qs.stringify(r.args)
    if (args) {
        r.log("args="+ args );
        args = '?' + args
    }
    if (backendUrl) {
        backendUrl = backendUrl + r.uri + args;
    } else {
        backendUrl = "https://" +r.variables.host + r.uri + args;
    }
    r.log("Backend url " + backendUrl);
    return backendUrl
}

export default {
    getUpstreamUrl
};
