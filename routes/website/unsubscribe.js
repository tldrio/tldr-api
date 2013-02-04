/** * Request Handlers for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var bunyan = require('../../lib/logger').bunyan
  , config = require('../../lib/config')
  , User = require('../../lib/models').User
  , customUtils = require('../../lib/customUtils')
  , i18n = require('../../lib/i18n');



function unsubscribe (req, res, next) {
  var type = req.query.type
    , id = req.query.id
    , signature = req.query.signature
    , expiration = req.query.expiration
    , check;

  check = customUtils.createDataForUnsubscribeLink(id, expiration);

  if ( !type || !id || !signature || !expiration
     || expiration - new Date() < 0
     || signature !== check.signature ) {
      req.renderingValues.error = true;
      return res.render('website/basicLayout', { values: req.renderingValues
                                        , partials: { content: '{{>website/pages/unsubscribe}}' }
                                        });
  }

  User.findOne({ _id: id },  function (err, user) {
    if (err) { return next({ statusCode: 500, body: { message: i18n.mongoInternErrGetUserId} } ); }

    user.notificationsSettings[type] = false;
    user.save(function(err, user) {
      if (err) { return next({ statusCode: 500, body: { message: i18n.mongoInternErrUpdateUser} } ); }
      return res.render('website/basicLayout', { values: req.renderingValues
                                        , partials: { content: '{{>website/pages/unsubscribe}}' }
                                        });
    });
  });

}

// Module interface
module.exports = unsubscribe;
