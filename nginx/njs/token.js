const crypto = require('crypto');

/**
 * support algorithm mapping
 */
const algorithmMap = {
    HS256: 'sha256',
    HS384: 'sha384',
    HS512: 'sha512',
    RS256: 'RSA-SHA256'
};

/**
 * Map algorithm to hmac or sign type, to determine which crypto function to use
 */
const typeMap = {
    HS256: 'hmac',
    HS384: 'hmac',
    HS512: 'hmac',
    RS256: 'sign'
};


/**
 * Decode jwt
 *
 * @param {Object} token
 * @param {String} key
 * @param {Boolean} [noVerify]
 * @param {String} [algorithm]
 * @return {Object} payload
 * @api public
 */
function jwtVerify(token, key, noVerify, algorithm) {
    // check token
    if (!token) {
        throw new Error('No token supplied');
    }
    // check segments
    var segments = token.split('.');
    if (segments.length !== 3) {
        throw new Error('Not enough or too many segments');
    }

    // All segment should be base64
    var headerSeg = segments[0];
    var payloadSeg = segments[1];
    var signatureSeg = segments[2];

    // base64 decode and parse JSON
    //var header = '';
    //var payload = '';
    //jwt.return.return(200, payloadSeg);

    var h = base64urlDecode(headerSeg);
    var p = base64urlDecode(payloadSeg);


    while (h.charCodeAt((h.length - 1)) === 0) {
        h = h.substring(0, h.length - 1);
    }

    while (p.charCodeAt((p.length - 1)) === 0) {
        p = p.substring(0, p.length - 1);
    }


    var header = JSON.parse(h);
    var payload = JSON.parse(p);

    if (noVerify) {
        return payload;
    }
    if (!algorithm && /BEGIN( RSA)? PUBLIC KEY/.test(key.toString())) {
        algorithm = 'RS256';
    }

    var signingMethod = algorithmMap[algorithm || header.alg];
    var signingType = typeMap[algorithm || header.alg];
    if (!signingMethod || !signingType) {
        throw new Error('Algorithm not supported');
    }

    // verify signature. `sign` will return base64 string.
    var signingInput = [headerSeg, payloadSeg].join('.');
    if (!verify(signingInput, key, signingMethod, signingType, signatureSeg)) {
        throw new Error('Signature verification failed');
    }

    // Support for nbf and exp claims.
    // According to the RFC, they should be in seconds.
    if (payload.nbf && Date.now() < payload.nbf * 1000) {
        throw new Error('Token not yet active');
    }

    if (payload.exp && Date.now() > payload.exp * 1000) {
        throw new Error('Token expired');
    }
    return payload;
}

function verify(input, key, method, type, signature) {
    if (type === "hmac") {
        return (signature === sign(input, key, method, type));
    }
    if (type == "sign") {
        return crypto.createVerify(method)
            .update(input)
            .verify(key, base64urlUnescape(signature), 'base64');
    }
    throw new Error('Algorithm type not recognized');
}

function sign(input, key, method, type) {
    var base64str;
    if (type === "hmac") {
        base64str = crypto.createHmac(method, key).update(input).digest('base64');
    } else if (type == "sign") {
        base64str = crypto.createSign(method).update(input).sign(key, 'base64');
    } else {
        throw new Error('Algorithm type not recognized');
    }
    return base64urlEscape(base64str);
}

function base64urlDecode(str) {
    return String.bytesFrom(str, 'base64');
}

function base64urlUnescape(str) {
    str += new Array(5 - str.length % 4).join('=');
    return str.replace(/\-/g, '+').replace(/_/g, '/');
}

function base64urlEscape(str) {
    str = str.replace(/\+/g, '-');
    str = str.replace(/\//g, '_');
    str = str.replace(/\=/g, '');
    return str;
}

export default {
    jwtVerify
}