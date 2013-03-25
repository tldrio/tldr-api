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
  , async = require('async');


module.exports = function (req, res, next) {
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
    // Second query to get the total length of tldrsCreated - Seems Not very optimal but otherwise
    // it would require to populate the entire tldrsCreated array which can lead to even poorer perf
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

