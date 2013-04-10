var customUtils = require('./customUtils')
  , slugOffenders
  , querystringOffenders
  , _ = require('underscore')
  , url = require('url')
  , mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , OffendersSchema, Offenders
  ;


// ===============================================================
// Where we'll store querystring (and maybe later slug) offenders
// ===============================================================
OffendersSchema = new Schema({
  domainName: { type: String }
});


/**
 * Get all querystring offenders from the database
 * callback signature: err, qsoffenders
 */
OffendersSchema.fetchAllQuerystringOffenders = function (callback) {
  Offenders.find({}, 'domainNames', function (err, offenders) {
    if (err) { return callback(err); }

    var allQuerystringOffenders = {};

    offenders.forEach(function (offender) {
      allQuerystringOffenders[offender.domainName] = true;
    });

    return callback(null, allQuerystringOffenders);
  });
};


/**
 * Initialize the cached querystring offenders to the state in the database
 * cb is optional and signature is err
 */
OffendersSchema.statics.initializeCachedQuerystringOffenders = function (cb) {
  var callback = cb || function () {};

  this.fetchAllQuerystringOffenders(function (err, newQSOffenders) {
    if (err) { return callback(err); }

    querystringOffenders = newQSOffenders;

    return cb();
  });
};


/**
 * Add a querystring offender both to the cached copy
 * and the database
 * cb is optional and signature is err
 */
OffendersSchema.statics.addQuerystringOffender = function (domainName, cb) {
  var callback = cb || function () {}
    , instance = new Offenders({ domainName: domainName })
    ;

  querystringOffenders[domainName] = true;

  instance.save(function (err) { return callback(err); });
};


/**
 * Get the cached copy of all query string offenders
 */
OffendersSchema.statics.getAllQuerystringOffenders = function () {
  var defaultQuerystringOffenders = {
      'youtube.com': true
    , 'spacex.com': true
    , 'groklaw.net': true
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

  if (querystringOffenders && Object.keys(querystringOffenders).length > 0) {
    return querystringOffenders;
  } else {
    return defaultQuerystringOffenders;
  }
};


/**
 * Reset the cached copy of querystring offenders
 */
OffendersSchema.statics.resetCachedQuerystringOffenders = function () {
  querystringOffenders = {};
};


// Create the model
Offenders = mongoose.model('offenders', OffendersSchema);



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
    , qsOffenders = Offenders.getAllQuerystringOffenders();

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



module.exports.normalizeUrl = normalizeUrl;
module.exports.Offenders = Offenders;
