var url = require('url')
  , crypto = require('crypto')
  , config = require('./config')
  , _ = require('underscore')
  , jsDiff = require('diff')
  , config = require('./config')
  , sanitize = require('validator').sanitize
  , querystringOffenders
  , slugOffenders
  , months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  , i18n = require('./i18n')
  ;


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
 * Normalize a given url. Policy:
 *   * Trailing slash is to be removed if there is a path. It must be added if there is no path (subdomain only) and it is missing
 *   * Multiple consecutive slashes are kept as is (no collapse in one slash) since the resources may be different
 *   * Trailing fragment and hash are to be removed (this is typically done by the agent but we need to make sure at server level) except in the case of a fucking #! of course
 *   * DNS part (protocol, hostname, tld) is lowercased (for normalization purposes as it is case insensitive), the path is kept as-is (can be case sensitive depending on the OS/server) - node.js does it for us
 *   * Query string is removed by default, except for whitelisted websites defined at the top of this module
 *   * When query string is kept, we remove all utm strings then its arguments are sorted alphabetically
 *   * The forbiddenQueryKeys are removed from the query string (they vary without changing the resource the url points to)
 *   * Default port (80) is removed, other ports are kept
 *   * URL-decoding non-reserved characters should be handled by clients (browsers do it and they are the main clients)
 *   * Uppercasing url-encoded parts (i.e. '%3a' becomes '%3A' as they are equivalent) is not handled
 *   * Removing dot-segments should be handled by clients (browsers do it and they are the main clients)
 *
 * Guidelines followed (in part): http://en.wikipedia.org/wiki/URL_normalization
 */

// The normalized hostname will be used in all subsequent normalization steps
function normalizeHostname (hostname) {
  var res = hostname;

  // Remove www from hostname if any. Done here as we use it to classify website as querystring offenders, slug offenders etc.
  res = res.substring(0, 4) === 'www.' ? res.substring(4) : res;

  // All Blogspot hostnames should be blogname.blogspot.com
  res = res.replace(/^(.*\.blogspot\.).*/, '$1com');

  return res;
}

function normalizeDomain (hostname, protocol, port) {
  var res;

  // Handle protocol, domain and port
  res = (protocol ? protocol.toLowerCase() : '') +
    "//" +
    hostname +
    (port ? (port !== "80" ? ':' + port : '') : '');

  return res;
}


slugOffenders = {   // List the slug offenders with the regex matching the offending urls. Put the part to keep in parentheses.
  'stackoverflow.com': /^(\/questions\/[0-9]*\/).*$/
};

function normalizePath (hostname, path) {
  var res = "";

  // Handle path
  if (! path || path.length === 0 || path === "/") {
    res += "/";   // No real path, just put a trailing slash
  } else {
    res += path;

    // Remove slug if there is one
    if (slugOffenders[hostname]) {
      res = res.replace(slugOffenders[hostname], '$1');
    }

    // Remove trailing slash
    if (res[res.length - 1] === '/') {
      res = res.substring(0,res.length - 1);
    }
  }

  return res;
}


querystringOffenders = {
  'youtube.com': true   // All country tlds are redirected to this one
, 'spacex.com': true
, 'groklaw.net': true       // .com redirected to this one
, 'blog.tanyakhovanova.com': true
, 'news.ycombinator.com': true
, 'bennjordan.com': true
, 'aarongreenspan.com': true
, 'play.google.com': true
, 'network-tools.com': true
, 'mcahogarth.org': true
, 'dendory.net': true
, 'datacenteracceleration.com': true
};

function normalizeQuerystring (hostname, query, search) {
  var res = "", queryKeys = [], key;

  if (querystringOffenders[hostname]) {
    if (search && (search.length > 1)) {
      _.each(_.keys(query), function(key) {
        if (null === key.match(/^utm_.*/)) {
          queryKeys.push(key);
        }
      });
      queryKeys.sort();

      for (key = 0; key < queryKeys.length; key += 1) {
        res += (key === 0 ? '?' : '&') + queryKeys[key] + "=" + query[queryKeys[key]];
      }
    }
  }

  return res;
}

function normalizeHash (hash) {
  var res = "";

  // If the hash is the beginning of a hashbang, keeep it
  if (hash && hash.length > 2 && hash.substring(0,2) === "#!") {
    res += hash;
  }

  return res;
}


function normalizeUrl (theUrl) {
  var sUrl = sanitizeInput(theUrl) // Sanitize input
    , parsedUrl = url.parse(sUrl || '', true)
    , hostname = normalizeHostname(parsedUrl.hostname || '')
    , query = parsedUrl.query
    , nUrl = ""
    ;

  nUrl += normalizeDomain(hostname, parsedUrl.protocol, parsedUrl.port);
  nUrl += normalizePath(hostname, parsedUrl.pathname);
  nUrl += normalizeQuerystring(hostname, parsedUrl.query, parsedUrl.search);
  nUrl += normalizeHash(parsedUrl.hash);

  return nUrl;
}

/**
 * ==================================
 * ==== End of URL normalization ====
 * ==================================
 */


/**
 * Extract hostname from a URL
 */
function getHostnameFromUrl (theUrl) {
  theUrl = theUrl || '';
  return url.parse(theUrl).hostname;
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

// Make sure to return a number. If value can't be parsed,
// return undefined so that mongoose uses thedefault value
function sanitizeNumber (value) {
  var res;

  try {
    res = parseInt(value, 10);
  } catch (e) {
    res = undefined;
  }

  if (isNaN(res)) { res = undefined; }

  return res;
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


function createDataForUnsubscribeLink (text, expiration) {
  var hmac = crypto.createHmac('sha1', config.unsubscribeKey )
    , exp = expiration || new Date().setDate(new Date().getDate() + config.unsubscribeExpDays); // 48h expiration by default

  hmac.update(text + '/' + exp);

  return { signature: hmac.digest('hex'), expiration: exp };
}


/**
 * Return a slug of the given string
 */
function slugify (input) {
  var res = input || ''
    , resParts
    , toReplace = [ { pattern: 'éèêëẽ', replacement: 'e' }
                  , { pattern: 'áàâäã', replacement: 'a' }
                  , { pattern: 'úùûüũ', replacement: 'u' }
                  , { pattern: 'íìîïĩ', replacement: 'i' }
                  , { pattern: 'óòôöõ', replacement: 'o' }
                  , { pattern: 'ýỳŷÿỹ', replacement: 'y' }
                  ]
    , i
    ;

  res = res.toLowerCase();

  // Replace all non-English characters by their English counterparts
  for (i = 0; i < toReplace.length; i += 1) {
    res = res.replace(new RegExp('[' + toReplace[i].pattern + ']', "g"), toReplace[i].replacement);
  }

  // Use only dashes as delimiters (remember: jshint is fucking stupid)
  res = res.replace(/[ _\.,;\/\\]/g, '-');

  // Remove all characters that are not alphanumeric or a dash
  res = res.replace(/[^a-z0-9\-]/g, '');

  // Collapse multiple successive dashes into one
  res = res.replace(/-+/g, '-');

  return res;
}


/**
 * Transform an object into an array of pairs { key, value }
 *
 */
function arrayify (obj) {
  var res = []
    , keys = Object.keys(obj), i
    ;

  for (i = 0; i < keys.length; i+= 1) {
    res.push({ key: keys[i], value: obj[keys[i]] });
  }

  return res;
}


/**
 * Add a new pair { key, value } to the array, or modify it if it exists
 * @param {Array} array Array of pairs { key, value }
 * @param {String} key
 * @param {String} value
 * @return {Array} The modified array
 */
function upsertKVInArray (array, key, value) {
  var modified = false;

  if (! key || (! value && value !== '')) { return array; }

  array = array.map(function (o) {
    if (o.key === key) {
      modified = true;
      return { key: key, value: value };
    } else {
      return o;
    }
  });

  if (! modified) { array.push({ key: key, value: value }); }

  return array;
}


/**
 * given email, compute md5 hash and assemble gravatar url
 *
 */
function getGravatarUrlFromEmail (email) {
  var hash = email ? email.trim().toLowerCase() : ''
    , md5 = crypto.createHash('md5');

  md5.update(hash, 'utf8');

  // If user has no avatar linked to this email, the cartoonish mystery-man will be used
  return 'https://secure.gravatar.com/avatar/' + md5.digest('hex') + '?d=wavatar';
}


/**
 * Given two validation error objects, merge them into one
 *
 */
function mergeErrors (err1, err2) {
  var errors = null;

  if ((err1 && err1.errors) || (err2 && err2.errors)) {
    errors = { name: 'ValidationError'
             , message: 'Validation failed'
             , errors: _.extend( err1 && err1.errors ? err1.errors : {}
                               , err2 && err2.errors ? err2.errors : {} ) };

  }

  return errors;
}


/**
 * Given a Date, return a Date object with a resolution of a day/ month
 */
function getDayResolution (date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getMonthResolution (date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function computeTldrDiff (oldTldr, newTldr) {
  var oldBulletsCount = oldTldr.summaryBullets.length
    , newBulletsCount = newTldr.summaryBullets.length
    , minBulletCount = Math.min(oldBulletsCount, newBulletsCount)
    , diffs = []
    , i , j
    , diff
    , swap;

  for ( j = 0; j < minBulletCount; j += 1) {
    diff = jsDiff.diffWords(oldTldr.summaryBullets[j], newTldr.summaryBullets[j]);
    for (i = 0; i < diff.length; i++) {
      if (diff[i].added && diff[i + 1] && diff[i + 1].removed) {
        swap = diff[i];
        diff[i] = diff[i + 1];
        diff[i + 1] = swap;
      }
    }
    diffs.push({ diffBullet: diff });
  }

  if (oldBulletsCount < newBulletsCount) {
    for ( j = minBulletCount; j < newBulletsCount; j += 1) {
      diffs.push({ diffBullet: [{ value: newTldr.summaryBullets[j], added: true, removed: undefined }]});
    }
  } else if (oldBulletsCount > newBulletsCount ) {
    for ( j = minBulletCount; j < oldBulletsCount; j += 1) {
      diffs.push({ diffBullet: [{ value: oldTldr.summaryBullets[j], added: undefined, removed: true }]});
    }
  }

  return diffs;
}

module.exports.createDataForUnsubscribeLink = createDataForUnsubscribeLink;
module.exports.computeTldrDiff = computeTldrDiff;
module.exports.dateForDisplay = dateForDisplay;
module.exports.getHostnameFromUrl = getHostnameFromUrl;
module.exports.normalizeUrl = normalizeUrl;
module.exports.sanitizeAndNormalizeEmail = sanitizeAndNormalizeEmail;
module.exports.sanitizeArray = sanitizeArray;
module.exports.sanitizeInput = sanitizeInput;
module.exports.timeago = timeago;
module.exports.uid = uid;
module.exports.slugify = slugify;
module.exports.arrayify = arrayify;
module.exports.upsertKVInArray = upsertKVInArray;
module.exports.getGravatarUrlFromEmail = getGravatarUrlFromEmail;
module.exports.mergeErrors = mergeErrors;
module.exports.getDayResolution = getDayResolution;
module.exports.getMonthResolution = getMonthResolution;
module.exports.sanitizeNumber = sanitizeNumber;
