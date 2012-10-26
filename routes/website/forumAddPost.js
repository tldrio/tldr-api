var models = require('../../lib/models')
  , Topic = models.Topic
  , _ = require('underscore')
  , config = require('../../lib/config')
  ;

module.exports = function (req, res, next) {
  req.renderValues = {};   // Will be passed to the next middleware's values

  Topic.findOne({ _id: req.params.id }, function (err, topic) {
    if (err || ! topic) {
      req.renderValues.notFound = true;
      return next();
    }

    topic.addPost({ text: req.body.text }, req.user, function(err, post) {
      if (err) {
        req.renderValues.displayValidationErrors = true;
        req.renderValues.validationErrors = _.values(models.getAllValidationErrorsWithExplanations(err.errors));
        req.renderValues.userInput = req.body;
        return next();
      } else {
        // Redirect instead of render so that user can reload the topic without the "POST" error message
        return res.redirect(config.websiteUrl + '/forum/topics/' + topic._id);
      }
    });
  });
};
