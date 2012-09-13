var nodemailer = require('nodemailer')
  , config = require('./config');

// create reusable transport method (opens pool of SMTP connections)
var smtpTransport = nodemailer.createTransport('SMTP',{
    host : 'smtp.sendgrid.net',
    port : '587',
    auth: { user: process.env.SENDGRID_USERNAME
          , pass: process.env.SENDGRID_PWD
          }
});

function sendConfirmToken (user, callback) {

  if (config.env === 'production' || config.env === 'development') {
    var link = config.websiteUrl +
              '/confirm?confirmEmailToken=' +
              encodeURIComponent(user.confirmEmailToken) +
              '&email=' +
              encodeURIComponent(user.email)
      , mailOptions = { from: 'tl;dr <meta@tldr.io>' // sender address
                      , to: user.email // list of receivers
                      , subject: 'tl;dr - Please confirm your email address' // Subject line
                      , html: 'Hi ' + user.username + ', <br>'
                            + 'Your registration process is nearly done. To complete it, we just need you to confirm your email address by clicking on the following link: <br><br>'
                            + '<a href="'+ link +'">Click here to confirm your email address</a><br><br>'
                            + 'If you can\'t click the link, copy paste it in your browser:<br>' + link + '<br>'
                            + 'Cheers,<br>The tl;dr team'
                      };
   //send mail with defined transport object
    smtpTransport.sendMail(mailOptions, callback);
  }
}

// Email sent to user when he creates his first tldr
function sendCongratulationsFirstTldr (tldr, user, callback) {

  if (config.env === 'production') {
    var summary = ''
      , mailOptions
      , content
      , link = config.apiUrl + '/tldrs/search?url=' + encodeURIComponent(tldr.url) ;


    content = 'We are very pleased to see that you took some time to write '
            + 'your first <em>tl;dr</em>.'
            + '<br>'
            + 'It is now available to you and everyone else using the service.'
            + '<br><br>'
            + 'Did you know that you can easily share it with your friends by sending them this '
            + '<a href="'+ link +'">link</a>?'
            + '<br><br>'
            + 'We hope you enjoy the service. We are waiting for your feedback at feedback@tldr.io'
            + '<br><br>'
            + 'Cheers,<br>The tl;dr team';

    mailOptions = { from: 'tl;dr <meta@tldr.io>'
                      , to: user.username +' <' + user.email+ '>'
                      , subject: 'Congratulations for your first tl;dr'
                      , html: content
    };

    smtpTransport.sendMail(mailOptions, callback);
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
function advertiseAdminTldr (tldr, user, type, callback) {

  if (config.env === 'production') {
    var summary = ''
      , mailOptions
      , i
      , content
      , subject;

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
      if (type === 'create') {
        content += 'Created by ' + user.username;
      } else if (type === 'update') {
        content += 'Edited by ' + user.username;
      }
    }

    if (type === 'create') {
      subject = '[MODERATION] A tldr was created';
    } else if (type === 'update') {
      subject = '[MODERATION] A tldr was edited';
    }

    content += '<br/><br/><br/>'
            + 'This summary smells like shit? '
            + '<a href="'+ config.apiUrl +'/tldrs/beatricetonusisfuckinggorgeousnigga/'+ tldr._id +'">Delete the fucking outrageous tl;dr</a>'
            ;


    mailOptions = { from: 'tl;dr <meta@tldr.io>'
                      , to: 'tl;dr <meta@tldr.io>'
                      , subject: subject
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
module.exports.sendConfirmToken = sendConfirmToken;
module.exports.sendResetPasswordEmail = sendResetPasswordEmail;
module.exports.sendUserDoesntExistButYouTriedToResetHisPasswordEmail = sendUserDoesntExistButYouTriedToResetHisPasswordEmail;
module.exports.sendPasswordWasResetEmail = sendPasswordWasResetEmail;
module.exports.sendCongratulationsFirstTldr = sendCongratulationsFirstTldr;
module.exports.advertiseAdminTldr = advertiseAdminTldr;
module.exports.advertiseAdminNewUser = advertiseAdminNewUser;
