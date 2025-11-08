# Where to Add Variables in EmailJS - Step by Step Guide

## Step-by-Step Instructions

### 1. Log into EmailJS Dashboard
- Go to [https://dashboard.emailjs.com/](https://dashboard.emailjs.com/)
- Sign in to your account

### 2. Navigate to Your Template
- Click on **"Email Templates"** in the left sidebar
- Find and click on **`template_8kvqbzd`** (or search for it)

### 3. Edit the Template
- Click the **"Edit"** button (or click on the template name)

### 4. Add Variables - Two Methods:

---

## Method 1: Variables Tab (Recommended)

1. In the template editor, look for tabs at the top:
   - **"Content"** tab (where you paste the HTML)
   - **"Variables"** tab ← **Click this one!**

2. In the **Variables** tab, you'll see a list of variables

3. **Add each variable** by clicking **"+ Add Variable"** or **"New Variable"** button

4. For each variable, enter:
   - **Variable Name**: The exact name (e.g., `to_email`, `guest_name`, etc.)
   - **Default Value**: Leave empty or add a test value (optional)

5. Add all 20 variables one by one:

```
to_email
guest_name
email_type
status_message
booking_status
listing_title
check_in
check_out
total_amount
host_name
booking_id
rejection_reason
original_amount
refund_amount
admin_deduction
cancellation_fee
cancellation_policy
cancellation_date
action_button_text
action_button_link
```

---

## Method 2: Auto-Detection (Easier!)

**EmailJS automatically detects variables from your HTML template!**

1. First, paste the HTML template in the **"Content"** tab
2. Save the template
3. EmailJS will automatically detect all variables that use `{{variable_name}}` syntax
4. Go to the **"Variables"** tab - you should see all variables already listed!
5. Review them and make sure all 20 are there

---

## Visual Guide - Where to Find Variables Tab

```
EmailJS Dashboard
├── Email Templates (click here)
│   └── template_8kvqbzd (click to edit)
│       ├── Content Tab ← Paste HTML here
│       ├── Variables Tab ← Add variables here ⭐
│       ├── Settings Tab
│       └── Test Tab
```

---

## Quick Copy-Paste List

Copy this list and add each one in the Variables tab:

```
to_email
guest_name
email_type
status_message
booking_status
listing_title
check_in
check_out
total_amount
host_name
booking_id
rejection_reason
original_amount
refund_amount
admin_deduction
cancellation_fee
cancellation_policy
cancellation_date
action_button_text
action_button_link
```

---

## Important Notes

1. **Variable names must match exactly** - Use lowercase with underscores (e.g., `to_email` not `toEmail`)

2. **Default values are optional** - You can leave them empty, or add test values like:
   - `to_email`: `test@example.com`
   - `guest_name`: `John Doe`
   - `status_message`: `Test message`

3. **After adding variables**:
   - Click **"Save"** button
   - Test the template using the **"Test"** tab

4. **If you don't see a Variables tab**:
   - Some EmailJS versions auto-detect variables from HTML
   - Just paste the HTML and save - variables will be detected automatically
   - If still not working, contact EmailJS support

---

## Testing Your Template

After adding variables:

1. Go to **"Test"** tab
2. Fill in sample values:
   ```
   to_email: your-email@example.com
   guest_name: Test User
   email_type: approval
   status_message: Great news! Your booking request has been approved.
   booking_status: Approved
   listing_title: Beautiful Beach House
   check_in: 2024-12-25
   check_out: 2024-12-30
   total_amount: ₱5,000.00
   host_name: John Host
   booking_id: BK123456
   ```
3. Click **"Send Test Email"**
4. Check your email inbox!

---

## Troubleshooting

**Q: I don't see a Variables tab**
- Try refreshing the page
- Make sure you're in the template editor (not just viewing)
- Some EmailJS plans auto-detect variables - just paste HTML and save

**Q: Variables not showing in email**
- Make sure variable names match exactly (case-sensitive)
- Check that you used `{{variable_name}}` syntax in HTML
- Make sure you saved the template after adding variables

**Q: Getting errors**
- Make sure `to_email` is always filled (it's required)
- Check that variable names don't have spaces or special characters
- Ensure you're using the correct template ID: `template_8kvqbzd`

---

## Summary

**Where to add variables:**
1. EmailJS Dashboard → Email Templates
2. Click `template_8kvqbzd`
3. Click **"Variables"** tab (or let EmailJS auto-detect from HTML)
4. Add all 20 variables
5. Save and test!

That's it! 🎉

