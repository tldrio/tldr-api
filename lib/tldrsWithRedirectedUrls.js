/**
 * In charge of changing the url and possibleUrls of tldrs made on urls
 * that are known to be redirections (for example Readability).
 */

var config = require('./config')
  , mqClient = require('./message-queue')
  , request = require('request')
  , url = require('url')
  , urlNormalization = require('../lib/urlNormalization')
  , models = require('./models')
  , _ = require('underscore')
  , Tldr = models.Tldr
  , TwitterAnalytics = models.TwitterAnalytics
  , redirectOffenders
  ;


/**
 * Handles Readability's "cleaned up article" urls
 */
function handleReadabilityRedirects (tldr) {
  request.get({ uri: tldr.originalUrl, followRedirect: false }, function (error, response, body) {
    if (error) { return; }
    if (response.statusCode !== 302 && response.statusCode !== 301) { return; }
    if (! response.headers || !response.headers.location) { return; }
    if (! response.headers.location.match(/^http:\/\/www.readability.com\/read?.*/)) { return; }

    var targetUrl;

    try {
      targetUrl = url.parse(response.headers.location, true).query.url;

      // Need to get the Mongoose object that can be persisted to the DB
      Tldr.findOne({ _id: tldr._id }, function (err, tldr) {
        tldr.originalUrl = targetUrl;
        tldr.url = urlNormalization.normalizeUrl(targetUrl);
        tldr.possibleUrls.push(tldr.url);
        tldr.save(function () {});
      });
    } catch (e) {
      return;
    }
  });
}


/**
 * Check if a newly created tldr's url is in a redirection chain
 * register in the Twitter analytics
 * Optional callback signature: err
 */
function checkTARedirectionChain (tldr, cb) {
  var callback = cb || function () {};

  TwitterAnalytics.find({ urls: { $in: tldr.possibleUrls } }, function (err, tas) {
    if (err) { return callback(err); }
    if (tas.length === 0) { return callback(); }


    // It's possible that we have several tweets with urls for this article (in different days)
    var urls = _.reduce(_.pluck(tas, 'urls'), function (memo, urls) { return memo.concat(urls); }, []);

    Tldr.update({ _id: tldr._id }, { $addToSet: { possibleUrls: { $each: urls } } }, { multi: false }, function (err) { return callback(err); });
  });
}


/**
 * Every time a new equivalence class is found, check whether
 * a tldr's possibleUrls needs to be updated
 * Optional callback signature: err
 */
function registerNewEquivalenceClass (nec, cb) {
  var callback = cb || function () {};

  Tldr.findOne({ possibleUrls: { $in: nec } }, function (err, tldr) {
    if (err) { return callback(err); }
    if (!tldr) { return callback(); }

    Tldr.update({ _id: tldr._id }, { $addToSet: { possibleUrls: { $each: nec } } }, { multi: false }, function (err) { return callback(err); });
  });
}



/**
 * Main entry point to check whether a tldr's url should be retreated
 */
redirectOffenders = [{ pattern: /^http:\/\/readability.com\/articles\/.*/, handler: handleReadabilityRedirects }];
function checkForRedirects (data) {
  var tldr = data.tldr;

  redirectOffenders.forEach(function (possibleOffender) {
    if (tldr.url.match(possibleOffender.pattern)) {
      possibleOffender.handler(tldr);
    }
  });
}


// Register event handler if we are not in test mode
if (config.env !== 'test') {
  mqClient.on('tldr.created', checkForRedirects);
  //mqClient.on('tldr.created', function (data) { checkTARedirectionChain(data.tldr); });
  //mqClient.on('new.equivalenceclass', function (data) { registerNewEquivalenceClass(data.newEquivalenceClass); });
}



// Interface
module.exports.checkTARedirectionChain = checkTARedirectionChain;
module.exports.registerNewEquivalenceClass = registerNewEquivalenceClass;
