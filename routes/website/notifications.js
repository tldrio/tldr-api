/**
 * /tldrscreated page of the website
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


module.exports = function (req, res, next) {
  var values = {};

  values.user = req.user;
  values.user.getNotifications(function(user) {
    values.notifications = user.notifications;

    res.render('website/basicLayout', { values: values
               , partials: { content: '{{>website/pages/notifications}}' }
    });
  });
}


