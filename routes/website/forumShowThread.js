var models = require('../../lib/models')
  , Thread = models.Thread
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
  partials.content = '{{>website/pages/forumShowThread}}';

  Thread.findOne({ _id: req.params.id }, function (err, thread) {
    if (err || !thread) { return res.json(404, {}); }

    if (req.params.slug !== customUtils.slugify(thread.title)) {
      return res.redirect(301, '/forum/threads/' + thread._id + '/' + thread.slug);
    }

    // Still not possible in mongoose to subpopulate documents so we do it manually
    Post.find({ _id: { $in: thread.posts } })
        .populate('creator', 'username gravatar')
        .exec(function (err, posts) {

     _.each(posts, function (post) {
       post.timeago = customUtils.timeago(post.createdAt);
       post.markedText = marked(post.text);
       post.markedText = post.markedText.replace(/<a href="([^>]*)">/g, '<a href="$1" rel="nofollow">'); // Make all user-supplied links nofollow

       if (req.user && (req.user.isAdmin || (req.user && req.user._id.toString() === post.creator._id.toString()))) { post.editable = true; }
     });

     thread.moreThanOnePost = (thread.posts.length === 0) || (thread.posts.length > 1);
     thread.moreThanOneVote = (thread.votes > 1) || (thread.votes === 0) || (thread.votes < -1);
     if (req.user) { thread.userHasntVoted = thread.alreadyVoted.indexOf(req.user._id) === -1; }

      values.posts = posts;
      values.thread = thread;
      values.title = thread.title + config.titles.branding;

      // Thread specific metatags
      values.pageMetaProperties = customUtils.upsertKVInArray(values.pageMetaProperties, 'og:title', thread.title);
      values.pageMetaProperties = customUtils.upsertKVInArray(values.pageMetaProperties, 'og:type', 'discussion');
      values.pageMetaProperties = customUtils.upsertKVInArray(values.pageMetaProperties, 'og:url', 'http://tldr.io/' + thread._id + '/' + thread.slug);
      values.pageMetaProperties = customUtils.upsertKVInArray(values.pageMetaProperties, 'og:description', "Discussion on tldr.io's forum");

      res.render('website/basicLayout', { values: values
                                        , partials: partials
                                        });
    });
  });
};
