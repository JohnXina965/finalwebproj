# EmailJS Templates Setup Guide

## Overview
You need to create **3 new email templates** in your EmailJS account for booking notifications.

## Current Setup
- **Service ID**: `service_z8ms74u`
- **User ID**: `GqhsogPCZps6-KE_V`
- **Current Template**: `template_44e0uoq` (OTP verification)

## Required Templates

### 1. Booking Approval Email
**Template ID**: `template_booking_approved`

**Purpose**: Sent to guests when host approves their booking request.

**Template Variables** (use these in your EmailJS template):
- `{{to_email}}` - Guest's email address
- `{{guest_name}}` - Guest's name
- `{{listing_title}}` - Title of the listing
- `{{check_in}}` - Check-in date
- `{{check_out}}` - Check-out date
- `{{total_amount}}` - Total booking amount (formatted as ₱X,XXX.XX)
- `{{booking_id}}` - Booking ID
- `{{host_name}}` - Host's name

**Sample Email Content**:
```
Subject: 🎉 Your Booking Has Been Approved!

Hi {{guest_name}},

Great news! Your booking request has been approved by {{host_name}}.

Booking Details:
- Listing: {{listing_title}}
- Check-in: {{check_in}}
- Check-out: {{check_out}}
- Total Amount: {{total_amount}}
- Booking ID: {{booking_id}}

We're excited to host you! If you have any questions, please contact your host directly.

Best regards,
EcoEscape Team
```

---

### 2. Booking Rejection Email
**Template ID**: `template_booking_rejected`

**Purpose**: Sent to guests when host rejects their booking request.

**Template Variables**:
- `{{to_email}}` - Guest's email address
- `{{guest_name}}` - Guest's name
- `{{listing_title}}` - Title of the listing
- `{{check_in}}` - Check-in date
- `{{check_out}}` - Check-out date
- `{{total_amount}}` - Total booking amount (formatted as ₱X,XXX.XX)
- `{{booking_id}}` - Booking ID
- `{{host_name}}` - Host's name
- `{{rejection_reason}}` - Reason for rejection (default: "Host unavailable for these dates")

**Sample Email Content**:
```
Subject: Booking Request Update

Hi {{guest_name}},

We're sorry to inform you that your booking request has been declined by {{host_name}}.

Booking Details:
- Listing: {{listing_title}}
- Check-in: {{check_in}}
- Check-out: {{check_out}}
- Total Amount: {{total_amount}}
- Booking ID: {{booking_id}}
- Reason: {{rejection_reason}}

Don't worry! You can explore other amazing listings on our platform. If you paid for this booking, your payment will be fully refunded to your wallet.

Best regards,
EcoEscape Team
```

---

### 3. Cancellation Refund Email
**Template ID**: `template_cancellation_refund`

**Purpose**: Sent to guests when they cancel a booking, showing refund details.

**Template Variables**:
- `{{to_email}}` - Guest's email address
- `{{guest_name}}` - Guest's name
- `{{listing_title}}` - Title of the listing
- `{{original_amount}}` - Original booking amount (formatted as ₱X,XXX.XX)
- `{{refund_amount}}` - Refund amount after deductions (formatted as ₱X,XXX.XX)
- `{{admin_deduction}}` - Admin deduction amount (10% of refund, formatted as ₱X,XXX.XX)
- `{{cancellation_fee}}` - Cancellation fee based on policy (formatted as ₱X,XXX.XX)
- `{{cancellation_policy}}` - Policy description (e.g., "Full refund (cancelled 5+ days before check-in)")
- `{{booking_id}}` - Booking ID
- `{{cancellation_date}}` - Date of cancellation

**Sample Email Content**:
```
Subject: Booking Cancellation & Refund Confirmation

Hi {{guest_name}},

Your booking has been cancelled. Here are your refund details:

Booking Details:
- Listing: {{listing_title}}
- Booking ID: {{booking_id}}
- Cancellation Date: {{cancellation_date}}

Refund Breakdown:
- Original Amount: {{original_amount}}
- Cancellation Fee: {{cancellation_fee}}
- Admin Deduction (10%): {{admin_deduction}}
- Refund Amount: {{refund_amount}}

Policy Applied: {{cancellation_policy}}

Your refund of {{refund_amount}} has been added to your wallet and is available for future bookings.

Thank you for using EcoEscape!

Best regards,
EcoEscape Team
```

---

## Setup Instructions

1. **Log in to EmailJS**: Go to https://www.emailjs.com/ and log in to your account

2. **Create New Templates**:
   - Navigate to "Email Templates" in your dashboard
   - Click "Create New Template"
   - For each template:
     - Copy the Template ID exactly as shown above
     - Use the template variables listed
     - Customize the email content as needed
     - Save the template

3. **Verify Template IDs**:
   - After creating each template, copy its Template ID
   - Update `src/services/EmailService.js` with the actual Template IDs if they differ

4. **Test Templates**:
   - Use the EmailJS test feature to send test emails
   - Verify all variables are displaying correctly
   - Check email formatting on different email clients

## Important Notes

- **Auto-reply**: You can use EmailJS's auto-reply feature, but it's not required. The templates will be triggered programmatically from the application.
- **Template Variables**: Make sure variable names match exactly (case-sensitive)
- **Email Formatting**: Use HTML formatting in EmailJS templates for better email appearance
- **Service ID**: All templates use the same service (`service_z8ms74u`)

## Troubleshooting

If emails are not sending:
1. Check that Template IDs match exactly in `EmailService.js`
2. Verify all required variables are included in the template
3. Check EmailJS dashboard for error logs
4. Ensure EmailJS script is loaded in `index.html`

## Next Steps

After creating the templates:
1. Update Template IDs in `src/services/EmailService.js` if needed
2. Test booking approval/rejection flow
3. Test cancellation flow with refund calculation
4. Verify emails are received correctly

