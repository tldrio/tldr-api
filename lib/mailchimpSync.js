var bunyan = require('./logger').bunyan
  , config = require('./config')
  , MailChimpAPI = require('mailchimp').MailChimpAPI
  , apiKey = process.env.MAILCHIMP_API_KEY
  , api = new MailChimpAPI(apiKey, { version : '1.3', secure : true });



/**
 * Add a new User in the User list on Mailchimp
 */
function addNewUser (options) {
  var email = options.email
    , username = options.username;

  if (config.env === 'production') {
    api.listSubscribe({ id: 'e2d0324cba'
                      , email_address: encodeURIComponent(email)
                      , merge_vars: { FNAME: username}
                      , double_optin: false }, function (error, data) {
      if (error) {
        bunyan.error('Couldnt sync user with MailChimp User List: ' + error.message);
      } else {
        bunyan.info('New user ' + email +' successfully synced with MailChimp User list');
      }
    });
  }
}


module.exports.addNewUser = addNewUser;
