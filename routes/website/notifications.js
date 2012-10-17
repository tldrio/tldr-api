/**
 * /notifications page of the website
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/

var _ = require('underscore');

function notificationsRoute (req, res, next) {
  var values = {}
    , notifStatuses;

  values.user = req.user;
  values.user.getNotifications(function(user) {
    values.notifications = user.notifications;
    // Count the unseen notifs
    notifStatuses = _.countBy(values.notifications, function (notif) {
      return notif.unseen ? 'unseen' : 'seen';
    });
    // Get count only if > 0
    if (notifStatuses.unseen) {
      values.unseenNotifications = notifStatuses.unseen;
    }

    res.render('website/basicLayout', { values: values
               , partials: { content: '{{>website/pages/notifications}}' }
    });
  });
}

module.exports = notificationsRoute;
