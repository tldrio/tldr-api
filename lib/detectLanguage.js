/**
 * Detect language of a tldr
 * For now we use the google translate API but implementation may change
 * It's a paid API so don't do anything stupid
 */

var config = require('./config')
  , mqClient = require('./message-queue')
  , request = require('request')
  , Tldr = require('../models/tldrModel')
  , bunyan = require('./logger')
  , _ = require('underscore')
  ;



/**
 * Upon reception of a tldr.created message, populate this newly created tldr's language
 * The callback cb is optional, signature: err, numAffected, rawMongoResponse
 */
function populateLanguage (tldr, cb) {
  var longestBullet= _.max(tldr.summaryBullets, function (bullet) { return bullet.length; })
    , uri = 'https://www.googleapis.com/language/translate/v2/detect?key=' + config.googleTranslateKey + '&q=' + encodeURIComponent(longestBullet)
    , callback = cb || function () {};

  if (config.env === 'test') { return; }   // We're not here to test their API

  request.get({ uri: uri }, function (error, response, body) {
    var resJSON, language;

    if (error) {
      console.log({ level: 40, message: 'Error with the Google Translate API', error: error });
      return callback(error);
    }

    try {
      resJSON = JSON.parse(body);
      language = _.max(resJSON.data.detections[0], function (detection) { return parseFloat(detection.confidence); });
    } catch (e) {
      console.log('Language not found', e);
      callback(e);
    }

    Tldr.update({ _id: tldr._id }, { $set: { language: language } }, { multi: false }, callback);
  });
}


mqClient.on('tldr.created', function (data) { populateLanguage(data.tldr); });


// Interface (mainly for migrations)
module.exports.populateLanguage = populateLanguage;
