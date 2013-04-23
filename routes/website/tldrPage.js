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

// Actually display the tldr page
function displayPage (req, res, tldr) {
  var values = req.renderingValues || {}
    , partials = req.renderingPartials || {}
    , tldrData = tldr.serializeForDataAttribute();
    ;

  partials.content = '{{>website/pages/tldrPage}}';
  partials.fbmetatags = '{{#tldr}} {{>website/metatags/metatagsPage}} {{/tldr}}'

  values.tldr = tldr;
  values.title = 'Summary of "' +
                 tldr.title.substring(0, 60) +
                 (tldr.title.length > 60 ? '..."' : '"') +
                 config.titles.branding + config.titles.shortDescription;
  // Warning: don't use double quotes in the meta description tag
  if (tldr.creator) { values.description = "Summary written by " + tldr.creator.usernameForDisplay + " of '" + tldr.title.replace(/"/g, '') + "'"; }

  // Specific metatags for the tldr page
  values.pageMetaProperties = customUtils.upsertKVInArray(values.pageMetaProperties, 'og:title', tldr.title);
  values.pageMetaProperties = customUtils.upsertKVInArray(values.pageMetaProperties, 'og:type', 'article');
  values.pageMetaProperties = customUtils.upsertKVInArray(values.pageMetaProperties, 'og:url', 'http://tldr.io/tldrs/' + tldr._id + '/' + tldr.slug);
  values.pageMetaProperties = customUtils.upsertKVInArray(values.pageMetaProperties, 'og:description', tldr.summaryBullets.join(' - '));
  if (tldr.creator) {values.pageMetaProperties = customUtils.upsertKVInArray(values.pageMetaProperties, 'tldrCreatorTwitterHandle', tldr.creator.twitterHandle || ''); }
  if (tldr.imageUrl) { values.pageMetaProperties = customUtils.upsertKVInArray(values.pageMetaProperties, 'og:image', tldr.imageUrl); }

  values.tldrData = tldrData;
  values.responsive = true;

  return res.render('website/basicLayout', { values: values , partials: partials });
}


// Display the "missing tldr page"
function displayMissingTldrPage (req, res) {
  var values = req.renderingValues || {}
    , partials = req.renderingPartials || {}
    ;

  partials.content = '{{>website/pages/missingTldrPage}}';

  values.title = "This tldr doesn't exist" + config.titles.branding;
  values.articleUrl = req.query.url;

  return res.render('website/basicLayout', { values: values , partials: partials });
}


// Display the tldr page when it's called by its id
module.exports.byId = function (req, res, next) {
  Tldr.findOneById(req.params.id, function (err, tldr) {
    if (err || !tldr) { return res.json(404, {}); }

    // Redirect to the correct url if the slug is not the right one. Will result in partial double counting
    // but also in much simpler code
    if (req.params.slug !== customUtils.slugify(tldr.title)) {
      return res.redirect(302, '/tldrs/' + tldr._id + '/' + tldr.slug);
    }

    displayPage(req, res, tldr);
  });
};


// Display the tldr page when it's called by the url of the article
module.exports.byUrl = function (req, res, next) {
  Tldr.findOneByUrl(req.query.url, function (err, tldr) {
    if (err || !tldr) { return displayMissingTldrPage(req, res); }

    res.redirect(302, '/tldrs/' + tldr._id + '/' + tldr.slug);
  });
};
