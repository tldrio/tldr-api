var config = require('../../lib/config')
  , models = require('../../lib/models')
  , Topic = models.Topic
  , Tldr = models.Tldr
  , _ = require('underscore')
  ;


function loadTldrs (req, res, next) {
  Topic.getCategories(function (err, categories) {
    req.params.topic = _.pluck(categories, 'name');
    loadTldrsByCategory(req, res, next);
  });
}


function loadTldrsByCategory (req, res, next) {
  var options = { sort: req.params.sort === 'mostread' ? '-readCount' : '-createdAt'
                , limit: 100
                };

  if (req.params.sort === 'mostread') {
    options = { sort: '-readCount' };
    req.renderingValues.mostread = true;
  } else {
    options = { sort: '-createdAt' };
    req.renderingValues.latest = true;
  }

  Tldr.findByCategoryName(req.params.topic, options, function (err, tldrs) {
    req.renderingValues.tldrs = tldrs;
    return next();
  });
}


function displayPage (req, res, next) {
  var partials = req.renderingPartials || {}
    , values = req.renderingValues || {}
    , topic = req.params.topic
    ;

  values.title = "Discover" + config.titles.branding + config.titles.shortDescription;
  values.description = "Discover tldrs";
  partials.content = '{{>website/pages/discover}}';

  res.render('website/responsiveLayout', { values: values
                                    , partials: partials
                                    });
}


// Interface
module.exports.loadTldrs = loadTldrs;
module.exports.loadTldrsByCategory = loadTldrsByCategory;
module.exports.displayPage = displayPage;
