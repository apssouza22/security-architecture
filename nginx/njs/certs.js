import fs from 'fs'

/**
 * Generate cache key with metadata suffix
 * @param {string} key - Original cache key
 * @returns {string} - Key for storing metadata
 */
function getMetaKey(key) {
  return `${key}:meta`;
}

/**
 * Get cache instance from zone
 * @param {string} zone - Cache zone name
 * @returns {object|null} - Cache instance or null
 */
function getCache(zone) {
  return zone && ngx.shared && ngx.shared[zone];
}

/**
 * Set data in cache with TTL
 * @param {string} zone - Cache zone name
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} ttl - TTL in seconds
 * @returns {boolean} - Success status
 */
function cacheSet(zone, key, data, ttl) {
  ngx.log(ngx.INFO, `TTLCache: setting cache key ${key}`);
  const cache = getCache(zone);
  if (!cache) {
    return false;
  }

  const expireTime = Date.now() + (ttl * 1000);
  const metadata = {
    expireTime: expireTime,
    createdAt: Date.now()
  };

  try {
    // Store the actual data
    cache.set(key, data);
    // Store metadata with expiration info
    cache.set(getMetaKey(key), JSON.stringify(metadata));
    return true;
  } catch (e) {
    ngx.log(ngx.ERR, `TTLCache: Error setting cache key ${key}: ${e}`);
    return false;
  }
}

/**
 * Get data from cache, checking TTL
 * @param {string} zone - Cache zone name
 * @param {string} key - Cache key
 * @returns {any|null} - Cached data or null if expired/not found
 */
function cacheGet(zone, key) {
  const cache = getCache(zone);
  if (!cache) {
    return null;
  }

  try {
    const data = cache.get(key);
    if (!data) {
      return null;
    }

    const metaData = cache.get(getMetaKey(key));
    if (!metaData) {
      // No metadata found, assume expired or old entry
      cacheDelete(zone, key);
      return null;
    }

    const metadata = JSON.parse(metaData);
    const now = Date.now();

    // Check if data has expired
    if (now > metadata.expireTime) {
      ngx.log(ngx.INFO, `TTLCache: Key ${key} expired, removing from cache`);
      cacheDelete(zone, key);
      return null;
    }

    return data;
  } catch (e) {
    ngx.log(ngx.ERR, `TTLCache: Error getting cache key ${key}: ${e}`);
    return null;
  }
}

/**
 * Delete data from cache
 * @param {string} zone - Cache zone name
 * @param {string} key - Cache key
 * @returns {boolean} - Success status
 */
function cacheDelete(zone, key) {
  const cache = getCache(zone);
  if (!cache) {
    return false;
  }

  try {
    cache.delete(key);
    cache.delete(getMetaKey(key));
    return true;
  } catch (e) {
    ngx.log(ngx.ERR, `TTLCache: Error deleting cache key ${key}: ${e}`);
    return false;
  }
}

/**
 * Check if key exists and is not expired
 * @param {string} zone - Cache zone name
 * @param {string} key - Cache key
 * @returns {boolean} - True if key exists and is valid
 */
function cacheHas(zone, key) {
  return cacheGet(zone, key) !== null;
}

/**
 * Get TTL remaining for a key
 * @param {string} zone - Cache zone name
 * @param {string} key - Cache key
 * @returns {number|null} - Seconds remaining, or null if key doesn't exist
 */
function cacheGetTTL(zone, key) {
  const cache = getCache(zone);
  if (!cache) {
    return null;
  }

  try {
    const metaData = cache.get(getMetaKey(key));
    if (!metaData) {
      return null;
    }

    const metadata = JSON.parse(metaData);
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((metadata.expireTime - now) / 1000));

    return remaining > 0 ? remaining : null;
  } catch (e) {
    ngx.log(ngx.ERR, `TTLCache: Error getting TTL for key ${key}: ${e}`);
    return null;
  }
}

/**
 * Clear all cache entries
 * @param {string} zone - Cache zone name
 */
function cacheClear(zone) {
  const cache = getCache(zone);
  if (cache) {
    cache.clear();
  }
}

/**
 * Join args with a slash remove duplicate slashes
 */
function joinPaths(...args) {
  return args.join('/').replace(/\/+/g, '/');
}

/**
 * Get certificate data with TTL cache
 */
function get_cert(r) {
  return get_cert_data(r, 'service.crt');
}

/**
 * Get CA certificate data with TTL cache
 */
function get_ca_cert(r) {
  return get_cert_data(r, 'ca.crt');
}

/**
 * Get certificate key data with TTL cache
 */
function get_cert_key(r) {
  return get_cert_data(r, 'service.key');
}

/**
 * Validate certificate
 */
function isValidCert(r) {
  const result = r.variables['ssl_client_verify']
  if (result === 'SUCCESS') {
    return true;
  }
  r.log("Certificate verify : " + result);
  return false;
}

/**
 * Retrieves the key/cert value from TTL cache or disk
 *
 * @param {NginxHTTPRequest} r - The Nginx HTTP request object.
 * @param {string} fileName - The file name
 * @returns {string} - The key/cert associated with the ssl_server_name.
 */
function get_cert_data(r, fileName) {
  let data = '';
  let path = '';
  const zone = r.variables['shared_dict_zone_name'];
  let prefix = r.variables['cert_folder'] || '/etc/nginx/certs/';

  // Get TTL from variable or use default (30 seconds)
  const ttl = parseInt(r.variables['cache_ttl'] || '30', 10);

  path = joinPaths(prefix, fileName);
  r.log(`Resolving ${path}`);

  const key = fileName;

  if (!getCache(zone)) {
    r.log("No cache found");
  } else {
    data = cacheGet(zone, key) || '';
    if (data) {
      const remainingTTL = cacheGetTTL(zone, key);
      r.log(`Read ${key} from cache (TTL remaining: ${remainingTTL}s)`);
      return data;
    }
  }

  // Read from file if not in cache or expired
  try {
    data = fs.readFileSync(path, 'utf8');
    r.log('Read from file');
  } catch (e) {
    r.log(`Error reading from file: ${path}. Error=${e}`);
    return '';
  }

  // Store in TTL cache
  if (getCache(zone)) {
    try {
      const success = cacheSet(zone, key, data, ttl);
      if (success) {
        r.log(`Persisted in cache with TTL ${ttl}s. Key: ${key}`);
      } else {
        r.log(`Failed to persist in cache. Key: ${key}`);
      }
    } catch (e) {
      const errMsg = `Error writing to shared dict zone: ${zone}. Error=${e}`;
      r.log(errMsg);
    }
  }

  return data;
}

/**
 * Handle get/set APIs with TTL support
 * @param {NginxHTTPRequest} r - The Nginx HTTP request object.
 */
function handleRequest(r) {
  const zone = r.variables['shared_dict_zone_name'];
  const prefix = r.variables['cert_folder'] || '/etc/nginx/certs/';
  const ttl = parseInt(r.variables['cache_ttl'] || '30', 10);

  if (r.method === 'GET') {
    const key = "service.crt";
    r.log(`Reading from cache ${key}`);
    const data = cacheGet(zone, key);
    if (!data) {
      r.return(404, 'Data not found in the cache or expired');
      return;
    }

    const remainingTTL = cacheGetTTL(zone, key);
    r.headersOut['X-Cache-TTL'] = remainingTTL ? remainingTTL.toString() : '0';
    r.return(200, data);
    return;
  }

  if (r.method !== 'POST') {
    r.return(405, 'Method Not Allowed');
    return;
  }

  const requestBody = r.requestText;
  if (!requestBody || requestBody.length === 0) {
    r.return(400, 'No file uploaded');
    return;
  }

  // Parse the request body to extract file information
  var boundary = r.headersIn['Content-Type'].match(/boundary=(.*)/)[1];
  var parts = requestBody.split('--' + boundary);

  for (var i = 0; i < parts.length; i++) {
    var part = parts[i].trim();
    r.log(" part = " + part);

    if (part.indexOf('Content-Disposition') === -1) {
      continue;
    }

    var filename = part.match(/filename="(.*)"/);
    if (!filename) {
      r.return(400, 'No filename found');
      return;
    }

    // The file content is available in the part after the blank line (\r\n\r\n)
    var fileContent = part.split('\r\n\r\n')[1];
    let path = joinPaths(prefix, filename[1]);

    r.log(`Saving file: ${filename[1]}, Size: ${fileContent.length}, Path: ${path}`);

    try {
      fs.writeFileSync(path, fileContent);
      r.log(`Wrote to file. Path: ${path}`);

      if (getCache(zone)) {
        const key = filename[1];
        const success = cacheSet(zone, key, fileContent, ttl);
        if (success) {
          r.log(`Wrote to cache with TTL ${ttl}s. Key: ${key}`);
        } else {
          r.log(`Failed to write to cache. Key: ${key}`);
        }
      }
    } catch (err) {
      r.return(500, `Error saving: ${err}`);
      return;
    }
  }

  r.return(201);
}

/**
 * Clear Cache
 * @param {NginxHTTPRequest} r - The Nginx HTTP request object.
 */
function clear_cache(r) {
  const zone = r.variables['shared_dict_zone_name'];

  if (getCache(zone)) {
    cacheClear(zone);
    r.log(`Cleared ${zone}`);
  }

  r.return(200);
}


export default {
  get_cert,
  get_ca_cert,
  get_cert_key,
  handleRequest,
  clear_cache,
  isValidCert,
}