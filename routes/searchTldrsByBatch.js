/**
 * Request Handlers for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */


var bunyan = require('../lib/logger').bunyan
  , Tldr = require('../lib/models').Tldr
  , TldrSubscription = require('../lib/models').TldrSubscription
  , _ = require('underscore')
  , urlNormalization = require('../lib/urlNormalization')
  , normalizeUrl = urlNormalization.normalizeUrl
  , i18n = require('../lib/i18n')
  , mqClient = require('../lib/message-queue')
  , customUtils = require('../lib/customUtils')
  ;

/**
 * Search tldrs by batch
 * Search and return existing tldrs contained in the batch array provided in the body
 * Result in contained in an object with the `tldrs` key
 */
function searchTldrsByBatch (req, res, next) {
  var query = req.query
    , batch = []
    , urls = {}
    , maxBatchSize = req.body.nolimit ? 5000 : 100;

  //if (req.header('origin') === 'https://twitter.com') {
    //mqClient.emit('searchBatch.twitter', { urls: req.body.batch, expandedUrls: req.body.expandedUrls, userId: req.user ? req.user._id : null });
  //}

  if (req.header('origin') && req.header('origin').match(/^https?:\/\/news\.ycombinator\.com/)) {
    mqClient.emit('searchBatch.hackernews', { urls: req.body.batch });
  }

  if (!req.body.batch) { req.body.batch = []; }
  if (req.body.batch.length > maxBatchSize) { return next({ statusCode: 403, body: { message: i18n.batchTooLarge } }); }

  // We normalize the urls
  _.each(req.body.batch, function (url) {
    var normalizedUrl = normalizeUrl(url);
    batch.push(normalizedUrl);
    urls[url] = normalizedUrl;
  });

  //Search by batch
  Tldr.findByUrlBatch( batch, {}, function (err, docs) {
    var tldrsToReturn = [];

    if (err) { return res.send(500, { message: i18n.mongoInternErrQuery }); }

    docs.forEach(function (tldr) {
      tldrsToReturn.push(tldr.getPublicData());
    });

    // Quick and dirty option provided by the client to tell the server he wants
    // to be able to subscribe to future tldrs
    if (req.body.insertSubscription) {
      // Array of urls that dont have a tldr
      batch = _.difference(batch, _.flatten(_.pluck(docs, 'possibleUrls')));
      TldrSubscription.findByBatchOrInsert(batch, function (err, docs) {

        return res.json(200, { tldrs: tldrsToReturn, urls: urls, requests: docs} );
      });
    } else {
      return res.json(200, { tldrs: tldrsToReturn, urls: urls} );
    }

  });

}

module.exports = searchTldrsByBatch;
