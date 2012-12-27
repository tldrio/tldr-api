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


  Tldr.findAndIncrementReadCount({ _id: req.params.id }, req.user, function (err, tldr) {

    if (!err && tldr) {
      // Warning: don't use double quotes in the meta description tag
      values.description = "Summary written by " + tldr.creator.username + " of '" + tldr.title.replace(/"/g, '') + "'";
      values.title = tldr.title + " - tldr.io";
      values.tldr = tldr;
    } else {
      values.tldrNotFound = true;
    }

    res.render('website/basicLayout', { values: values
                                      , partials: partials
                                      });
  });
}
