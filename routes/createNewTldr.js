/**
 * Request Handlers for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var bunyan = require('../lib/logger').bunyan
  , normalizeUrl = require('../lib/customUtils').normalizeUrl
  , models = require('../lib/models')
  , i18n = require('../lib/i18n')
  , helpers = require('./helpers')
  , config = require('../lib/config')
  , mailer = require('../lib/mailer')
  , _ = require('underscore')
  , Tldr = models.Tldr;

/**
 * Handles POST /tldrs
 * create new tldr, as per the spec
 * http://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html#sec9.6
 * oldest POST wins if there are concurrent POSTs
 *
 */

function createNewTldr (req, res, next) {

  bunyan.incrementMetric('tldrs.creation.routeCalled');

  if (!req.body) {
    return next({ statusCode: 400, body: { message: i18n.bodyRequired } } );
  }

  Tldr.createAndSaveInstance(req.body, req.user, function (err, tldr) {
    if (err) {
      bunyan.incrementMetric('tldrs.creation.creationError');

      if (err.errors) {
        return next({ statusCode: 403, body: models.getAllValidationErrorsWithExplanations(err.errors)} );
      } else if (err.code === 11000 || err.code === 11001) {// code 1100x is for duplicate key in a mongodb index

        // POST on existing resource so we act as if it's an update
        var url = normalizeUrl(req.body.url);
        Tldr.find({url: url}, function (err, docs) {
          helpers.updateCallback(err, docs, req, res, next);
        });

      } else {
        return next({ statusCode: 500, body: { message: i18n.mongoInternErrCreateTldr} } );
      }

    } else {
      bunyan.incrementMetric('tldrs.creation.creationSuccess');

      mailer.sendEmail({ type: 'adminTldrWasCreated'
                       , development: false
                       , values: { user: req.user, tldr: tldr, apiUrl: config.apiUrl }
                       });

      // If a user is logged, he gets to be the tldr's creator
      if (req.user) {
        // If this is the creator's first tldr, send him a congratulory email
        if (req.user.tldrsCreated.length === 1) {
          // Send congratulory email
          mailer.sendEmail({ type: 'congratulationsFirstTldr'
                           , to: req.user.email
                           , development: true
                           , values: { apiUrl: config.apiUrl, url: encodeURIComponent(tldr.url) }
                           });
        }

        // Populate creator username
        Tldr.findOne({_id: tldr.id})
          .populate('creator', 'username')
          .exec( function (err, tldr) {
            return res.json(201, tldr);
        });
      } else {
        return res.json(201, tldr);
      }
    }
  });
}


// Module interface
module.exports = createNewTldr;
