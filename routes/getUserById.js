/**
 * GET a user by id
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var User = require('../lib/models').User
  , i18n = require('../lib/i18n');

function getUserById (req, res, next) {

  var id = req.params.id;

  User.findOne({_id: id})
      .populate('tldrsCreated')
      .exec( function (err, user) {
    if (err) {
      // If err.message is 'Invalid ObjectId', its not an unknown internal error but the ObjectId is badly formed (most probably it doesn't have 24 characters)
      // This API may change (though unlikely) with new version of mongoose. Currently, this Error is thrown by:
      // node_modules/mongoose/lib/drivers/node-mongodb-native/objectid.js
      if (err.message === 'Invalid ObjectId') {
        return next({ statusCode: 403, body: { _id: i18n.invalidId } } );
      } else {
        return next({ statusCode: 500, body: { message: i18n.mongoInternErrGetUserId} } );
      }
    }
    if(!user){
      // There is no record for this id
      return next({ statusCode: 404, body: { message: i18n.resourceNotFound} } );
    }

    res.send(200, user);
  });
}


// Module interface
module.exports = getUserById;
