/**
 * Will take care of parsing an article to get its word count
 * For now we use the readability API but implementation may change
 */

var config = require('./config')
  , mqClient = require('./message-queue')
  , request = require('request')
  , Tldr = require('../models/tldrModel')
  , bunyan = require('./logger')
  ;



/**
 * Upon reception of a tldr.created message, populate this newly created tldr's articleWordCount
 * The callback cb is optional, signature: err, numAffected, rawMongoResponse
 */
function populateArticleWordCount (tldr, cb) {
  var uri = 'http://readability.com/api/content/v1/parser?url=' + tldr.originalUrl + '&token=' + config.readability.token
    , callback = cb || function () {};

  if (config.env === 'test') { return; }   // We're not here to test their API

  request.get({ uri: uri }, function (error, response, body) {
    var resJSON, articleWordCount;

    if (error) {
      console.log({ level: 40, message: 'Error with the Readability API', error: error });
      return callback(error);
    }

    try {
      resJSON = JSON.parse(body);
      articleWordCount = resJSON.word_count;
    } catch (e) {
      articleWordCount = 863;   // Couldn't process it, use default value
    }

    articleWordCount = Math.max(articleWordCount, 275);   // No article can be smaller than this, must be a bug

    if (!articleWordCount || isNaN(articleWordCount)) {
      console.log({ level: 40, message: 'Response from the Readability API strange', body: body });
      return callback(error);
    }

    Tldr.update({ _id: tldr._id }, { $set: { articleWordCount: articleWordCount } }, { multi: false }, callback);
  });
}


mqClient.on('tldr.created', function (data) { populateArticleWordCount(data.tldr); });


// Interface (mainly for migrations)
module.exports.populateArticleWordCount = populateArticleWordCount;
