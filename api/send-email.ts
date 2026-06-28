// api/send-email.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

interface EmailRequest {
  type: 'submission' | 'approval' | 'rejection';
  tripId: string;
  approverRole?: 'admin' | 'superadmin';
  approverUserId?: string;
  remarks?: string;
}

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDestination(countries: string[], cities: any[]): string {
  const cityNames = Array.isArray(cities)
    ? cities.map((c: any) => (typeof c === 'string' ? c : c.name)).join(', ')
    : '';
  const countryNames = (countries || []).join(', ');
  if (cityNames && countryNames) return `${cityNames} (${countryNames})`;
  return cityNames || countryNames || 'N/A';
}

function generateSubmissionEmail(data: any) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Trip Cost Sheet Submitted</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f7fa;
      padding: 20px;
      line-height: 1.6;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 { color: #ffffff; font-size: 26px; font-weight: 700; margin: 0; }
    .header .subtitle { color: rgba(255,255,255,0.85); font-size: 14px; margin-top: 6px; }
    .body { padding: 40px 30px; }
    .alert-box {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border-left: 4px solid #f59e0b;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .alert-box strong { color: #92400e; font-size: 16px; display: block; margin-bottom: 8px; }
    .alert-box p { color: #78350f; margin: 0; font-size: 14px; }
    .info-card {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 25px;
      margin: 25px 0;
    }
    .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
    .info-row:last-child { border-bottom: none; }
    .label { font-weight: 600; color: #64748b; font-size: 14px; }
    .value { color: #1e293b; font-weight: 500; font-size: 14px; text-align: right; max-width: 60%; }
    .total-box {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 25px;
      border-radius: 10px;
      text-align: center;
      margin: 25px 0;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }
    .total-box .total-label { font-size: 14px; color: rgba(255,255,255,0.9); margin-bottom: 8px; }
    .total-box .amount { font-size: 30px; font-weight: 700; }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff !important;
      padding: 14px 36px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 15px;
      margin: 20px 0;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    .footer {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      padding: 25px 30px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer p { color: #64748b; font-size: 13px; margin: 6px 0; }
    .footer .company { font-weight: 600; color: #667eea; font-size: 14px; }
    h2 { color: #1e293b; font-size: 22px; margin-bottom: 12px; font-weight: 600; }
    p { color: #475569; font-size: 15px; margin: 10px 0; }
    .divider { height: 1px; background: linear-gradient(90deg, transparent, #e2e8f0, transparent); margin: 22px 0; }
    .badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: capitalize;
    }
    .badge-domestic { background: #dcfce7; color: #166534; }
    .badge-international { background: #dbeafe; color: #1e40af; }
    .badge-institute { background: #fef3c7; color: #92400e; }
    .badge-commercial { background: #f3e8ff; color: #6b21a8; }
    .badge-fti { background: #ffe4e6; color: #9f1239; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>✈️ New Trip Cost Sheet Submitted</h1>
      <div class="subtitle">VExplore Trip Management System</div>
    </div>
    <div class="body">
      <div class="alert-box">
        <strong>⚠️ Action Required</strong>
        <p>A new trip cost sheet has been submitted and requires your approval.</p>
      </div>

      <h2>📋 Submission Details</h2>
      <p>Hello Admin,</p>
      <p>A trip cost sheet has been submitted and is awaiting your review and approval.</p>

      <div class="info-card">
        <div class="info-row">
          <span class="label">Trip Name</span>
          <span class="value">${data.tripName}</span>
        </div>
        <div class="info-row">
          <span class="label">Institution</span>
          <span class="value">${data.institution}</span>
        </div>
        <div class="info-row">
          <span class="label">Destination</span>
          <span class="value">${data.destination}</span>
        </div>
        <div class="info-row">
          <span class="label">Duration</span>
          <span class="value">${data.duration}</span>
        </div>
        <div class="info-row">
          <span class="label">Trip Type</span>
          <span class="value">
            <span class="badge badge-${data.tripCategory}">${data.tripCategory}</span>
            &nbsp;
            <span class="badge badge-${data.tripType}">${data.tripType}</span>
          </span>
        </div>
        <div class="info-row">
          <span class="label">Participants</span>
          <span class="value">${data.participants}</span>
        </div>
        <div class="info-row">
          <span class="label">Submitted By</span>
          <span class="value">${data.submitterName}</span>
        </div>
        <div class="info-row">
          <span class="label">Submitted On</span>
          <span class="value">${data.submittedAt}</span>
        </div>
      </div>

      <div class="total-box">
        <div class="total-label">Grand Total (INR)</div>
        <div class="amount">${formatINR(data.grandTotal)}</div>
      </div>

      <div class="divider"></div>
      <p style="text-align: center; font-weight: 500;">
        Please review the trip cost sheet and take appropriate action.
      </p>
      <center>
        <a href="${data.viewUrl}" class="button">📊 Review Trip Cost Sheet</a>
      </center>
      <p style="font-size: 13px; color: #94a3b8; text-align: center; margin-top: 16px;">
        If the button doesn't work, copy and paste this link:<br>
        <a href="${data.viewUrl}" style="color: #667eea; word-break: break-all;">${data.viewUrl}</a>
      </p>
    </div>
    <div class="footer">
      <p class="company">© ${new Date().getFullYear()} VExplore Trip Management</p>
      <p>This is an automated notification. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`;
}

function generateApprovalEmail(data: any) {
  const roleDisplay = data.approverRole === 'superadmin' ? 'Super Admin' : 'Admin';
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trip Cost Sheet Approved</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f7fa;
      padding: 20px;
      line-height: 1.6;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 { color: #ffffff; font-size: 26px; font-weight: 700; margin: 0; }
    .header .subtitle { color: rgba(255,255,255,0.85); font-size: 14px; margin-top: 6px; }
    .body { padding: 40px 30px; }
    .success-box {
      background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
      border-left: 4px solid #10b981;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .success-box strong { color: #065f46; font-size: 16px; display: block; margin-bottom: 8px; }
    .success-box p { color: #047857; margin: 0; font-size: 14px; }
    .success-badge {
      display: inline-block;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 6px 18px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 13px;
      margin: 12px 0;
    }
    .info-card {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 25px;
      margin: 25px 0;
    }
    .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
    .info-row:last-child { border-bottom: none; }
    .label { font-weight: 600; color: #64748b; font-size: 14px; }
    .value { color: #1e293b; font-weight: 500; font-size: 14px; text-align: right; max-width: 60%; }
    .total-box {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 25px;
      border-radius: 10px;
      text-align: center;
      margin: 25px 0;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }
    .total-box .total-label { font-size: 14px; color: rgba(255,255,255,0.9); margin-bottom: 8px; }
    .total-box .amount { font-size: 30px; font-weight: 700; }
    .remarks-box {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border-left: 4px solid #f59e0b;
      padding: 18px;
      border-radius: 8px;
      margin: 22px 0;
    }
    .remarks-box strong { color: #92400e; font-size: 14px; display: block; margin-bottom: 8px; }
    .remarks-box p { color: #78350f; margin: 0; font-size: 14px; font-style: italic; }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #ffffff !important;
      padding: 14px 36px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 15px;
      margin: 20px 0;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    }
    .footer {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      padding: 25px 30px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer p { color: #64748b; font-size: 13px; margin: 6px 0; }
    .footer .company { font-weight: 600; color: #10b981; font-size: 14px; }
    h2 { color: #1e293b; font-size: 22px; margin-bottom: 12px; font-weight: 600; }
    p { color: #475569; font-size: 15px; margin: 10px 0; }
    .divider { height: 1px; background: linear-gradient(90deg, transparent, #e2e8f0, transparent); margin: 22px 0; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>✅ Trip Cost Sheet Approved</h1>
      <div class="subtitle">VExplore Trip Management System</div>
    </div>
    <div class="body">
      <div class="success-box">
        <strong>🎉 Congratulations!</strong>
        <p>Your trip cost sheet has been reviewed and approved.</p>
      </div>

      <h2>Hello ${data.creatorName},</h2>
      <p>Great news! Your trip cost sheet has been <span class="success-badge">APPROVED</span></p>

      <div class="info-card">
        <div class="info-row">
          <span class="label">Trip Name</span>
          <span class="value">${data.tripName}</span>
        </div>
        <div class="info-row">
          <span class="label">Institution</span>
          <span class="value">${data.institution}</span>
        </div>
        <div class="info-row">
          <span class="label">Destination</span>
          <span class="value">${data.destination}</span>
        </div>
        <div class="info-row">
          <span class="label">Duration</span>
          <span class="value">${data.duration}</span>
        </div>
        <div class="info-row">
          <span class="label">Approved By</span>
          <span class="value">${data.approverName} (${roleDisplay})</span>
        </div>
        <div class="info-row">
          <span class="label">Approved On</span>
          <span class="value">${data.approvedAt}</span>
        </div>
      </div>

      <div class="total-box">
        <div class="total-label">Approved Grand Total (INR)</div>
        <div class="amount">${formatINR(data.grandTotal)}</div>
      </div>

      ${data.remarks ? `
      <div class="remarks-box">
        <strong>💬 Approver's Remarks:</strong>
        <p>${data.remarks}</p>
      </div>` : ''}

      <div class="divider"></div>
      <p style="text-align: center; font-weight: 500;">
        You can now view the approved trip cost sheet and download the PDF.
      </p>
      <center>
        <a href="${data.viewUrl}" class="button">📄 View Approved Trip</a>
      </center>
      <p style="font-size: 13px; color: #94a3b8; text-align: center; margin-top: 16px;">
        If the button doesn't work, copy and paste this link:<br>
        <a href="${data.viewUrl}" style="color: #10b981; word-break: break-all;">${data.viewUrl}</a>
      </p>
    </div>
    <div class="footer">
      <p class="company">© ${new Date().getFullYear()} VExplore Trip Management</p>
      <p>This is an automated notification. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`;
}

function generateRejectionEmail(data: any) {
  const roleDisplay = data.approverRole === 'superadmin' ? 'Super Admin' : 'Admin';
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trip Cost Sheet Rejected</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f7fa;
      padding: 20px;
      line-height: 1.6;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 { color: #ffffff; font-size: 26px; font-weight: 700; margin: 0; }
    .header .subtitle { color: rgba(255,255,255,0.85); font-size: 14px; margin-top: 6px; }
    .body { padding: 40px 30px; }
    .alert-box {
      background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
      border-left: 4px solid #dc2626;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .alert-box strong { color: #7f1d1d; font-size: 16px; display: block; margin-bottom: 8px; }
    .alert-box p { color: #991b1b; margin: 0; font-size: 14px; }
    .info-card {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 25px;
      margin: 25px 0;
    }
    .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
    .info-row:last-child { border-bottom: none; }
    .label { font-weight: 600; color: #64748b; font-size: 14px; }
    .value { color: #1e293b; font-weight: 500; font-size: 14px; text-align: right; max-width: 60%; }
    .remarks-box {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border-left: 4px solid #f59e0b;
      padding: 18px;
      border-radius: 8px;
      margin: 22px 0;
    }
    .remarks-box strong { color: #92400e; font-size: 14px; display: block; margin-bottom: 8px; }
    .remarks-box p { color: #78350f; margin: 0; font-size: 14px; line-height: 1.6; }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: #ffffff !important;
      padding: 14px 36px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 15px;
      margin: 20px 0;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
    }
    .footer {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      padding: 25px 30px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer p { color: #64748b; font-size: 13px; margin: 6px 0; }
    .footer .company { font-weight: 600; color: #ef4444; font-size: 14px; }
    h2 { color: #1e293b; font-size: 22px; margin-bottom: 12px; font-weight: 600; }
    p { color: #475569; font-size: 15px; margin: 10px 0; }
    .divider { height: 1px; background: linear-gradient(90deg, transparent, #e2e8f0, transparent); margin: 22px 0; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>❌ Trip Cost Sheet Rejected</h1>
      <div class="subtitle">VExplore Trip Management System</div>
    </div>
    <div class="body">
      <div class="alert-box">
        <strong>⚠️ Action Required</strong>
        <p>Your trip cost sheet has been rejected. Please review the feedback and resubmit.</p>
      </div>

      <h2>Hello ${data.creatorName},</h2>
      <p>Unfortunately, your trip cost sheet has been <strong style="color: #dc2626;">REJECTED</strong>.</p>

      <div class="info-card">
        <div class="info-row">
          <span class="label">Trip Name</span>
          <span class="value">${data.tripName}</span>
        </div>
        <div class="info-row">
          <span class="label">Institution</span>
          <span class="value">${data.institution}</span>
        </div>
        <div class="info-row">
          <span class="label">Destination</span>
          <span class="value">${data.destination}</span>
        </div>
        <div class="info-row">
          <span class="label">Rejected By</span>
          <span class="value">${data.approverName} (${roleDisplay})</span>
        </div>
        <div class="info-row">
          <span class="label">Rejected On</span>
          <span class="value">${data.rejectedAt}</span>
        </div>
      </div>

      ${data.remarks ? `
      <div class="remarks-box">
        <strong>💬 Rejection Reason:</strong>
        <p>${data.remarks}</p>
      </div>` : ''}

      <div class="divider"></div>
      <p style="text-align: center; font-weight: 500;">
        Please review the rejection reason and make the necessary changes before resubmitting.
      </p>
      <center>
        <a href="${data.viewUrl}" class="button">📋 View &amp; Edit Trip</a>
      </center>
      <p style="font-size: 13px; color: #94a3b8; text-align: center; margin-top: 16px;">
        If the button doesn't work, copy and paste this link:<br>
        <a href="${data.viewUrl}" style="color: #ef4444; word-break: break-all;">${data.viewUrl}</a>
      </p>
    </div>
    <div class="footer">
      <p class="company">© ${new Date().getFullYear()} VExplore Trip Management</p>
      <p>This is an automated notification. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(204)
      .setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type')
      .end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { type, tripId, approverRole, approverUserId, remarks } = req.body as EmailRequest;

    console.log('Processing trip email request:', { type, tripId, approverRole });

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      throw new Error('Email credentials not configured');
    }
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Fetch email settings — fall back to env vars if the table doesn't exist yet
    let settings: any = null;
    const { data: settingsData, error: settingsError } = await supabase
      .from('email_settings')
      .select('*')
      .single();

    if (!settingsError && settingsData) {
      settings = settingsData;
      if (!settings.notifications_enabled) {
        console.log('Email notifications are disabled');
        return res.status(400).json({ success: false, error: 'Notifications are disabled' });
      }
    } else {
      // Fallback: use env vars directly
      settings = {
        notifications_enabled: true,
        super_admin_email: process.env.SUPER_ADMIN_EMAIL || process.env.EMAIL_USER,
        admin_emails: process.env.ADMIN_EMAILS
          ? process.env.ADMIN_EMAILS.split(',').map((e: string) => e.trim())
          : [],
      };
      console.log('email_settings table not found — using env var fallback');
    }

    // Fetch trip + creator user
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select(`
        id, name, institution, countries, cities,
        start_date, end_date, total_days, total_nights,
        trip_category, trip_type, grand_total, grand_total_inr,
        created_by,
        creator:users!trips_created_by_fkey(id, name, email)
      `)
      .eq('id', tripId)
      .single();

    if (tripError || !trip) {
      console.error('Trip fetch error:', tripError);
      throw new Error('Trip not found');
    }

    // Fetch approver user if provided
    let approver: any = null;
    if (approverUserId) {
      const { data: approverData } = await supabase
        .from('users')
        .select('id, name, email, role')
        .eq('id', approverUserId)
        .single();
      approver = approverData;
    }

    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const viewUrl = `${appUrl}/trips/${tripId}`;

    const destination = formatDestination(trip.countries || [], trip.cities || []);
    const duration = trip.total_days
      ? `${trip.total_days} Days, ${trip.total_nights ?? trip.total_days - 1} Nights`
      : 'N/A';

    const formattedDate = new Date().toLocaleString('en-IN', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata',
    });

    const grandTotal = trip.grand_total_inr ?? trip.grand_total ?? 0;
    const creatorUser = Array.isArray(trip.creator) ? trip.creator[0] : trip.creator;

    let emailOptions: any;

    if (type === 'submission') {
      const toEmail = settings.super_admin_email;
      if (!toEmail || !toEmail.includes('@')) {
        throw new Error('Super admin email is invalid or missing');
      }

      let ccEmails: string[] = [...(settings.admin_emails || [])];
      ccEmails = [...new Set(ccEmails)].filter(
        (email) => email && typeof email === 'string' && email.includes('@') && email !== toEmail
      );

      const html = generateSubmissionEmail({
        tripName: trip.name,
        institution: trip.institution,
        destination,
        duration,
        tripCategory: trip.trip_category || 'domestic',
        tripType: trip.trip_type || 'institute',
        participants: 'See trip details',
        submitterName: creatorUser?.name || 'Unknown',
        submittedAt: formattedDate,
        grandTotal,
        viewUrl,
      });

      emailOptions = {
        from: `VExplore <${process.env.EMAIL_USER}>`,
        to: toEmail,
        cc: ccEmails.length > 0 ? ccEmails.join(', ') : undefined,
        subject: `✈️ New Trip Submitted for Approval - ${trip.name}`,
        html,
      };

    } else if (type === 'approval') {
      if (!creatorUser?.email || !creatorUser.email.includes('@')) {
        throw new Error('Creator email is invalid or missing');
      }

      let ccEmails: string[] = [...(settings.admin_emails || [])];
      ccEmails = [...new Set(ccEmails)].filter(
        (email) => email && typeof email === 'string' && email.includes('@') && email !== creatorUser.email
      );

      const html = generateApprovalEmail({
        tripName: trip.name,
        institution: trip.institution,
        destination,
        duration,
        approverName: approver?.name || 'Admin',
        approverRole: approverRole || 'admin',
        approvedAt: formattedDate,
        remarks: remarks || '',
        grandTotal,
        viewUrl,
        creatorName: creatorUser.name || 'User',
      });

      emailOptions = {
        from: `VExplore <${process.env.EMAIL_USER}>`,
        to: creatorUser.email,
        cc: ccEmails.length > 0 ? ccEmails.join(', ') : undefined,
        subject: `✅ Trip Approved - ${trip.name}`,
        html,
      };

    } else if (type === 'rejection') {
      if (!creatorUser?.email || !creatorUser.email.includes('@')) {
        throw new Error('Creator email is invalid or missing');
      }

      let ccEmails: string[] = [...(settings.admin_emails || [])];
      ccEmails = [...new Set(ccEmails)].filter(
        (email) => email && typeof email === 'string' && email.includes('@') && email !== creatorUser.email
      );

      const html = generateRejectionEmail({
        tripName: trip.name,
        institution: trip.institution,
        destination,
        approverName: approver?.name || 'Admin',
        approverRole: approverRole || 'admin',
        rejectedAt: formattedDate,
        remarks: remarks || '',
        viewUrl,
        creatorName: creatorUser.name || 'User',
      });

      emailOptions = {
        from: `VExplore <${process.env.EMAIL_USER}>`,
        to: creatorUser.email,
        cc: ccEmails.length > 0 ? ccEmails.join(', ') : undefined,
        subject: `❌ Trip Rejected - ${trip.name}`,
        html,
      };

    } else {
      throw new Error('Invalid email type');
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    console.log('Sending trip email via Nodemailer...');
    const info = await transporter.sendMail(emailOptions);
    console.log('Trip email sent successfully:', info.messageId);

    return res.status(200).setHeader('Access-Control-Allow-Origin', '*').json({
      success: true,
      messageId: info.messageId,
    });

  } catch (error: any) {
    console.error('Trip email send error:', error);
    return res.status(400).setHeader('Access-Control-Allow-Origin', '*').json({
      success: false,
      error: error.message || 'Failed to send email',
    });
  }
}
