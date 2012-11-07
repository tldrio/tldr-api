var models = require('../../lib/models')
  , Topic = models.Topic
  , _ = require('underscore')
  , config = require('../../lib/config')
  , mailer = require('../../lib/mailer')
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
        // Send moderation email
        mailer.sendEmail({ type: 'postToForum'
                         , development: false
                         , values: { user: req.user, websiteUrl: config.websiteUrl, topic: topic, postData: { text: req.body.text } }
                         });

        // Redirect instead of render so that user can reload the topic without the "POST" error message
        return res.redirect(config.websiteUrl + '/forum/topics/' + topic._id);
      }
    });
  });
};
