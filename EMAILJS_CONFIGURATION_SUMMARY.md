# EmailJS Configuration Summary

## ✅ Current Configuration

### Single EmailJS Account Setup

**Service ID:** `service_z8ms74u`  
**User ID (Public Key):** `GqhsogPCZps6-KE_V`  
**Template 1:** `template_44e0uoq` - OTP/Email Verification  
**Template 2:** `template_8kvqbzd` - **ALL Transaction Emails** (Reused for everything)

---

## 📧 Email Types Using `template_8kvqbzd`

All these emails use the **same template** (`template_8kvqbzd`) with different `email_type` parameters:

### 1. **Booking Notifications**
- `email_type: 'approval'` - Booking approved
- `email_type: 'rejection'` - Booking rejected
- `email_type: 'cancellation'` - Booking cancelled
- `email_type: 'reminder'` - Booking reminder
- `email_type: 'completion'` - Booking completed
- `email_type: 'new_booking'` - New booking notification to host

### 2. **Wallet Transactions**
- `email_type: 'cash_in_confirmation'` - Cash-in confirmation
- `email_type: 'withdrawal_confirmation'` - Withdrawal confirmation

### 3. **Message Notifications**
- `email_type: 'new_message'` - New message received
- `email_type: 'offer_notification'` - Offer sent/accepted/declined

### 4. **User Communications**
- `email_type: 'welcome'` - Welcome email after registration
- `email_type: 'auto_reply'` - Contact form auto-reply

### 5. **Payment Confirmations**
- `email_type: 'payment_confirmation'` - Payment confirmation (subscription, booking)

---

## 🔧 Template Setup

### Template ID: `template_8kvqbzd`

This template needs to handle **ALL** email types using the `email_type` parameter.

### Required Template Variables:

#### Common Variables (All Email Types):
- `email` or `to_email` - Recipient email (REQUIRED)
- `name` or `guest_name` - User name
- `email_type` - Email type (e.g., 'cash_in_confirmation', 'withdrawal_confirmation', 'approval', etc.)
- `booking_status` - Status message (e.g., 'Cash-In Confirmation', 'Withdrawal Confirmation')
- `status_message` - Main message content
- `action_button_text` - Button text (e.g., 'View Wallet', 'View Booking')
- `action_button_link` - Button URL

#### Cash-In Confirmation Specific:
- `amount_added` - Amount added (e.g., `₱10,000.00`)
- `new_balance` - New wallet balance
- `date_time` - Transaction date and time
- `transaction_id` - Transaction ID

#### Withdrawal Confirmation Specific:
- `amount_withdrawn` - Amount withdrawn
- `new_balance` - New wallet balance
- `paypal_email` - PayPal email
- `payout_id` - PayPal payout ID
- `date_time` - Transaction date and time

#### Booking Specific:
- `listing_title` - Listing title
- `check_in` - Check-in date
- `check_out` - Check-out date
- `total_amount` - Total amount
- `booking_id` - Booking ID
- `host_name` - Host name
- `guest_name` - Guest name

---

## 📋 EmailJS Template Configuration

### Template Settings:
- **To Email:** `{{email}}` or `{{to_email}}` (REQUIRED!)
- **From Name:** `EcoExpress`
- **From Email:** Use Default Email Address
- **Reply To:** `santosjerico420@gmail.com`

### Template HTML:
The template should use Handlebars conditionals to display different content based on `email_type`:

```html
{{#if_eq email_type "cash_in_confirmation"}}
  <!-- Cash-In Confirmation Content -->
{{/if_eq}}

{{#if_eq email_type "withdrawal_confirmation"}}
  <!-- Withdrawal Confirmation Content -->
{{/if_eq}}

{{#if_eq email_type "approval"}}
  <!-- Booking Approval Content -->
{{/if_eq}}

<!-- etc. -->
```

**Note:** If Handlebars conditionals are not supported, you can create separate templates or use a simplified version that works for all types.

---

## ✅ Code Configuration

### File: `src/services/EmailService.js`

```javascript
const EMAILJS_CONFIG = {
  SERVICE_ID: 'service_z8ms74u',
  USER_ID: 'GqhsogPCZps6-KE_V',
  TEMPLATE_ID: 'template_44e0uoq', // OTP only
  TEMPLATE_BOOKING_NOTIFICATIONS: 'template_8kvqbzd' // ALL other emails
};
```

### All Email Functions Use:
- **Service ID:** `service_z8ms74u`
- **User ID:** `GqhsogPCZps6-KE_V`
- **Template:** `template_8kvqbzd` (except OTP which uses `template_44e0uoq`)

---

## 🎯 Email Functions Available

1. ✅ `sendEmail()` - OTP emails (uses `template_44e0uoq`)
2. ✅ `sendBookingNotificationEmail()` - Booking notifications
3. ✅ `sendNewBookingNotificationToHost()` - New booking to host
4. ✅ `sendBookingReminderEmail()` - Booking reminders
5. ✅ `sendReviewReminderEmail()` - Review reminders
6. ✅ `sendBookingCompletionEmail()` - Booking completion
7. ✅ `sendMessageNotificationEmail()` - Message notifications
8. ✅ `sendWelcomeEmail()` - Welcome emails
9. ✅ `sendCashInConfirmationEmail()` - Cash-in confirmations
10. ✅ `sendWithdrawalConfirmationEmail()` - Withdrawal confirmations
11. ✅ `sendPaymentConfirmationEmail()` - Payment confirmations
12. ✅ `sendOfferNotificationEmail()` - Offer notifications
13. ✅ `sendAutoReplyEmail()` - Auto-reply emails

---

## 🚀 Summary

**✅ Configuration Status:**
- Single EmailJS account
- 2 templates:
  - `template_44e0uoq` - OTP only
  - `template_8kvqbzd` - ALL other emails (13+ email types)

**✅ All Emails Use:**
- Service ID: `service_z8ms74u`
- User ID: `GqhsogPCZps6-KE_V`
- Template: `template_8kvqbzd` (except OTP)

**✅ Ready to Use:**
- All email functions are implemented
- All emails use the same template
- Configuration is centralized and consistent

---

**Everything is configured and ready!** Just make sure your EmailJS template (`template_8kvqbzd`) handles all the different `email_type` values. 🎉

