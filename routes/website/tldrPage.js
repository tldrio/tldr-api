/**
 * The tldr page, at last with the same layout as the rest of the website
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/

var _ = require('underscore')
  , Tldr = require('../../lib/models').Tldr
  , notificator = require('../../lib/notificator')
  , bunyan = require('../../lib/logger').bunyan;

module.exports = function (req, res, next) {
  var values = req.renderingValues || {}
    , partials = req.renderingPartials || {};

  partials.content = '{{>website/pages/tldrPage}}';
  partials.fbmetatags = '{{>website/metatags/metatagsPage}}'

  bunyan.incrementMetric('tldrs.get.html');


  Tldr.findAndIncrementReadCount({ _id: req.params.id }, false, function (err, tldr) {

    if (!err && tldr) {
      values = _.extend(values, tldr);

      // Send Notif
      notificator.publish({ type: 'read'
                          , from: req.user
                          , tldr: tldr
                          // all contributors instead of creator only ?? we keep creator for now as there a very few edits
                          , to: tldr.creator
                          });
    } else {
      values.tldrNotFound = true;
    }

    res.render('website/basicLayout', { values: values
                                      , partials: partials
                                      });
  });
}
