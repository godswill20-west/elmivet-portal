import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

function getDivision(formNumber) {
  const num = Number(formNumber);
  if (num >= 1 && num <= 5) return 'Global Trade';
  if (num >= 6 && num <= 9) return 'Logistics';
  if (num >= 10 && num <= 12) return 'Commercial';
  if (num >= 13 && num <= 18) return 'Industrial';
  return 'General Inquiry'; // Form 19
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { formId, customerName, customerEmail, fields, uploadedPaths } = req.body;
  const division = getDivision(formId);

  // 1. Generate 7-day private download links for staff review
  let attachmentLinks = [];
  if (uploadedPaths?.length > 0) {
    const { data: signedLinks, error } = await supabaseAdmin.storage
      .from('elmivet-quotes')
      .createSignedUrls(uploadedPaths, 60 * 60 * 24 * 7);

    if (!error && signedLinks) {
      attachmentLinks = signedLinks;
    }
  }

  // 2. Log backup submission into Supabase PostgreSQL
  await supabaseAdmin.from('quote_submissions').insert({
    form_id: String(formId),
    division,
    customer_name: customerName,
    customer_email: customerEmail,
    payload: fields,
    file_paths: uploadedPaths,
  });

  // 3. Configure Zoho Mail SMTP
  const transporter = nodemailer.createTransport({
    host: 'smtp.zoho.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.ZOHO_SMTP_USER, // noreply@elmivet.com
      pass: process.env.ZOHO_SMTP_PASS, // Zoho app-specific password
    },
  });

  // 4. Format HTML email for quotes@elmivet.com
  const linksHtml = attachmentLinks.length
    ? `<h3>Attached Documents (Valid for 7 days)</h3><ul>${attachmentLinks
        .map((item) => `<li><a href="${item.signedUrl}">${item.path.split('/').pop()}</a></li>`)
        .join('')}</ul>`
    : '<p><em>No files attached.</em></p>';

  const fieldsHtml = Object.entries(fields)
    .map(([key, val]) => `<p><strong>${key}:</strong> ${val}</p>`)
    .join('');

  await transporter.sendMail({
    from: `"Elmivet Web Portal" <${process.env.ZOHO_SMTP_USER}>`,
    to: 'quotes@elmivet.com',
    bcc: 'elmivet19@gmail.com',
    replyTo: customerEmail,
    subject: `[${division}] New Quote Request — Form #${formId} (${customerName})`,
    html: `<h2>New ${division} Submission (Form #${formId})</h2>${fieldsHtml}${linksHtml}`,
  });

  // 5. Send automated 24-hour response confirmation to customer
  await transporter.sendMail({
    from: `"Elmivet International" <${process.env.ZOHO_SMTP_USER}>`,
    to: customerEmail,
    subject: `We received your ${division} inquiry — Elmivet International`,
    html: `<p>Dear ${customerName},</p>
           <p>Thank you for contacting Elmivet International regarding <strong>${division}</strong>. 
           Our team has received your submission and will review your details and respond within <strong>24 hours</strong>.</p>
           <p>Best regards,<br/>Elmivet International Team</p>`,
  });

  return res.status(200).json({ success: true });
}