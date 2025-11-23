/**
 * API Route: Contact Form Submission
 * Handles "Request Associate" form submissions
 * Sends email to office location via Resend
 * POST /api/contact
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      profileId,
      profileName,
      location,
      officeEmail,
      name,
      email,
      phone,
      comment,
    } = body;

    // Validate required fields
    if (!name || !email || !comment || !profileName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // For now, just log the contact request
    // In production, integrate with email service (Resend, SendGrid, etc.)
    console.log('Contact Request Received:', {
      profileId,
      profileName,
      location,
      officeEmail,
      requester: { name, email, phone },
      comment,
    });

    // TODO: Integrate with email service
    // Example with Resend:
    /*
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'noreply@intersolutions.com',
      to: officeEmail,
      replyTo: email,
      subject: `Request for Associate: ${profileName}`,
      html: `
        <h2>New Associate Request</h2>
        <p><strong>Associate:</strong> ${profileName}</p>
        <p><strong>Location:</strong> ${location}</p>
        <hr />
        <h3>Requester Information</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
        <hr />
        <h3>Message</h3>
        <p>${comment}</p>
      `,
    });
    */

    // Simulate successful send
    return NextResponse.json({
      success: true,
      message: 'Contact request received successfully',
    });
  } catch (error) {
    console.error('Error processing contact request:', error);
    return NextResponse.json(
      { error: 'Failed to process contact request' },
      { status: 500 }
    );
  }
}
