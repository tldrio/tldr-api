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

  Topic.findOne({ _id: req.params.id }, function (err, topic) {
    if (err || !topic) { return res.json(404, {}); }

    if (req.params.slug !== customUtils.slugify(topic.title)) {
      return res.redirect(301, '/forum/topics/' + topic._id + '/' + topic.slug);
    }

    // Still not possible in mongoose to subpopulate documents so we do it manually
    Post.find({ _id: { $in: topic.posts } })
        .populate('creator', 'username gravatar')
        .exec(function (err, posts) {

     _.each(posts, function (post) {
       post.timeago = customUtils.timeago(post.createdAt);
       post.markedText = marked(post.text);
       post.markedText = post.markedText.replace(/<a href="([^>]*)">/g, '<a href="$1" rel="nofollow">'); // Make all user-supplied links nofollow
       if (values.admin) { post.editable = true; }
     });

     topic.moreThanOnePost = (topic.posts.length === 0) || (topic.posts.length > 1);
     topic.moreThanOneVote = (topic.votes > 1) || (topic.votes === 0) || (topic.votes < -1);
     if (req.user) {   // Won't display the buttons if nobody's logged in
       topic.userHasntVoted = topic.alreadyVoted.indexOf(req.user._id) === -1;
     }

      values.posts = posts;
      values.topic = topic;
      values.title = topic.title + config.titles.branding;

      // Topic specific metatags
      values.pageMetaProperties['og:title'] = topic.title;
      values.pageMetaProperties['og:type'] = 'discussion';
      values.pageMetaProperties['og:url'] = 'http://tldr.io/' + topic._id + '/' + topic.slug;
      values.pageMetaProperties['og:description'] = "Discussion on tldr.io's forum";

      res.render('website/basicLayout', { values: values
                                        , partials: partials
                                        });
    });
  });
};
