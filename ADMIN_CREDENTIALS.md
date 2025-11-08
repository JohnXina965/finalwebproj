# 🔐 ADMIN CREDENTIALS

## Admin Login Credentials

**Email:** `admin@ecoexpress.com`  
**Password:** `Admin123!`

---

## How to Set Up Admin Account

### Option 1: Use Admin Setup Page (Recommended)

1. Navigate to: `http://localhost:5173/admin/setup`
2. The form will be pre-filled with admin credentials
3. Click "Create Admin Account"
4. Once created, you can login at `/admin/login`

### Option 2: Manual Setup via Firebase Console

1. **Create Firebase Auth User:**
   - Go to Firebase Console → Authentication
   - Click "Add user"
   - Email: `admin@ecoexpress.com`
   - Password: `Admin123!`
   - Click "Add user"

2. **Create Firestore User Document:**
   - Go to Firebase Console → Firestore Database
   - Navigate to `users` collection
   - Create a new document with the UID from step 1
   - Add these fields:
     ```json
     {
       "email": "admin@ecoexpress.com",
       "displayName": "Admin User",
       "role": "admin",
       "isAdmin": true,
       "createdAt": [current timestamp]
     }
     ```

3. **Login:**
   - Navigate to `/admin/login`
   - Use the credentials above

---

## Admin Routes

- `/admin/login` - Admin login page
- `/admin/dashboard` - Main admin dashboard
- `/admin/subscriptions` - Subscription & Payment Management
- `/admin/reviews` - Host Review Management
- `/admin/bookings` - Booking Management
- `/admin/users` - User Management
- `/admin/payouts` - Payout Control Center
- `/admin/settings` - Admin Settings (Service Fee Management)
- `/admin/policy` - Policy & Compliance Management
- `/admin/reports` - Report Generation

---

## Security Note

⚠️ **Important:** 
- Change the default password in production
- Use strong passwords
- Consider implementing 2FA for admin accounts
- Restrict admin access by IP if possible

