var url = require('url')
  , crypto = require('crypto')
  , _ = require('underscore')
  , sanitize = require('validator').sanitize
  , hostnamesUsingQueryStrings
  , months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  , i18n = require('./i18n')
  ;


/*
 * Definition of hostnamesUsingQueryStrings, as an object for O(1) querying as we don't know
 * how big it will become
 */
hostnamesUsingQueryStrings = {
  'www.youtube.com': true   // All country tlds and www are redirected to this one
, 'youtube.com': true       // Tests use youtube.com not www.youtube.com
, 'www.spacex.com': true    // www redirected to this one
, 'groklaw.net': true       // .com redirected to this one
, 'www.groklaw.net': true
, 'blog.tanyakhovanova.com': true
, 'news.ycombinator.com': true
, 'www.bennjordan.com': true
};



/**
 * Extract hostname from a URL
 * @param {String} theUrl url
 */

function getHostnameFromUrl (theUrl) {
  theUrl = theUrl || '';
  return url.parse(theUrl).hostname;
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



/**
 * Clean a given url. Policy:
 *   * Trailing slash is to be removed if there is a path. It must be added if there is no path (subdomain only) and it is missing
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
    , hostname = parsedUrl.hostname || ''
    , query = parsedUrl.query
    , queryKeys = []
    , nUrl = ""
    , key;

  // Handle protocol, domain and port
  nUrl = (parsedUrl.protocol ? parsedUrl.protocol.toLowerCase() : '') +
    "//" +
    (hostname.substring(0, 4) === 'www.' ? hostname.substring(4) : hostname) +
    (parsedUrl.port ? (parsedUrl.port !== "80" ? ':' + parsedUrl.port : '') : '');

  // Handle path
  if (! parsedUrl.pathname || parsedUrl.pathname.length === 0 || parsedUrl.pathname === "/") {
    nUrl += "/";   // No real path, just put a trailing slash
  } else {
    nUrl += parsedUrl.pathname;
    // If there is a path and it has a trailing slash, remove this slash
    if (nUrl[nUrl.length - 1] === '/') {
      nUrl = nUrl.substring(0,nUrl.length - 1);
    }
  }

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


function timeago(date) {
  var ellapsedTime = ((new Date ()) - date)
    , limits = [ [1000, 'a second ago', ' seconds ago']
               , [1000 * 60, 'a minute ago', ' minutes ago']
               , [1000 * 60 * 60, 'an hour ago', ' hours ago']
               , [1000 * 60 * 60 * 24, 'a day ago', ' days ago']
               , [1000 * 60 * 60 * 24 * 30, 'a month ago', ' months ago']
               , [1000 * 60 * 60 * 24 * 365, 'a year ago', ' years ago']
               ]
    , i, res;

  for (i = limits.length - 1; i >= 0; i -= 1) {
    if (ellapsedTime >= limits[i][0]) {
      res = Math.floor(ellapsedTime / limits[i][0]);
      res = res === 1 ? limits[i][1] : '' + res + limits[i][2];

      break;
    }
  }

  if (! res) { res = 'just now'; }

  return res;
}


/**
 * Wrap urls in a tags for display
 *
 */
function linkify (text) {
  //var exp = /(([a-z]+:\/\/)?(([a-z0-9\-]+\.)+([a-z]{2}|aero|arpa|biz|com|coop|edu|gov|info|int|jobs|mil|museum|name|nato|net|org|pro|travel|local|internal))(:[0-9]{1,5})?(\/[a-z0-9_\-\.~]+)*(\/([a-z0-9_\-\.]*)(\?[a-z0-9+_\-\.%=&amp;]*)?)?(#[a-zA-Z0-9!$&'()*+.=-_~:@/?]*)?)(\s+|$)/gi
  //text = text.replace(exp,"<a href=\"$1\">$1</a>");
  return text;
}


function computeSignatureForUnsubscribeLink ( text) {
  var hmac = crypto.createHmac('sha1', i18n.unsubscribeKey );
  hmac.update(text);
  return hmac.digest('hex');
}

module.exports.computeSignatureForUnsubscribeLink = computeSignatureForUnsubscribeLink;
module.exports.dateForDisplay = dateForDisplay;
module.exports.getHostnameFromUrl = getHostnameFromUrl;
module.exports.linkify = linkify;
module.exports.normalizeUrl = normalizeUrl;
module.exports.sanitizeAndNormalizeEmail = sanitizeAndNormalizeEmail;
module.exports.sanitizeArray = sanitizeArray;
module.exports.sanitizeInput = sanitizeInput;
module.exports.timeago = timeago;
module.exports.uid = uid;
