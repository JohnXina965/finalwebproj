# EmailJS Auto-Reply Template - Testing Instructions

## ❌ Error: "The recipients address is empty"

This error happens because EmailJS doesn't know where to send the email.

## ✅ Fix: Set "To Email" in Template Settings

### Step 1: Go to EmailJS Template Settings

1. Open your template (`template_8kvqbzd` or create a new one)
2. Go to **Template Settings**
3. Find **"To Email"** field
4. Set it to: `{{email}}` ⬅️ **THIS IS THE FIX!**

### Step 2: Test in EmailJS

**Template Parameters (fill these in):**
```
email: test@example.com          ⬅️ REQUIRED - Recipient email
to_email: test@example.com       ⬅️ REQUIRED - Same as email
name: John Doe                   ⬅️ Optional
guest_name: John Doe            ⬅️ Optional
message: This is a test message  ⬅️ Optional
status_message: We've received your message
```

**Leave these empty (they're for booking template):**
```
booking_status: (leave empty)
listing_title: (leave empty)
check_in: (leave empty)
check_out: (leave empty)
total_amount: (leave empty)
host_name: (leave empty)
booking_id: (leave empty)
rejection_reason: (leave empty)
cancellation_date: (leave empty)
original_amount: (leave empty)
cancellation_fee: (leave empty)
admin_deduction: (leave empty)
refund_amount: (leave empty)
cancellation_policy: (leave empty)
action_button_link: (leave empty)
action_button_text: (leave empty)
```

### Step 3: Test JavaScript Code

```javascript
emailjs.send("service_z8ms74u", "template_8kvqbzd", {
  email: "test@example.com",
  to_email: "test@example.com",
  name: "John Doe",
  guest_name: "John Doe",
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

## 🎯 Better Solution: Create Dedicated Auto-Reply Template

### Why Create a New Template?

1. **Cleaner** - Only has variables you need
2. **Simpler** - No booking-related fields
3. **Better** - Dedicated for contact form

### New Template Setup:

**Template Settings:**
- **Template Name**: `Auto-Reply Template`
- **Subject**: `We've received your message`
- **To Email**: `{{email}}` ⬅️ **SET THIS!**
- **From Name**: `EcoExpress`
- **Reply To**: `santosjerico420@gmail.com`

**Template Variables (only 3 needed):**
- `email` - Recipient email (required)
- `name` - Sender name
- `message` - Message content

**Template Content (Simple):**
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #14b8a6;">We've Received Your Message! 📬</h2>
  <p>Hi <strong>{{name}}</strong>,</p>
  <p>Thank you for contacting EcoExpress! We've received your message and will get back to you soon.</p>
  <div style="background: #f0fdfa; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <p><strong>Your Message:</strong></p>
    <p>{{message}}</p>
  </div>
  <p>We typically respond within 24-48 hours.</p>
  <p>Best regards,<br>The EcoExpress Team</p>
</div>
```

**Test with:**
```javascript
emailjs.send("service_z8ms74u", "YOUR_NEW_TEMPLATE_ID", {
  email: "test@example.com",
  name: "John Doe",
  message: "This is a test message"
});
```

---

## 🔍 Quick Check

### Did you set "To Email" in template settings?

**In EmailJS Template Settings:**
- ✅ **To Email**: `{{email}}` ⬅️ **MUST BE SET!**
- ✅ **From Name**: `EcoExpress`
- ✅ **Reply To**: `santosjerico420@gmail.com`

### Did you provide `email` parameter in test?

**In Test Parameters:**
- ✅ `email: "test@example.com"` ⬅️ **MUST BE PROVIDED!**
- ✅ `to_email: "test@example.com"` ⬅️ **ALSO PROVIDE THIS!**

---

## 📝 Summary

**The error "The recipients address is empty" means:**
1. ❌ "To Email" is not set in template settings, OR
2. ❌ `email` parameter is not provided in test

**Fix:**
1. ✅ Set **"To Email"** to `{{email}}` in template settings
2. ✅ Provide `email` parameter when testing: `email: "test@example.com"`

**That's it!** Once you set "To Email" in the template settings, the error will be fixed.

