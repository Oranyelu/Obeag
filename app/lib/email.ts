import nodemailer from 'nodemailer';

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

export const sendEmail = async (data: EmailPayload) => {
  let transporter;

  if (!process.env.SMTP_USER) {
    // Generate test SMTP service account from ethereal.email
    // Only needed if you don't have a real mail account for testing
    try {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: testAccount.user, // generated ethereal user
                pass: testAccount.pass, // generated ethereal password
            },
        });
        console.log("Using Ethereal Email for testing.");
    } catch (err) {
        console.error("Failed to create Ethereal account", err);
        return;
    }
  } else {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  try {
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM_EMAIL || '"OBEAG Admin" <admin@obeag.com>',
        ...data,
      });

      if (!process.env.SMTP_USER) {
          console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
      }

      return info;
  } catch (error) {
      console.error("Error sending email:", error);
      throw error;
  }
};