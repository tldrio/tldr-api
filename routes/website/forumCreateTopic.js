var models = require('../../lib/models')
  , Topic = models.Topic
  , _ = require('underscore')
  , config = require('../../lib/config')
  ;

module.exports = function (req, res, next) {
  var values = {}
    , topicData = { title: req.body.title }
    , postData = { text: req.body.firstPostText }
    ;

  Topic.createTopicAndFirstPost(topicData, postData, req.user, function (err, topic) {
    if (err) {
      values.displayValidationErrors = true;
      values.validationErrors = _.values(models.getAllValidationErrorsWithExplanations(err.errors));
      values.userInput = req.body;
      req.renderValues = values;
      return next();
    } else {
      return res.redirect(config.websiteUrl + '/forum/topics/' + topic._id);
    }
  });
}

