var url = require('url')
  , crypto = require('crypto')
  , _ = require('underscore')
  , sanitize = require('validator').sanitize;


/**
 * Clean a given url. Policy:
 *   * Trailing slash is to be left unchanged if a path is specified (no addition or removal). It must be added if there is no path (subdomain only) and it is missing
 *   * Multiple consecutive slashes are kept as is (no collapse in one slash) since the resources may be different
 *   * Trailing fragment and hash are to be removed (this is typically done by the agent but we need to make sure at server level) except in the case of a fucking #! of course
 *   * DNS part (protocol, hostname, tld) is lowercased (for normalization purposes as it is case insensitive), the path is kept as-is (can be case sensitive depending on the OS/server) - node.js does it for us
 *   * Query string is kept (can correspond to different representations of resources like different blog posts), and its arguments are sorted alphabetically
 *   * The forbiddenQueryKeys are removed from the query string (they vary without changing the resource the url points to)
 *   * Default port (80) is removed, other ports are kept
 *   * URL-decoding non-reserved characters should be handled by clients (browsers do it and they are the main clients)
 *   * Uppercasing url-encoded parts (i.e. '%3a' becomes '%3A' as they are equivalent) is not handled (very rare case) --> TODO log occurences to check if really rare
 *   * Removing dot-segments should be handled by clients (browsers do it and they are the main clients)
 *
 * Guidelines followed (in part): http://en.wikipedia.org/wiki/URL_normalization
 * @param {String} theUrl url to be normalized
 */

function normalizeUrl (theUrl) {
  var sUrl = sanitizeInput(theUrl) // Sanitize input
    , parsedUrl = url.parse(sUrl || '', true)
    , query = parsedUrl.query
    , queryKeys = []
    , nUrl = ""
    , key;

  nUrl = (parsedUrl.protocol ? parsedUrl.protocol.toLowerCase() : '') +
    "//" +
    (parsedUrl.hostname || '') +
    (parsedUrl.port ? (parsedUrl.port !== "80" ? ':' + parsedUrl.port : '') : '') +
    (parsedUrl.pathname || '/');

  // If there is a querystring, the arguments need to be sorted alphabetically
  // and all keys that begin with 'utm_' need to be removed
  if (parsedUrl.search && (parsedUrl.search.length > 1)) {
    for (key in query) {
      if (query.hasOwnProperty(key) && (null === key.match(/^utm_.*/)) ) {
        queryKeys.push(key);
      }
    }
    queryKeys.sort();

    for (key = 0; key < queryKeys.length; key += 1) {
      nUrl += (key === 0 ? '?' : '&') + queryKeys[key] + "=" + query[queryKeys[key]];
    }
  }

  if ((parsedUrl.hash) && (parsedUrl.hash.length > 2) && (parsedUrl.hash.substring(0,2) === "#!")) {
    nUrl += parsedUrl.hash;
  }

  return nUrl;
}



/**
 * Normalize user email: lowercase and trim
 *
 */
function sanitizeEmail (input) {
  var sinput = input.toLowerCase();
  sinput = sanitize(sinput).trim();
  sinput = sanitizeInput(sinput);
  return sinput;
}


// Generates a random string of length len
// Taken from Connect
function uid (len) {
  return crypto.randomBytes(Math.ceil(len * 3 / 4))
    .toString('base64')
    .slice(0, len);
}

function sanitizeInput (value) {
  var svalue = sanitize(value).trim();
  svalue = sanitize(svalue).xss();
  return svalue;
}

function sanitizeAndEncodeInput (value) {
  var evalue = sanitize(sanitizeInput(value)).entityEncode();
  return evalue;
}

function sanitizeAndEncodeArray (array) {
  var sarray = [];
  _.map(array, function (value) {
    sarray.push(sanitizeAndEncodeInput(value));
  });
  return sarray;
}

module.exports.sanitizeEmail = sanitizeEmail;
module.exports.normalizeUrl = normalizeUrl;
module.exports.sanitizeInput = sanitizeInput;
module.exports.sanitizeAndEncodeInput = sanitizeAndEncodeInput;
module.exports.sanitizeAndEncodeArray = sanitizeAndEncodeArray;
module.exports.uid = uid;
