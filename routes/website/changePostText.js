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

  Post.findOne({ _id: req.params.id }, function (err, post) {
    if (err || !post) {
      partials.content = "Couldn't find the post you want to edit ...";
      res.render('website/basicLayout', { values: values
                                        , partials: partials
                                        });
    } else {
      post.changeText(req.body.text, function (err) {
        res.redirect(config.websiteUrl + '/forum/posts/' + req.params.id + '/edit');
      });
    }
  });
}

