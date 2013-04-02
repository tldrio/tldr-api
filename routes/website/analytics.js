/**
 * /account page of the website
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/

var config = require('../../lib/config')
  , models = require('../../lib/models')
  , analytics = require('../../lib/analytics')
  , _ = require('underscore')
  , moment = require('moment')
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

  analytics.getAnalyticsForUser( userToDisplayAnalyticsFor, 30, function (analytics30Days) {
    analytics.getAnalyticsForUser( userToDisplayAnalyticsFor, null, function (analyticsAllTime) {
      var userJoinDate = moment(userToDisplayAnalyticsFor.createdAt)
        , now = moment()
        , joinedRecently = now.diff(userJoinDate, 'days') < 6
        ;

      // figure out correct subtitle depending on activity
      if (analyticsAllTime.allTime.readCount > 0) {   // User already made some tldrs
        values.hasBeenActive = true;
        if (analytics30Days.past30Days.tldrsCreated > 0) {
          values.active = true;
          values.subtitle = 'Looks like the world owes you a one!';
        } else {
          values.wasActive = true;
          values.subtitle = 'You were so prolific once upon a time, what happened to you?';
        }
      } else {   // User never wrote a tldr
        if (joinedRecently) {
          values.subtitle = 'Looks like you\'re new here. You should try creating your first tl;dr!';
          values.isNewHere = true;
        } else {
          values.subtitle = 'Time to stop procrastinating and contribute a tl;dr!';
          values.neverActive = true;
        }
      }
      res.render('website/basicLayout', { values: _.extend(values, analytics30Days, analyticsAllTime)
                                        , partials: partials
                                        });

    });
  });

};

