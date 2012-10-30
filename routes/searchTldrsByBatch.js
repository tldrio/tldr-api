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
  , batch;

  bunyan.incrementMetric('tldrs.search.routeCalled');

  // We normalize the urls
  // Creates an empty array if req.body.batch doest exist
  batch = _.map(req.body.batch, normalizeUrl);


  //Search by batch
  Tldr.find({ url: { $in: batch } })
    .populate('creator', 'username twitterHandle')
    .exec( function (err, docs) {
      if (err) {
        return next({ statusCode: 500, body: {message: i18n.mongoInternErrQuery} });
      }
      // update read count - We dont wait for the operation to be executed
      Tldr.updateBatch(batch , { $inc: { readCount: 1 } }) ;

      return res.json(200, { tldrs: docs} );
    });

}

module.exports = searchTldrsByBatch;
