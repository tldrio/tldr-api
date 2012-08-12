var confirmUserEmail = require('confirmUserEmail')
  , createNewTldr = require('createNewTldr')
  , createNewUser = require('createNewUser')
  , getCreatedTldrs = require('getCreatedTldrs')
  , getLatestTldrs = require('getLatestTldrs')
  , getLoggedUser = require('getLoggedUser')
  , getTldrById = require('getTldrById')
  , logout = require('logout')
  , resendConfirmToken = require('resendConfirmToken')
  , searchTldrs = require('searchTldrs')
  , updateTldrWithId = require('updateTldrWithId')
  , updateUserInfo = require('updateUserInfo');
  


// Module interface
module.exports.confirmUserEmail = confirmUserEmail;
module.exports.createNewTldr = createNewTldr;
module.exports.createNewUser = createNewUser;
module.exports.getCreatedTldrs = getCreatedTldrs;
module.exports.getLatestTldrs = getLatestTldrs;
module.exports.getLoggedUser = getLoggedUser;
module.exports.logout = logout;
module.exports.resendConfirmToken = resendConfirmToken;
module.exports.searchTldrs = searchTldrs;
module.exports.updateTldrWithId = updateTldrWithId;
module.exports.updateUserInfo = updateUserInfo;
