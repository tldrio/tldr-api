/**
 * /account page of the website
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/

var config = require('../../lib/config')
  , models = require('../../lib/models')
  , UserAnalytics = models.UserAnalytics;
  ;

module.exports = function (req, res, next) {
  var partials = req.renderingPartials || {}
    , values = req.renderingValues || {}
    ;

  partials.content = '{{>website/pages/analytics}}';
  values.title = (values.loggedUser ? values.loggedUser.username : '') + " - How badass are you?" + config.titles.branding;

  values.past30Days = {};
  values.allTime = {};

  UserAnalytics.daily.getAnalytics(null, null, req.user._id, function (err, data) {
    console.log(data);


  res.render('website/basicLayout', { values: values
                                    , partials: partials
                                    });
  });
}

