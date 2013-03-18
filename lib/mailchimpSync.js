var bunyan = require('./logger').bunyan
  , config = require('./config')
  , mqClient = require('./message-queue')
  , MailChimpAPI = require('mailchimp').MailChimpAPI
  , apiKey = process.env.MAILCHIMP_API_KEY
  , api = new MailChimpAPI(apiKey, { version : '1.3', secure : true })
  , defaultListId = 'e2d0324cba'   // All our users
  ;



/**
 * Add a new User in the User list on Mailchimp
 */
function subscribeNewUser (options) {
  if (config.env !== 'production') { return; }

  var email = options.email
    , username = options.username
    , groups = options.groups || 'Service Updates,Tldrs Newsletter'
    , listId = options.listId || defaultListId
    ;

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


/**
 * Removes a user from a list in Mailchimp
 * @param {String} options.listId Optional, the id of the list to remove the user from. By default, the tldr.io users list
 * @param {String} options.email Email of the user to unsubscribe
 */
function unsubscribeUser (options) {
  if (config.env !== 'production') { return; }

  var listId = options.listId || defaultListId;

  api.listUnsubscribe({ id: listId
                      , email_address: encodeURIComponent(options.email)
                      , delete_member: true
                      , send_goodbye: true
                      , send_notify: false
                      }, function (err, success) {
    if (err) {
      bunyan.error('Couldnt unsubscribe ' + options.email + ' from the Mailchimp list');
    } else {
      bunyan.info(options.email + ' successfully unsubscribed');
    }
  });
}


/**
 * Update a user's data
 * @param {String} options.listId Optional, the id of the list to remove the user from. By default, the tldr.io users list
 * @param {String} options.email Email of the user we want to update
 * @param {String} options.merge_vars A valid merge_vars object
 */
function updateUser (options) {
  if (config.env !== 'production') { return; }

  var listId = options.listId || defaultListId;

  api.listUpdateMember({ id: listId
                       , email_address: encodeURIComponent(options.email)
                       , merge_vars: options.merge_vars
                       }, function (error, data) {
    if (error) {
      bunyan.error('Couldnt update user ' + options.email + ' on MailChimp List ' + listId);
    } else {
      bunyan.info('User ' + options.email +' successfully updated on MailChimp List ' + listId);
    }
  });
}


/**
 * Sync a user profile with MailChimp
 */
function syncSettings (user, data) {
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

  updateUser({ email: user.email
             , merge_vars: merge_vars });
}


/**
 * Add to the group of contributors
 * @param {String} options.listId Optional, the id of the list to remove the user from. By default, the tldr.io users list
 * @param {String} options.email Email of the user we want to update
 * @param {String} options.groupName
 * @param {String} options.userBelongsToGroup
 */
function updateGroupForUser (options) {
  var merge_vars = {};

  merge_vars.GROUPINGS = { 0: { name: options.groupName, groups: options.userBelongsToGroup ? options.groupName : '' } };

  updateUser({ email: options.email
             , merge_vars: merge_vars });
}


/**
 * Handle Mailchimp sync upon events here
 */
mqClient.on('tldr.created', function (data) {
  if (!data.creator || !data.creator.email) { return; }

  updateGroupForUser({ email: data.creator.email
                     , groupName: 'Contributors'
                     , userBelongsToGroup: true
                     });
});


module.exports.subscribeNewUser = subscribeNewUser;
module.exports.unsubscribeUser = unsubscribeUser;
module.exports.syncSettings = syncSettings;
module.exports.updateGroupForUser = updateGroupForUser;
