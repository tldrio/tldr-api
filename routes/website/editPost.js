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

  Post.findOne({ _id: req.params.id }, function (err, post) {
    if (err || !post) {
      partials.content = "Couldn't find the post you want to edit ...";
    } else {
      values.post = post;
      partials.content = '{{>website/pages/forumEditPost}}';
    }

    res.render('website/basicLayout', { values: values
                                      , partials: partials
                                      });
  });
}
