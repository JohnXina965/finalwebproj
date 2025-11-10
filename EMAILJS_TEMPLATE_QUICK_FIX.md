# EmailJS Template Quick Fix - template_8kvqbzd

## ✅ The Problem

You're getting **"The recipients address is empty"** error because:
- ❌ You're using `{{email}}` in the "To Email" field
- ✅ But the code is sending `to_email` parameter (not `email`)

---

## 🔧 The Fix

### Step 1: Open EmailJS Dashboard
1. Login to EmailJS
2. Go to **Email Templates**
3. Find template `template_8kvqbzd`
4. Click **Edit**

### Step 2: Fix the "To Email" Field

**Change this:**
```
{{email}}  ❌
```

**To this:**
```
{{to_email}}  ✅
```

### Step 3: Template Settings

**Make sure these settings are correct:**

- **To Email:** `{{to_email}}` ✅
- **Subject:** `{{booking_status}} - {{listing_title}}`
- **From Name:** EcoExpress
- **From Email:** Use Default Email Address

---

## 📋 Parameters Being Sent

The code sends these parameters:

### Always Sent:
- `to_email` - ✅ **Use this in "To Email" field**
- `guest_name`
- `email_type` - `'approval'`, `'rejection'`, or `'cancellation'`
- `booking_status` - "Approved", "Rejected", or "Cancelled"
- `status_message`
- `listing_title`
- `check_in`
- `check_out`
- `total_amount`
- `booking_id`
- `host_name`
- `action_button_text`
- `action_button_link`

### For Rejection:
- `rejection_reason`

### For Cancellation:
- `original_amount`
- `refund_amount`
- `admin_deduction`
- `cancellation_fee`
- `cancellation_policy`
- `cancellation_date`

---

## ✅ Why This Happens

- **OTP Template** uses `{{email}}` because the OTP function sends `email` parameter
- **Booking Template** uses `{{to_email}}` because the booking function sends `to_email` parameter

Both templates are different, so they use different parameter names! 😊

---

## 🎯 Quick Test

After changing to `{{to_email}}`:

1. **Save the template** in EmailJS
2. **Test booking approval:**
   - Approve a booking in your app
   - Check the guest's email
   - ✅ Email should be received!

3. **Test booking rejection:**
   - Reject a booking
   - Check email
   - ✅ Should work!

4. **Test cancellation:**
   - Cancel a booking
   - Check email
   - ✅ Should work!

---

## 📝 Summary

**The fix is simple:**
- Change `{{email}}` → `{{to_email}}` in the "To Email" field
- Save the template
- Test!

**You're absolutely correct!** The issue was using the wrong parameter name. Once you change it to `{{to_email}}`, everything should work perfectly! 🎉

---

## 🔍 How to Verify

After saving, you can test the template in EmailJS:
1. Click **Test** button in EmailJS template editor
2. Fill in test parameters:
   - `to_email`: your test email
   - `guest_name`: Test User
   - `email_type`: approval
   - `booking_status`: Approved
   - etc.
3. Send test email
4. ✅ Should receive the email!

---

**That's it! Just change `{{email}}` to `{{to_email}}` and you're good to go!** 🚀

