var config = require('../../lib/config')
  , models = require('../../lib/models')
  , Topic = models.Topic
  , Tldr = models.Tldr
  , _ = require('underscore')
  ;


// Get 100 tldrs according to our sort
function loadTldrs (req, res, next) {
  var options = { limit: 100 };

  if (req.params.sort === 'mostread') {
    options.sort = '-readCount';
    req.renderingValues.mostread = true;
  } else {
    options.sort = '-createdAt';
    req.renderingValues.newest = true;
  }

  Tldr.findAll(options, function (err, tldrs) {
    req.renderingValues.tldrs = tldrs;
    return next();
  });
}

// Get 100 tldrs from the given topic
function loadTldrsByCategory (req, res, next) {
  var options = { limit: 100 };

  if (req.params.sort === 'mostread') {
    options = { sort: '-readCount' };
    req.renderingValues.mostread = true;
  } else {
    options = { sort: '-createdAt' };
    req.renderingValues.latest = true;
  }

  // First check the type of the topic, then do the correct query
  Topic.findOne({ name: req.params.topic }, function (err, topic) {
    if (err || !topic) { req.renderingValues.tldrs = []; return next(); }

    if (topic.type === 'domain') {
      Tldr.findByDomainId(topic._id, options, function (err, tldrs) {
        req.renderingValues.tldrs = tldrs;
        return next();
      });
    } else {
      Tldr.findByCategoryId([topic._id], options, function (err, tldrs) {
        req.renderingValues.tldrs = tldrs;
        return next();
      });
    }
  });
}

// Display the discover page
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
