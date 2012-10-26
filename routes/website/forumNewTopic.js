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

  function renderNewTopicForm () {
    res.render('website/basicLayout', { values: values
                                      , partials: { content: '{{>website/pages/forumNewTopic}}' }
                                      });
  }

  values.loggedUser = req.user;   // Cannot be null since this is called after the loggedInOnly middleware

  // If data was POSTed, try to create the topic and redirect to topic list in case of success
  if (req.route.method === "post") {
    Topic.createTopicAndFirstPost(topicData, postData, req.user, function (err, topic) {
      if (err) {
        values.displayValidationErrors = true;
        values.validationErrors = _.values(models.getAllValidationErrorsWithExplanations(err.errors));
        values.userInput = req.body;
        renderNewTopicForm();
      } else {
        return res.redirect(config.websiteUrl + '/forum/topics/' + topic._id);
      }
    });
  } else {
    renderNewTopicForm();
  }

}
