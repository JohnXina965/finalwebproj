# EmailJS Cash-In & Withdrawal Confirmation Email Template

## 📧 Template Setup

### Template ID: `template_8kvqbzd`

Update your EmailJS template to handle `cash_in_confirmation` and `withdrawal_confirmation` email types.

---

## 🎨 Cash-In Confirmation Email Template

### Template Parameters:
- `email_type`: `cash_in_confirmation`
- `to_email`: Recipient email
- `name`: User name
- `guest_name`: User name (same as name)
- `booking_status`: `Cash-In Confirmation`
- `status_message`: `This is a confirmation that you have successfully added funds to your EcoExpress e-wallet. 💰`
- `listing_title`: `Cash-In Details`
- `amount_added`: `₱10,000.00` (formatted amount)
- `new_balance`: `₱10,000.00` (formatted new balance)
- `date_time`: `11/8/2025, 7:35:10 PM` (formatted date and time)
- `transaction_id`: Transaction ID
- `action_button_text`: `View Wallet`
- `action_button_link`: Wallet URL

### HTML Template (for EmailJS):

```html
<div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
  
  <!-- Header with Logo -->
  <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 30px 20px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">EcoExpress</h1>
  </div>

  <!-- Content -->
  <div style="padding: 30px;">
    
    <!-- Title -->
    <h2 style="color: #1f2937; font-size: 24px; font-weight: 700; margin: 0 0 20px; text-align: center;">
      {{#if_eq email_type "cash_in_confirmation"}}Cash-In Confirmation{{/if_eq}}
      {{#if_eq email_type "withdrawal_confirmation"}}Withdrawal Confirmation{{/if_eq}}
    </h2>
    
    <!-- Greeting -->
    <p style="padding-top: 16px; border-top: 1px solid #eaeaea; margin-top: 20px;">
      Hi <strong>{{name}}</strong>,
    </p>
    
    <!-- Status Message -->
    <p style="color: #4b5563; margin: 20px 0; font-size: 16px;">
      {{status_message}}
    </p>

    <!-- Transaction Details -->
    <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 30px 0; border-left: 4px solid #14b8a6;">
      <h3 style="color: #1f2937; font-size: 18px; font-weight: 600; margin: 0 0 20px;">
        {{#if_eq email_type "cash_in_confirmation"}}Cash-In Details{{/if_eq}}
        {{#if_eq email_type "withdrawal_confirmation"}}Withdrawal Details{{/if_eq}}
      </h3>
      
      <!-- Amount Added/Withdrawn -->
      <div style="margin-bottom: 15px;">
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 5px;">
          {{#if_eq email_type "cash_in_confirmation"}}Amount Added:{{/if_eq}}
          {{#if_eq email_type "withdrawal_confirmation"}}Amount Withdrawn:{{/if_eq}}
        </p>
        <p style="color: #1f2937; font-size: 20px; font-weight: 700; margin: 0;">
          {{#if_eq email_type "cash_in_confirmation"}}{{amount_added}}{{/if_eq}}
          {{#if_eq email_type "withdrawal_confirmation"}}{{amount_withdrawn}}{{/if_eq}}
        </p>
      </div>

      <!-- New Balance -->
      <div style="margin-bottom: 15px;">
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 5px;">New Wallet Balance:</p>
        <p style="color: #1f2937; font-size: 20px; font-weight: 700; margin: 0;">{{new_balance}}</p>
      </div>

      <!-- Date & Time -->
      <div style="margin-bottom: 15px;">
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 5px;">Date & Time:</p>
        <p style="color: #1f2937; font-size: 16px; margin: 0;">{{date_time}}</p>
      </div>

      <!-- PayPal Email (for withdrawal) -->
      {{#if_eq email_type "withdrawal_confirmation"}}
      <div style="margin-bottom: 15px;">
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 5px;">PayPal Email:</p>
        <p style="color: #1f2937; font-size: 16px; margin: 0;">{{paypal_email}}</p>
      </div>
      {{/if_eq}}

      <!-- Payout ID (for withdrawal) -->
      {{#if_eq email_type "withdrawal_confirmation"}}
      <div style="margin-bottom: 15px;">
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 5px;">Payout ID:</p>
        <p style="color: #1f2937; font-size: 14px; margin: 0; font-family: monospace;">{{payout_id}}</p>
      </div>
      {{/if_eq}}
    </div>

    <!-- Message -->
    <p style="color: #4b5563; margin: 20px 0; font-size: 16px; text-align: center;">
      {{#if_eq email_type "cash_in_confirmation"}}
      You can now use your wallet to book, host, or join exciting experiences on EcoExpress! Thank you for trusting us. ❤️
      {{/if_eq}}
      {{#if_eq email_type "withdrawal_confirmation"}}
      The funds have been sent to your PayPal account. Thank you for using EcoExpress! ❤️
      {{/if_eq}}
    </p>

    <!-- Action Button -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{action_button_link}}" style="display: inline-block; background: #14b8a6; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
        {{action_button_text}}
      </a>
    </div>

    <!-- Closing -->
    <p style="padding-top: 16px; border-top: 1px solid #eaeaea; margin-top: 30px; color: #6b7280; font-size: 14px;">
      Cheers,<br />
      <strong style="color: #14b8a6;">The EcoExpress Team</strong>
    </p>

    <!-- Tagline -->
    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 20px 0;">
      Discover. Experience. Celebrate.
    </p>
  </div>

  <!-- Footer -->
  <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
    <p style="color: #9ca3af; font-size: 12px; margin: 0 0 10px;">
      © 2025 EcoExpress. All rights reserved.
    </p>
    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
      <a href="{{action_button_link}}" style="color: #14b8a6; text-decoration: none;">Visit our website</a> | 
      <a href="mailto:santosjerico420@gmail.com" style="color: #14b8a6; text-decoration: none;">Contact Support</a>
    </p>
    <p style="color: #9ca3af; font-size: 10px; margin: 10px 0 0;">
      Email sent via EmailJS.com
    </p>
  </div>
</div>
```

---

## 📋 Simplified Version (Without Handlebars Conditionals)

If your EmailJS template doesn't support Handlebars conditionals, you can create separate templates or use this simplified version:

### For Cash-In:

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
  <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 30px 20px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">EcoExpress</h1>
  </div>
  
  <div style="padding: 30px;">
    <h2 style="color: #1f2937; font-size: 24px; font-weight: 700; margin: 0 0 20px; text-align: center;">
      Cash-In Confirmation
    </h2>
    
    <p>Hi <strong>{{name}}</strong>,</p>
    
    <p>This is a confirmation that you have successfully added funds to your EcoExpress e-wallet. 💰</p>
    
    <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 30px 0; border-left: 4px solid #14b8a6;">
      <h3 style="color: #1f2937; font-size: 18px; font-weight: 600; margin: 0 0 20px;">Cash-In Details</h3>
      
      <div style="margin-bottom: 15px;">
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 5px;">Amount Added:</p>
        <p style="color: #1f2937; font-size: 20px; font-weight: 700; margin: 0;">{{amount_added}}</p>
      </div>

      <div style="margin-bottom: 15px;">
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 5px;">New Wallet Balance:</p>
        <p style="color: #1f2937; font-size: 20px; font-weight: 700; margin: 0;">{{new_balance}}</p>
      </div>

      <div style="margin-bottom: 15px;">
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 5px;">Date & Time:</p>
        <p style="color: #1f2937; font-size: 16px; margin: 0;">{{date_time}}</p>
      </div>
    </div>

    <p style="text-align: center;">
      You can now use your wallet to book, host, or join exciting experiences on EcoExpress! Thank you for trusting us. ❤️
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{action_button_link}}" style="display: inline-block; background: #14b8a6; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
        View Wallet
      </a>
    </div>

    <p>Cheers,<br /><strong>The EcoExpress Team</strong></p>
    
    <p style="text-align: center; color: #9ca3af; font-size: 12px;">Discover. Experience. Celebrate.</p>
  </div>

  <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
      © 2025 EcoExpress. All rights reserved.
    </p>
    <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0;">
      Email sent via EmailJS.com
    </p>
  </div>
</div>
```

### For Withdrawal:

Same as above, but replace:
- "Cash-In Confirmation" → "Withdrawal Confirmation"
- "Amount Added" → "Amount Withdrawn"
- Add PayPal email and Payout ID fields
- Change message to: "The funds have been sent to your PayPal account."

---

## ✅ Template Variables Summary

### Cash-In Confirmation:
- `email_type`: `cash_in_confirmation`
- `name`: User name
- `amount_added`: `₱10,000.00`
- `new_balance`: `₱10,000.00`
- `date_time`: `11/8/2025, 7:35:10 PM`
- `transaction_id`: Transaction ID
- `action_button_link`: Wallet URL

### Withdrawal Confirmation:
- `email_type`: `withdrawal_confirmation`
- `name`: User name
- `amount_withdrawn`: `₱10,000.00`
- `new_balance`: `₱10,000.00`
- `paypal_email`: PayPal email
- `payout_id`: PayPal payout ID
- `date_time`: `11/8/2025, 7:35:10 PM`
- `action_button_link`: Wallet URL

---

## 🚀 Implementation Status

✅ **Code Updated:**
- `src/services/EmailService.js` - Added `sendCashInConfirmationEmail()` and `sendWithdrawalConfirmationEmail()`
- `src/components/WalletModal.jsx` - Integrated cash-in and withdrawal email confirmations

✅ **Ready to Use:**
- Cash-in confirmation emails are sent after successful wallet top-up
- Withdrawal confirmation emails are sent after successful PayPal withdrawal

---

## 📝 Next Steps

1. **Update EmailJS Template:**
   - Go to EmailJS Dashboard
   - Open template `template_8kvqbzd`
   - Add the HTML template above
   - Save the template

2. **Test:**
   - Perform a cash-in transaction
   - Check email for cash-in confirmation
   - Perform a withdrawal transaction
   - Check email for withdrawal confirmation

3. **Customize:**
   - Update colors, fonts, or layout as needed
   - Add your logo image if desired
   - Adjust messaging to match your brand

---

**Everything is ready!** Just update your EmailJS template with the HTML above, and the emails will be sent automatically when users cash in or withdraw. 🎉

