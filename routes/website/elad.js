/**
 * User public profile page
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/

var models = require('../../lib/models')
  , Tldr = models.Tldr
  , _ = require('underscore')
  , customUtils = require('../../lib/customUtils')
  , bunyan = require('../../lib/logger').bunyan
  , config = require('../../lib/config')
  , async = require('async');


module.exports = function (req, res, next) {
  var values = req.renderingValues || {}
    , partials = req.renderingPartials || {}
    , usernameLowerCased = req.params.username ? req.params.username.toLowerCase() : '';

  partials.content = '{{>website/pages/elad}}';
  partials.fbmetatags = '{{>website/metatags/metatagsUserProfile}}';

  Tldr.find({ hostname: 'blog.eladgil.com' })
      .populate('creator')
      .exec(function (err, tldrs) {
        values.tldrs = tldrs;

       res.render('website/basicLayout', { values: values
                                           , partials: partials
                                                       });
      });
}

