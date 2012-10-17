/**
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var bunyan = require('../lib/logger').bunyan
  , _ = require('underscore')
  , config = require('../lib/config')
  , Notification = require('../lib/models').Notification;


/*
 * Updates a notification
 */
function updateNotification(req, res, next) {
  bunyan.incrementMetric('users.updateNotification.routeCalled');

  if (req.user) {
    var id = req.params.id;

    Notification.findOne({ _id: id}, function (err, notif) {
      notif.updateStatus(req.body);
    });

    //Dont wait update is done to return
    return res.send(200);
  } else {
    res.setHeader('WWW-Authenticate', i18n.unknownUser);
    return res.json(401, { message: i18n.unauthorized} );
  }
}


// Module interface
module.exports = updateNotification;
