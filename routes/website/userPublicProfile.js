/**
 * User public profile page
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/

var models = require('../../lib/models')
  , User = models.User
  , customUtils = require('../../lib/customUtils')
  , bunyan = require('../../lib/logger').bunyan
  , config = require('../../lib/config')
  , async = require('async');


module.exports = function (req, res, next) {
  bunyan.incrementMetric('users.publicProfile.routeCalled');

  var values = req.renderingValues || {}
    , partials = req.renderingPartials || {}
    , usernameLowerCased = req.params.username ? req.params.username.toLowerCase() : '';

  partials.content = '{{>website/pages/userPublicProfile}}';
  partials.fbmetatags = '{{>website/metatags/metatagsUserProfile}}';

  async.waterfall([
    function (cb) {   // Only populate the latest tldrs the user created, in a specific object
      User.findOne({ usernameLowerCased: usernameLowerCased })
          .populate('tldrsCreated', '_id url slug title hostname readCount summaryBullets', {}, { limit: 14, sort: [['createdAt', -1]] })
          .populate('history')
          .exec(function (err, user) {
            if (! err && user) {
              values.description = user.username + ' has contributed' + user.tldrsCreated.length.toString() + ' tl;drs. Follow them on tldr.io';
              values.user = user;
              values.user.createdAtReadable = customUtils.dateForDisplay(user.createdAt);
              values.user.lastActiveReadable = customUtils.dateForDisplay(user.lastActive);
              values.user.numberTldrsCreated = user.tldrsCreated.length ;
              values.title = user.username + config.titles.branding + config.titles.shortDescription;
            } else {
              return res.json(404, {});
            }

            cb(null);
          });
    }
    // Second query to get the total length of tldrsCreated - Seems Not very optimal but otherwise
    // it would require to populate the entire tldrsCreated array which can lead to even poorer perf
    , function (cb) {
      User.findOne({ usernameLowerCased: usernameLowerCased })
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

