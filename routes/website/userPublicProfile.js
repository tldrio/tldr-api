/**
 * User public profile page
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/

var models = require('../../lib/models')
  , User = models.User
  , customUtils = require('../../lib/customUtils')
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
          .populate('tldrsCreated', '_id title hostname', {}, { limit: 20, sort: [['createdAt', -1]] })
          .populate('history')
          .exec(function (err, user) {
            if (! err && user) {
              values.user = user;
              values.user.createdAtReadable = customUtils.dateForDisplay(user.createdAt);
              values.user.numberTldrsCreated = user.tldrsCreated.length ;
              values.title = user.username + ' - tldr.io';
            } else {
              values.userNotFound = true;
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
              values.userNotFound = true;
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

