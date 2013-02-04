/**
 * Request Handlers for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var bunyan = require('../lib/logger').bunyan
  , Tldr = require('../lib/models').Tldr
  , i18n = require('../lib/i18n')
  , helpers = require('./helpers');


/**
 * Handles PUT /tldrs/:id
 * updates the tldr, as per the spec
 * http://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html#sec9.6
 *
 */

function updateTldrWithId (req, res, next) {
  bunyan.incrementMetric('tldrs.updateById.routeCalled');

  var id = req.params.id;

  if (!req.body) {
    return next({ statusCode: 400, body: { message: i18n.bodyRequired} } );
  }

  // Increment readcount if body contains the key `incrementReadCount`
  // Usefull for increment readCOunt on hover in the extension
  if (req.body.incrementReadCount) {
    Tldr.findAndIncrementReadCount({ _id: id }, function (err, tldr) {
      if (err) {
        return next({ statusCode: 500, body: { message: i18n.mongoInternErrUpdateTldr} } );
      }
      return res.send(204);
    }) ;
    return;
  }

  if (!req.user) {
    return next({ statusCode: 401, body: { message: i18n.needToBeLogged} } );
  }

  // We find by id here
  Tldr.find({ _id: id }, function (err, docs) {
    helpers.updateCallback(err, docs, req, res, next);
  });

}

// Module interface
module.exports = updateTldrWithId;
