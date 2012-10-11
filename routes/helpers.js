/**
 * Request Handlers for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var i18n = require('../lib/i18n')
  , models = require('../lib/models')
  , _ = require('underscore')
  , config = require('../lib/config')
  , bunyan = require('../lib/logger').bunyan
  , mailer = require('../lib/mailer')
  ;


function contentNegotiationForTldr (req, res, tldr) {
  // Increment read count but don't wait for DB access to finish to return to client
  tldr.incrementReadCount();

  // If this is an admin type request, simply return data as JSON
  if (req.accepts('text/html') && req.query.admin !== 'true') {
    bunyan.incrementMetric('tldrs.get.html');
    return res.render('page/layout', { values: tldr
                                     , partials: { } } ); // We serve the tldr Page
  } else {  // Send json by default
    bunyan.incrementMetric('tldrs.get.json');
    return res.json(200, tldr); // We serve the raw tldr data
  }
}

/**
 * Convenience function to factor code betweet PUT and POST on
 * already existing tldr
 *
 */

function updateCallback (err, docs, req, res, next) {

  var oldTldr;

  if (err) {
    bunyan.incrementMetric('tldrs.update.error');
    if (err.message === 'Invalid ObjectId') {
      return next({ statusCode: 403, body: { _id: i18n.invalidId} } );
    } else {
      return next({ statusCode: 500, body: { message: i18n.mongoInternErrGetTldrUrl} } );
    }
  }

  if (docs.length === 1) {
    oldTldr = docs[0];

    oldTldr.updateValidFields(req.body, req.user, function (err, updatedTldr) {
      if (err) {
        bunyan.incrementMetric('tldrs.update.error');
        if (err.errors) {
          return next({ statusCode: 403, body: models.getAllValidationErrorsWithExplanations(err.errors)} );
        }
        return next({ statusCode: 500, body: { message: i18n.mongoInternErrUpdateTldr} } );
      }
      bunyan.incrementMetric('tldrs.update.success');

      mailer.sendEmail({ type: 'adminTldrWasEdited'
                       , development: false
                       , values: { user: req.user, tldr: updatedTldr, apiUrl: config.apiUrl }
                       });

      // With 204 even if a object is provided it's not sent by express
      return res.send(204);
    });
  } else {
    return next({ statusCode: 404, body: { message: i18n.resourceNotFound} } );
  }
}

// Module interface
module.exports.contentNegotiationForTldr = contentNegotiationForTldr;
module.exports.updateCallback = updateCallback;
