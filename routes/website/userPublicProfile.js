/**
 * User public profile page
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/

var models = require('../../lib/models')
  , Tldr = models.Tldr
  , User = models.User
  , _ = require('underscore')
  , customUtils = require('../../lib/customUtils')
  , bunyan = require('../../lib/logger').bunyan
  , config = require('../../lib/config')
  , analytics = require('../../lib/analytics')
  , async = require('async')
 , moment = require('moment')

function displayProfile (req, res, next) {
  var values = req.renderingValues || {}
    , partials = req.renderingPartials || {}
    , usernameLowerCased = req.params.username ? req.params.username.toLowerCase() : '';

  partials.content = '{{>website/pages/userPublicProfile}}';
  partials.fbmetatags = '{{>website/metatags/metatagsUserProfile}}';

  async.waterfall([
    function (cb) {   // Only populate the latest tldrs the user created, in a specific object
      User.findOne({ usernameLowerCased: usernameLowerCased })
          .populate('history')
          .exec(function (err, user) {

        if (err || !user) { return res.redirect(302, '/'); }

        Tldr.find({ _id: { $in: user.tldrsCreated }, anonymous: false }, 'originalUrl slug title readCount summaryBullets domain')
            .populate('domain')
            .limit(14)
            .sort('-createdAt')
            .exec(function (err, tldrsCreated) {

          if (! err && user) {
            values.description = user.username + ' has contributed ' + user.tldrsCreated.length.toString() + ' tl;drs. Read them on tldr.io';
            values.user = user;
            values.user.createdAtReadable = customUtils.dateForDisplay(user.createdAt);
            values.user.lastActiveReadable = customUtils.dateForDisplay(user.lastActive);
            values.user.numberTldrsCreated = user.tldrsCreated.length ;
            values.user.completeTldrsCreated = tldrsCreated;
            values.title = user.username + config.titles.branding + config.titles.shortDescription;

            _.each(values.user.completeTldrsCreated, function (tldr) {
              tldr.linkToTldrPage = true;
            });

            // Specific metatags
            values.pageMetaProperties = customUtils.upsertKVInArray(values.pageMetaProperties, 'og:title', values.description);
            values.pageMetaProperties = customUtils.upsertKVInArray(values.pageMetaProperties, 'og:type', 'author');
            values.pageMetaProperties = customUtils.upsertKVInArray(values.pageMetaProperties, 'og:url', 'http://tldr.io/' + user.username);
            values.pageMetaProperties = customUtils.upsertKVInArray(values.pageMetaProperties, 'og:image', user.gravatar.url + '&s=210');
            values.pageMetaProperties = customUtils.upsertKVInArray(values.pageMetaProperties, 'og:description', user.bio);
          } else {
            return res.json(404, {});
          }

          cb(null);
            });
	  });
    }
    , function (cb) {
      User.findOne({ usernameLowerCased: usernameLowerCased })
          .populate('tldrsCreated', '_id', { anonymous: false })
          .exec(function (err, user) {
            if (! err && user) {
              values.user.numberTldrsCreated = user.tldrsCreated.length ;
            } else {
              return res.json(404, {});
            }
	      cb(null);
          });
    }
      , function (cb) {
	  User.findOne({ usernameLowerCased: usernameLowerCased })
	  .populate('tldrsCreated', '_id', { anonymous: false })
          .exec(function (err, user) {
	      if (! err && user) {
		  analytics.getAnalyticsForUser( user, 30, function (err, analytics30Days, rawData) {
		      analytics.getAnalyticsForUser( user, null, function (err, analyticsAllTime, rawData) {
			  var userJoinDate = moment(user.createdAt)
			  , now = moment()
			  , joinedRecently = now.diff(userJoinDate, 'days') < 6
			  ;

			  // figure out correct subtitle depending on activity
			  if (parseInt(analyticsAllTime.readCount, 10) > 0) {   // User already made some tldrs
			      values.hasBeenActive = true;
			      if (parseInt(analytics30Days.tldrsCreated, 10) > 0) {
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
			values.analytics = rawData;
			values.past30Days = analytics30Days;
			values.past30Days.selection = 'past30Days';
			values.allTime = analyticsAllTime;
			values.allTime.selection = 'allTime';
			  cb(null);
	
		      });
		  });
		      
	      }
            else {
              return res.json(404, {});
		cb(null);
	    }
	  });
      }

  ], function (err) {   // Render the page
       res.render('website/basicLayout', { values: values
                                         , partials: partials
                                                     });
                                         });
}


// Interface
module.exports.displayProfile = displayProfile;


