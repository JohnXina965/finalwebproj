# EmailJS Template Setup Guide - template_8kvqbzd

## 📧 Template Configuration

**Template ID:** `template_8kvqbzd`  
**Service ID:** `service_z8ms74u`  
**User ID:** `GqhsogPCZps6-KE_V`

---

## 🎯 What This Template Is Used For

This template is **ONLY** used for:
1. **Booking Approval** - When a host approves a guest's booking
2. **Booking Rejection** - When a host rejects a guest's booking
3. **Booking Cancellation & Refund** - When a booking is cancelled and refund is processed

---

## 📋 Template Parameters Being Sent

### Common Parameters (All Email Types):
- `to_email` - Recipient email address
- `guest_name` - Guest's name
- `email_type` - `'approval'`, `'rejection'`, or `'cancellation'`
- `booking_status` - Status text (e.g., "Approved", "Rejected", "Cancelled")
- `status_message` - Main message
- `listing_title` - Listing title
- `check_in` - Check-in date
- `check_out` - Check-out date
- `total_amount` - Total booking amount (formatted as ₱X,XXX.XX)
- `booking_id` - Booking ID
- `host_name` - Host's name
- `action_button_text` - Button text (e.g., "View My Trips")
- `action_button_link` - Button link URL

### Approval-Specific Parameters:
- All common parameters
- No additional fields

### Rejection-Specific Parameters:
- `rejection_reason` - Reason for rejection

### Cancellation-Specific Parameters:
- `original_amount` - Original booking amount
- `refund_amount` - Refund amount
- `admin_deduction` - Admin service fee deduction
- `cancellation_fee` - Cancellation fee
- `cancellation_policy` - Cancellation policy description
- `cancellation_date` - Date of cancellation

---

## 🎨 EmailJS Template HTML Setup

### Step 1: Go to EmailJS Dashboard
1. Login to your EmailJS account
2. Go to **Email Templates**
3. Find template `template_8kvqbzd`
4. Click **Edit**

### Step 2: Configure Template Settings

**Template Settings:**
- **Template Name:** Booking Notifications (or any name you prefer)
- **Subject:** `{{booking_status}} - {{listing_title}}`
- **To Email:** `{{to_email}}`
- **From Name:** EcoExpress
- **From Email:** Use Default Email Address
- **Reply To:** (your support email)

### Step 3: Template HTML Content

Use this HTML template with conditional logic:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{booking_status}}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    
    <!-- Header -->
    <div style="text-align: center; padding: 20px; background-color: #14b8a6; color: white; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">EcoExpress</h1>
    </div>
    
    <!-- Main Content -->
    <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
        
        <!-- Greeting -->
        <p style="font-size: 16px; margin-bottom: 20px;">
            Hi {{guest_name}},
        </p>
        
        <!-- Status Message -->
        <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #14b8a6;">
            <h2 style="margin-top: 0; color: #14b8a6; font-size: 20px;">{{booking_status}}</h2>
            <p style="font-size: 16px; margin-bottom: 0;">{{status_message}}</p>
        </div>
        
        <!-- Booking Details (For Approval and Rejection) -->
        {{#if (eq email_type "approval")}}
        <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #333; font-size: 18px;">Booking Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; font-weight: bold; width: 40%;">Listing:</td>
                    <td style="padding: 8px 0;">{{listing_title}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Host:</td>
                    <td style="padding: 8px 0;">{{host_name}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Check-in:</td>
                    <td style="padding: 8px 0;">{{check_in}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Check-out:</td>
                    <td style="padding: 8px 0;">{{check_out}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Total Amount:</td>
                    <td style="padding: 8px 0; font-size: 18px; color: #14b8a6; font-weight: bold;">{{total_amount}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Booking ID:</td>
                    <td style="padding: 8px 0;">{{booking_id}}</td>
                </tr>
            </table>
        </div>
        {{/if}}
        
        <!-- Rejection Details -->
        {{#if (eq email_type "rejection")}}
        <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #333; font-size: 18px;">Booking Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; font-weight: bold; width: 40%;">Listing:</td>
                    <td style="padding: 8px 0;">{{listing_title}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Host:</td>
                    <td style="padding: 8px 0;">{{host_name}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Check-in:</td>
                    <td style="padding: 8px 0;">{{check_in}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Check-out:</td>
                    <td style="padding: 8px 0;">{{check_out}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Total Amount:</td>
                    <td style="padding: 8px 0;">{{total_amount}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Booking ID:</td>
                    <td style="padding: 8px 0;">{{booking_id}}</td>
                </tr>
            </table>
            {{#if rejection_reason}}
            <div style="margin-top: 15px; padding: 15px; background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px;">
                <p style="margin: 0; font-weight: bold; color: #991b1b;">Reason for Rejection:</p>
                <p style="margin: 5px 0 0 0; color: #7f1d1d;">{{rejection_reason}}</p>
            </div>
            {{/if}}
        </div>
        {{/if}}
        
        <!-- Cancellation & Refund Details -->
        {{#if (eq email_type "cancellation")}}
        <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #333; font-size: 18px;">Cancellation Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; font-weight: bold; width: 40%;">Listing:</td>
                    <td style="padding: 8px 0;">{{listing_title}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Check-in:</td>
                    <td style="padding: 8px 0;">{{check_in}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Check-out:</td>
                    <td style="padding: 8px 0;">{{check_out}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Booking ID:</td>
                    <td style="padding: 8px 0;">{{booking_id}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Cancellation Date:</td>
                    <td style="padding: 8px 0;">{{cancellation_date}}</td>
                </tr>
            </table>
            
            <div style="margin-top: 20px; padding: 20px; background-color: #f0fdf4; border-left: 4px solid #10b981; border-radius: 4px;">
                <h4 style="margin-top: 0; color: #065f46; font-size: 16px;">Refund Summary</h4>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold;">Original Amount:</td>
                        <td style="padding: 8px 0; text-align: right;">{{original_amount}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold;">Cancellation Fee:</td>
                        <td style="padding: 8px 0; text-align: right;">{{cancellation_fee}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold;">Admin Deduction:</td>
                        <td style="padding: 8px 0; text-align: right;">{{admin_deduction}}</td>
                    </tr>
                    <tr style="border-top: 2px solid #10b981; margin-top: 10px;">
                        <td style="padding: 12px 0; font-weight: bold; font-size: 18px; color: #065f46;">Refund Amount:</td>
                        <td style="padding: 12px 0; text-align: right; font-weight: bold; font-size: 18px; color: #065f46;">{{refund_amount}}</td>
                    </tr>
                </table>
                {{#if cancellation_policy}}
                <p style="margin-top: 15px; font-size: 14px; color: #047857;">
                    <strong>Cancellation Policy:</strong> {{cancellation_policy}}
                </p>
                {{/if}}
            </div>
        </div>
        {{/if}}
        
        <!-- Action Button -->
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{action_button_link}}" style="display: inline-block; padding: 12px 30px; background-color: #14b8a6; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                {{action_button_text}}
            </a>
        </div>
        
        <!-- Footer -->
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
            <p style="margin: 0;">Thank you for using EcoExpress!</p>
            <p style="margin: 5px 0 0 0;">If you have any questions, please contact our support team.</p>
            <p style="margin: 15px 0 0 0; font-size: 12px;">© 2025 EcoExpress. All rights reserved.</p>
        </div>
        
    </div>
</body>
</html>
```

---

## ⚠️ Important Notes

### Handlebars Conditionals
EmailJS uses Handlebars for conditionals. However, if your EmailJS plan doesn't support advanced Handlebars helpers like `eq`, use this simpler approach:

```html
<!-- Simple conditional based on email_type -->
{{#if email_type}}
  <!-- Check if email_type is "approval" -->
  {{#if (contains email_type "approval")}}
    <!-- Approval content -->
  {{/if}}
  
  <!-- Check if email_type is "rejection" -->
  {{#if (contains email_type "rejection")}}
    <!-- Rejection content -->
  {{/if}}
  
  <!-- Check if email_type is "cancellation" -->
  {{#if (contains email_type "cancellation")}}
    <!-- Cancellation content -->
  {{/if}}
{{/if}}
```

### Alternative: Separate Sections (Simpler)
If conditionals don't work, you can create a simpler template that shows all fields and uses empty values for fields that don't apply:

```html
<!-- Always show booking details (will be empty for cancellation) -->
<table>
    <tr>
        <td>Listing:</td>
        <td>{{listing_title}}</td>
    </tr>
    <tr>
        <td>Check-in:</td>
        <td>{{check_in}}</td>
    </tr>
    <!-- etc -->
</table>

<!-- Show refund details if refund_amount is not empty -->
{{#if refund_amount}}
<div>
    <h3>Refund Summary</h3>
    <p>Refund Amount: {{refund_amount}}</p>
</div>
{{/if}}
```

---

## ✅ Testing Steps

1. **Save the template** in EmailJS dashboard
2. **Test with Approval:**
   - Create a test booking approval
   - Check if email is received
   - Verify all fields are displayed correctly

3. **Test with Rejection:**
   - Create a test booking rejection
   - Check if email is received
   - Verify rejection reason is displayed

4. **Test with Cancellation:**
   - Create a test booking cancellation
   - Check if email is received
   - Verify refund details are displayed correctly

---

## 🚀 Quick Setup Checklist

- [ ] Open EmailJS dashboard
- [ ] Edit template `template_8kvqbzd`
- [ ] Set "To Email" to `{{to_email}}`
- [ ] Set "Subject" to `{{booking_status}} - {{listing_title}}`
- [ ] Copy HTML template content
- [ ] Save template
- [ ] Test with a booking approval
- [ ] Test with a booking rejection
- [ ] Test with a booking cancellation

---

## 📝 Template Parameters Reference

Make sure all these parameters are available in your EmailJS template:
- `to_email`
- `guest_name`
- `email_type`
- `booking_status`
- `status_message`
- `listing_title`
- `check_in`
- `check_out`
- `total_amount`
- `booking_id`
- `host_name`
- `rejection_reason` (for rejection)
- `original_amount` (for cancellation)
- `refund_amount` (for cancellation)
- `admin_deduction` (for cancellation)
- `cancellation_fee` (for cancellation)
- `cancellation_policy` (for cancellation)
- `cancellation_date` (for cancellation)
- `action_button_text`
- `action_button_link`

---

**That's it!** Your template is now ready to handle booking, cancellation, and refund emails. 🎉

