/**
 * Show a user's history
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var i18n = require('../lib/i18n')
  , User = require('../lib/models').User;


module.exports = function (req, res, next) {
  if (! req.params.username) {
    return next({ statusCode: 404, body: { message: i18n.resourceNotFound }});
  }

  User.findOne({ usernameLowerCased: req.params.username.toLowerCase(), deleted: false }, function (err, user) {
    if (err || !user) { return res.json(404, { message: i18n.resourceNotFound }); }

    var publicData = user.getPublicProfile();
    user.getPublicCreatedTldrs(function (err, tldrs) {
      var tldrsCreated = [];

      tldrs.forEach(function (tldr) {
        tldrsCreated.push(tldr.getPublicData());
      });

      publicData.tldrsCreated = tldrsCreated;

      return res.json(200, publicData);
    });
  });
};
