var nodemailer = require('nodemailer')
  , config = require('./config')
  , hogan = require('consolidate').hogan
  , bunyan = require('./logger').bunyan
  , i18n = require('./i18n');

// create reusable transport method (opens pool of SMTP connections)
var smtpTransport = nodemailer.createTransport('SMTP',{
    host : 'smtp.sendgrid.net',
    port : '587',
    auth: { user: process.env.SENDGRID_USERNAME
          , pass: process.env.SENDGRID_PWD
          }
});

/**
 * Sends an email according to the given options:
 * @param {String} type [Required] The type of email, pointing to the mustache body and the title in lib/i18n
 * @param {String} to Recipient. Default: meta@tldr.io
 * @param {String} from Sender. Default: meta@tldr.io
 * @param {Object} values Values to be used to render the body
 * @param {Boolean} production Indicate whether email should be sent in production environment. Default: true
 * @param {Boolean} development Indicate whether email should be sent in development environment. Default: true
 * @param {Boolean} staging Indicate whether email should be sent in staging environment. Default: false
 *
 */
function sendEmail (options) {
  var type = options.type
    , to = options.to || 'meta@tldr.io'
    , from = options.from || 'tl;dr <meta@tldr.io>'
    , values = options.values || {}

    // List of environments in which email is sent. By default we send the email in production and development
    , sendEnvironments = { production: typeof options.production === 'undefined' ? true : options.production
                         , development: typeof options.development === 'undefined' ? true : options.development
                         , staging: typeof options.staging === 'undefined' ? false : options.staging
                         };

  // Cache the body template
  values.cache = true;

  if (sendEnvironments[config.env]) {
    hogan('./templates/emails/' + type + '.mustache', values, function(err, result) {
      var mailOptions = { from: from
                        , to: to
                        , subject: i18n[type]
                        , html: result
                        };

      // Send mail with defined transport object. Log only if there is an error
      smtpTransport.sendMail(mailOptions, function(error, response) {
        if(error) {
          bunyan.warn('Error sending email with type ' + type, error);
        }
      });
    });
  }
}


// Email sent to reset a user's password
function sendResetPasswordEmail (user, callback) {

  if (config.env === 'production' || config.env === 'development') {
    var link = config.websiteUrl +
              '/resetPassword?resetPasswordToken=' +
              encodeURIComponent(user.resetPasswordToken) +
              '&email=' +
              encodeURIComponent(user.email)
      , mailOptions = { from: 'tl;dr <meta@tldr.io>' // sender address
                      , to: user.email // list of receivers
                      , subject: 'tl;dr - Reset your password' // Subject line
                      , html: 'Hi ' + user.username + ', <br>'
                            + 'Please click on the following link to reset your password: <br><br>'
                            + '<a href="'+ link +'">Click here to reset your password</a><br><br>'
                            + 'If you can\'t click the link, copy paste it in your browser:<br>' + link + '<br>'
                            + 'If you didn\'t request a password reset, please disregard this email.<br><br>Cheers,<br>The tl;dr team'
                      };
    //send mail with defined transport object
    smtpTransport.sendMail(mailOptions, callback);
  }
}


// Email sent to someone for whose email a password reset request was sent
// but user is not registered (may be that he has multiple emails or that a third party
// tried to know whether he was a member of tl;dr)
function sendUserDoesntExistButYouTriedToResetHisPasswordEmail (email, callback) {

  if (config.env === 'production' || config.env === 'development') {
    var mailOptions = { from: 'tl;dr <meta@tldr.io>' // sender address
                      , to: email // list of receivers
                      , subject: 'tl;dr - Attempt to reset your password' // Subject line
                      , html: 'Hi, <br><br>'
                            + 'A password reset request was sent for this email address but it doesn\'t correspond to one of our members. If you are a member, please '
                            + 'try to reset your password with the email address you used during registration. If you\'re not, '
                            + 'please disregard this email.<br><br>Cheers,<br>The tl;dr team'
                      };
    //send mail with defined transport object
    smtpTransport.sendMail(mailOptions, callback);
  }
}


// Email sent to reset a user's password
function sendPasswordWasResetEmail (user, callback) {

  if (config.env === 'production' || config.env === 'development') {
     var mailOptions = { from: 'tl;dr <meta@tldr.io>' // sender address
                      , to: user.email // list of receivers
                      , subject: 'tl;dr - Your password was reset successfully' // Subject line
                      , html: 'Hi ' + user.username + ', <br>'
                            + 'Your password was reset successfully.<br><br>If you didn\'t initiate a password reset procedure, please contact us by responding to this email immediately<br><br>'
                            + 'Cheers,<br>The tl;dr team'
                      };
    //send mail with defined transport object
    smtpTransport.sendMail(mailOptions, callback);
  }
}


// Email sent to admins when a new tldr is created
function advertiseAdminTldr (tldr, user, callback) {
  // encode user input before inserting it the email
  var tldr = tldr.htmlEncode();

  if (config.env === 'production') {
    var summary = ''
      , mailOptions
      , i
      , content;

    for (i = 0; i < tldr.summaryBullets.length; i += 1) {
      summary += '- ' + tldr.summaryBullets[i] + '<br>';
    }

    content = 'The new entry is: <br><br>'
            + 'Title: <a href="'+tldr.url+'"> ' + tldr.title +'</a> <br>'
            + 'Author: ' + tldr.resourceAuthor +'<br>'
            + 'Date: ' + tldr.resourceDate +'<br>'
            + 'Summary: <br>'
            + summary;

    if (user) {
      content += 'Created/ Edited by ' + user.username;
    }
    content += '<br/><br/><br/>'
            + 'This summary smells like shit? '
            + '<a href="'+ config.apiUrl +'/tldrs/beatricetonusisfuckinggorgeousnigga/'+ tldr._id +'">Delete the fucking outrageous tl;dr</a>'
            ;


    mailOptions = { from: 'tl;dr <meta@tldr.io>'
                      , to: 'tl;dr <meta@tldr.io>'
                      , subject: '[MODERATION] A tldr was created or edited' // Subject line
                      , html: content
    };

    smtpTransport.sendMail(mailOptions, callback);
  }
}

// Email sent to admins when a new user is created
function advertiseAdminNewUser (user, callback) {

  if (config.env === 'production') {
    var summary = ''
      , mailOptions
      , content;


    content = 'New user is: <br><br>'
            + 'Username: '+ user.username +' <br>'
            + 'Email: ' + user.email +'<br>';


    mailOptions = { from: 'tl;dr <meta@tldr.io>'
                      , to: 'tl;dr <meta@tldr.io>'
                      , subject: '[CONGRATULATION] We have a new user' // Subject line
                      , html: content
    };

    smtpTransport.sendMail(mailOptions, callback);
  }
}
module.exports.sendEmail = sendEmail;
module.exports.sendResetPasswordEmail = sendResetPasswordEmail;
module.exports.sendUserDoesntExistButYouTriedToResetHisPasswordEmail = sendUserDoesntExistButYouTriedToResetHisPasswordEmail;
module.exports.sendPasswordWasResetEmail = sendPasswordWasResetEmail;
module.exports.advertiseAdminTldr = advertiseAdminTldr;
module.exports.advertiseAdminNewUser = advertiseAdminNewUser;
