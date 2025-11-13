# Email Template Designs for Booking System

## 📧 Template 1: Cancellation & Refund Email
**Service ID:** `service_z8ms74u`  
**Template ID:** `template_8kvqbzd`

### Design Preview:
```
┌─────────────────────────────────────────────────────────┐
│  🌿 EcoExpress - Booking Cancellation & Refund          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Hello {{guest_name}},                                   │
│                                                          │
│  Your booking has been cancelled and a refund has been │
│  processed according to our cancellation policy.        │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Booking Details                                  │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ Listing: {{listing_title}}                        │  │
│  │ Booking ID: {{booking_id}}                        │  │
│  │ Cancellation Date: {{cancellation_date}}           │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Refund Breakdown                                  │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ Original Amount: {{original_amount}}              │  │
│  │ Cancellation Fee: {{cancellation_fee}}            │  │
│  │ Admin Deduction (10%): {{admin_deduction}}        │  │
│  │ ──────────────────────────────────────────────── │  │
│  │ Refund Amount: {{refund_amount}}                  │  │
│  │                                                   │  │
│  │ Policy: {{cancellation_policy}}                   │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  The refund has been credited to your wallet.          │
│                                                          │
│  [View Wallet]                                          │
│                                                          │
│  Thank you for choosing EcoExpress!                    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 📧 Template 2: Booking Approved Email
**Service ID:** `service_mwd78t3`  
**Template ID:** `template_j8neka1`

### Design Preview:
```
┌─────────────────────────────────────────────────────────┐
│  ✅ Booking Approved - EcoExpress                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Hello {{guest_name}},                                   │
│                                                          │
│  Great news! Your booking request has been approved.   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Booking Confirmation                             │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ Listing: {{listing_title}}                        │  │
│  │ Booking ID: {{booking_id}}                        │  │
│  │ Check-in: {{check_in}}                            │  │
│  │ Check-out: {{check_out}}                          │  │
│  │ Total Amount: {{total_amount}}                     │  │
│  │ Host: {{host_name}}                                │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  Your booking is confirmed! We're excited to host you. │
│                                                          │
│  [View My Trips]                                        │
│                                                          │
│  See you soon!                                          │
│  The EcoExpress Team                                    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 📧 Template 3: Booking Rejected Email
**Service ID:** `service_mwd78t3`  
**Template ID:** `template_th1vx1c`

### Design Preview:
```
┌─────────────────────────────────────────────────────────┐
│  ❌ Booking Request Declined - EcoExpress              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Hello {{guest_name}},                                   │
│                                                          │
│  We're sorry, but your booking request has been        │
│  declined by the host.                                  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Booking Details                                  │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ Listing: {{listing_title}}                        │  │
│  │ Booking ID: {{booking_id}}                        │  │
│  │ Check-in: {{check_in}}                            │  │
│  │ Check-out: {{check_out}}                          │  │
│  │ Total Amount: {{total_amount}}                     │  │
│  │ Host: {{host_name}}                                │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  Reason: {{rejection_reason}}                            │
│                                                          │
│  Don't worry! Your payment has been refunded to your    │
│  wallet. You can use it to book another amazing place.  │
│                                                          │
│  [Explore Other Listings]                               │
│                                                          │
│  We're here to help you find the perfect stay!          │
│  The EcoExpress Team                                    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 HTML Templates for EmailJS

### Template 1: Cancellation & Refund (template_8kvqbzd)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Cancellation & Refund</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 30px 20px; text-align: center;">
              <div style="position: relative; z-index: 2; margin-bottom: 20px;">
                <img src="https://i.ibb.co/Q3TwzGRT/logo.png" 
                     alt="EcoExpress Logo" 
                     style="width: 60px; height: 60px; border-radius: 10px; margin: 0 auto; display: block;" />
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">EcoEscape</h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 18px; font-weight: 500;">
                Booking Cancellation & Refund
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Hello <strong>{{guest_name}}</strong>,
              </p>
              
              <p style="margin: 0 0 30px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Your booking has been cancelled and a refund has been processed according to our cancellation policy.
              </p>
              
              <!-- Booking Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px; border: 1px solid #e5e7eb;">
                <tr>
                  <td>
                    <h3 style="margin: 0 0 15px 0; color: #111827; font-size: 18px; font-weight: 600;">
                      Booking Details
                    </h3>
                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                          <strong style="color: #374151;">Listing:</strong> {{listing_title}}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                          <strong style="color: #374151;">Booking ID:</strong> {{booking_id}}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">
                          <strong style="color: #374151;">Cancellation Date:</strong> {{cancellation_date}}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Refund Breakdown Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin-bottom: 30px; border: 2px solid #86efac;">
                <tr>
                  <td>
                    <h3 style="margin: 0 0 15px 0; color: #166534; font-size: 18px; font-weight: 600;">
                      💰 Refund Breakdown
                    </h3>
                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color: #374151; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #bbf7d0;">
                          <strong>Original Amount:</strong>
                        </td>
                        <td align="right" style="color: #374151; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #bbf7d0;">
                          {{original_amount}}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #374151; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #bbf7d0;">
                          <strong>Cancellation Fee:</strong>
                        </td>
                        <td align="right" style="color: #dc2626; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #bbf7d0;">
                          {{cancellation_fee}}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #374151; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #bbf7d0;">
                          <strong>Admin Deduction (10%):</strong>
                        </td>
                        <td align="right" style="color: #dc2626; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #bbf7d0;">
                          {{admin_deduction}}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #166534; font-size: 16px; padding: 12px 0 0 0; font-weight: 600;">
                          <strong>Refund Amount:</strong>
                        </td>
                        <td align="right" style="color: #166534; font-size: 20px; padding: 12px 0 0 0; font-weight: 700;">
                          {{refund_amount}}
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="color: #6b7280; font-size: 12px; padding: 12px 0 0 0; font-style: italic;">
                          Policy: {{cancellation_policy}}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 30px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                The refund has been credited to your wallet. You can use it for future bookings or withdraw it anytime.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="https://yourwebsite.com/trips" style="display: inline-block; background: linear-gradient(135deg, #14b8a6 0%, #10b981 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                      View Wallet
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6; text-align: center;">
                Thank you for choosing EcoExpress!<br>
                We hope to serve you again soon.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                © 2024 EcoExpress. All rights reserved.<br>
                This is an automated email. Please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

### Template 2: Booking Approved (template_j8neka1)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Approved</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 30px 20px; text-align: center;">
              <div style="position: relative; z-index: 2; margin-bottom: 20px;">
                <img src="https://i.ibb.co/Q3TwzGRT/logo.png" 
                     alt="EcoExpress Logo" 
                     style="width: 60px; height: 60px; border-radius: 10px; margin: 0 auto; display: block;" />
              </div>
              <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">EcoEscape</h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 18px; font-weight: 500;">
                Booking Approved! Your reservation is confirmed
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Hello <strong>{{guest_name}}</strong>,
              </p>
              
              <p style="margin: 0 0 30px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Great news! Your booking request has been <strong style="color: #10b981;">approved</strong> by the host. Your reservation is now confirmed!
              </p>
              
              <!-- Booking Confirmation Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin-bottom: 30px; border: 2px solid #86efac;">
                <tr>
                  <td>
                    <h3 style="margin: 0 0 15px 0; color: #166534; font-size: 18px; font-weight: 600;">
                      📋 Booking Confirmation
                    </h3>
                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color: #374151; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #bbf7d0;">
                          <strong>Listing:</strong>
                        </td>
                        <td align="right" style="color: #374151; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #bbf7d0;">
                          {{listing_title}}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #374151; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #bbf7d0;">
                          <strong>Booking ID:</strong>
                        </td>
                        <td align="right" style="color: #374151; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #bbf7d0;">
                          {{booking_id}}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #374151; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #bbf7d0;">
                          <strong>Check-in:</strong>
                        </td>
                        <td align="right" style="color: #374151; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #bbf7d0;">
                          {{check_in}}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #374151; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #bbf7d0;">
                          <strong>Check-out:</strong>
                        </td>
                        <td align="right" style="color: #374151; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #bbf7d0;">
                          {{check_out}}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #374151; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #bbf7d0;">
                          <strong>Total Amount:</strong>
                        </td>
                        <td align="right" style="color: #166534; font-size: 16px; padding: 8px 0; border-bottom: 1px solid #bbf7d0; font-weight: 600;">
                          {{total_amount}}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #374151; font-size: 14px; padding: 8px 0;">
                          <strong>Host:</strong>
                        </td>
                        <td align="right" style="color: #374151; font-size: 14px; padding: 8px 0;">
                          {{host_name}}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 30px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Your booking is confirmed! We're excited to host you. You'll receive a reminder email before your check-in date.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="https://yourwebsite.com/trips" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                      View My Trips
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6; text-align: center;">
                See you soon!<br>
                <strong>The EcoExpress Team</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                © 2024 EcoExpress. All rights reserved.<br>
                This is an automated email. Please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

### Template 3: Booking Rejected (template_th1vx1c)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Request Declined</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 30px 20px; text-align: center;">
              <div style="position: relative; z-index: 2; margin-bottom: 20px;">
                <img src="https://i.ibb.co/Q3TwzGRT/logo.png" 
                     alt="EcoExpress Logo" 
                     style="width: 60px; height: 60px; border-radius: 10px; margin: 0 auto; display: block;" />
              </div>
              <div style="font-size: 48px; margin-bottom: 10px;">❌</div>
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">EcoEscape</h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 18px; font-weight: 500;">
                Booking Request Declined - We're sorry for the inconvenience
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Hello <strong>{{guest_name}}</strong>,
              </p>
              
              <p style="margin: 0 0 30px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                We're sorry, but your booking request has been <strong style="color: #dc2626;">declined</strong> by the host.
              </p>
              
              <!-- Booking Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border-radius: 8px; padding: 20px; margin-bottom: 20px; border: 2px solid #fecaca;">
                <tr>
                  <td>
                    <h3 style="margin: 0 0 15px 0; color: #991b1b; font-size: 18px; font-weight: 600;">
                      📋 Booking Details
                    </h3>
                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color: #374151; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #fecaca;">
                          <strong>Listing:</strong>
                        </td>
                        <td align="right" style="color: #374151; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #fecaca;">
                          {{listing_title}}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #374151; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #fecaca;">
                          <strong>Booking ID:</strong>
                        </td>
                        <td align="right" style="color: #374151; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #fecaca;">
                          {{booking_id}}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #374151; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #fecaca;">
                          <strong>Check-in:</strong>
                        </td>
                        <td align="right" style="color: #374151; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #fecaca;">
                          {{check_in}}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #374151; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #fecaca;">
                          <strong>Check-out:</strong>
                        </td>
                        <td align="right" style="color: #374151; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #fecaca;">
                          {{check_out}}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #374151; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #fecaca;">
                          <strong>Total Amount:</strong>
                        </td>
                        <td align="right" style="color: #374151; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #fecaca;">
                          {{total_amount}}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #374151; font-size: 14px; padding: 8px 0;">
                          <strong>Host:</strong>
                        </td>
                        <td align="right" style="color: #374151; font-size: 14px; padding: 8px 0;">
                          {{host_name}}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Reason Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fffbeb; border-radius: 8px; padding: 20px; margin-bottom: 30px; border: 2px solid #fde68a;">
                <tr>
                  <td>
                    <h3 style="margin: 0 0 10px 0; color: #92400e; font-size: 16px; font-weight: 600;">
                      ℹ️ Reason:
                    </h3>
                    <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">
                      {{rejection_reason}}
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 30px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Don't worry! Your payment has been <strong>fully refunded</strong> to your wallet. You can use it to book another amazing place.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="https://yourwebsite.com/guest/homes" style="display: inline-block; background: linear-gradient(135deg, #14b8a6 0%, #10b981 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                      Explore Other Listings
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6; text-align: center;">
                We're here to help you find the perfect stay!<br>
                <strong>The EcoExpress Team</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                © 2024 EcoExpress. All rights reserved.<br>
                This is an automated email. Please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 📋 Required Template Variables

### Template 1 (Cancellation & Refund - template_8kvqbzd):
- `{{guest_name}}`
- `{{listing_title}}`
- `{{booking_id}}`
- `{{cancellation_date}}`
- `{{original_amount}}`
- `{{cancellation_fee}}`
- `{{admin_deduction}}`
- `{{refund_amount}}`
- `{{cancellation_policy}}`

### Template 2 (Approved - template_j8neka1):
- `{{guest_name}}`
- `{{listing_title}}`
- `{{booking_id}}`
- `{{check_in}}`
- `{{check_out}}`
- `{{total_amount}}`
- `{{host_name}}`

### Template 3 (Rejected - template_th1vx1c):
- `{{guest_name}}`
- `{{listing_title}}`
- `{{booking_id}}`
- `{{check_in}}`
- `{{check_out}}`
- `{{total_amount}}`
- `{{host_name}}`
- `{{rejection_reason}}`

---

## ✅ Next Steps

1. **Copy each HTML template** into the corresponding EmailJS template
2. **Add all required variables** in EmailJS template settings
3. **Test each template** using EmailJS test feature
4. **Update EmailService.js** to use the new service IDs and template IDs

