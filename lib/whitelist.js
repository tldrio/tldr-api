var globals = require('./globals')
  , request = require('request')
  , urlNormalization = require('./urlNormalization')
  , normalizeUrl = urlNormalization.normalizeUrl
  , async = require('async')
  , _ = require('underscore')
  ;


function Whitelist () {
  this.prefix = 'whitelist:';
  this.normalizedUrlPrefix = 'normalized:';
  this.originalUrlPrefix = 'original:';
}

/**
 * Tells whether a given url is whitelisted or not
 * Checks against the url itself and its normalized form
 * Callback signature: err, isWhitelisted
 */
Whitelist.prototype.isWhitelisted = function (url, callback) {
  var self = this;

  globals.getGlobalValue(self.prefix + self.originalUrlPrefix + url, function (err, v1) {
    globals.getGlobalValue(self.prefix + self.normalizedUrlPrefix + normalizeUrl(url), function (err, v2) {
      if (err) { return callback(err); }
      return callback(err, v1 === 'true' || v2 === 'true');
    });
  });
};


/**
 * Add urls on the whitelist, with a TTL of 2 days
 * Optional cb signature: err
 */
Whitelist.prototype.whitelist = function (urls, cb) {
  var callback = cb || function () {}
    , self = this;

  if (typeof urls === 'string') { urls = [urls]; }

  // Add all urls
  async.each(urls
  , function (url, cb) {
    globals.setGlobalValue(self.prefix + self.originalUrlPrefix + url, 'true', 2 * 24 * 3600, cb);
  }, function (err) {
    if (err) { return callback(err); }

    // Add all urls, normalized
    async.each(_.map(urls, normalizeUrl)
    , function (url, cb) {
      globals.setGlobalValue(self.prefix + self.normalizedUrlPrefix + url, 'true', 2 * 24 * 3600, cb);
    }, callback);
  });
};


/**
 * Whitelist the whole Hacker News frontpage
 * Timeout of 10s (don't hang, HN is not always very reliable)
 * Optional callback signature: err
 */
Whitelist.prototype.whitelistHackerNews = function (cb) {
  // No need for it, we will use the searchBatch from our users
  // It's a more accurate method and HN cant ban our IP like this
};



// Interface
module.exports = new Whitelist();
