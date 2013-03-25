/*
 * Handler called when a user wants to vote on a thread
 */

var i18n = require('../lib/i18n')
  , Thread = require('../lib/models').Thread
  ;

module.exports = function (req, res, next) {
  if (! req.user) {
    return next({ statusCode: 401, body: { message: i18n.needToBeLogged } });
  }

  Thread.findOne({ _id: req.params.id }, function (err, thread) {
    if (err) { return next(i18n.se_retrievingThread); }

    if (! thread) {
      return next({ statusCode: 404, body: { message: i18n.threadDoesntExist } });
    }

    thread.vote(req.body.direction, req.user, function (err) {
      if (err) { return next(i18n.se_voting); }

      return res.json(200, {});
    });
  });
};
