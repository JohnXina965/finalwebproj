# 🔐 ADMIN LOGIN SETUP GUIDE

## How to Access Admin Page

### Step 1: Navigate to Admin Login Page
**URL:** `http://localhost:5173/admin/login`

Or add a link in your app to navigate there.

---

## Step 2: Create Admin User Account

You need to create an admin user in Firebase. Here are two methods:

### Method 1: Manual Setup (Recommended)

1. **Sign up normally** as a regular user:
   - Go to `/signup`
   - Create an account with your email (e.g., `admin@ecoexpress.com`)
   - Complete the registration

2. **Go to Firebase Console:**
   - Visit: https://console.firebase.google.com
   - Select your project: `ecoexpress-3eae1`
   - Go to **Firestore Database**

3. **Update User Document:**
   - Find the `users` collection
   - Find your user document (by email or UID)
   - Click **Edit** on the document
   - Add this field:
     ```
     role: "admin"
     ```
   - Save the document

4. **Now you can login:**
   - Go to `/admin/login`
   - Use your email and password
   - You'll be redirected to `/admin/dashboard`

---

### Method 2: Create Admin User Programmatically

You can also create an admin user directly in Firestore:

1. **Go to Firebase Console → Firestore**
2. **Create a new document** in `users` collection
3. **Set the document ID** to your Firebase Auth UID (or use auto-generated ID)
4. **Add these fields:**
   ```
   email: "admin@ecoexpress.com"
   displayName: "Admin User"
   role: "admin"
   createdAt: [current timestamp]
   ```

5. **Create the Firebase Auth account:**
   - Go to Firebase Console → Authentication
   - Click "Add user"
   - Enter email and set a temporary password
   - User will need to change password on first login

---

## Step 3: Login to Admin Dashboard

1. Navigate to: `http://localhost:5173/admin/login`
2. Enter your admin email
3. Enter your password
4. Click "Sign In as Admin"
5. You'll be redirected to `/admin/dashboard`

---

## Troubleshooting

### "Access denied. Admin credentials required."
- **Problem:** User doesn't have `role: "admin"` in Firestore
- **Solution:** Follow Step 2 above to add the admin role

### Can't find user document
- **Problem:** User document doesn't exist in Firestore `users` collection
- **Solution:** Create the document manually or sign up first, then update the role

### Login redirects to guest page
- **Problem:** Admin role check is failing
- **Solution:** Verify `role: "admin"` field exists in Firestore user document

---

## Quick Setup Script

If you want, I can create a setup page that automatically creates an admin user. Would you like me to add that?

---

## Security Note

⚠️ **Important:** In production, you should:
- Use Firebase Admin SDK for role management
- Implement proper admin access controls
- Add IP whitelisting for admin routes
- Use environment variables for admin emails

---

## Current Admin Routes

- `/admin/login` - Admin login page
- `/admin/dashboard` - Main admin dashboard
- `/admin/service-fees` - (Coming soon)
- `/admin/analytics` - (Coming soon)
- `/admin/policy` - (Coming soon)
- `/admin/reports` - (Coming soon)
- `/admin/payments` - (Coming soon)

