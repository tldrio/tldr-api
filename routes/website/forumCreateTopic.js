var models = require('../../lib/models')
  , Topic = models.Topic
  , _ = require('underscore')
  , config = require('../../lib/config')
  ;

module.exports = function (req, res, next) {
  var topicData = { title: req.body.title }
    , postData = { text: req.body.firstPostText }
    ;

  req.renderingValues = req.renderingValues || {};

  Topic.createTopicAndFirstPost(topicData, postData, req.user, function (err, topic) {
    if (err) {
      req.renderingValues.displayValidationErrors = true;
      req.renderingValues.validationErrors = _.values(models.getAllValidationErrorsWithExplanations(err.errors));
      req.renderingValues.userInput = req.body;
      return next();
    } else {
      return res.redirect(config.websiteUrl + '/forum/topics/' + topic._id);
    }
  });
}

