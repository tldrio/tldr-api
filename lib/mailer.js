var nodemailer = require("nodemailer");

// create reusable transport method (opens pool of SMTP connections)
var smtpTransport = nodemailer.createTransport("SMTP",{
    host : "smtp.sendgrid.net",
    port : "587",
    auth: {
        user: "charlesmigli",
        pass: "Jd.,V$I#~t}&k.93)jHI"
    }
});


module.exports = smtpTransport;
