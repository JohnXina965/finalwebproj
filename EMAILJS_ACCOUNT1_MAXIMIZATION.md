# EmailJS Account 1 - Maximization Guide

## 📋 Current Setup (Account 1)

### Templates Available:
1. **`template_44e0uoq`** - OTP/Email Verification
2. **`template_8kvqbzd`** - Booking Notifications (multi-purpose)

### Current Usage:
- ✅ OTP emails (using `template_44e0uoq`)
- ✅ Booking approval/rejection/cancellation (using `template_8kvqbzd`)
- ✅ Booking reminders (using `template_8kvqbzd`)
- ✅ Review reminders (using `template_8kvqbzd`)
- ✅ New booking notifications to host (using `template_8kvqbzd`)

---

## 🚀 What Else We Can Do with Account 1

### 1. ✅ Message Notifications (NEW)
**Use:** `template_8kvqbzd` (booking template with `email_type: 'new_message'`)

**When to send:**
- When a guest sends a message to a host
- When a host sends a message to a guest
- When an offer is sent/received

**Implementation:** Add email notification when messages are sent

---

### 2. ✅ Welcome Emails (NEW)
**Use:** `template_8kvqbzd` (booking template with `email_type: 'welcome'`)

**When to send:**
- When a new user signs up (guest or host)
- After successful registration

**Implementation:** Send welcome email after account creation

---

### 3. ✅ Password Reset Emails (NEW)
**Use:** `template_44e0uoq` (OTP template - reuse for password reset code)

**When to send:**
- When user requests password reset
- Include reset code/link

**Implementation:** Add password reset functionality

---

### 4. ✅ Listing Status Notifications (NEW)
**Use:** `template_8kvqbzd` (booking template with `email_type: 'listing_status'`)

**When to send:**
- When listing is published/approved
- When listing is rejected
- When listing is suspended

**Implementation:** Send email when listing status changes

---

### 5. ✅ Payment Confirmation Emails (NEW)
**Use:** `template_8kvqbzd` (booking template with `email_type: 'payment_confirmation'`)

**When to send:**
- When payment is successful (wallet cash-in)
- When subscription payment is successful
- When booking payment is received

**Implementation:** Send email after successful PayPal payments

---

### 6. ✅ Subscription Reminders (NEW)
**Use:** `template_8kvqbzd` (booking template with `email_type: 'subscription_reminder'`)

**When to send:**
- Before subscription expires (7 days, 3 days, 1 day)
- When subscription expires
- When subscription is renewed

**Implementation:** Add subscription expiry tracking

---

### 7. ✅ Offer Notifications (NEW)
**Use:** `template_8kvqbzd` (booking template with `email_type: 'offer_sent'` or `'offer_accepted'`)

**When to send:**
- When host sends an offer to guest
- When guest accepts/declines offer
- When offer expires

**Implementation:** Send email when offers are created/responded to

---

### 8. ✅ Account Activity Emails (NEW)
**Use:** `template_8kvqbzd` (booking template with `email_type: 'account_activity'`)

**When to send:**
- When wallet balance changes significantly
- When withdrawal is processed
- When important account changes occur

**Implementation:** Send email for important account activities

---

## 📊 Priority List (What to Implement First)

### 🔴 HIGH PRIORITY (Implement Now)

1. **Message Notifications** ⭐⭐⭐
   - **Impact:** High - Users want to know when they receive messages
   - **Effort:** Low - Just add email send when message is created
   - **Template:** `template_8kvqbzd` with `email_type: 'new_message'`

2. **Welcome Emails** ⭐⭐⭐
   - **Impact:** High - Good user experience
   - **Effort:** Low - Add after registration
   - **Template:** `template_8kvqbzd` with `email_type: 'welcome'`

3. **Payment Confirmation** ⭐⭐⭐
   - **Impact:** High - Users want payment receipts
   - **Effort:** Medium - Add after PayPal payments
   - **Template:** `template_8kvqbzd` with `email_type: 'payment_confirmation'`

### 🟠 MEDIUM PRIORITY (Implement Soon)

4. **Listing Status Notifications** ⭐⭐
   - **Impact:** Medium - Hosts want to know when listings are approved
   - **Effort:** Low - Add when listing status changes
   - **Template:** `template_8kvqbzd` with `email_type: 'listing_status'`

5. **Offer Notifications** ⭐⭐
   - **Impact:** Medium - Important for offer system
   - **Effort:** Low - Add when offers are sent/accepted
   - **Template:** `template_8kvqbzd` with `email_type: 'offer_sent'` or `'offer_accepted'`

6. **Password Reset** ⭐⭐
   - **Impact:** Medium - Important for user recovery
   - **Effort:** Medium - Need to implement password reset flow
   - **Template:** `template_44e0uoq` (reuse OTP template)

### 🟡 LOW PRIORITY (Nice to Have)

7. **Subscription Reminders** ⭐
   - **Impact:** Low - Can use in-app notifications
   - **Effort:** Medium - Need subscription expiry tracking
   - **Template:** `template_8kvqbzd` with `email_type: 'subscription_reminder'`

8. **Account Activity Emails** ⭐
   - **Impact:** Low - Can use in-app notifications
   - **Effort:** Low - Add for important activities
   - **Template:** `template_8kvqbzd` with `email_type: 'account_activity'`

---

## 🎯 Implementation Plan

### Phase 1: High Priority (Do First) ✅

1. **Message Notifications**
   - Add email send in `GuestMessages.jsx` and `HostMessages.jsx`
   - Send when new message is created
   - Use `template_8kvqbzd` with `email_type: 'new_message'`

2. **Welcome Emails**
   - Add email send after registration in `OTPContext.jsx` or registration flow
   - Use `template_8kvqbzd` with `email_type: 'welcome'`

3. **Payment Confirmation**
   - Add email send after PayPal payment success
   - In `PayPalButton.jsx` and `HostSubscription.jsx`
   - Use `template_8kvqbzd` with `email_type: 'payment_confirmation'`

### Phase 2: Medium Priority (Do Next)

4. **Listing Status Notifications**
   - Add email send when listing status changes
   - In listing publish/review flow
   - Use `template_8kvqbzd` with `email_type: 'listing_status'`

5. **Offer Notifications**
   - Add email send when offers are sent/accepted
   - In `GuestMessages.jsx` and `HostMessages.jsx`
   - Use `template_8kvqbzd` with `email_type: 'offer_sent'` or `'offer_accepted'`

6. **Password Reset**
   - Implement password reset flow
   - Reuse `template_44e0uoq` for reset code
   - Add password reset page

---

## 📝 Template Parameter Mapping

### For `template_8kvqbzd` (Booking Template):

All these email types can use the same template with different `email_type`:

```javascript
{
  email_type: 'new_message' | 'welcome' | 'payment_confirmation' | 
              'listing_status' | 'offer_sent' | 'offer_accepted' | 
              'subscription_reminder' | 'account_activity',
  to_email: 'user@example.com',
  guest_name: 'User Name', // or host_name
  status_message: 'Custom message based on email_type',
  booking_status: 'Status text',
  listing_title: 'Listing name or N/A',
  // ... other fields can be empty or N/A
}
```

### For `template_44e0uoq` (OTP Template):

Can be reused for:
- OTP verification (current)
- Password reset code (new)

```javascript
{
  email: 'user@example.com',
  passcode: '123456', // OTP or reset code
  time: 'Expiry time',
  fullName: 'User Name'
}
```

---

## ✅ Summary

### What We Can Do with Account 1:

1. ✅ **Message Notifications** - Notify users when they receive messages
2. ✅ **Welcome Emails** - Send welcome email after registration
3. ✅ **Payment Confirmation** - Send receipt after payments
4. ✅ **Listing Status** - Notify hosts when listings are approved/rejected
5. ✅ **Offer Notifications** - Notify when offers are sent/accepted
6. ✅ **Password Reset** - Send reset code (reuse OTP template)
7. ✅ **Subscription Reminders** - Remind hosts about expiring subscriptions
8. ✅ **Account Activity** - Notify about important account changes

### Templates Usage:

- **`template_44e0uoq`**: OTP + Password Reset
- **`template_8kvqbzd`**: All other notifications (booking, message, welcome, payment, listing, offer, subscription, account activity)

### Next Steps:

1. Implement **Message Notifications** (highest impact, easiest)
2. Implement **Welcome Emails** (good UX, easy)
3. Implement **Payment Confirmation** (important, medium effort)
4. Then move to medium priority items

---

**You can do A LOT with just 2 templates!** The booking template is very flexible and can handle many different email types with the `email_type` parameter.

