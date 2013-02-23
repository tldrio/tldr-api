/**
 * Will take care of parsing an article to get its word count
 * For now we use the readability API but implementation may change
 */

var config = require('./config')
  , mqClient = require('./message-queue')
  , request = require('request')
  , Tldr = require('../models/tldrModel')
  ;

/**
 * Upon reception of a tldr.created message, populate this newly created tldr's articleWordCount
 * The callback cb is optional, signature: err, numAffected, rawMongoResponse
 */
function populateArticleWordCount (tldr, cb) {
  var uri = 'http://readability.com/api/content/v1/parser?url=' + tldr.originalUrl + '&token=' + config.readability.token
    , callback = cb || function () {};

    console.log("==============");
  request.get({ uri: uri }, function (error, response, body) {
    var resJSON, articleWordCount;

    console.log('----------');
    try {
      resJSON = JSON.parse(body);
      articleWordCount = resJSON.word_count;
    } catch (e) {
      articleWordCount = 863;   // Couldn't process it, use default value
    }

    articleWordCount = Math.max(articleWordCount, 275);   // No article can be smaller than this, must be a bug
    console.log(articleWordCount);

    Tldr.update({ _id: tldr._id }, { $set: { articleWordCount: articleWordCount } }, { multi: false }, callback);
  });
}


mqClient.on('tldr.created', function (data) { populateArticleWordCount(data.tldr); });


// Interface (mainly for migrations)
module.exports.populateArticleWordCount = populateArticleWordCount;
