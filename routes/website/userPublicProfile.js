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
  var values = {}
    , usernameLowerCased = req.params.username ? req.params.username.toLowerCase() : '';

  values.loggedUser = req.user;

  async.waterfall([
    function (cb) {   // Get user info. For now, reputation is the number of created tldrs
      User.findOne({ usernameLowerCased: usernameLowerCased })
          .exec(function (err, user) {
            if (err || !user) {
              values.userNotFound = true;
            } else {
              values.user = user;
              values.user.createdAtReadable = customUtils.dateForDisplay(user.createdAt);
              values.user.createdMoreThanOneTldr = (user.tldrsCreated.length > 0);
              values.user.avatarUrl = user.getGravatarUrl(400);
            }
            cb();
          });
    }
  , function (cb) {   // Only populate the latest tldrs the user created, in a specific object
      User.findOne({ usernameLowerCased: usernameLowerCased })
          .populate('tldrsCreated', '_id title', {}, { limit: 5, sort: [['createdAt', -1]] })
          .populate('history')
          .exec(function (err, user) {
            if (! err && user) {
              values.tldrsCreatedToDisplay = user.tldrsCreated;
            }

            cb();
          });
    }
  ], function (err) {   // Render the page
       res.render('website/basicLayout', { values: values
                                         , partials: { content: '{{>website/pages/userPublicProfile}}' }
                                         });
     });
}

