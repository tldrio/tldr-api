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

  bunyan.incrementMetric('tldrs.get.html');

  partials.content = '{{>website/pages/tldrPage}}';
  partials.fbmetatags = '{{>website/metatags/metatagsPage}}'

  // First, try to find the tldr by the slug
  Tldr.findAndIncrementReadCount({ slug: req.params.id }, req.user, function (err, tldr) {
    if (!err && tldr) {
      values = _.extend(values, tldr);
      return res.render('website/basicLayout', { values: values , partials: partials });
    }

    // If it can't be found by the slug, try the _id for retrocompatibility
    Tldr.findOne({ _id: req.params.id }, function (err, tldr) {
      if (err || !tldr || !tldr.slug || tldr.slug.length === 0) {
        values.tldrNotFound = true;
        return res.render('website/basicLayout', { values: values , partials: partials });
      }

      return res.redirect(301, config.websiteUrl + '/tldrs/' + tldr.slug);
    });
  });
}
