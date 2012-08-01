var nodemailer = require('nodemailer');

// create reusable transport method (opens pool of SMTP connections)
var smtpTransport = nodemailer.createTransport('SMTP',{
    host : 'smtp.sendgrid.net',
    port : '587',
    auth: { user: process.env.SENDGRID_USERNAME
          , pass: process.env.SENDGRID_PWD
          }
});


function sendConfirmToken (user, serverUrl, callback) {

  var link = serverUrl + '/confirm?confirmToken=' + encodeURIComponent(user.confirmToken)
                    + '&email=' + encodeURIComponent(user.email)
    , mailOptions = { from: 'tl;dr <meta@tldr.io>' // sender address
                    , to: user.email // list of receivers
                    , subject: 'Confirm your email address' // Subject line
                    , html: 'Hi ' + user.username + ', <br/>' // plaintext body
                          + 'Your registration process for tldr.io is nearly done. To complete it, we just need you confirm your email address ' 
                          + 'by clicking on this <a href="'+ link +'">link</a>. <br/>'
                          + 'See you on <a href="http://tldr.io"> tldr.io</a>'
                    };
 //send mail with defined transport object
  smtpTransport.sendMail(mailOptions, callback);
}


module.exports.sendConfirmToken = sendConfirmToken;
