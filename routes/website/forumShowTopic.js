var models = require('../../lib/models')
  , Topic = models.Topic
  , Post = models.Post
  , _ = require('underscore')
  , customUtils = require('../../lib/customUtils')
  , config = require('../../lib/config')
  , marked = require('../../lib/customMarked')
  ;

module.exports = function (req, res, next) {
  var values = req.renderingValues || {}
    , partials = req.renderingPartials || {};

  values.forum = true;
  partials.content = '{{>website/pages/forumShowTopic}}';

  function showTopic (topic) {
    // Still not possible in mongoose to subpopulate documents so we do it manually
    Post.find({ _id: { $in: topic.posts } })
        .populate('creator', 'username gravatar')
        .exec(function (err, posts) {

     _.each(posts, function (post) {
       post.timeago = customUtils.timeago(post.createdAt);
       post.markedText = marked(post.text);
       if (values.admin) { post.editable = true; }
     });

     topic.moreThanOnePost = (topic.posts.length === 0) || (topic.posts.length > 1);
     topic.moreThanOneVote = (topic.votes > 1) || (topic.votes === 0) || (topic.votes < -1);
     if (req.user) {   // Won't display the buttons if nobody's logged in
       topic.userHasntVoted = topic.alreadyVoted.indexOf(req.user._id) === -1;
     }

      values.posts = posts;
      values.topic = topic;
      values.title = topic.title + " - tldr.io";

      res.render('website/basicLayout', { values: values
                                        , partials: partials
                                        });
    });
  }

  Topic.findOne({ slug: req.params.id }, function (err, topic) {
    if (!err && topic) {
      return showTopic(topic);
    } else {
      Topic.findOne({ _id: req.params.id }, function (err, topic) {
        if (err || ! topic || !topic.slug || topic.slug.length === 0) {
          return res.json(404, {});   // Assume that a topic with no slug doesn't exist, we don't want any ugly url anymore
        } else {
          return res.redirect(301, config.websiteUrl + '/forum/topics/' + topic.slug);
        }
      });
    }
  });
};
