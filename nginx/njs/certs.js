/**
 * Dynamically update SSL certificates and keys through rest API
 */

import fs from 'fs'

function get_cert(r) {
  return get_cert_data(r, 'service.crt');
}

function get_ca_cert(r) {
  return get_cert_data(r, 'ca.crt');
}

function isValidCert(r) {
  const result = r.variables['ssl_client_verify']
  if (result === 'SUCCESS') {
    return true;
  }
  r.log("Certificate verify : " + result);
  return false;
}

function get_cert_key(r) {
  return get_cert_data(r, 'service.key');
}

/**
 * Join args with a slash remove duplicate slashes
 */
function joinPaths(...args) {
  return args.join('/').replace(/\/+/g, '/');
}

/**
 * Retrieves the key/cert value from file cache or disk
 *
 * @param {NginxHTTPRequest} r - The Nginx HTTP request object.
 * @param {string} fileName - The file extension
 * @returns {string} - The key/cert associated with the ssl_server_name.
 */
function get_cert_data(r, fileName) {
  let data = '';
  let path = '';
  const zone = r.variables['shared_dict_zone_name'];
  let prefix = r.variables['cert_folder'] || '/etc/nginx/certs/';
  path = joinPaths(prefix, fileName);
  r.log(`Resolving ${path}`);

  const key = fileName
  const cache = zone && ngx.shared && ngx.shared[zone];

  if (!cache) {
    r.log("No cache found");
  }
  data = cache.get(key) || '';
  if (data) {
    r.log(`Read ${key} from cache`);
    return data;
  }

  try {
    data = fs.readFileSync(path, 'utf8');
    r.log('Read from file');
  } catch (e) {
    r.log(`Error reading from file:', ${path}, . Error=${e}`);
    return
  }

  try {
    cache.set(key, data);
    r.log('Persisted in cache. Key: ' + key);
  } catch (e) {
    const errMsg = `Error writing to shared dict zone: ${zone}. Error=${e}`;
    r.log(errMsg);
  }

  return data
}

/**
 * Handle get/set APIs
 * To upload files via curl you can use:
 *
 * @param {NginxHTTPRequest} r - The Nginx HTTP request object.
 */
function handleRequest(r) {
  const zone = r.variables['shared_dict_zone_name'];
  const prefix = r.variables['cert_folder'] || '/etc/nginx/certs/';
  const cache = zone && ngx.shared && ngx.shared[zone];

  if (r.method === `GET`) {
    const key = "service.crt"
    r.log(`Reading from cache ${key}`)
    const data = cache && cache.get(key);
    if (!data) {
      r.return(404, 'Data not found in the cache')
      return;
    }
    r.return(200, data);
    return
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
    r.log(" part = " + part)
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
    r.log(
        `Saving file: ${filename[1]}, Size: ${fileContent.length}, Path: ${path}`);
    try {
      fs.writeFileSync(path, fileContent);
      r.log(`Wrote to file. Path: ${path}`);
      if (cache) {
        const key = filename[1];
        cache.set(key, fileContent);
        r.log(`Wrote to cache. Key: ${key}`);
      }
    } catch (err) {
      r.return(500, `Error saving ${err}`);
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
  const zone = r.variables['shared_dict_zone_name']
  const cache = zone && ngx.shared && ngx.shared[zone]
  if (cache) {
    cache.clear()
    r.log(`cleared ${zone}`)
  }
  r.return(200)
}

export default {
  get_cert,
  get_ca_cert,
  get_cert_key,
  handleRequest,
  clear_cache,
  isValidCert,
}