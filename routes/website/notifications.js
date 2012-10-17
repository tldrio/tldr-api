/**
 * /notifications page of the website
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/

var _ = require('underscore');

function notificationsRoute (req, res, next) {

  res.render('website/basicLayout', { values: req.renderingValues
             , partials: { content: '{{>website/pages/notifications}}' }
  });
}

module.exports = notificationsRoute;
