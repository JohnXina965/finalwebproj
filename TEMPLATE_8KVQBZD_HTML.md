# Template HTML for template_8kvqbzd

## Copy This HTML Into Your EmailJS Template

```html
<div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
  
  <!-- Header -->
  <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 30px 20px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">EcoEscape</h1>
  </div>

  <!-- Content -->
  <div style="padding: 30px;">
    <h2 style="color: #1f2937; font-size: 24px; font-weight: 700; margin: 0 0 20px; text-align: center;">{{status_message}}</h2>
    
    <p style="padding-top: 16px; border-top: 1px solid #eaeaea; margin-top: 20px;">Hi <strong>{{guest_name}}</strong>,</p>
    
    <p style="color: #4b5563; margin: 20px 0; font-size: 18px;">
      {{status_message}}
    </p>

    <!-- Status Badge -->
    <p style="color: #059669; font-weight: 600; font-size: 16px; margin: 20px 0; background: #ecfdf5; padding: 12px; border-radius: 8px; text-align: center;">
      Status: {{booking_status}}
    </p>

    <!-- Booking Details -->
    <div style="background: #f0fdfa; border-left: 4px solid #10b981; border-radius: 8px; padding: 24px; margin: 30px 0;">
      <h3 style="color: #065f46; font-size: 18px; font-weight: 600; margin: 0 0 16px;">Booking Information</h3>
      
      <p style="margin: 8px 0; color: #374151;"><strong>Listing:</strong> {{listing_title}}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Check-in:</strong> {{check_in}}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Check-out:</strong> {{check_out}}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Total Amount:</strong> <span style="color: #059669; font-weight: 700; font-size: 18px;">{{total_amount}}</span></p>
      <p style="margin: 8px 0; color: #374151;"><strong>Host:</strong> {{host_name}}</p>
      <p style="margin: 8px 0; color: #6b7280; font-family: monospace; font-size: 14px;"><strong>Booking ID:</strong> {{booking_id}}</p>
      <p style="margin: 8px 0; color: #78350f;"><strong>Reason:</strong> {{rejection_reason}}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Cancellation Date:</strong> {{cancellation_date}}</p>
    </div>

    <!-- Refund Breakdown (for cancellations) -->
    <div style="background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 24px; margin: 30px 0;">
      <h3 style="color: #1e40af; font-size: 18px; font-weight: 600; margin: 0 0 20px;">Refund Breakdown</h3>
      <p style="margin: 10px 0; color: #374151;"><strong>Original Amount:</strong> <span style="float: right; font-weight: 600;">{{original_amount}}</span></p>
      <p style="margin: 10px 0; color: #374151;"><strong>Cancellation Fee:</strong> <span style="float: right; color: #dc2626;">- {{cancellation_fee}}</span></p>
      <p style="margin: 10px 0; color: #374151;"><strong>Admin Deduction (10%):</strong> <span style="float: right; color: #dc2626;">- {{admin_deduction}}</span></p>
      <div style="border-top: 2px solid #3b82f6; margin-top: 15px; padding-top: 15px;">
        <p style="margin: 0; color: #1e40af; font-weight: 700; font-size: 18px;"><strong>Refund Amount:</strong> <span style="float: right; color: #059669; font-size: 20px;">{{refund_amount}}</span></p>
      </div>
    </div>

    <!-- Policy Info -->
    <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="color: #166534; margin: 0; font-size: 14px;">
        <strong>📋 Policy Applied:</strong> {{cancellation_policy}}
      </p>
    </div>

    <!-- Call to Action Button -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{action_button_link}}" style="display: inline-block; background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600;">
        {{action_button_text}}
      </a>
    </div>

    <p style="color: #6b7280; font-size: 14px; margin: 30px 0 20px;">
      If you have any questions, please contact our support team or your host directly through the messaging system.
    </p>

    <p style="padding-top: 16px; border-top: 1px solid #eaeaea; margin-top: 30px; color: #6b7280; font-size: 14px;">
      Best regards,<br />
      <strong style="color: #14b8a6;">The EcoEscape Team</strong>
    </p>
  </div>

  <!-- Footer -->
  <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
      © 2024 EcoEscape. All rights reserved.
    </p>
  </div>
</div>
```

## Variables to Add in EmailJS

When setting up the template in EmailJS, add these variables:

1. `to_email`
2. `guest_name`
3. `email_type`
4. `status_message`
5. `booking_status`
6. `listing_title`
7. `check_in`
8. `check_out`
9. `total_amount`
10. `host_name`
11. `booking_id`
12. `rejection_reason`
13. `original_amount`
14. `refund_amount`
15. `admin_deduction`
16. `cancellation_fee`
17. `cancellation_policy`
18. `cancellation_date`
19. `action_button_text`
20. `action_button_link`

## How It Works

- **For Approval**: Most fields will have values, cancellation fields will be empty
- **For Rejection**: Booking fields + rejection_reason will have values, cancellation fields empty
- **For Cancellation**: Cancellation fields will have values, some booking fields may be empty

Empty fields will just appear blank in the email, which is perfectly fine!

## Testing

Test with these sample values:

**Approval Test:**
- `email_type`: "approval"
- `status_message`: "Great news! Your booking request has been approved."
- `booking_status`: "Approved"
- Fill in booking details, leave cancellation fields empty

**Rejection Test:**
- `email_type`: "rejection"
- `status_message`: "We're sorry, but your booking request has been declined."
- `booking_status`: "Rejected"
- Fill in booking details + rejection_reason, leave cancellation fields empty

**Cancellation Test:**
- `email_type`: "cancellation"
- `status_message`: "Your booking has been cancelled."
- `booking_status`: "" (empty)
- Fill in cancellation fields, some booking fields can be empty

