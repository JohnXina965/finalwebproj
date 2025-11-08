const EMAILJS_CONFIG = {
  SERVICE_ID: 'service_z8ms74u',
  TEMPLATE_ID: 'template_44e0uoq', // OTP template
  USER_ID: 'GqhsogPCZps6-KE_V',
  // Single template for all booking notifications
  TEMPLATE_BOOKING_NOTIFICATIONS: 'template_8kvqbzd' // Combined template for approval/rejection/cancellation
};

export const initEmailJS = () => {
  if (typeof window !== 'undefined' && window.emailjs) {
    window.emailjs.init(EMAILJS_CONFIG.USER_ID);
    console.log('EmailJS initialized');
  }
};

export const sendEmail = async (email, otp, userData = {}) => {
  try {
    if (typeof window === 'undefined' || !window.emailjs) {
      throw new Error('EmailJS not available. Make sure the script is loaded.');
    }

    const templateParams = {
      email: email,
      passcode: otp,
      time: getExpiryTime(),
      fullName: userData.name || 'User' // ADD THIS LINE
    };

    console.log('Sending OTP email to:', email);
    console.log('Using template parameters:', templateParams);
    console.log('User full name:', userData.name); // Debug log

    const response = await window.emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.TEMPLATE_ID,
      templateParams
    );

    console.log('Email sent successfully:', response);
    return response;
  } catch (error) {
    console.error('EmailJS error details:', error);
    throw new Error('Failed to send verification email: ' + (error.text || error.message));
  }
};

const getExpiryTime = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 15);
  return now.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
};

/**
 * Send booking notification email (unified function for all types)
 * Uses a single template with email_type parameter
 */
export const sendBookingNotificationEmail = async (guestEmail, guestName, details, emailType) => {
  try {
    // Wait for EmailJS to be available
    if (typeof window === 'undefined') {
      throw new Error('Window object not available');
    }

    // Check if EmailJS is loaded
    if (!window.emailjs) {
      console.error('EmailJS not loaded. Waiting for script...');
      // Wait a bit for script to load
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (!window.emailjs) {
        throw new Error('EmailJS script not loaded. Please check if the script is included in index.html');
      }
    }

    // Initialize EmailJS if not already initialized
    if (!window.emailjs.init) {
      console.warn('EmailJS init function not found');
    } else {
      try {
        window.emailjs.init(EMAILJS_CONFIG.USER_ID);
      } catch (initError) {
        console.warn('EmailJS already initialized or init failed:', initError);
      }
    }

    // Prepare common parameters
    const templateParams = {
      to_email: guestEmail,
      guest_name: guestName || 'Guest',
      email_type: emailType, // 'approval', 'rejection', or 'cancellation'
      
      // Common fields (will be empty for cancellation)
      booking_status: emailType === 'approval' ? 'Approved' : (emailType === 'rejection' ? 'Rejected' : 'Cancelled'),
      status_message: emailType === 'approval' 
        ? 'Great news! Your booking request has been approved.' 
        : (emailType === 'rejection' 
          ? 'We\'re sorry, but your booking request has been declined.' 
          : 'Your booking has been cancelled.'),
      listing_title: details.listingTitle || 'Your Booking',
      check_in: details.checkIn ? (details.checkIn instanceof Date ? details.checkIn.toLocaleDateString('en-US') : details.checkIn) : '',
      check_out: details.checkOut ? (details.checkOut instanceof Date ? details.checkOut.toLocaleDateString('en-US') : details.checkOut) : '',
      total_amount: details.totalAmount ? `₱${details.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '',
      booking_id: details.bookingId || 'N/A',
      host_name: details.hostName || 'Host',
      rejection_reason: details.rejectionReason || '',
      
      // Cancellation-specific fields (will be empty for approval/rejection)
      original_amount: details.originalAmount ? `₱${details.originalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '₱0.00',
      refund_amount: details.refundAmount ? `₱${details.refundAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '₱0.00',
      admin_deduction: details.adminDeduction ? `₱${details.adminDeduction.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '₱0.00',
      cancellation_fee: details.cancellationFee ? `₱${details.cancellationFee.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '₱0.00',
      cancellation_policy: details.cancellationPolicy || 'Standard cancellation policy',
      cancellation_date: details.cancellationDate || new Date().toLocaleDateString('en-US'),
      
      // Action buttons
      action_button_text: emailType === 'approval' ? 'View My Trips' : (emailType === 'rejection' ? 'Explore Other Listings' : 'View Wallet'),
      action_button_link: emailType === 'approval' ? 'https://yourwebsite.com/trips' : (emailType === 'rejection' ? 'https://yourwebsite.com/guest/homes' : 'https://yourwebsite.com/wallet')
    };

    console.log(`📧 Sending ${emailType} email to:`, guestEmail);
    console.log('📧 Template parameters:', templateParams);

    const response = await window.emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.TEMPLATE_BOOKING_NOTIFICATIONS,
      templateParams
    );

    console.log(`✅ Booking ${emailType} email sent successfully:`, response);
    console.log('📧 Response status:', response.status);
    console.log('📧 Response text:', response.text);
    return response;
  } catch (error) {
    console.error(`❌ EmailJS error sending booking ${emailType} email:`, error);
    console.error('❌ Error details:', {
      message: error.message,
      text: error.text,
      status: error.status,
      stack: error.stack
    });
    // Re-throw with more details
    throw new Error(`Failed to send booking ${emailType} email: ${error.text || error.message || 'Unknown error'}`);
  }
};

/**
 * Send booking approval email to guest
 */
export const sendBookingApprovalEmail = async (guestEmail, guestName, bookingDetails) => {
  return sendBookingNotificationEmail(guestEmail, guestName, bookingDetails, 'approval');
};

/**
 * Send booking rejection email to guest
 */
export const sendBookingRejectionEmail = async (guestEmail, guestName, bookingDetails) => {
  return sendBookingNotificationEmail(guestEmail, guestName, bookingDetails, 'rejection');
};

/**
 * Send cancellation refund email to guest
 */
export const sendCancellationRefundEmail = async (guestEmail, guestName, cancellationDetails) => {
  return sendBookingNotificationEmail(guestEmail, guestName, cancellationDetails, 'cancellation');
};

/**
 * Send booking created notification to host
 */
export const sendNewBookingNotificationToHost = async (hostEmail, hostName, bookingDetails) => {
  try {
    if (typeof window === 'undefined' || !window.emailjs) {
      console.warn('EmailJS not available. Skipping host notification.');
      return;
    }

    // Initialize EmailJS if needed
    try {
      window.emailjs.init(EMAILJS_CONFIG.USER_ID);
    } catch (initError) {
      console.warn('EmailJS already initialized or init failed:', initError);
    }

    const templateParams = {
      to_email: hostEmail,
      host_name: hostName || 'Host',
      email_type: 'new_booking',
      booking_status: 'New Booking Request',
      status_message: 'You have received a new booking request that requires your attention.',
      listing_title: bookingDetails.listingTitle || 'Your Listing',
      guest_name: bookingDetails.guestName || 'Guest',
      check_in: bookingDetails.checkIn ? (bookingDetails.checkIn instanceof Date ? bookingDetails.checkIn.toLocaleDateString('en-US') : bookingDetails.checkIn) : '',
      check_out: bookingDetails.checkOut ? (bookingDetails.checkOut instanceof Date ? bookingDetails.checkOut.toLocaleDateString('en-US') : bookingDetails.checkOut) : '',
      guests: bookingDetails.guests || 1,
      total_amount: bookingDetails.totalAmount ? `₱${bookingDetails.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '',
      booking_id: bookingDetails.bookingId || 'N/A',
      action_button_text: 'View Booking',
      action_button_link: 'https://yourwebsite.com/host/dashboard?section=bookings'
    };

    console.log('📧 Sending new booking notification to host:', hostEmail);

    const response = await window.emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.TEMPLATE_BOOKING_NOTIFICATIONS,
      templateParams
    );

    console.log('✅ New booking notification sent to host:', response);
    return response;
  } catch (error) {
    console.error('❌ Error sending new booking notification to host:', error);
    // Don't throw - this is a non-critical notification
  }
};

/**
 * Send auto-confirmation notification to guest
 */
export const sendAutoConfirmationEmail = async (guestEmail, guestName, bookingDetails) => {
  try {
    const details = {
      ...bookingDetails,
      autoConfirmed: true,
      autoConfirmReason: 'Your booking was automatically confirmed because the host did not respond within 24 hours.'
    };
    
    return sendBookingNotificationEmail(guestEmail, guestName, details, 'approval');
  } catch (error) {
    console.error('❌ Error sending auto-confirmation email:', error);
    // Don't throw - this is a non-critical notification
  }
};

/**
 * Send booking reminder email (check-in reminders)
 */
export const sendBookingReminderEmail = async (guestEmail, guestName, reminderDetails) => {
  try {
    if (typeof window === 'undefined' || !window.emailjs) {
      console.warn('EmailJS not available. Skipping reminder notification.');
      return;
    }

    // Initialize EmailJS if needed
    try {
      window.emailjs.init(EMAILJS_CONFIG.USER_ID);
    } catch (initError) {
      console.warn('EmailJS already initialized or init failed:', initError);
    }

    const templateParams = {
      to_email: guestEmail,
      guest_name: guestName || 'Guest',
      email_type: 'reminder',
      booking_status: 'Upcoming Check-in',
      status_message: reminderDetails.reminderMessage || 'Don\'t forget about your upcoming stay!',
      listing_title: reminderDetails.listingTitle || 'Booking',
      check_in: reminderDetails.checkIn || 'N/A',
      check_out: reminderDetails.checkOut || 'N/A',
      booking_id: reminderDetails.bookingId || 'N/A',
      reminder_type: reminderDetails.reminderType || 'check_in',
      action_button_text: 'View Booking',
      action_button_link: 'https://yourwebsite.com/trips'
    };

    console.log('📧 Sending booking reminder to:', guestEmail);

    const response = await window.emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.TEMPLATE_BOOKING_NOTIFICATIONS,
      templateParams
    );

    console.log('✅ Booking reminder sent:', response);
    return response;
  } catch (error) {
    console.error('❌ Error sending booking reminder:', error);
    // Don't throw - this is a non-critical notification
  }
};

/**
 * Send review reminder email after check-out
 */
export const sendReviewReminderEmail = async (guestEmail, guestName, bookingDetails) => {
  try {
    if (typeof window === 'undefined' || !window.emailjs) {
      console.warn('EmailJS not available. Skipping review reminder.');
      return;
    }

    // Initialize EmailJS if needed
    try {
      window.emailjs.init(EMAILJS_CONFIG.USER_ID);
    } catch (initError) {
      console.warn('EmailJS already initialized or init failed:', initError);
    }

    const templateParams = {
      to_email: guestEmail,
      guest_name: guestName || 'Guest',
      email_type: 'review_reminder',
      booking_status: 'Stay Completed',
      status_message: 'We hope you had a great stay! Please share your experience by leaving a review.',
      listing_title: bookingDetails.listingTitle || 'Booking',
      check_in: bookingDetails.checkIn || 'N/A',
      check_out: bookingDetails.checkOut || 'N/A',
      host_name: bookingDetails.hostName || 'Host',
      booking_id: bookingDetails.bookingId || 'N/A',
      action_button_text: 'Leave a Review',
      action_button_link: 'https://yourwebsite.com/trips'
    };

    console.log('📧 Sending review reminder to:', guestEmail);

    const response = await window.emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.TEMPLATE_BOOKING_NOTIFICATIONS,
      templateParams
    );

    console.log('✅ Review reminder sent:', response);
    return response;
  } catch (error) {
    console.error('❌ Error sending review reminder:', error);
    // Don't throw - this is a non-critical notification
  }
};

/**
 * Send booking completion notification to guest and host
 */
export const sendBookingCompletionEmail = async (email, name, bookingDetails, userType = 'guest') => {
  try {
    if (typeof window === 'undefined' || !window.emailjs) {
      console.warn('EmailJS not available. Skipping completion notification.');
      return;
    }

    // Initialize EmailJS if needed
    try {
      window.emailjs.init(EMAILJS_CONFIG.USER_ID);
    } catch (initError) {
      console.warn('EmailJS already initialized or init failed:', initError);
    }

    const templateParams = {
      to_email: email,
      [userType === 'guest' ? 'guest_name' : 'host_name']: name || (userType === 'guest' ? 'Guest' : 'Host'),
      email_type: 'completion',
      booking_status: 'Completed',
      status_message: userType === 'guest' 
        ? 'Thank you for staying with us! We hope you had a wonderful experience.' 
        : 'A guest has completed their stay. You can now leave a review.',
      listing_title: bookingDetails.listingTitle || 'Booking',
      [userType === 'guest' ? 'host_name' : 'guest_name']: userType === 'guest' 
        ? (bookingDetails.hostName || 'Host') 
        : (bookingDetails.guestName || 'Guest'),
      check_in: bookingDetails.checkIn ? (bookingDetails.checkIn instanceof Date ? bookingDetails.checkIn.toLocaleDateString('en-US') : bookingDetails.checkIn) : '',
      check_out: bookingDetails.checkOut ? (bookingDetails.checkOut instanceof Date ? bookingDetails.checkOut.toLocaleDateString('en-US') : bookingDetails.checkOut) : '',
      total_amount: bookingDetails.totalAmount ? `₱${bookingDetails.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '',
      booking_id: bookingDetails.bookingId || 'N/A',
      action_button_text: userType === 'guest' ? 'Leave a Review' : 'Review Guest',
      action_button_link: userType === 'guest' 
        ? 'https://yourwebsite.com/trips' 
        : 'https://yourwebsite.com/host/dashboard?section=bookings'
    };

    console.log(`📧 Sending completion notification to ${userType}:`, email);

    const response = await window.emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.TEMPLATE_BOOKING_NOTIFICATIONS,
      templateParams
    );

    console.log(`✅ Completion notification sent to ${userType}:`, response);
    return response;
  } catch (error) {
    console.error(`❌ Error sending completion notification to ${userType}:`, error);
    // Don't throw - this is a non-critical notification
  }
};