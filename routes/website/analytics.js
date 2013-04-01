/**
 * /account page of the website
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/

var config = require('../../lib/config')
  , models = require('../../lib/models')
  , analytics = require('../../lib/analytics')
  , _ = require('underscore')
  , User = models.User
  ;

module.exports.selectUserForAnalytics = function (req, res, next) {
  User.findOne({ usernameLowerCased: req.params.username.toLowerCase() }, function (err, user) {
    if (err || !user) { return res.send(404); }

    req.userToDisplayAnalyticsFor = user;
    return next();
  });
};


module.exports.displayAnalytics = function (req, res, next) {
  var partials = req.renderingPartials || {}
    , values = req.renderingValues || {}
    , userToDisplayAnalyticsFor = req.userToDisplayAnalyticsFor || req.user   // By default, display the logged user's analytics
    ;

  values.impact = true;
  partials.content = '{{>website/pages/analytics}}';
  values.title = (userToDisplayAnalyticsFor ? userToDisplayAnalyticsFor.username : '') + " - How badass are you?" + config.titles.branding;
  values.userToDisplayAnalyticsFor = req.userToDisplayAnalyticsFor;   // If set, have an informative title for the admin

  analytics.getAnalyticsForUser( userToDisplayAnalyticsFor, 30, function (analyticsValues) {

    res.render('website/basicLayout', { values: _.extend(values, analyticsValues)
                                      , partials: partials
                                      });

  });

};

