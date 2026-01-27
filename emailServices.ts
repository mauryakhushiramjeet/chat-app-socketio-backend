import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.USER_EMAIL,
    pass: process.env.GOOGLE_APP_PASSWORD,
  },
});

transporter.verify((error) => {
  if (error) {
    console.log("Email transport error:", error);
  } else {
    console.log("Email is ready to send");
  }
});

// Function to send OTP email
export const sendVerifyEmail = async (
  toEmail: string,
  verificationCode: string,
) => {
  try {
    const mailOptions = {
      from: process.env.USER_EMAIL,
      to: toEmail,
      subject: "Your OTP Code for Email Verification",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>OTP Verification</title>
          </head>
          <body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="padding: 40px 0;">
                  <table width="400" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <tr>
                      <td style="padding: 30px; text-align: center;">
                        <h2 style="color: #333333; margin: 0 0 20px 0;">Email Verification</h2>
                        <p style="color: #555555; font-size: 16px; margin: 0 0 30px 0;">
                          Use the following OTP to verify your email address:
                        </p>
                        <div style="font-size: 28px; font-weight: bold; color: #1a73e8; letter-spacing: 4px; margin-bottom: 30px;">
                          ${verificationCode}
                        </div>
                        <p style="color: #777777; font-size: 14px; margin: 0;">
                          This OTP is valid for <strong>10 minutes</strong>.
                        </p>
                      </td>
                    </tr>
                  </table>
                  <p style="color: #999999; font-size: 12px; margin-top: 20px;">
                    If you did not request this OTP, please ignore this email.
                  </p>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("OTP email sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending OTP email:", error);
    return false;
  }
};
