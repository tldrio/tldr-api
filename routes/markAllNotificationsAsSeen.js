/*
 * Route used to mark all of a user's notifications as seen
 */

var i18n = require('../lib/i18n')
  , util = require('util')
  ;

module.exports = function (req, res, next) {
  if (! req.user) { return next({ statusCode: 401, body: { message: i18n.unauthorized } }); }

  req.user.markAllNotificationsAsSeen(function (err, numAffected) {
    if (err) { return next({ statusCode: 500, body: { message: i18n.mongoInternErrUpdateNotif } }); }

    return res.json(200, { message: util.format(i18n.markAllNotificationsAsSeen, numAffected) });
  });

}
