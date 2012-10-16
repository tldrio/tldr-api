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
    function (cb) {
      User.findOne({ usernameLowerCased: usernameLowerCased })
          .exec(function (err, user) {
            if (err || !user) { values.userNotFound = true; }

            values.user = user;
            values.user.createdAtReadable = customUtils.dateForDisplay(user.createdAt);

            cb();
          });
    }
  , function (cb) {
      User.findOne({ usernameLowerCased: usernameLowerCased })
          .populate('tldrsCreated', '_id title')
          .exec(function (err, user) {
            values.tldrsCreatedToDisplay = user.tldrsCreated;

            cb();
          });
    }
  ], function (err) {   // Render the page
       res.render('website/basicLayout', { values: values
                                         , partials: { content: '{{>website/pages/userPublicProfile}}' }
                                         });
     });
}

