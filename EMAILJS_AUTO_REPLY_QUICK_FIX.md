# EmailJS Auto-Reply Template - Quick Fix Guide

## ❌ Problem
Error: "The recipients address is empty"

## ✅ Solution

### Option 1: Create a NEW Auto-Reply Template (Recommended)

#### Step 1: Create New Template
1. Go to EmailJS Dashboard → **Email Templates**
2. Click **"Create New Template"**
3. Name: `Auto-Reply Template`

#### Step 2: Template Settings
- **Subject**: `We've received your message`
- **To Email**: `{{email}}` ⬅️ **THIS IS CRITICAL!**
- **From Name**: `EcoExpress`
- **From Email**: Use Default Email Address
- **Reply To**: `santosjerico420@gmail.com`

#### Step 3: Template Content (Simple Version)

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #14b8a6;">We've Received Your Message! 📬</h2>
  
  <p>Hi <strong>{{name}}</strong>,</p>
  
  <p>Thank you for contacting EcoExpress! We've received your message and will get back to you as soon as possible.</p>
  
  <div style="background: #f0fdfa; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <h3>Your Message:</h3>
    <p>{{message}}</p>
  </div>
  
  <p>We typically respond within 24-48 hours during business days.</p>
  
  <p>Best regards,<br>The EcoExpress Team</p>
</div>
```

#### Step 4: Template Variables
Add these variables in EmailJS:
- `email` ⬅️ **MOST IMPORTANT - For recipient address**
- `name`
- `message`

#### Step 5: Save and Get Template ID
- Save the template
- Copy the **Template ID** (e.g., `template_abc123xyz`)

#### Step 6: Update Code
Replace `template_xxxxxxxxx` in `src/services/EmailService.js` with your new Template ID.

---

### Option 2: Test with Existing Template (Quick Test)

If you want to test immediately with the existing template:

#### In EmailJS Test Interface:

**Template Parameters:**
```
to_email: test@example.com
email: test@example.com
guest_name: John Doe
name: John Doe
message: This is a test message
status_message: We've received your message
booking_status: 
listing_title: 
check_in: 
check_out: 
total_amount: 
host_name: 
booking_id: 
rejection_reason: 
cancellation_date: 
original_amount: 
cancellation_fee: 
admin_deduction: 
refund_amount: 
cancellation_policy: 
action_button_link: 
action_button_text: 
```

**Important:** You MUST fill in:
- `to_email`: `test@example.com` (or your email)
- `email`: `test@example.com` (same as to_email)

---

## 🔧 Quick Fix for Testing

### If using existing template (`template_8kvqbzd`):

In the EmailJS test interface, make sure to set:
- `to_email`: `your-email@example.com`
- `email`: `your-email@example.com`

### JavaScript Test Code:

```javascript
emailjs.send("service_z8ms74u", "template_8kvqbzd", {
  to_email: "test@example.com",
  email: "test@example.com",
  guest_name: "John Doe",
  name: "John Doe",
  message: "This is a test auto-reply message",
  status_message: "We've received your message!",
  booking_status: "",
  listing_title: "",
  check_in: "",
  check_out: "",
  total_amount: "",
  host_name: "",
  booking_id: "",
  rejection_reason: "",
  cancellation_date: "",
  original_amount: "",
  cancellation_fee: "",
  admin_deduction: "",
  refund_amount: "",
  cancellation_policy: "",
  action_button_link: "",
  action_button_text: ""
});
```

---

## ✅ Recommended Solution

**Create a NEW template** specifically for auto-reply because:
1. Cleaner - only has the variables you need
2. Simpler - no booking-related fields
3. Better - dedicated template for contact form

### New Template Variables (Minimum):
- `email` - Recipient email (required)
- `name` - Sender name
- `message` - Message content

That's it! Much simpler than the booking template.

---

## 📝 Steps Summary

1. **Create new template** in EmailJS
2. **Set "To Email"** to `{{email}}` in template settings
3. **Add variables**: `email`, `name`, `message`
4. **Copy Template ID**
5. **Update code** with new Template ID
6. **Test** with:
   ```
   email: test@example.com
   name: John Doe
   message: Test message
   ```

---

## 🎯 What You Need

**In Template Settings:**
- ✅ To Email: `{{email}}` ⬅️ **THIS FIXES THE ERROR!**
- ✅ From Name: `EcoExpress`
- ✅ Reply To: `santosjerico420@gmail.com`

**Template Variables:**
- ✅ `email` (required - for recipient)
- ✅ `name` (optional)
- ✅ `message` (optional)

That's it! The error happens because EmailJS doesn't know where to send the email. Setting `To Email: {{email}}` in the template settings fixes it.

