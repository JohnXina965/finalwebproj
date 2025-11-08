# EmailJS Templates Setup Guide (2 Templates Only)

## Overview
Since you can only create **2 templates** on the free EmailJS plan, we'll combine approval and rejection into one template, and keep cancellation separate.

## Required Templates

### Template 1: Booking Status Update (Approval/Rejection Combined)
**Template ID**: `template_booking_status`

**Purpose**: Handles both booking approval AND rejection emails using a status parameter.

**Template Variables**:
- `{{to_email}}` - Guest's email address
- `{{guest_name}}` - Guest's name
- `{{booking_status}}` - "Approved" or "Rejected"
- `{{status_message}}` - Dynamic message based on status
- `{{listing_title}}` - Title of the listing
- `{{check_in}}` - Check-in date
- `{{check_out}}` - Check-out date
- `{{total_amount}}` - Total booking amount (formatted as ₱X,XXX.XX)
- `{{booking_id}}` - Booking ID
- `{{host_name}}` - Host's name
- `{{rejection_reason}}` - Reason for rejection (empty if approved)
- `{{action_button_text}}` - Button text ("View My Trips" or "Explore Other Listings")
- `{{action_button_link}}` - Button link

**HTML Design**:
```html
<div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
  
  <!-- Header -->
  <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 30px 20px; text-align: center;">
    <a style="text-decoration: none; outline: none" href="https://yourwebsite.com" target="_blank">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">EcoEscape</h1>
    </a>
  </div>

  <!-- Icon -->
  <div style="text-align: center; padding: 40px 20px 20px;">
    <div style="width: 80px; height: 80px; background: linear-gradient(135deg, {{#if_eq booking_status "Approved"}}#10b981 0%, #059669 100%{{else}}#f59e0b 0%, #d97706 100%{{/if_eq}}); border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba({{#if_eq booking_status "Approved"}}16, 185, 129{{else}}245, 158, 11{{/if_eq}}, 0.3);">
      <span style="font-size: 40px;">{{#if_eq booking_status "Approved"}}✅{{else}}📋{{/if_eq}}</span>
    </div>
  </div>

  <!-- Content -->
  <div style="padding: 0 30px 30px;">
    <h2 style="color: #1f2937; font-size: 24px; font-weight: 700; margin: 0 0 20px; text-align: center;">
      {{#if_eq booking_status "Approved"}}🎉 Your Booking Has Been Approved!{{else}}Booking Request Update{{/if_eq}}
    </h2>
    
    <p style="padding-top: 16px; border-top: 1px solid #eaeaea; margin-top: 20px;">Hi <strong>{{guest_name}}</strong>,</p>
    
    <p style="color: #4b5563; margin: 20px 0;">
      {{status_message}} {{#if_eq booking_status "Approved"}}We're excited to host you!{{else}}Don't worry! You can explore other amazing listings on our platform.{{/if_eq}}
    </p>

    <!-- Booking Details Card -->
    <div style="background: linear-gradient(135deg, {{#if_eq booking_status "Approved"}}#f0fdfa 0%, #ecfdf5 100%{{else}}#fef3c7 0%, #fde68a 100%{{/if_eq}}); border-left: 4px solid {{#if_eq booking_status "Approved"}}#10b981{{else}}#f59e0b{{/if_eq}}; border-radius: 8px; padding: 24px; margin: 30px 0;">
      <h3 style="color: {{#if_eq booking_status "Approved"}}#065f46{{else}}#92400e{{/if_eq}}; font-size: 18px; font-weight: 600; margin: 0 0 16px;">Booking Details</h3>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #374151; font-weight: 600; width: 140px;">Listing:</td>
          <td style="padding: 8px 0; color: #1f2937;">{{listing_title}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #374151; font-weight: 600;">Check-in:</td>
          <td style="padding: 8px 0; color: #1f2937;">{{check_in}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #374151; font-weight: 600;">Check-out:</td>
          <td style="padding: 8px 0; color: #1f2937;">{{check_out}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #374151; font-weight: 600;">Total Amount:</td>
          <td style="padding: 8px 0; color: {{#if_eq booking_status "Approved"}}#059669{{else}}#92400e{{/if_eq}}; font-size: 18px; font-weight: 700;">{{total_amount}}</td>
        </tr>
        {{#if rejection_reason}}
        <tr>
          <td style="padding: 8px 0; color: #374151; font-weight: 600;">Reason:</td>
          <td style="padding: 8px 0; color: #78350f;">{{rejection_reason}}</td>
        </tr>
        {{/if}}
        <tr>
          <td style="padding: 8px 0; color: #374151; font-weight: 600;">Booking ID:</td>
          <td style="padding: 8px 0; color: #6b7280; font-family: monospace; font-size: 14px;">{{booking_id}}</td>
        </tr>
      </table>
    </div>

    {{#if_eq booking_status "Rejected"}}
    <!-- Refund Notice (only for rejections) -->
    <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="color: #166534; margin: 0; font-size: 14px;">
        <strong>💳 Refund Information:</strong> If you paid for this booking, your payment will be fully refunded to your wallet within 3-5 business days.
      </p>
    </div>
    {{/if_eq}}

    <!-- Call to Action -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{action_button_link}}" style="display: inline-block; background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 12px rgba(20, 184, 166, 0.3);">
        {{action_button_text}}
      </a>
    </div>

    <p style="color: #6b7280; font-size: 14px; margin: 30px 0 20px;">
      {{#if_eq booking_status "Approved"}}If you have any questions or need to make changes to your booking, please contact your host directly through the messaging system.{{else}}There are many other amazing listings available. We're here to help you find the perfect stay.{{/if_eq}}
    </p>

    <p style="padding-top: 16px; border-top: 1px solid #eaeaea; margin-top: 30px; color: #6b7280; font-size: 14px;">
      Best regards,<br />
      <strong style="color: #14b8a6;">The EcoEscape Team</strong>
    </p>
  </div>

  <!-- Footer -->
  <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
      © 2024 EcoEscape. All rights reserved.<br />
      <a href="https://yourwebsite.com" style="color: #14b8a6; text-decoration: none;">Visit our website</a> | 
      <a href="https://yourwebsite.com/support" style="color: #14b8a6; text-decoration: none;">Support</a>
    </p>
  </div>
</div>
```

**Note**: EmailJS doesn't support Handlebars conditionals like `{{#if_eq}}`. Use this simpler version instead:

```html
<div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
  
  <!-- Header -->
  <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 30px 20px; text-align: center;">
    <a style="text-decoration: none; outline: none" href="https://yourwebsite.com" target="_blank">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">EcoEscape</h1>
    </a>
  </div>

  <!-- Icon -->
  <div style="text-align: center; padding: 40px 20px 20px;">
    <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
      <span style="font-size: 40px;">✅</span>
    </div>
  </div>

  <!-- Content -->
  <div style="padding: 0 30px 30px;">
    <h2 style="color: #1f2937; font-size: 24px; font-weight: 700; margin: 0 0 20px; text-align: center;">{{status_message}}</h2>
    
    <p style="padding-top: 16px; border-top: 1px solid #eaeaea; margin-top: 20px;">Hi <strong>{{guest_name}}</strong>,</p>
    
    <p style="color: #4b5563; margin: 20px 0;">
      {{status_message}} Your booking status: <strong style="color: #059669;">{{booking_status}}</strong>
    </p>

    <!-- Booking Details Card -->
    <div style="background: linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%); border-left: 4px solid #10b981; border-radius: 8px; padding: 24px; margin: 30px 0;">
      <h3 style="color: #065f46; font-size: 18px; font-weight: 600; margin: 0 0 16px;">Booking Details</h3>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #374151; font-weight: 600; width: 140px;">Listing:</td>
          <td style="padding: 8px 0; color: #1f2937;">{{listing_title}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #374151; font-weight: 600;">Check-in:</td>
          <td style="padding: 8px 0; color: #1f2937;">{{check_in}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #374151; font-weight: 600;">Check-out:</td>
          <td style="padding: 8px 0; color: #1f2937;">{{check_out}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #374151; font-weight: 600;">Total Amount:</td>
          <td style="padding: 8px 0; color: #059669; font-size: 18px; font-weight: 700;">{{total_amount}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #374151; font-weight: 600;">Status:</td>
          <td style="padding: 8px 0; color: #059669; font-weight: 700; font-size: 16px;">{{booking_status}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #374151; font-weight: 600;">Host:</td>
          <td style="padding: 8px 0; color: #1f2937;">{{host_name}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #374151; font-weight: 600;">Booking ID:</td>
          <td style="padding: 8px 0; color: #6b7280; font-family: monospace; font-size: 14px;">{{booking_id}}</td>
        </tr>
      </table>
    </div>

    <!-- Call to Action -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{action_button_link}}" style="display: inline-block; background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 12px rgba(20, 184, 166, 0.3);">
        {{action_button_text}}
      </a>
    </div>

    <p style="color: #6b7280; font-size: 14px; margin: 30px 0 20px;">
      If you have any questions, please contact your host directly through the messaging system or our support team.
    </p>

    <p style="padding-top: 16px; border-top: 1px solid #eaeaea; margin-top: 30px; color: #6b7280; font-size: 14px;">
      Best regards,<br />
      <strong style="color: #14b8a6;">The EcoEscape Team</strong>
    </p>
  </div>

  <!-- Footer -->
  <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
      © 2024 EcoEscape. All rights reserved.<br />
      <a href="https://yourwebsite.com" style="color: #14b8a6; text-decoration: none;">Visit our website</a> | 
      <a href="https://yourwebsite.com/support" style="color: #14b8a6; text-decoration: none;">Support</a>
    </p>
  </div>
</div>
```

---

### Template 2: Cancellation Refund
**Template ID**: `template_cancellation_refund`

**Purpose**: Sent when guest cancels a booking, showing refund details.

**Template Variables**:
- `{{to_email}}` - Guest's email address
- `{{guest_name}}` - Guest's name
- `{{listing_title}}` - Title of the listing
- `{{original_amount}}` - Original booking amount
- `{{refund_amount}}` - Final refund amount after deductions
- `{{admin_deduction}}` - Admin deduction (10%)
- `{{cancellation_fee}}` - Cancellation fee
- `{{cancellation_policy}}` - Policy description
- `{{booking_id}}` - Booking ID
- `{{cancellation_date}}` - Date of cancellation

**HTML Design**:
```html
<div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
  
  <!-- Header -->
  <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 30px 20px; text-align: center;">
    <a style="text-decoration: none; outline: none" href="https://yourwebsite.com" target="_blank">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">EcoEscape</h1>
    </a>
  </div>

  <!-- Icon -->
  <div style="text-align: center; padding: 40px 20px 20px;">
    <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
      <span style="font-size: 40px;">💰</span>
    </div>
  </div>

  <!-- Content -->
  <div style="padding: 0 30px 30px;">
    <h2 style="color: #1f2937; font-size: 24px; font-weight: 700; margin: 0 0 20px; text-align: center;">Booking Cancellation & Refund Confirmation</h2>
    
    <p style="padding-top: 16px; border-top: 1px solid #eaeaea; margin-top: 20px;">Hi <strong>{{guest_name}}</strong>,</p>
    
    <p style="color: #4b5563; margin: 20px 0;">
      Your booking has been cancelled. Here are your refund details:
    </p>

    <!-- Booking Info Card -->
    <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #374151; font-weight: 600; width: 140px;">Listing:</td>
          <td style="padding: 8px 0; color: #1f2937;">{{listing_title}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #374151; font-weight: 600;">Booking ID:</td>
          <td style="padding: 8px 0; color: #6b7280; font-family: monospace; font-size: 14px;">{{booking_id}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #374151; font-weight: 600;">Cancellation Date:</td>
          <td style="padding: 8px 0; color: #1f2937;">{{cancellation_date}}</td>
        </tr>
      </table>
    </div>

    <!-- Refund Breakdown Card -->
    <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-left: 4px solid #3b82f6; border-radius: 8px; padding: 24px; margin: 30px 0;">
      <h3 style="color: #1e40af; font-size: 18px; font-weight: 600; margin: 0 0 20px;">Refund Breakdown</h3>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; color: #374151; font-weight: 600; border-bottom: 1px solid #bfdbfe;">Original Amount:</td>
          <td style="padding: 10px 0; color: #1f2937; text-align: right; border-bottom: 1px solid #bfdbfe; font-weight: 600;">{{original_amount}}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #374151;">Cancellation Fee:</td>
          <td style="padding: 10px 0; color: #dc2626; text-align: right;">- {{cancellation_fee}}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #374151;">Admin Deduction (10%):</td>
          <td style="padding: 10px 0; color: #dc2626; text-align: right;">- {{admin_deduction}}</td>
        </tr>
        <tr style="background-color: #ffffff; border-top: 2px solid #3b82f6;">
          <td style="padding: 12px 0; color: #1e40af; font-weight: 700; font-size: 18px;">Refund Amount:</td>
          <td style="padding: 12px 0; color: #059669; text-align: right; font-weight: 700; font-size: 20px;">{{refund_amount}}</td>
        </tr>
      </table>
    </div>

    <!-- Policy Info -->
    <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="color: #166534; margin: 0; font-size: 14px;">
        <strong>📋 Policy Applied:</strong> {{cancellation_policy}}
      </p>
    </div>

    <!-- Wallet Notice -->
    <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
      <p style="color: #065f46; margin: 0; font-size: 16px; font-weight: 600;">
        ✅ Your refund of <strong style="font-size: 20px;">{{refund_amount}}</strong> has been added to your wallet and is available for future bookings.
      </p>
    </div>

    <!-- Call to Action -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://yourwebsite.com/wallet" style="display: inline-block; background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 12px rgba(20, 184, 166, 0.3); margin: 0 8px 8px 0;">
        View Wallet
      </a>
      <a href="https://yourwebsite.com/guest/homes" style="display: inline-block; background: #ffffff; color: #14b8a6; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; border: 2px solid #14b8a6; margin: 0 0 8px 8px;">
        Explore Listings
      </a>
    </div>

    <p style="color: #6b7280; font-size: 14px; margin: 30px 0 20px;">
      If you have any questions about your refund, please contact our support team. We're here to help!
    </p>

    <p style="padding-top: 16px; border-top: 1px solid #eaeaea; margin-top: 30px; color: #6b7280; font-size: 14px;">
      Best regards,<br />
      <strong style="color: #14b8a6;">The EcoEscape Team</strong>
    </p>
  </div>

  <!-- Footer -->
  <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
      © 2024 EcoEscape. All rights reserved.<br />
      <a href="https://yourwebsite.com" style="color: #14b8a6; text-decoration: none;">Visit our website</a> | 
      <a href="https://yourwebsite.com/support" style="color: #14b8a6; text-decoration: none;">Support</a>
    </p>
  </div>
</div>
```

---

## Setup Instructions

1. **Create Template 1** (`template_booking_status`):
   - Copy the HTML for "Booking Status Update"
   - Paste into EmailJS template editor
   - Name it: "Booking Status Update"
   - Use Template ID: `template_booking_status` (or whatever EmailJS gives you)

2. **Create Template 2** (`template_cancellation_refund`):
   - Copy the HTML for "Cancellation Refund"
   - Paste into EmailJS template editor
   - Name it: "Cancellation Refund"
   - Use Template ID: `template_cancellation_refund` (or whatever EmailJS gives you)

3. **Update Template IDs in Code**:
   - Edit `src/services/EmailService.js`
   - Update `TEMPLATE_BOOKING_STATUS` and `TEMPLATE_CANCELLATION_REFUND` with your actual template IDs from EmailJS

4. **Test**:
   - Use EmailJS test feature
   - Verify all variables display correctly

---

## How It Works

- **Approval/Rejection**: Both use the same template (`template_booking_status`). The code sends different values for `booking_status` ("Approved" or "Rejected") and `status_message`, so the email content adapts accordingly.

- **Cancellation**: Uses separate template (`template_cancellation_refund`) with detailed refund breakdown.

---

## Important Notes

- Replace `https://yourwebsite.com` with your actual domain
- The template will show "Approved" or "Rejected" based on the `booking_status` variable
- All variables must be included in the EmailJS template
- Test both approval and rejection scenarios to ensure the template works for both

