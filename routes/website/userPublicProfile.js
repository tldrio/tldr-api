/**
 * User public profile page
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/

var models = require('../../lib/models')
  , User = models.User
  , customUtils = require('../../lib/customUtils')
  , _ = require('underscore')
  , async = require('async');


module.exports = function (req, res, next) {
  var values = {}
    , usernameLowerCased = req.params.username ? req.params.username.toLowerCase() : '';

  values.loggedUser = req.user;

  async.waterfall([
    function (cb) {   // Only populate the latest tldrs the user created, in a specific object
      User.findOne({ usernameLowerCased: usernameLowerCased })
          .populate('tldrsCreated', '_id title', {}, { limit: 20, sort: [['createdAt', -1]] })
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

            cb();
          });
    }
  ], function (err) {   // Render the page
       res.render('website/basicLayout', { values: _.extend({}, values, { linkify: customUtils.linkify })
                                         , partials: { content: '{{>website/pages/userPublicProfile}}' }
                                         });
     });
}

