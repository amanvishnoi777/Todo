const email = "todomanageyourtasks@gmail.com";
function sendMail(randomString, send_email){
    const nodemailer = require('nodemailer');
      let transporter = nodemailer.createTransport({
             service: 'gmail',
             auth: {
                 user: email,
                 pass: "TODO@2345"
             }
     })

message = {
    from: email,
    to: send_email,
    subject: "Verification Code",
    text: "Hello Your Email Verification Code is : " + randomString
}
transporter.sendMail(message, function(err, info) {
    if (err) {
        console.log(err)
    } else {
        console.log(info);
    }
})
}
module.exports.sendMail = sendMail;

