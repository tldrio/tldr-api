/**
 * The tldr page, at last with the same layout as the rest of the website
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/

var _ = require('underscore')
  , Tldr = require('../../lib/models').Tldr
  , bunyan = require('../../lib/logger').bunyan
  , config = require('../../lib/config')
  , customUtils = require('../../lib/customUtils')
  ;

module.exports = function (req, res, next) {
  var values = req.renderingValues || {}
    , partials = req.renderingPartials || {};

  bunyan.incrementMetric('tldrs.get.html');

  partials.content = '{{>website/pages/tldrPage}}';
  partials.fbmetatags = '{{>website/metatags/metatagsPage}}'

  Tldr.findAndIncrementReadCount({ _id: req.params.id }, function (err, tldr) {
    if (err || !tldr) { return res.json(404, {}); }

    if (req.params.slug !== customUtils.slugify(tldr.title)) {
      return res.redirect('/tldrs/' + customUtils.slugify(tldr.title) + '/' + tldr._id);
    }

    values.tldr = tldr;
    return res.render('website/basicLayout', { values: values , partials: partials });
  });
}
