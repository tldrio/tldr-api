var nodemailer = require('nodemailer')
  , config = require('./config')
  , bunyan = require('./logger').bunyan
  , i18n = require('./i18n')
  , _ = require('underscore')
  , h4e = require('h4e')
  , request = require('request')
  ;

// create reusable transport method (opens pool of SMTP connections)
var smtpTransport = nodemailer.createTransport('SMTP',{
    host : 'smtp.mandrillapp.com',
    port : '587',
    auth: { user: process.env.MAILER_USERNAME
          , pass: process.env.MAILER_PWD
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
function sendEmail (options, cb) {
  var type = options.type
    , to = options.to || 'admin@tldr.io'
    , from = options.from || 'tldr.io <hello@tldr.io>'
    , values = options.values || {}

    // List of environments in which email is sent. By default we send the email in production and development
    , sendEnvironments = { production: typeof options.production === 'undefined' ? true : options.production
                         , development: typeof options.development === 'undefined' ? true : options.development
                         , staging: typeof options.staging === 'undefined' ? false : options.staging
                         , test: false
                         , testMail: true
    }
    , environmentPrefixes = { production: ''
                            , staging: '[STAGING]'
                            , development: '[DEVELOPMENT]'
                            , testMail: '[TEST]'
                            }
    , callback = cb || function() {}
    , mailOptions;

  // Extend values with cache and config
  _.extend(values, { cache: true }, config);

  if (sendEnvironments[config.env]) {
    mailOptions = { from: from
                  , to: to
                  , subject: h4e.render(environmentPrefixes[config.env] + i18n[type], { values: values })
                  , html: h4e.render('emails/' + type, { values: values })
                  };


    // Send mail with defined transport object. Log only if there is an error
    smtpTransport.sendMail(mailOptions, function(error, response) {
      if(error) {
        bunyan.warn('Error sending email with type ' + type, error);
      }
      callback();
    });
  }
}

function sendReadReport (options, cb) {
  var type = options.type
    , to = options.to || 'admin@tldr.io'
    , from = options.from || 'tldr.io <hello@tldr.io>'
    , values = options.values || {}

    // List of environments in which email is sent. By default we send the email in production and development
    , sendEnvironments = { production: typeof options.production === 'undefined' ? true : options.production
                         , development: typeof options.development === 'undefined' ? true : options.development
                         , staging: typeof options.staging === 'undefined' ? false : options.staging
                         , test: false
                         , testMail: true
    }
    , environmentPrefixes = { production: ''
                            , staging: '[STAGING]'
                            , development: '[DEVELOPMENT]'
                            , testMail: '[TEST]'
                            }
    , callback = cb || function() {}
    , mailOptions
    , data = {}
    , images;

  // Extend values with cache and config
  _.extend(values, { cache: true }, config);

  if (sendEnvironments[config.env]) {
    mailOptions = { from: from
                  , to: to
                  , subject: h4e.render(environmentPrefixes[config.env] + i18n[type], { values: values })
                  , html: h4e.render('emails/' + type, { values: values })
                  };

    data.key = '98306d8b-b67d-4cac-b92b-61ddac98af77';
    data.template_name = 'readreport';
    data.template_content = [ { name: 'thank' , content: 200 }
                            , { name: 'read' , content: 20 }
                            , { name: 'coffee' , content: 20020 }
                            , { name: 'timesaved' , content: 111 }
                            , { name: 'tldrcount' , content: 11 }
                            , { name: 'initialwords' , content: 3333 }
                            , { name: 'compressedwords' , content: 33 }

    ];
    images = [ { type: 'image/png' , name: 'testimage' , content:'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' } ];
    data.message = { html: h4e.render('emails/' + type, { values: values })
                   , subject: 'Readreport'
                   , from_email: 'charles@tldr.io'
                   , from_name: 'Charly Migli'
                   , to: [ { email: 'hello+test@tldr.io', name: "Hello toto" }]
                   , images: images

    };
    request.post({ uri: 'https://mandrillapp.com/api/1.0/messages/send-template.json'
                 , json: data
    }, function (err, response, body) {

      console.log('ERR', err, 'body', body);
      callback();
    });

  }
}

module.exports.sendEmail = sendEmail;
module.exports.sendReadReport = sendReadReport;

