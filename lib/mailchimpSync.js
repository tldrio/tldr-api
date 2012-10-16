var bunyan = require('./logger').bunyan
  , config = require('./config')
  , MailChimpAPI = require('mailchimp').MailChimpAPI
  , apiKey = process.env.MAILCHIMP_API_KEY
  , api = new MailChimpAPI(apiKey, { version : '1.3', secure : true })
  , listId = 'e2d0324cba';



/**
 * Add a new User in the User list on Mailchimp
 */
function subscribeNewUser (options) {
  var email = options.email
    , username = options.username;

  //if (config.env === 'production') {
    api.listSubscribe({ id: listId
                      , email_address: encodeURIComponent(email)
                      , merge_vars: { FNAME: username
                                    , GROUPINGS: { 0: {name: 'Interested in', groups: 'Service Updates,Tldrs Newsletter' } }
                                    }
                      , double_optin: false }, function (error, data) {
      if (error) {
        bunyan.error('Couldnt sync user with MailChimp List: ' + listId + ' ' + error.message);
      } else {
        bunyan.info('New user ' + email +' successfully synced with MailChimp List ' + listId);
      }
    });
  //}
}



module.exports.subscribeNewUser = subscribeNewUser;
