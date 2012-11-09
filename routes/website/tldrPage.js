/**
 * The tldr page, at last with the same layout as the rest of the website
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/

var _ = require('underscore')
  , Tldr = require('../../lib/models').Tldr
  , bunyan = require('../../lib/logger').bunyan;

module.exports = function (req, res, next) {
  var values = req.renderingValues || {}
    , partials = req.renderingPartials || {};

  partials.content = '{{>website/pages/tldrPage}}';
  partials.fbmetatags = '{{>website/metatags/metatagsPage}}'

  bunyan.incrementMetric('tldrs.get.html');

  Tldr.findOne({ _id: req.params.id })
      .populate('creator', 'username twitterHandle')
      .exec(function (err, tldr) {

    values = _.extend(values, tldr);

    res.render('website/basicLayout', { values: values
                                      , partials: partials
                                      });
  });
}
