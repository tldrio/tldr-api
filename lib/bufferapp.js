/**
 * Handles usage of the buffer API to list the profiles we use
 * and post to them
 */

var config = require('./config')
  , request = require('request')
  , bufferApiRootUrl = "https://api.bufferapp.com/1"
  , cachedProfiles = []   // Calls to Buffer can be long
  , customUtils = require('./customUtils')
  ;


/**
 * Get the list of all accounts we use with Buffer, which we want to use in the moderation interface
 * callback signature: null, array of profiles (assumes no error)
 */
function getAllProfiles (callback) {
  request.get({ uri: bufferApiRootUrl + '/profiles.json?access_token=' + config.bufferAccessToken }, function (err, res, body) {
    var profiles;

    // Bufferapp is supposed to send valid JSON, but you never know
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
  var dataToSend = "shorten=false"
    , callback = cb || function () {}
    , i
    , callId = customUtils.uid(8)
    ;

  console.log(JSON.stringify({ type: "Call bufferapp", callId: callId, profile_ids: profile_ids }));

  // Don't try to do anything if no sharing through buffer has been asked
  if (!profile_ids || profile_ids.length === 0) {
    return callback();
  }

  dataToSend += "&text=" + encodeURIComponent(text);
  for (i = 0; i < profile_ids.length; i += 1) {
    dataToSend += "&profile_ids[" + i + "]=" + profile_ids[i];
  }

  request.post({ uri: bufferApiRootUrl + '/updates/create.json?access_token=' + config.bufferAccessToken
               , headers: { "Content-Type": "application/x-www-form-urlencoded"
                          , "charset": "utf-8"
                          }
               , body: dataToSend
               }, function (err, res, body) {

    console.log(JSON.stringify({ type: "Call bufferapp", callId: callId, err: err }));
    console.log(JSON.stringify({ type: "Call bufferapp", callId: callId, body: body }));

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
