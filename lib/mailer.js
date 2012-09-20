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


module.exports.sendEmail = sendEmail;
