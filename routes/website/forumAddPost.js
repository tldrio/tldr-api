var models = require('../../lib/models')
  , Topic = models.Topic
  , _ = require('underscore')
  , config = require('../../lib/config')
  , mailer = require('../../lib/mailer')
  , RedisQueue = require('../../lib/redis-queue')
  , rqClient = new RedisQueue(config.redisQueue)
  ;

module.exports = function (req, res, next) {
  req.renderingValues = req.renderingValues || {};

  Topic.findOne({ _id: req.params.id }, function (err, topic) {
    if (err || ! topic) {
      req.renderingValues.notFound = true;
      return next();
    }

    topic.addPost({ text: req.body.text }, req.user, function(err, post) {
      if (err) {
        req.renderingValues.displayValidationErrors = true;
        req.renderingValues.validationErrors = _.values(models.getAllValidationErrorsWithExplanations(err.errors));
        req.renderingValues.userInput = req.body;
        return next();
      } else {
        rqClient.emit('forum.post', { type: 'forumPost'
                                     , from: req.user
                                     , topic: topic
                                     , post: post
                                     });

        // Redirect instead of render so that user can reload the topic without the "POST" error message
        return res.redirect('/forum/topics/' + topic._id + '/' + topic.slug);
      }
    });
  });
};
