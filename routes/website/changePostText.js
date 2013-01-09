/**
 * Change a post text (only admins can do that)
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/

var models = require('../../lib/models')
  , Post = models.Post
  , config = require('../../lib/config')
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

        post.changeText(req.body.text, function (err) {
          res.redirect('/forum/topics/' + post.topic.id + '/' + post.topic.slug);
        });
      });
}

