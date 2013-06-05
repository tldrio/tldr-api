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
  , async = require('async')
  , mqClient = require('../../lib/message-queue')
  ;


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
  ], function (err) {   // Render the page
       res.render('website/basicLayout', { values: values
                                         , partials: partials
                                                     });
                                         });
}


/**
 * Serve a user's RSS feed
 */
function serveUserRssFeed (req, res, next) {
  var partials = req.renderingPartials || {}
    , values = req.renderingValues || {}
    , usernameLowerCased = req.params.username ? req.params.username.toLowerCase() : '';
    ;

  User.findOne({ usernameLowerCased: usernameLowerCased })
      .populate('tldrsCreated')
      .exec(function (err, user) {

    if (err) { return res.send(500); }
    if (!user) { return res.send(404); }

    values.title = "Latest summaries created by user " + user.username;
    values.link = "http://tldr.io/" + user.username;
    values.description = "Latest summaries created by user " + user.username + " - tldr.io - interesting content summarized by people";
    values.tldrs = user.tldrsCreated;

    mqClient.emit('rssfeed.get', { feedUrl: '/' + user.username + '/feed.xml' });

    res.render('rss/feed', { values: values, partials: partials }, function(err, xml) {
      res.type('xml');
      res.send(200, xml);
    });
  });
}


// Interface
module.exports.displayProfile = displayProfile;
module.exports.serveUserRssFeed = serveUserRssFeed;
