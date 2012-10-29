/**
 * /notifications page of the website
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/

var _ = require('underscore')
  , customUtils = require('../../lib/customUtils')
  , Notification = require('../../lib/models').Notification;

function notificationsRoute (req, res, next) {

  var values = req.renderingValues
    , notifications = values.notifications;

    // We populate the fields we need for display
  Notification.find({ _id: { $in: _.pluck(notifications, '_id')} })
  .populate('tldr', 'title readCount')
  .sort('-createdAt')
  .exec(function(err, populatedNotifs) {
    values.notifications = populatedNotifs;

    // Nice date Display
    _.each(values.notifications, function (notif, i) {
      values.notifications[i].displayDate = customUtils.dateForDisplay(new Date(notif.createdAt));
    });

    res.render('website/basicLayout', { values: values
               , partials: { content: '{{>website/pages/notifications}}' }
    });
  });
}


module.exports = notificationsRoute;
