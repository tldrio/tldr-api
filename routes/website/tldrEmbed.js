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
  , async = require('async')
  ;


module.exports = function (req, res, next) {
  var values = {}
    , showTitle = req.query && req.query.showTitle ? req.query.showTitle.toString() === 'true' ? true : false
                                                   : false
    , tldrId = req.query && req.query.tldrId
    , url = req.query && req.query.url
    ;

  values.iframeId = req.query && req.query.iframeId;

  async.waterfall([
     function (cb) {
       if (tldrId) {
         Tldr.findOneById(tldrId, function (err, tldr) { return cb(err, tldr); });
       } else {
         Tldr.findOneByUrl(url, function (err, tldr) { return cb(err, tldr); });
       }
     }
  ], function (err, tldr) {
       if (err || !tldr) { return res.json(404, {}); }

       values.tldr = tldr;
       values.titlePart = showTitle ? 'Summary of "' + tldr.title + '"'
                                    : 'Summary';

       return res.render('website/tldrEmbed', { values: values });
  });
};
