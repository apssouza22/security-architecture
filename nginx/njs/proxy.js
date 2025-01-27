import qs from "querystring";

/**
 *
 * @param r see http://nginx.org/en/docs/njs/reference.html
 */
function getUpstreamUrl(r) {
    let backendUrl = r.headersIn['X-Backend-URL'];
    let args = ""
    if (r.args) {
        args = '?' + qs.stringify(r.args);
    }
    if (backendUrl) {
        backendUrl = backendUrl + args;
    } else {
        backendUrl = r.uri + args;
    }
    r.log("Backend url " + backendUrl);
    return backendUrl
}

export default {
    getUpstreamUrl
};
