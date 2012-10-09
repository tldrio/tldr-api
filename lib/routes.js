module.exports = {
  // API routes
    confirmUserEmail: require('../routes/confirmUserEmail')
  , createNewTldr: require('../routes/createNewTldr')
  , createNewUser: require('../routes/createNewUser')
  , deleteTldr: require('../routes/deleteTldr')
  , getCreatedTldrs: require('../routes/getCreatedTldrs')
  , getLatestTldrs: require('../routes/getLatestTldrs')
  , getLoggedUser: require('../routes/getLoggedUser')
  , getTldrById: require('../routes/getTldrById')
  , getUserById: require('../routes/getUserById')
  , logout: require('../routes/logout')
  , resendConfirmToken: require('../routes/resendConfirmToken')
  , resetPassword: require('../routes/resetPassword')
  , searchTldrs: require('../routes/searchTldrs')
  , sendResetPasswordEmail: require('../routes/sendResetPasswordEmail')
  , updatePassword: require('../routes/updatePassword')
  , updateTldrWithId: require('../routes/updateTldrWithId')
  , updateProfile: require('../routes/updateProfile')

  // Website routes
  , website_index: require('../routes/website/index')
  , website_signup: require('../routes/website/signup')
  };
