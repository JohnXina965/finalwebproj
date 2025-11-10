# Auto-Reply Email Usage Summary

## ✅ Where Auto-Reply is Currently Used

### 1. **Guest Feedback Form** ✅
- **Location:** `src/components/GuestFeedback.jsx`
- **When:** When a guest submits feedback/reports an issue
- **Trigger:** After feedback is successfully saved to Firestore
- **Email Sent To:** Guest's email address
- **Content:** Auto-reply confirmation that their message was received

### 2. **Host Feedback Form** ✅
- **Location:** `src/components/HostFeedback.jsx`
- **When:** When a host submits feedback/reports an issue
- **Trigger:** After feedback is successfully saved to Firestore
- **Email Sent To:** Host's email address
- **Content:** Auto-reply confirmation that their message was received

---

## 📋 Where Auto-Reply Could Be Used (Future)

### 3. **Contact Page** (Optional)
- **Location:** Create `/contact` route and page
- **When:** When a public user (not logged in) submits a contact form
- **Use Case:** General inquiries, support requests from non-users
- **Status:** ❌ Not implemented yet (no contact page exists)

### 4. **Newsletter Signup** (Optional)
- **Location:** Landing page newsletter signup form
- **When:** When someone subscribes to newsletter
- **Use Case:** Welcome email for newsletter subscribers
- **Status:** ❌ Not implemented yet (if newsletter form exists)

### 5. **Support Request Form** (Optional)
- **Location:** Help center or support page
- **When:** When user submits a support ticket
- **Use Case:** Auto-reply with ticket number and response time
- **Status:** ❌ Not implemented yet

---

## 🎯 Current Implementation

### Auto-Reply Function:
- **Function:** `sendAutoReplyEmail()` in `src/services/EmailService.js`
- **Template:** `template_8kvqbzd`
- **Service:** `service_z8ms74u`
- **Parameters:**
  - `email` - Recipient email
  - `name` - User name
  - `message` - Message content
  - `subject` - Message subject (optional)

### Integration Points:
1. ✅ **GuestFeedback.jsx** - Sends auto-reply after feedback submission
2. ✅ **HostFeedback.jsx** - Sends auto-reply after feedback submission

---

## 📧 Auto-Reply Email Content

### Template Variables Used:
- `email` / `to_email` - Recipient email
- `name` / `guest_name` - User name
- `message` - Message content (user's feedback/description)
- `email_type` - `'auto_reply'`
- `booking_status` - `'Message Received'`
- `status_message` - `'We've received your message! We'll get back to you as soon as possible.'`
- `listing_title` - `'Contact Form Inquiry'`
- `action_button_link` - Website URL
- `action_button_text` - `'Visit Website'`

---

## ✅ Summary

**Currently Active:**
- ✅ Guest Feedback Form - Auto-reply sent
- ✅ Host Feedback Form - Auto-reply sent

**Ready to Use:**
- ✅ Auto-reply function is ready
- ✅ Template is configured
- ✅ Integration is complete

**Optional Future Use:**
- ❌ Contact page (public contact form)
- ❌ Newsletter signup confirmation
- ❌ Support ticket auto-reply

---

## 🚀 How It Works

1. **User submits feedback** via GuestFeedback or HostFeedback component
2. **Feedback is saved** to Firestore `feedback` collection
3. **Auto-reply email is sent** to user's email address
4. **User receives confirmation** that their message was received

---

**Auto-reply is now active and working!** When users submit feedback through the GuestFeedback or HostFeedback forms, they will automatically receive a confirmation email. 🎉

