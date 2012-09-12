var confirmUserEmail = require('../routes/confirmUserEmail')
  , createNewTldr = require('../routes/createNewTldr')
  , createNewUser = require('../routes/createNewUser')
  , deleteTldr = require('../routes/deleteTldr')
  , getCreatedTldrs = require('../routes/getCreatedTldrs')
  , getLatestTldrs = require('../routes/getLatestTldrs')
  , getLoggedUser = require('../routes/getLoggedUser')
  , getTldrById = require('../routes/getTldrById')
  , logout = require('../routes/logout')
  , resendConfirmToken = require('../routes/resendConfirmToken')
  , resetPassword = require('../routes/resetPassword')
  , searchTldrs = require('../routes/searchTldrs')
  , sendResetPasswordEmail = require('../routes/sendResetPasswordEmail')
  , updatePassword = require('../routes/updatePassword')
  , updateTldrWithId = require('../routes/updateTldrWithId')
  , updateProfile = require('../routes/updateProfile');


// Module interface
module.exports.confirmUserEmail = confirmUserEmail;
module.exports.createNewTldr = createNewTldr;
module.exports.createNewUser = createNewUser;
module.exports.deleteTldr = deleteTldr;
module.exports.getCreatedTldrs = getCreatedTldrs;
module.exports.getLatestTldrs = getLatestTldrs;
module.exports.getLoggedUser = getLoggedUser;
module.exports.getTldrById = getTldrById;
module.exports.logout = logout;
module.exports.resendConfirmToken = resendConfirmToken;
module.exports.resetPassword = resetPassword;
module.exports.searchTldrs = searchTldrs;
module.exports.sendResetPasswordEmail = sendResetPasswordEmail;
module.exports.updatePassword = updatePassword;
module.exports.updateTldrWithId = updateTldrWithId;
module.exports.updateProfile = updateProfile;
