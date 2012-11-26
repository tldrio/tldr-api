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
  if (config.env === 'production') {
    var email = options.email
      , username = options.username
      , groups = options.groups || 'Service Updates,Tldrs Newsletter';

      api.listSubscribe({ id: listId
                        , email_address: encodeURIComponent(email)
                        , merge_vars: { FNAME: username
                                      , GROUPINGS: { 0: {name: 'Interested in', groups: groups } }
                                      }
                        , update_existing: true
                        // We dont replace interests but add them because we dont want the interest in FF extension
                        // for example to erase previous interests and vice versa
                        , replace_interest: false
                        , double_optin: false }, function (error, data) {
        if (error) {
          bunyan.error('Couldnt subscribe user with MailChimp List: ' + error.message);
        } else {
          bunyan.info('New user ' + email +' successfully subscribed with MailChimp List');
        }
      });
  }
}


function syncSettings (user, data) {

  if (config.env === 'production') {
    var groups
      , merge_vars = {} ;

    if (data.email && data.email !== user.email) {
      merge_vars.EMAIL = encodeURIComponent(data.email);
    }

    if (data.username && data.username !== user.username) {
      merge_vars.FNAME = data.username;
    }

    if (data.notificationsSettings) {
      if (data.notificationsSettings.newsletter && data.notificationsSettings.serviceUpdates) {
        groups = 'Tldrs Newsletter,Service Updates';
      } else if (data.notificationsSettings.newsletter) {
        groups = 'Tldrs Newsletter';
      } else if (data.notificationsSettings.serviceUpdates) {
        groups = 'Service Updates';
      }


      merge_vars.GROUPINGS = { 0: { name: 'Interested in', groups: groups } };
    }

    api.listUpdateMember({ id: listId
                         , email_address: encodeURIComponent(user.email)
                         , merge_vars: merge_vars
                         }, function (error, data) {
      if (error) {
        bunyan.error('Couldnt sync user with MailChimp List');
      } else {
        bunyan.info('user ' + user.email +' successfully synced with MailChimp List' );
      }
    });
}
}



module.exports.subscribeNewUser = subscribeNewUser;
module.exports.syncSettings = syncSettings;
