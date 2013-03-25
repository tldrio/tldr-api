/**
 * Moderate all new tldrs
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var models = require('../../lib/models')
  , Tldr = models.Tldr
  , Topic = models.Topic
  , async = require('async')
  , _ = require('underscore')
  , config = require('../../lib/config')
  , bufferapp = require('../../lib/bufferapp')
  ;

module.exports = function (req, res, next) {
  var values = req.renderingValues || {}
    , partials = req.renderingPartials || {}
    ;

  values.title = "Tldrs to be moderated";
  partials.content = '{{>website/pages/add-categories}}';

  async.waterfall([
    function (cb) {
    Topic.getCategories(function (err, categories) {
      values.categories = categories;
      cb();
    });
  }
  , function (cb) {
      Tldr.find({ moderated: false, topics: { $size: 0 } })
        .sort('-createdAt')
        .populate('creator', 'deleted username')
        .populate('domain')
        .exec(function (err, tldrs) {
          values.tldrs = tldrs;
          _.each(values.tldrs, function (tldr) {
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


