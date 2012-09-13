/**
 * Request Handlers for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var i18n = require('../lib/i18n')
  , models = require('../lib/models')
  , _ = require('underscore')
  , config = require('../lib/config')
  , mailer = require('../lib/mailer');


function contentNegotiationForTldr (req, res, tldr) {
    if (req.accepts('text/html')) {
      bunyan.incrementMetric('tldrs.get.html');
      return res.render('page', _.extend({}, tldr )); // We serve the tldr Page
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
      return next({ statusCode: 403, body: { _id: i18n.invalidTldrId} } );
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

      mailer.advertiseAdminTldr(updatedTldr, req.user, function(error, response){
        if(error){
          bunyan.warn('Error sending update tldr by email to admins', error);
        }
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
