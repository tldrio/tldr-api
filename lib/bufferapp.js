/**
 * Handles usage of the buffer API to list the profiles we use
 * and post to them
 */

var config = require('./config')
  , request = require('request')
  , bufferApiRootUrl = "https://api.bufferapp.com/1"
  , cachedProfiles = []   // Calls to Buffer can be long
  ;


/**
 * Get the list of all accounts we use with Buffer, which we want to use in the moderation interface
 * callback signature: null, array of profiles (assumes no error)
 */
function getAllProfiles (callback) {
  request.get({ uri: bufferApiRootUrl + '/profiles.json?access_token=' + config.bufferAccessToken }, function (err, res, body) {
    var profiles;

    // Bufferapp is supposed to send valid JSON, but you never know
    // And we don't want to crash the API because of that kind of shit
    try{
      profiles = JSON.parse(body);
    } catch (e) {
      profiles = [];
    }

    return callback(null, profiles);
  });
}


/**
 * Get a cached copy of our profiles on Buffer
 */
function getCachedProfiles () {
  return cachedProfiles;
}


/**
 * Publish a status update
 * @param {String} text What to send
 * @param {Array} profile_ids Array of the profiles to send from
 * @param {Function} callback Optional. Signature: err, res
 */
function createUpdate (text, profile_ids, cb) {
  var dataToSend = "shorten=true"
    , callback = cb || function () {}
    , i;

  dataToSend += "&text=" + text;
  for (i = 0; i < profile_ids.length; i += 1) {
    dataToSend += "&profile_ids[" + i + "]=" + profile_ids[i];
  }

  request.post({ uri: bufferApiRootUrl + '/updates/create.json?access_token=' + config.bufferAccessToken
               , headers: { "Content-Type": "application/x-www-form-urlencoded"
                          , "charset": "utf-8"
                          }
               , body: dataToSend   // Will URI-encode it
               }, function (err, res, body) {

    return callback(err, res);
  });
}


// Called once at startup to cache our Buffer profiles
getAllProfiles(function (err, profiles) {
  cachedProfiles = profiles;
});

module.exports.getAllProfiles = getAllProfiles;
module.exports.getCachedProfiles = getCachedProfiles;
module.exports.createUpdate = createUpdate;
