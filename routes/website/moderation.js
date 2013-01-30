/**
 * Moderate all new tldrs
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var models = require('../../lib/models')
  , Tldr = models.Tldr
  , async = require('async')
  , _ = require('underscore')
  , config = require('../../lib/config')
  ;

module.exports = function (req, res, next) {
  var values = req.renderingValues || {}
    , partials = req.renderingPartials || {};

  values.title = "Tldrs to be moderated";
  partials.content = '{{>website/pages/moderation}}';

  async.waterfall(
  [
    function (cb) {
      Tldr.find({ discoverable: true, moderated: false })
        .sort('-createdAt')
        .populate('creator', 'username')
        .exec(function (err, tldrs) {
          values.latestTldrs = tldrs;
          _.each(values.latestTldrs, function (tldr) {
            tldr.linkToTldrPage = true;
          });
          cb(null);
        });
    }
  ], function (err) {
       res.render('website/basicLayout', { values: values
                                       , partials: partials
                                       });
  });
}


