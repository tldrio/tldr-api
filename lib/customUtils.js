var url = require('url')
  , crypto = require('crypto')
  , _ = require('underscore')
  , sanitize = require('validator').sanitize
  , hostnamesUsingQueryStrings
  , months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  ;


/*
 * Definition of hostnamesUsingQueryStrings, as an object for O(1) querying as we don't know
 * how big it will become
 */
hostnamesUsingQueryStrings = {
  'www.youtube.com': true   // All country tlds and www are redirected to this one
, 'www.spacex.com': true    // www redirected to this one
, 'groklaw.net': true       // .com redirected to this one
, 'www.groklaw.net': true
}



/**
 * Extract hostname from a URL
 * @param {String} theUrl url
 */

function getHostnameFromUrl (theUrl) {
  var theUrl = theUrl || '';
  return url.parse(theUrl).hostname;
}



/**
 * Clean a given url. Policy:
 *   * Trailing slash is to be left unchanged if a path is specified (no addition or removal). It must be added if there is no path (subdomain only) and it is missing
 *   * Multiple consecutive slashes are kept as is (no collapse in one slash) since the resources may be different
 *   * Trailing fragment and hash are to be removed (this is typically done by the agent but we need to make sure at server level) except in the case of a fucking #! of course
 *   * DNS part (protocol, hostname, tld) is lowercased (for normalization purposes as it is case insensitive), the path is kept as-is (can be case sensitive depending on the OS/server) - node.js does it for us
 *   * Query string is removed by default, except for whitelisted websites defined at the top of this module
 *   * When query string is kept, we remove all utm strings then its arguments are sorted alphabetically
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

  // Handle protocol, domain, port and trailing '/' if there is no path
  nUrl = (parsedUrl.protocol ? parsedUrl.protocol.toLowerCase() : '') +
    "//" +
    (parsedUrl.hostname || '') +
    (parsedUrl.port ? (parsedUrl.port !== "80" ? ':' + parsedUrl.port : '') : '') +
    (parsedUrl.pathname || '/');

  // Handle querystring
  if (hostnamesUsingQueryStrings[parsedUrl.hostname]) {
    if (parsedUrl.search && (parsedUrl.search.length > 1)) {
      _.each(_.keys(query), function(key) {
        if (null === key.match(/^utm_.*/)) {
          queryKeys.push(key);
        }
      });
      queryKeys.sort();

      for (key = 0; key < queryKeys.length; key += 1) {
        nUrl += (key === 0 ? '?' : '&') + queryKeys[key] + "=" + query[queryKeys[key]];
      }
    }
  }

  // If the hash is the beginning of a hashbang, keeep it
  if ((parsedUrl.hash) && (parsedUrl.hash.length > 2) && (parsedUrl.hash.substring(0,2) === "#!")) {
    nUrl += parsedUrl.hash;
  }

  return nUrl;
}


// Generates a random string of length len
// Taken from Connect
function uid (len) {
  return crypto.randomBytes(Math.ceil(len * 3 / 4))
    .toString('base64')
    .slice(0, len);
}


/**
 * Sanitize user input by protecting against XSS (actual sanitization),
 * HTML decoding values ('cleaning') and optionally normalizing
 */
function sanitizeInput (value) {
  var svalue = sanitize(value).trim();

  // Protect against (hopefully all) XSS attacks
  svalue = sanitize(svalue).xss();

  // Decode all inputed values so that fields that accidentally hold entities (e.g. in rue89)
  // Will be displayed exactly as they were typed or scraped (no "&lt;", "&nbsp;" and so on)
  svalue = sanitize(svalue).entityDecode();

  return svalue;
}


function sanitizeAndNormalizeEmail (input) {
  var sinput = input.toLowerCase();
  sinput = sanitize(sinput).trim();
  sinput = sanitizeInput(sinput);
  return sinput;
}


function sanitizeArray (array) {
  var sarray = [];
  _.map(array, function (value) {
    sarray.push(sanitizeInput(value));
  });
  return sarray;
}


/*
 * Display a date in a nice format
 */
function dateForDisplay(date) {
  try {
    return months[date.getMonth()] + ' ' + date.getDate() + ', ' + date.getFullYear();
  } catch (e) {
    return "";   // parameter was probably not a date, return empty string
  }


}

function sleep(milliseconds) {
  var start = new Date().getTime();

  while (true) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
  }
}



module.exports.getHostnameFromUrl = getHostnameFromUrl;
module.exports.sanitizeAndNormalizeEmail = sanitizeAndNormalizeEmail;
module.exports.normalizeUrl = normalizeUrl;
module.exports.sanitizeInput = sanitizeInput;
module.exports.sanitizeArray = sanitizeArray;
module.exports.sleep = sleep;
module.exports.uid = uid;
module.exports.dateForDisplay = dateForDisplay;
