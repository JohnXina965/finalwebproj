# Email Template Usage Summary

## ✅ Current Setup

### Template: `template_8kvqbzd`
- **Service ID:** `service_z8ms74u`
- **User ID:** `GqhsogPCZps6-KE_V`
- **Usage:** ONLY for Booking, Cancellation, and Refund emails

---

## 📧 Email Functions Using `template_8kvqbzd`

### ✅ Booking-Related (KEEP):
1. **`sendBookingApprovalEmail`** - When booking is approved
2. **`sendBookingRejectionEmail`** - When booking is rejected  
3. **`sendCancellationRefundEmail`** - When booking is cancelled with refund

---

## 🗑️ Email Functions to REMOVE (Not booking-related):

These should NOT use `template_8kvqbzd`:

1. ~~`sendMessageNotificationEmail`~~ - Message notifications
2. ~~`sendWelcomeEmail`~~ - Welcome emails
3. ~~`sendCashInConfirmationEmail`~~ - Cash-in confirmations
4. ~~`sendWithdrawalConfirmationEmail`~~ - Withdrawal confirmations
5. ~~`sendPaymentConfirmationEmail`~~ - Payment confirmations
6. ~~`sendOfferNotificationEmail`~~ - Offer notifications
7. ~~`sendNewBookingNotificationToHost`~~ - New booking notifications to host
8. ~~`sendAutoConfirmationEmail`~~ - Auto-confirmation emails
9. ~~`sendBookingReminderEmail`~~ - Booking reminders
10. ~~`sendReviewReminderEmail`~~ - Review reminders
11. ~~`sendBookingCompletionEmail`~~ - Booking completion emails

---

## 🎯 Goal

Use `template_8kvqbzd` **ONLY** for:
- ✅ Booking approval
- ✅ Booking cancellation  
- ✅ Refund notifications

All other email types should be removed or use a different template.

