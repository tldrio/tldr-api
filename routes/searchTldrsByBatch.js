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

  console.log('BATCH',batch);

  //Search by batch
  Tldr.find({url: { $in: batch }})
  .exec( function (err, docs) {

    console.log('DOCS', docs.length);
    docs.forEach(function (doc, i) {

      console.log('DOC', doc.url);
    });

    return res.json(200, { docs: docs} );
  });

}

module.exports = searchTldrsByBatch;
