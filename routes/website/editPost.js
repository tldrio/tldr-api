/**
 * Display a form to edit a post (only admins can do that)
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/

var models = require('../../lib/models')
  , Post = models.Post
  ;

module.exports = function (req, res, next) {
  var values = req.renderingValues || {}
    , partials = req.renderingPartials || {}
    ;

  Post.findOne({ _id: req.params.id })
      .populate('topic')
      .exec(function (err, post) {
    if (err || !post) { return res.send(404, "Couldn't find the post you want to edit!"); }

    if (! values.admin && (! req.user || post.creator.toString() !== req.user._id.toString())) {
      return res.send(401, 'You can only edit your own posts!');
    }

    values.post = post;
    values.topic = post.topic;
    values.topic.moreThanOnePost = post.topic.posts.length > 1
     if (req.user) {   // Won't display the buttons if nobody's logged in
       values.topic.userHasntVoted = values.topic.alreadyVoted.indexOf(req.user._id) === -1;
     }
    partials.content = '{{>website/pages/forumEditPost}}';

    res.render('website/basicLayout', { values: values
                                      , partials: partials
                                      });
  });
};
