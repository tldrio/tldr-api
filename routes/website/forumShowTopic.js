var models = require('../../lib/models')
  , Topic = models.Topic
  , Post = models.Post
  , _ = require('underscore')
  , config = require('../../lib/config')
  ;

module.exports = function (req, res, next) {
  var values = req.renderValues ? req.renderValues : {};

  values.loggedUser = req.user;

  Topic.findOne({ _id: req.params.id })
       .exec(function (err, topic) {

    // Still not possible in mongoose to subpopulate documents so we do it manually
    Post.find({ _id: { $in: topic.posts } })
        .populate('creator', 'username gravatar')
        .exec(function (err, posts) {

      values.posts = posts;
      values.topic = topic;

      res.render('website/basicLayout', { values: values
                                        , partials: { content: '{{>website/pages/forumShowTopic}}' }
                                        });
    });
  });
};
