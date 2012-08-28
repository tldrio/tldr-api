/**
 * Hash containing css names, ids...
 */


var config = {
  //Account View
    accountChangeProfile: 'account-change-profile'
  , accountChangePassword: 'account-change-password'
  , accountFormUsername: 'account-form-username'
  , accountFormEmail: 'account-form-email'
  , accountFormOldPwd: 'account-form-old-pwd'
  , accountFormNewPwd: 'account-form-new-pwd'
  , accountFormConfirmPwd: 'account-form-confirm-pwd'
  , accountResendToken: 'account-resend-token'
  , accountValidationStatus: 'account-validation-status'
  , accountSubmitNewProfile: 'account-submit-new-profile'
  , accountSubmitNewPassword: 'account-submit-new-password'

  // Congrats View
  , congratsContainer: 'congrats-container'
  , congratsMessageLogged: 'congrats-message-logged'
  , congratsMessageNotLogged: 'congrats-message-not-logged'

  // Container View
  , containerTldr: 'tldr-container'
  , containerMain: 'tldr-main'

  // CreatedTldrs
  , createdTldrsContainer: 'created-tldrs-container'
  , createdTldrsCollection: 'created-tldrs-collection'


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

  // Install BM View
  , installBmCommentAction: 'install-bm-comment-action'
  , installBmContainer: 'install-bm-container'
  , installBmLink: 'install-bm'

  // LoginForm View
  , loginForm: 'login-form'
  , loginFormCancel: 'login-form-cancel'
  , loginFormEmail: 'login-form-email'
  , loginFormError: 'login-form-error'
  , loginFormLogin: 'login-form-login'
  , loginFormPassword: 'login-form-password'
  , loginFormSignup: 'login-form-signup'

  // Login Status
  , loginStatusEmail: 'login-status-email'
  , loginStatusId: 'login-status'
  , loginStatusLogout: 'login-status-logout'
  , loginStatusPassword: 'login-status-password'
  , loginStatusSubmit: 'login-status-submit'

  // Manage Account
  , manageAccountContainer: 'manage-account-container'
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

  // OnboardingView
  , onboardingNumbering: 'onboarding-numbering'
  , onboardingShowNext: 'onboarding-show-next'
  , onboardingShowPrev: 'onboarding-show-prev'

  // Page View
  , pageContainer: 'page-container'

  // Sharing View
  , sharingContainer: 'sharing-container'
  , sharingFacebook: 'sharing-facebook'
  , sharingLink: 'sharing-link'
  , sharingTwitter: 'sharing-twitter'

  // Slideshow
  , slideshowContainer: 'slideshow-container'

  // Website Signup View
  , signupForm: 'signup-form'
  , signupFormContainer: 'signup-form-container'
  , signupFormEmail: 'signup-form-email'
  , signupFormPassword: 'signup-form-password'
  , signupFormSubmit: 'signup-form-submit'
  , signupFormUsername: 'signup-form-username'
  , signupSuccessMailProvider: 'signup-success-mail-provider'
  , signupSuccess: 'signup-success'

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

  // Website
  , callToAction: 'call-to-action'
  , graphicHelper: 'graphic-helper'
  , launchBookmarklet: 'launch-bm'
};

if ( typeof define === "function" && define.amd ) {
  define(config);
} else {
  module.exports = config;
}
