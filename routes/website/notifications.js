/**
 * /notifications page of the website
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/

var _ = require('underscore')
  , Notification = require('../../lib/models').Notification;

function notificationsRoute (req, res, next) {

  var values = req.renderingValues
    , notifications = values.notifications;

    // We populate the fields we need for display
  Notification.find({ _id: { $in: _.pluck(notifications, '_id')} })
  .populate('tldr', 'title')
  .populate('from', 'username')
  .sort('-createdAt')
  .exec(function(err, populatedNotifs) {
    values.notifications = populatedNotifs;
    
    // Nice date Display
    _.each(values.notifications, function (notif, i) {
      values.notifications[i].displayDate = (new Date(notif.createdAt)).toDateString();
    });

    res.render('website/basicLayout', { values: values
               , partials: { content: '{{>website/pages/notifications}}' }
    });
  });
}


module.exports = notificationsRoute;
