/**
 * /summaries page of the website
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var models = require('../../lib/models')
  , Tldr = models.Tldr
  , async = require('async');
  ;

module.exports = function (req, res, next) {
  var values = req.renderingValues;

  async.waterfall(
  [
    function (cb) {   // Only populate the latest tldrs the user created, in a specific object
      Tldr.find({})
        .limit(10)
        .sort('-createdAt')
        .populate('creator', 'username')
        .exec(function (err, tldrs) {
          values.latestTldrs = tldrs;
          cb(null);
        });
    }
  ], function (err) {
       res.render('website/basicLayout', { values: values
                                       , partials: { content: '{{>website/pages/summaries}}' }
                                       });
  });
}

