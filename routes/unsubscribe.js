/** * Request Handlers for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var bunyan = require('../lib/logger').bunyan
  , config = require('../lib/config')
  , User = require('../lib/models').User
  , i18n = require('../lib/i18n');



function unsubscribe (req, res, next) {
  var type = req.query.type
    , id = req.query.id;

  bunyan.incrementMetric('users.unsubscribe.routeCalled');

  if (!type || !id) {
    return next({ statusCode: 403, body: { message: i18n.missingParameterUnsubscribe} } );
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
