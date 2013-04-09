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

  req.renderingValues.activeTopic = 'all';
  req.renderingValues.currentBaseUrl = '/discover';

  Tldr.findByQuery( { 'language.language': { $in: req.renderingValues.languages }
                    , 'distributionChannels.latestTldrs': true }
                  ,options, function (err, tldrs) {
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
    req.renderingValues.newest = true;
  }

  // First check the type of the topic, then do the correct query
  Topic.findOne({ slug: req.params.topic.toLowerCase() }, function (err, topic) {
    if (err || !topic) { req.renderingValues.tldrs = []; return next(); }

    req.renderingValues.activeTopic = req.params.topic;
    req.renderingValues.currentBaseUrl = '/discover/' + req.params.topic;

    if (topic.type === 'domain') {
      Tldr.findByQuery({ domain: topic._id
                       , 'language.language': { $in: req.renderingValues.languages }
                       , 'distributionChannels.latestTldrs': true }, options, function (err, tldrs) {
      //Tldr.findByDomainId(topic._id, options, function (err, tldrs) {
        req.renderingValues.tldrs = tldrs;
        return next();
      });
    } else {
      //Tldr.findByCategoryId([topic._id], options, function (err, tldrs) {
      Tldr.findByQuery({ categories: { $in: [topic._id] }
                       , 'language.language': { $in: req.renderingValues.languages }
                       , 'distributionChannels.latestTldrs': true }, options,  function (err, tldrs) {
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

  // Ensure cookie is set and tell template which boxes need to be checked
  res.cookie('languages', req.renderingValues.languages, { path: '/', maxAge: 365 * 24 * 3600 });
  req.renderingValues.languagesToDisplay = {};
  req.renderingValues.languages.forEach(function (language) {
    req.renderingValues.languagesToDisplay[language] = true;
  });

  req.renderingValues.tldrs.forEach(function (tldr) {
    tldr.tldrData = tldr.serializeForDataAttribute();
  });

  Topic.getCategories(function (err, categories) {
    values.title = "Discover" + config.titles.branding + config.titles.shortDescription;
    values.discover = true;
    values.description = "Discover summaries of interesting content contributed by the community.";
    values.categories = _.sortBy(categories, function (c) { return c.name; });
    values.categories.unshift({name: 'All the things', slug: 'all'});
    values.categories.forEach(function (c) {
      if (c.slug === values.activeTopic) { c.active = true; }
    });

    partials.content = '{{>website/pages/discover}}';

    res.render('website/responsiveLayout', { values: values
                                           , partials: partials
                                           });
  });
}


// Interface
module.exports.loadTldrs = loadTldrs;
module.exports.loadTldrsByCategory = loadTldrsByCategory;
module.exports.displayPage = displayPage;
