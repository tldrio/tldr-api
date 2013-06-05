var bufferapp = require('../lib/bufferapp')
  , Tldr = require('../models/tldrModel')
  ;

module.exports = function (req, res, next) {
  Tldr.findOne({ _id: req.params.id }, function (err, tldr) {
    if (err || !tldr) { return; }

    var  stringsLengths = { shortenedUrl: 20
                           , hash: 6
                           , via: 12
                           , titleMax: 70   // Dont display more than the 70 first characters of the title
                           }
        , clippedTitle = tldr.title.length <= stringsLengths.titleMax ?
                         tldr.title :
                         tldr.title.substring(0, stringsLengths.titleMax-3) + '...'
        , tweetText = clippedTitle + ' ' + tldr.originalUrl + ', TLDR';

    if (tldr.creator && tldr.creator.twitterHandle && tldr.creator.twitterHandle.length > 0) {
      tweetText = tweetText + " by @" + tldr.creator.twitterHandle;
    }

    tweetText += ": http://tldr.io/tldrs/" + tldr._id + "/" + tldr.slug;

    bufferapp.createUpdate(tweetText, req.body.profile_ids);
  });


  res.send(200);   // Don't wait before acknowledging request is being treated
};
