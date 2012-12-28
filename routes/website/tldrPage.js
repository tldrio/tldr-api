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

  bunyan.incrementMetric('tldrs.get.html');

  partials.content = '{{>website/pages/tldrPage}}';
  partials.fbmetatags = '{{>website/metatags/metatagsPage}}'

  // After the tldr has been found (either by its slug or _id), render it
  function renderTldrPage(tldr) {
    values = _.extend(values, tldr);

    return res.render('website/basicLayout', { values: values
                                             , partials: partials
                                             });
  }

  // First, try to find the tldr by the slug
  Tldr.findAndIncrementReadCount({ slug: req.params.id }, req.user, function (err, tldr) {
    if (!err && tldr) { return renderTldrPage(tldr); }

    // If it can't be found by the slug, try the _id for retrocompatibility
    Tldr.findAndIncrementReadCount({ _id: req.params.id }, req.user, function (err, tldr) {
      if (err || !tldr) { values.tldrNotFound = true; }
      return renderTldrPage(tldr);
    });
  });
}
