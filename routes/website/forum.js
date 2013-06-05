var models = require('../../lib/models')
  , Thread = models.Thread
  , customUtils = require('../../lib/customUtils')
  , _ = require('underscore')
  , config = require('../../lib/config')
  ;

function showArchivedThread (req, res, next) {
  Thread.find({ archived: true })
       .sort('-lastPost.at')
       .populate('lastPost.by', 'deleted username')
       .exec(function(err, threads) {
    if (err) { return res.send(500, { message: "An internal error occured" }); }

    req.renderingValues = req.renderingValues || {};
    req.renderingValues.threads = threads;
    req.renderingValues.archive = true;

    return displayForum(req, res, next);
  });
}

function showCurrentThreads (req, res, next) {
  Thread.find({ archived: false })
       .sort('-lastPost.at')
       .populate('lastPost.by', 'deleted username')
       .exec(function(err, threads) {
    if (err) { return res.send(500, { message: "An internal error occured" }); }

    req.renderingValues = req.renderingValues || {};
    req.renderingValues.threads = threads;

    return displayForum(req, res, next);
  });
}


function displayForum (req, res, next) {
  var values = req.renderingValues || {}
    , partials = req.renderingPartials || {};

  values.forum = true;
  values.title = "Forum" + config.titles.branding;
  values.description = "Discuss everything related to tldr.io: feature suggestions, the best tl;drs, your favorite contributors etc.";
  partials.content = '{{>website/pages/forum}}';

  _.each(values.threads, function (thread) {
     thread.lastPostTimeago = customUtils.timeago(thread.lastPost.at);
     thread.moreThanOnePost = (thread.posts.length > 1);
     thread.moreThanOneVote = (thread.votes > 1) || (thread.votes === 0) || (thread.votes < -1);

     if (req.user) {   // Won't display the buttons if nobody's logged in
       thread.userHasntVoted = thread.alreadyVoted.indexOf(req.user._id) === -1;
     }
   });

  res.render('website/basicLayout', { values: values
                                    , partials: partials
                                    });
}


module.exports.showCurrentThreads = showCurrentThreads;
module.exports.showArchivedThread = showArchivedThread;
