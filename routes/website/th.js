/**
 * /tldrs page of the website
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var models = require('../../lib/models')
  , Tldr = models.Tldr
  , async = require('async')
  , _ = require('underscore')
  ;

module.exports = function (req, res, next) {
  var values = req.renderingValues || {}
    , partials = req.renderingPartials || {};

  values.tldrs = true;
  partials.content = '{{>website/pages/th}}';

  async.waterfall(
  [
    function (cb) {   // Only populate the latest tldrs the user created, in a specific object
      Tldr.find()
        .limit(10)
        .sort('-createdAt')
        .populate('creator', 'username')
        .exec(function (err, tldrs) {
          var i = 0;

          values.latestTldrs = tldrs;
          _.each(values.latestTldrs, function (tldr) {
            tldr.number = i;
            i += 1;
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

