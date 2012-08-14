/**
 * Hash containing css names, ids...
 */


var config = {

  // Congrats View
    congratsContainer: 'congrats-container'
  , congratsMessageLogged: 'congrats-message-logged'
  , congratsMessageNotLogged: 'congrats-message-not-logged'

  // Container View
  , containerTldr: 'tldr-container'
  , containerMain: 'tldr-main'

  // Edit View
  , editBullet: 'edit-bullet'
  , editBulletContainer: 'edit-bullet-container'
  , editControls: 'edit-controls'
  , editControlCancel: 'edit-control-cancel'
  , editControlLogin: 'edit-control-login'
  , editControlPreSaveInfo: 'edit-control-pre-save-info'
  , editControlSave: 'edit-control-save'
  , editDeleteBullet: 'edit-delete-bullet'
  , editMetadata: 'edit-metadata'

  //Error View
  , errorContainer: 'error-container'

  // LoginForm View
  , loginForm: 'login-form'
  , loginFormCancel: 'login-form-cancel'
  , loginFormEmail: 'login-form-email'
  , loginFormError: 'login-form-error'
  , loginFormLogin: 'login-form-login'
  , loginFormPassword: 'login-form-password'
  , loginFormSignup: 'login-form-signup'

  // Login Status
  , loginStatusId: 'login-status'

  // NavView
  , navCloseContainer: 'nav-close'
  , navContainer: 'nav-container'
  , navEditTldr: 'nav-edit'
  , navLogin: 'nav-login'
  , navLogout: 'nav-logout'
  , navProfile: 'nav-profile'

  // No TLdrYet View
  , noTldrYet: 'tldr-noTldrYet'
  , noTldrYetStartSummarizing: 'tldr-start-summarizing-now'

  , pageContainer: 'page-container'
  // Sharing View
  , sharingContainer: 'sharing-container'
  , sharingFacebook: 'sharing-facebook'
  , sharingLink: 'sharing-link'
  , sharingTwitter: 'sharing-twitter'

  // Website Signup View
  , signupFormSubmit: 'signup-form-submit'
  , signupFormEmail: 'signup-form-email'
  , signupFormPassword: 'signup-form-password'
  , signupFormUsername: 'signup-form-username'

  // Edit and Read View
  , tldrBullet: 'tldr-bullet'
  , tldrBulletContainer: 'tldr-bullet-container'
  , tldrContainer: 'tldr-read-container'
  , tldrErrorMessage: 'tldr-error-msg'
  , tldrMetadata: 'tldr-metadata'
  , tldrResourceMetadata: 'tldr-resource-metadata'
  , tldrResourceAuthor: 'tldr-resource-author'
  , tldrResourceData: 'tldr-resource-data'
  , tldrResourceDate: 'tldr-resource-date'
  , tldrSummary: 'tldr-summary'
  , tldrTitle: 'tldr-title'
  , tldrValidationError: 'tldr-validation-error'
};

if ( typeof define === "function" && define.amd ) {
  define(config);
} else {
  module.exports = config;
}
