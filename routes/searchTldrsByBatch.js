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
 */
function searchTldrsByBatch (req, res, next) {
  var query = req.query
  , batch;

  bunyan.incrementMetric('tldrs.search.routeCalled');

  // We normalize the urls
  batch = _.map(req.body.batch, normalizeUrl);


  //Search by batch
  Tldr.find({url: { $in: batch }})
    .populate('creator', 'username twitterHandle')
    .exec( function (err, docs) {
      if (err) {
        return next({ statusCode: 500, body: {message: i18n.mongoInternErrQuery} });
      }

      return res.json(200, { docs: docs} );
    });

}

module.exports = searchTldrsByBatch;
