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
    var link = config.apiUrl +
              '/confirm?confirmToken=' +
              encodeURIComponent(user.confirmToken) +
              '&email=' +
              encodeURIComponent(user.email)
      , mailOptions = { from: 'tl;dr <meta@tldr.io>' // sender address
                      , to: user.email // list of receivers
                      , subject: 'tldr.io - Please confirm your email address' // Subject line
                      , html: 'Hi ' + user.username + ', <br>'
                            + 'Your registration process is nearly complete. To complete it, we just need you to confirm your email address by clicking on the following link: <br><br>'
                            + '<a href="'+ link +'">Click here to confirm your email address</a><br><br>'
                            + 'Cheers,<br>The tldr team'
                      };
   //send mail with defined transport object
    smtpTransport.sendMail(mailOptions, callback);
  }
}


// Email sent to reset a user's password
function sendResetPasswordEmail (user, callback) {

  if (config.env === 'production' || config.env === 'development') {
    var link = config.websiteUrl +
              'resetPassword?resetPasswordToken=' +
              encodeURIComponent(user.resetPasswordToken) +
              '&email=' +
              encodeURIComponent(user.email)
      , mailOptions = { from: 'tl;dr <meta@tldr.io>' // sender address
                      , to: user.email // list of receivers
                      , subject: 'tldr.io - Reset your password' // Subject line
                      , html: 'Hi ' + user.username + ', <br>'
                            + 'Please click on the following link to reset your password: <br><br>'
                            + '<a href="'+ link +'">Click here to reset your password</a><br><br>'
                            + 'If you didn\'t request a password reset, please disregard this email.<br><br>Cheers,<br>The tldr team'
                      };
    //send mail with defined transport object
    smtpTransport.sendMail(mailOptions, callback);
  }
}


// Email sent to someone for whose email a password reset request was sent
// but user is not registered (may be that he has multiple emails or that a third party
// tried to know whether he was a member of tldr.io)
function sendUserDoesntExistButYouTriedToResetHisPasswordEmail (email, callback) {

  if (config.env === 'production' || config.env === 'development') {
    var mailOptions = { from: 'tl;dr <meta@tldr.io>' // sender address
                      , to: email // list of receivers
                      , subject: 'tldr.io - Attempt to reset your password' // Subject line
                      , html: 'Hi, <br><br>'
                            + 'A password reset request was sent for this email address but it doesn\'t correspond to one of our members. If you are a member, please '
                            + 'try to reset your password with the email address you used during registration. If you\'re not, '
                            + 'please disregard this email.<br><br>Cheers,<br>The tldr team'
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
                      , subject: 'tldr.io - Your password was reset successfully' // Subject line
                      , html: 'Hi ' + user.username + ', <br>'
                            + 'Your password was reset successfully.<br><br>If you didn\'t initiate a password reset procedure, please contact us by answering this email immediately<br><br>'
                            + 'Cheers,<br>The tldr team'
                      };
    //send mail with defined transport object
    smtpTransport.sendMail(mailOptions, callback);
  }
}


// Email sent to admins when a new tldr is created
function advertiseAdmin (tldr, callback) {

  if (config.env === 'production') {
    var mailOptions = { from: 'tl;dr <meta@tldr.io>'
                      , to: 'tl;dr <meta@tldr.io>'
                      , subject: '[MODERATION] An tldr was created or edited' // Subject line
                      , html: 'The new entry is: <br/>'
                            + 'Title: ' + tldr.title +'<br/>'
                            + 'Author: ' + tldr.resourceAuthor +'<br/>'
                            + 'Date: ' + tldr.resourceDate +'<br/>'
                            + 'Summary: ' + tldr.summaryBullets +'<br/>'
                      };
    smtpTransport.sendMail(mailOptions, callback);
  }
}

module.exports.sendConfirmToken = sendConfirmToken;
module.exports.sendResetPasswordEmail = sendResetPasswordEmail;
module.exports.sendUserDoesntExistButYouTriedToResetHisPasswordEmail = sendUserDoesntExistButYouTriedToResetHisPasswordEmail;
module.exports.sendPasswordWasResetEmail = sendPasswordWasResetEmail;
module.exports.advertiseAdmin = advertiseAdmin;
