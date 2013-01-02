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

  partials.content = '{{>website/pages/tldrPage}}';
  partials.fbmetatags = '{{#tldr}} {{>website/metatags/metatagsPage}} {{/tldr}}'

  bunyan.incrementMetric('tldrs.get.html');

  Tldr.findAndIncrementReadCount({ _id: req.params.id }, req.user, function (err, tldr) {
    if (err || !tldr) { return res.json(404, {}); }

    if (req.params.slug !== customUtils.slugify(tldr.title)) {
      Tldr.update({ _id: req.params.id }, { $inc: { readCount: -1 } }, {}, function() {   // Avoid counting two reads if the wrong url was called
        return res.redirect('/tldrs/' + customUtils.slugify(tldr.title) + '/' + tldr._id);   // 302 redirects to avoid 301 redirect loops if title changes
      });
    } else {
      values.tldr = tldr;
      values.title = tldr.title.substring(0, 60) +
                     (tldr.title.length > 60 ? '...' : '') +
                     config.titles.branding + config.titles.shortDescription;
      // Warning: don't use double quotes in the meta description tag
      values.description = "Summary written by " + tldr.creator.username + " of '" + tldr.title.replace(/"/g, '') + "'";

      return res.render('website/basicLayout', { values: values , partials: partials });
    }
  });
}
