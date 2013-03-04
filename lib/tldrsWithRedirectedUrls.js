/**
 * In charge of changing the url and possibleUrls of tldrs made on urls
 * that are known to be redirections (for example Readability).
 */

var config = require('./config')
  , mqClient = require('./message-queue')
  , request = require('request')
  , url = require('url')
  , customUtils = require('./customUtils')
  , Tldr = require('../models/tldrModel')
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
      targetUrl = url.parse(response.headers.location, true).query.url

      // Need to get the Mongoose object that can be persisted to the DB
      Tldr.findOne({ _id: tldr._id }, function (err, tldr) {
        console.log(err);
        console.log(tldr);
        tldr.originalUrl = targetUrl;
        tldr.url = customUtils.normalizeUrl(targetUrl);
        tldr.possibleUrls.push(tldr.url);
        tldr.save(function () {});
      });
    } catch (e) {
      return;
    }
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
}
