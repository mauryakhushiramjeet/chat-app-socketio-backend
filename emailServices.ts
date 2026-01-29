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
  subject: String,
  warningMessage: String,
) => {
  try {
    const mailOptions = {
      from: process.env.USER_EMAIL,
      to: toEmail,
      subject: `${subject}`, // Keeping your exact subject
      html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>OTP Verification</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f6f9fc;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f6f9fc; padding: 40px 20px;">
        <tr>
          <td align="center">
            <!-- Main Card -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 480px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px rgba(87, 76, 214, 0.08); overflow: hidden;">
              
              <!-- Top Accent Bar -->
              <tr>
                <td style="height: 6px; background-color: #574CD6;"></td>
              </tr>

              <tr>
                <td style="padding: 40px; text-align: center;">
                  <!-- Icon/Logo Placeholder -->
                  <div style="margin-bottom: 25px;">
                    <div style="display: inline-block; width: 60px; height: 60px; background-color: #f0effc; border-radius: 50%; line-height: 60px;">
                      <span style="font-size: 28px;">🔐</span>
                    </div>
                  </div>

                  <h2 style="color: #1a1f36; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
                    Email Verification
                  </h2>
                  
                  <p style="color: #4f566b; font-size: 16px; line-height: 24px; margin: 0 0 32px 0;">
                    Use the following OTP to verify your email address:
                  </p>

                  <!-- OTP Display -->
                  <div style="background-color: #f8faff; border: 1px solid #e3e8ee; border-radius: 12px; padding: 20px; margin-bottom: 32px;">
                    <div style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; color: #574CD6; letter-spacing: 6px;">
                      ${verificationCode}
                    </div>
                  </div>

                  <!-- Warning Message -->
                  <p style="color: #697386; font-size: 14px; line-height: 20px; margin: 0;">
                    ${warningMessage} <strong> 5 minutes</strong>.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 24px; background-color: #f9fafb; text-align: center; border-top: 1px solid #edf2f7;">
                  <p style="margin: 0; color: #a3acb9; font-size: 12px;">
                    This is an automated security notification.
                  </p>
                </td>
              </tr>
            </table>

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
