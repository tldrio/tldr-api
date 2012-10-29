/**
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var bunyan = require('../lib/logger').bunyan
  , _ = require('underscore')
  , config = require('../lib/config')
  , i18n = require('../lib/i18n')
  , Notification = require('../lib/models').Notification;


/*
 * Updates a notification
 */
function updateNotification(req, res, next) {
  bunyan.incrementMetric('users.updateNotification.routeCalled');

  if (req.user) {
    var id = req.params.id;

    Notification.findOne({ _id: id}, function (err, notif) {
      if (err) {
        return next({ statusCode: 500, body: { message: i18n.mongoInternErrUpdateNotif} } );
      }

      if ( notif.to.toString() !== req.user._id.toString() ) {
        return res.json(401, { message: i18n.unauthorized} );
      }

      notif.markAsSeen( function (err, notif) {
        if (err) {
          return next({ statusCode: 500, body: { message: i18n.mongoInternErrUpdateNotif} } );
        }
        return res.send(200, notif);
      });
    });

  } else {
    res.setHeader('WWW-Authenticate', i18n.unknownUser);
    return res.json(401, { message: i18n.unauthorized} );
  }
}


// Module interface
module.exports = updateNotification;
