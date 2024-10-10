
// endpoint of forgot password
const crypto = require('crypto');

app.post('/forgot-password', async (req, res) => {
  const { emailOrContact } = req.body;

  try {
    const isEmail = emailOrContact.includes('@');
    const user = isEmail 
      ? await User.findOne({ email: emailOrContact })
      : await User.findOne({ contact: emailOrContact });

    if (!user) {
      return res.status(400).send('User not found');
    }

    // Generate a reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpire = Date.now() + 3600000; // 1 hour

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = resetTokenExpire;
    await user.save();

    // Send email with the reset link
    const resetUrl = `http://192.168.56.1:3000/reset-password/${resetToken}`;

    // Assuming you have a sendEmail function
    await sendEmail({
      to: user.email, // or user.contact if sending SMS
      subject: 'Password Reset',
      text: `Please click on the following link to reset your password: ${resetUrl}`
    });

    res.status(200).send('Password reset link has been sent');
  } catch (error) {
    res.status(500).send('Error sending password reset link');
  }
});

// send email funtion
const nodemailer = require('nodemailer');

async function sendEmail({ to, subject, text }) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'your-email@gmail.com',
      pass: 'your-email-password',
    },
  });

  const mailOptions = {
    from: 'your-email@gmail.com',
    to,
    subject,
    text,
  };

  return transporter.sendMail(mailOptions);
}

// password reset endpoint
app.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).send('Invalid or expired token');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).send('Password has been reset');
  } catch (error) {
    res.status(500).send('Error resetting password');
  }
});

