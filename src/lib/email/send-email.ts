/**
 * Email Service for O365 SMTP Relay
 * Sends contact form emails to regional office addresses
 */

import nodemailer from 'nodemailer';


function formatTimeTo12Hour(time?: string): string {
  if (!time) return "Not specified";

  const [hourStr, minute] = time.split(":");
  let hour = parseInt(hourStr, 10);

  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;

  return `${hour}:${minute} ${ampm}`;
}

// O365 SMTP Relay Configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.office365.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: false,
  },
});

interface ContactEmailParams {
  toEmail: string;
  profileName: string;
  location: string;
  personId: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone?: string;
  comment: string;
  campaign?: string;
  startDate?: string;   //added three optional fields to ensure json delivery of information 3/11/26 MS
  startTime?: string;
  endTime?: string;
}

/**
 * Send contact request email to office
 */
export async function sendContactEmail(
  params: ContactEmailParams
): Promise<{ success: boolean; error?: string }> {
  const {
    toEmail,
    profileName,
    location,
    personId,
    requesterName,
    requesterEmail,
    requesterPhone,
    comment,
    startDate,    // added to call the correct 12 hour format times in email
    startTime,
    endTime,
    campaign,
  } = params;


  // Check if SMTP is configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.warn('SMTP not configured - email not sent');
    return { success: false, error: 'SMTP not configured' };
  }
   // lines 131-140 added to adjust json formatting of start time and end time in 12 hour format MS 3/11/26
   // ✅ Campaign-aware subject
  const campaignLabel =
    campaign === 'TalentTuesday'
      ? 'Talent Tuesday'
      : 'InterTalent Portal';

  const subject = `${campaignLabel} – Associate Request: ${profileName} - ${location}`;  

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0077B5;">New Associate Request</h2>
      
      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>Associate:</strong> ${profileName}</p>
        <p><strong>Location:</strong> ${location}</p>
        ${
  personId
    ? `
      <p><strong>Employee ID:</strong> ${personId}</p>
      <p>
        <a
          href="https://intersolutions.zenople.com/employee/directory/${personId}/employee/snapshot"
          target="_blank"
          rel="noopener noreferrer"
        >
          View Employee Profile
        </a>
      </p>
    `
    : ''
}
      </div>
      
      <h3 style="color: #333;">Requester Information</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Name:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${requesterName}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Email:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;"><a href="mailto:${requesterEmail}">${requesterEmail}</a></td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Phone:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${requesterPhone || 'Not provided'}</td>
        </tr>
      </table>
      
      <h3 style="color: #333;">Message</h3>
      <div style="background: #f9f9f9; padding: 15px; border-left: 3px solid #0077B5; margin: 15px 0;">
        ${comment.replace(/\n/g, '<br>')}
        
        ${
          startDate || startTime || endTime
            ? `<br><br><strong>Requested Schedule:</strong><br>
              Date: ${startDate || "Not specified"}<br>
              Start: ${formatTimeTo12Hour(startTime)}<br>
              End: ${formatTimeTo12Hour(endTime)}`
            : ""
        }
      </div>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">
        This email was sent from InterTalent Portal.
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: toEmail,
      replyTo: requesterEmail,
      subject,
      html,
    });

    console.log(
      `Email sent to ${toEmail} for associate request: ${profileName}`
    );
    return { success: true };
  } catch (error) {
    console.error('Failed to send email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Verify SMTP connection
 */
export async function verifySmtpConnection(): Promise<boolean> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    return false;
  }

  try {
    await transporter.verify();
    console.log('SMTP connection verified');
    return true;
  } catch (error) {
    console.error('SMTP verification failed:', error);
    return false;
  }
}

// TalentRequestModal Email parameters added 12/11/25 MS 
interface TalentRequestEmailParams {
  toEmail: string;               // Always InterTalent@ for now
  requesterName: string;
  requesterEmail: string;
  requesterPhone?: string;
  notes: string;

  startDate?: string;    // added on 3/11/26 for json delivery of information
  startTime?: string;
  endTime?: string;
}

/**
 * Send "Request Talent" email (No candidates found)
 * Always goes to InterTalent@intersolutions.com
 */
export async function sendTalentRequestEmail(
  params: TalentRequestEmailParams
): Promise<{ success: boolean; error?: string }> {
  const { toEmail, requesterName, requesterEmail, requesterPhone, notes } = params;

  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.warn("SMTP not configured - talent request email not sent");
    return { success: false, error: "SMTP not configured" };
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0077B5;">New Talent Request (No Candidates Found)</h2>

      <p>A user submitted a talent request from the InterTalent Portal.</p>

      <h3 style="color: #333;">Requester Information</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Name:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${requesterName}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Email:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">
            <a href="mailto:${requesterEmail}">${requesterEmail}</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Phone:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${requesterPhone || "Not provided"}</td>
        </tr>
      </table>

      <h3 style="color: #333;">Requested Talent Details</h3>
      <div style="background: #f9f9f9; padding: 15px; border-left: 3px solid #0077B5; margin: 15px 0;">
        ${notes.replace(/\n/g, "<br>")}
      </div>

      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">
        This email was sent from the InterTalent Portal (No candidates found).
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: toEmail, // Always InterTalent inbox
      replyTo: requesterEmail,
      subject: `New Talent Request from ${requesterName}`,
      html,
    });

    console.log(`Talent Request Email sent to ${toEmail}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to send talent request email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
