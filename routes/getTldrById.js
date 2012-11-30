/**
 * GET a tldr by id
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var Tldr = require('../lib/models').Tldr
  , i18n = require('../lib/i18n')
  , helpers = require('./helpers');


/**
 * GET /tldrs/:id
 * We query tldr by id here
 */

function getTldrById (req, res, next) {

  var id = req.params.id
    , query;

  query = Tldr.findOneAndUpdate({ _id: id }, { $inc: { readCount: 1 } })
              .populate('creator', 'username twitterHandle');

  // If the user has the admin role, populate history
  if (req.userRoleAdmin) {
    query.populate('history');
  }

  query.exec( function (err, tldr) {
    if (err) {
      // If err.message is 'Invalid ObjectId', its not an unknown internal error but the ObjectId is badly formed (most probably it doesn't have 24 characters)
      // This API may change (though unlikely) with new version of mongoose. Currently, this Error is thrown by:
      // node_modules/mongoose/lib/drivers/node-mongodb-native/objectid.js
      if (err.message === 'Invalid ObjectId') {
        return next({ statusCode: 403, body: { _id: i18n.invalidId } } );
      } else {
        return next({ statusCode: 500, body: { message: i18n.mongoInternErrGetTldrId} } );
      }
    }
    if(!tldr){
      // There is no record for this id
      return next({ statusCode: 404, body: { message: i18n.resourceNotFound} } );
    }

    helpers.apiSendTldr(req, res, tldr);

  });
}


// Module interface
module.exports = getTldrById;
