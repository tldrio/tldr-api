/*
 * Handler called when a user wants to vote on a topic
 */

var i18n = require('../lib/i18n')
  , Topic = require('../lib/models').Topic
  ;

module.exports = function (req, res, next) {
  if (! req.user) {
    return next({ statusCode: 401, body: { message: i18n.needToBeLogged } });
  }

  Topic.findOne({ _id: req.params.id }, function (err, topic) {
    if (err) { return next(i18n.se_retrievingTopic); }

    if (! topic) {
      return next({ statusCode: 404, body: { message: i18n.topicDoesntExist } });
    }

    topic.vote(req.body.direction, req.user, function (err) {
      if (err) { return next(i18n.se_voting); }

      return res.json(200, {});
    });
  });
};
