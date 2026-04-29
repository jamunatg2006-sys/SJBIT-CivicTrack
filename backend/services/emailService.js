const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,        // vetrimaran2323yog@gmail.com
    pass: process.env.PASS,         // xwue mito yved vwah
  },
});

// Verify the connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error("Error connecting to email server:", error);
  } else {
    console.log("✅ Email server is ready to send messages");
  }
});

// Base send function
const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"CivicTrack" <${process.env.EMAIL}>`,
      to,
      subject,
      text,
      html,
    });
    console.log("Message sent: %s", info.messageId);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

// Existing functions
async function sendRegistrationEmail(userEmail, name) {
  const subject = "Welcome to Backend Ledger!";
  const text = `Hello ${name},\n\nThank you for registering at Backend Ledger.\n\nBest regards,\nThe Backend Ledger Team`;
  const html = `<p>Hello ${name},</p><p>Thank you for registering at Backend Ledger.</p><p>Best regards,<br>The Backend Ledger Team</p>`;
  await sendEmail(userEmail, subject, text, html);
}

async function sendTransactionEmail(userEmail, name, amount, toAccount) {
  const subject = "Transaction Successful!";
  const text = `Hello ${name},\n\nYour transaction of $${amount} to account ${toAccount} was successful.\n\nBest regards,\nThe Backend Ledger Team`;
  const html = `<p>Hello ${name},</p><p>Your transaction of $${amount} to account ${toAccount} was successful.</p><p>Best regards,<br>The Backend Ledger Team</p>`;
  await sendEmail(userEmail, subject, text, html);
}

async function sendTransactionFailureEmail(userEmail, name, amount, toAccount) {
  const subject = "Transaction Failed";
  const text = `Hello ${name},\n\nYour transaction of $${amount} to account ${toAccount} has failed.\n\nBest regards,\nThe Backend Ledger Team`;
  const html = `<p>Hello ${name},</p><p>Your transaction of $${amount} to account ${toAccount} has failed.</p><p>Best regards,<br>The Backend Ledger Team</p>`;
  await sendEmail(userEmail, subject, text, html);
}

// New CivicTrack complaint notification
async function sendComplaintNotificationEmail(authorityEmail, authorityName, complaint) {
  const subject = `🚨 New Complaint Filed: ${complaint.title}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #4f46e5;">🏛️ CivicTrack — New Complaint Alert</h2>
      <p>Hello <strong>${authorityName}</strong>,</p>
      <p>A new civic complaint has been filed in your ward. Please review and take action.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="background: #f3f4f6;">
          <td style="padding: 10px; font-weight: bold; width: 30%;">Title</td>
          <td style="padding: 10px;">${complaint.title}</td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: bold;">Category</td>
          <td style="padding: 10px;">${complaint.category}</td>
        </tr>
        <tr style="background: #f3f4f6;">
          <td style="padding: 10px; font-weight: bold;">Location</td>
          <td style="padding: 10px;">${complaint.location.address}, Ward ${complaint.location.ward}</td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: bold;">Severity</td>
          <td style="padding: 10px;">${complaint.severity}</td>
        </tr>
        <tr style="background: #f3f4f6;">
          <td style="padding: 10px; font-weight: bold;">Description</td>
          <td style="padding: 10px;">${complaint.description}</td>
        </tr>
      </table>

      <p style="color: #6b7280; font-size: 0.9rem;">Please log in to CivicTrack to assign and resolve this complaint.</p>
      <p style="color: #6b7280;">— CivicTrack Notification System</p>
    </div>
  `;
  const text = `New complaint: ${complaint.title} | Ward ${complaint.location.ward} | Category: ${complaint.category} | Severity: ${complaint.severity}. Please log in to CivicTrack to review.`;
  await sendEmail(authorityEmail, subject, text, html);
}

module.exports = {
  sendRegistrationEmail,
  sendTransactionEmail,
  sendTransactionFailureEmail,
  sendComplaintNotificationEmail,
};