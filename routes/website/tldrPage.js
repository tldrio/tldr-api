/**
 * The tldr page, at last with the same layout as the rest of the website
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/

var _ = require('underscore')
  , Tldr = require('../../lib/models').Tldr
  , bunyan = require('../../lib/logger').bunyan
  , config = require('../../lib/config')
  ;

module.exports = function (req, res, next) {
  var values = req.renderingValues || {}
    , partials = req.renderingPartials || {};

  partials.content = '{{>website/pages/tldrPage}}';
  partials.fbmetatags = '{{>website/metatags/metatagsPage}}'

  bunyan.incrementMetric('tldrs.get.html');


  Tldr.findAndIncrementReadCount({ _id: req.params.id }, req.user, function (err, tldr) {

    if (!err && tldr) {
      values.tldr = tldr;
      values.title = tldr.title.substring(0, 60) +
                     (tldr.title.length > 60 ? '...' : '') +
                     config.titles.branding + config.titles.shortDescription;
    } else {
      values.tldrNotFound = true;
    }

    res.render('website/basicLayout', { values: values
                                      , partials: partials
                                      });
  });
}
