/*
 * API route to allow hovering on HN
 * Used with PUT
 */

var i18n = require('../lib/i18n');

module.exports = function (req, res, next) {
  if (req.user) {
    req.user.allowHover(function (err, user) {
      if (err) {
        return next({ statusCode: 500, message: i18n.couldntAllowHover });
      } else {
        return res.json(200, user.getAuthorizedFields());
      }
    });
  } else {
    res.setHeader('WWW-Authenticate', i18n.unknownUser);
    return res.json(401, { message: i18n.unauthorized} );
  }
};
