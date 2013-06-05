var models = require('../../lib/models')
  , Thread = models.Thread
  , _ = require('underscore')
  , config = require('../../lib/config')
  , mqClient = require('../../lib/message-queue')
  ;

module.exports = function (req, res, next) {
  req.renderingValues = req.renderingValues || {};

  Thread.findOne({ _id: req.params.id }, function (err, thread) {
    if (err || ! thread) {
      req.renderingValues.notFound = true;
      return next();
    }

    thread.addPost({ text: req.body.text }, req.user, function(err, post) {
      if (err) {
        req.renderingValues.displayValidationErrors = true;
        req.renderingValues.validationErrors = _.values(models.getAllValidationErrorsWithExplanations(err.errors));
        req.renderingValues.userInput = req.body;
        return next();
      } else {
        mqClient.emit('forum.post', { creator: req.user
                                    , thread: thread
                                    , post: post
                                    });

        // Redirect instead of render so that user can reload the thread without the "POST" error message
        return res.redirect('/forum/threads/' + thread._id + '/' + thread.slug);
      }
    });
  });
};
