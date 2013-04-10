var customUtils = require('./customUtils')
  , slugOffenders
  , querystringOffenders
  , _ = require('underscore')
  , url = require('url')
  ;

// The normalized hostname will be used in most subsequent normalization steps
function normalizeHostname (hostname) {
  var res = hostname;

  // Remove www from hostname if any. Done here as we use it to classify website as querystring offenders, slug offenders etc.
  res = res.substring(0, 4) === 'www.' ? res.substring(4) : res;

  // All Blogspot hostnames should be blogname.blogspot.com
  res = res.replace(/^(.*\.blogspot\.).*/, '$1com');

  return res;
}

function normalizeProtocol (protocol) {
  if (protocol === 'http:' || protocol === 'https:') {
    return 'http:';
  } else {
    return 'other:';   // You really need to want to screw with us if you send us an URL falling in this case ...
  }
}

function normalizePort (port) {
  return (port ? (port !== "80" ? ':' + port : '') : '');
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
, 'code.google.com': true
, 'symbo1ics.com': true
, 'chartjs.org': true
, 'us2.campaign-archive1.com': true
, 'universityventuresfund.com': true
, 'youell.com': true
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
  var sUrl = customUtils.sanitizeInput(theUrl) // Sanitize input
    , parsedUrl = url.parse(sUrl || '', true)
    , hostname = normalizeHostname(parsedUrl.hostname || '')
    , nUrl = ""
    ;

  nUrl += normalizeProtocol(parsedUrl.protocol) + '//' + hostname + normalizePort(parsedUrl.port);
  nUrl += normalizePath(hostname, parsedUrl.pathname);
  nUrl += normalizeQuerystring(hostname, parsedUrl.query, parsedUrl.search);
  nUrl += normalizeHash(parsedUrl.hash);

  return nUrl;
}



module.exports.normalizeUrl = normalizeUrl;
