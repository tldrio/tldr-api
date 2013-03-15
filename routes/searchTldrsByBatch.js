/**
 * Request Handlers for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */


var bunyan = require('../lib/logger').bunyan
  , Tldr = require('../lib/models').Tldr
  , helpers = require('./helpers')
  , _ = require('underscore')
  , normalizeUrl = require('../lib/customUtils').normalizeUrl
  , i18n = require('../lib/i18n');

/**
 * Search tldrs by batch
 * Search and return existing tldrs contained in the batch array provided in the body
 * Result in contained in an object with the `tldrs` key
 */
function searchTldrsByBatch (req, res, next) {
  var query = req.query
    , batch = []
    , urls = {}
    , maxBatchSize = 100
    ;

  if (!req.body.batch) { req.body.batch = []; }
  if (req.body.batch.length > maxBatchSize) { return next({ statusCode: 403, body: { message: i18n.batchTooLarge } }); }

  // We normalize the urls
  _.each(req.body.batch, function (url) {
    var normalizedUrl = normalizeUrl(url);
    batch.push(normalizedUrl);
    urls[url] = normalizedUrl;
  });

  //Search by batch
  Tldr.find({ possibleUrls: { $in: batch } })
    .populate('creator', 'deleted username twitterHandle')
    .populate('editors', 'deleted username')
    .exec( function (err, docs) {
      if (err) {
        return next({ statusCode: 500, body: {message: i18n.mongoInternErrQuery} });
      }
      // We dont update the read count here it's done when hovering on the tldr labels

      return res.json(200, { tldrs: docs, urls: urls} );
    });

}

module.exports = searchTldrsByBatch;
