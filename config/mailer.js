const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',  
    auth: {
        user: 'mehulpathak48@gmail.com',  
        pass: 'gwvu hnqj ewsj zvsf',   
    }
});

const sendVerificationEmail = (email, verificationLink) => {
    const mailOptions = {
        from: 'mehulpathak48@gmail.com',     
        to: email,                        
        subject: 'Verify Your Email',     
        html: `<p>Click the link below to verify your email:</p><p><a href="${verificationLink}"><button style="font-size:10px; padding:10px 20px; background-color: #30d71d; color: white; border:none; border-radius: 5px; cursor: pointer;">Please verify yourself</button></a></p>`,  // email content
    };

    return transporter.sendMail(mailOptions);
};

module.exports = { sendVerificationEmail };
