var models = require('../../lib/models')
  , Thread = models.Thread
  , _ = require('underscore')
  , config = require('../../lib/config')
  , mailer = require('../../lib/mailer')
  ;

module.exports = function (req, res, next) {
  var threadData = { title: req.body.title }
    , postData = { text: req.body.firstPostText }
    ;

  req.renderingValues = req.renderingValues || {};

  Thread.createThreadAndFirstPost(threadData, postData, req.user, function (err, thread) {
    if (err) {
      req.renderingValues.displayValidationErrors = true;
      req.renderingValues.validationErrors = _.values(models.getAllValidationErrorsWithExplanations(err.errors));
      req.renderingValues.userInput = req.body;
      return next();
    } else {
      // Send moderation email
      mailer.sendEmail({ type: 'adminPostToForum'
                       , development: false
                       , values: { lastPostCreator: req.user, thread: thread, post: postData }
                       });

      return res.redirect('/forum/threads/' + thread._id + '/' + thread.slug);
    }
  });
}

