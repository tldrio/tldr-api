var customUtils = require('./customUtils')
  , slugOffenders
  , querystringOffenders
  , _ = require('underscore')
  , url = require('url')
  , mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , OffendersSchema, Offenders
  , mqClient = require('./message-queue')
  , mailer = require('./mailer')
  ;


// ===============================================================
// Where we'll store querystring (and maybe later slug) offenders
// ===============================================================
OffendersSchema = new Schema({
  domainName: { type: String, unique: true }
});

// Create the model
Offenders = mongoose.model('offenders', OffendersSchema);

// The actual object we will use for getting and storing the querystring offenders
function QuerystringOffenders () {
  this.cache = {};
}


/**
 * Reset cache (duh)
 */
QuerystringOffenders.prototype.resetCache = function () {
  this.cache = {};
};


/**
 * Set cache state to the contents of the database
 * cb is optional, signature: err
 */
QuerystringOffenders.prototype.updateCacheFromDatabase = function (cb) {
  var callback = cb || function () {}
    , self = this
    ;

  Offenders.find({}, function (err, offenders) {
    if (err) { return callback(err); }

    var newCache = {};

    offenders.forEach(function (offender) {
      newCache[offender.domainName] = true;
    });

    self.cache = newCache;
    return callback();
  });
};

QuerystringOffenders.prototype.getCache = function () {
  return this.cache;
};


/**
 * Add a querystring offender both to the cached copy
 * and the database
 * cb is optional and signature is err
 */
QuerystringOffenders.prototype.addDomainToCacheAndDatabase = function (domainName, cb) {
  var callback = cb || function () {}
    , instance = new Offenders({ domainName: domainName })
    ;

  this.cache[domainName] = true;

  instance.save(function (err) {
    if (err) {
      if (err.code === 11000) {
        return callback();
      } else {
        return callback(err);
      }
    }

    return callback();
  });
};

// Instantiate the querystring offender manager we'll use for normalization
querystringOffenders = new QuerystringOffenders();



// For now we have only one slug offender so nothing fancy
slugOffenders = {   // List the slug offenders with the regex matching the offending urls. Put the part to keep in parentheses.
  'stackoverflow.com': /^(\/questions\/[0-9]*\/).*$/
};



// =======================
// Actual normalization
// =======================

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

function normalizeQuerystring (hostname, query, search) {
  var res = "", queryKeys = [], key
    , qsOffenders = querystringOffenders.getCache()
    ;

  if (qsOffenders[hostname]) {
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


// ======================================================
// Handle tldrs where we detected a querystring offender
// ======================================================
/**
 * Handle a new querystring offender by adding its domain to the list
 * and changing its possibleUrls
 * cb is optional, with signature err
 */
function handleQuerystringOffender (data, cb) {
  var tldr = data.tldr
    , Tldr = require('./models').Tldr
    , callback = cb || function () {}
    , domain = customUtils.getHostnameFromUrl(tldr.originalUrl);

  // No need to go through the function twice
  if (querystringOffenders.getCache()[domain]) { return callback(null); }

  querystringOffenders.addDomainToCacheAndDatabase(domain, function () {
    Tldr.findOne({ _id: tldr._id }, function (err, tldr) {
      if (err || !tldr) { return; }

      mailer.sendEmail({ type: 'newQuerystringOffender'
                       , development: true
                       , values: { tldr: tldr, domain: domain }
                       });

      tldr.possibleUrls = [ normalizeUrl(tldr.originalUrl) ];
      tldr.save(function (err) { return callback(err); });
    });
  });
}

mqClient.on('tldr.created.querystringoffender', handleQuerystringOffender);




module.exports.normalizeUrl = normalizeUrl;
module.exports.Offenders = Offenders;
module.exports.QuerystringOffenders = QuerystringOffenders;
module.exports.querystringOffenders = querystringOffenders;
module.exports.handleQuerystringOffender = handleQuerystringOffender;
