var config = require('../../lib/config')
  , models = require('../../lib/models')
  , Topic = models.Topic
  , Tldr = models.Tldr
  , _ = require('underscore')
  , mqClient = require('../../lib/message-queue')
  , customUtils = require('../../lib/customUtils')
  , ExecTime = require('exec-time')
  ;



// Get 100 tldrs according to our sort
function loadTldrs (req, res, next) {
  var options = { limit: 100 };

  req.profiler = new ExecTime("DISCOVER - " + Math.random().toString().substring(2, 7) + " -");
  req.profiler.beginProfiling();

  if (req.params.sort === 'mostread') {
    options.sort = '-readCount';
    req.renderingValues.mostread = true;
  } else {
    options.sort = '-createdAt';
    req.renderingValues.newest = true;
  }

  req.renderingValues.activeTopic = 'all';
  req.renderingValues.currentBaseUrl = '/discover';

  req.profiler.step('Ready to query');

  Tldr.findByQuery( { 'language.language': { $in: req.renderingValues.languages }
                    , 'distributionChannels.latestTldrs': true }
                  ,options, function (err, tldrs) {

    req.profiler.step('Query done');

    req.renderingValues.tldrs = tldrs;
    return next();
   });
}

// Get 100 tldrs from the given topic
function loadTldrsByCategory (req, res, next) {
  var options = { limit: 100 };

  if (req.params.sort === 'mostread') {
    options.sort = '-readCount';
    req.renderingValues.mostread = true;
  } else {
    options.sort = '-createdAt';
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


function searchTldrs(req, res, next) {
  // filter added to cast the model
  var options = { limit: 100 };
  

  if (req.params.sort === 'mostread') {
    options.sort = '-readCount';
    req.renderingValues.mostread = true;
  } else {
    options.sort = '-createdAt';
    req.renderingValues.newest = true;
  }
  options.language = req.renderingValues.languagesToDisplay
  searchTerm = req.body.search
   
  req.renderingValues.activeTopic = 'all';
  req.renderingValues.currentBaseUrl = '/discover';
    
  // Search for all the objects in the query
  Tldr.textSearch(searchTerm , options,  function (err, tldrs_temp) {
      tldrs = []
      tldrs_temp.results.forEach(function (result) {
	  tldrs.push(result.obj) 
      });

      req.renderingValues.tldrs = tldrs;
      return next();
   });
    
}



// Display the discover page
function displayPage (req, res, next) {
  var partials = req.renderingPartials || {}
    , values = req.renderingValues || {}
    , topic = req.params.topic
    , limit = 10
    ;

  if (req.profiler) { req.profiler.step("Beginning displayPage"); }

  // Ensure cookie is set and tell template which boxes need to be checked
  req.renderingValues.languagesToDisplay = {};
  req.renderingValues.languages.forEach(function (language) {
    req.renderingValues.languagesToDisplay[language] = true;
  });

  req.renderingValues.tldrs.forEach(function (tldr) {
    tldr.tldrData = tldr.serializeForDataAttribute();
  });

  if (values.tldrs.length >= limit) {
    values.loadMoreButton = true;
  }

  // Non default RSS feed
  if (topic) {
    values.rssFeed = { url: config.websiteUrl + "/discover/" + topic + "/feed.xml?languages=" + values.languages.join(",")
                     , topic: topic
                     };
  }
  if (req.profiler) { req.profiler.step('Ready to get categories'); }

  Topic.getCategories(function (err, categories) {
  if (req.profiler) { req.profiler.step('Categories gotten'); }
    values.title = "Discover" + config.titles.branding + config.titles.shortDescription;
    values.discover = true;
    values.description = "Discover summaries of interesting content contributed by the community.";
    values.categories = _.sortBy(categories, function (c) { return c.name; });
    values.categories.unshift({name: 'All the things', slug: 'all'});
    values.categories.forEach(function (c) {
      if (c.slug === values.activeTopic) { c.active = true; }
    });

    partials.content = '{{>website/pages/discover}}';

  if (req.profiler) { req.profiler.step('Begin rendering'); }
    res.render('website/responsiveLayout', { values: values
                                           , partials: partials
                                           });
  if (req.profiler) { req.profiler.step('Rendering done'); }
  });
}


function serveCategoryRSSFeed (req, res, next) {
  var partials = req.renderingPartials || {}
    , values = req.renderingValues || {}
    , category = req.params.topic
    ;

  values.title = "Latest summaries in " + category;
  values.link = "http://tldr.io/discover/" + category;
  values.description = "Latest summaries in " + category + " - tldr.io - interesting content summarized by people";

  mqClient.emit('rssfeed.get', { feedUrl: '/discover/' + category + '/feed.xml' });

  res.render('rss/feed', { values: values, partials: partials }, function(err, xml) {
    res.type('xml');
    res.send(200, xml);
  });
}





// Interface
module.exports.loadTldrs = loadTldrs;
module.exports.loadTldrsByCategory = loadTldrsByCategory;
module.exports.displayPage = displayPage;
module.exports.serveCategoryRSSFeed = serveCategoryRSSFeed;
module.exports.searchTldrs = searchTldrs;
