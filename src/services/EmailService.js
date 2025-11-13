const EMAILJS_CONFIG = {
  SERVICE_ID: 'service_z8ms74u',
  TEMPLATE_ID: 'template_44e0uoq', // OTP template
  USER_ID: 'GqhsogPCZps6-KE_V',
  // Single template for all booking notifications
  TEMPLATE_BOOKING_NOTIFICATIONS: 'template_8kvqbzd' // Combined template for approval/rejection/cancellation
};

// EmailJS Account 2 - For wallet transactions (cash-in, cash-out)
const EMAILJS_CONFIG_ACCOUNT2 = {
  SERVICE_ID: 'service_yaewyfi',
  USER_ID: 'Vdve3tFnBgXl-MH0o',
  TEMPLATE_CASH_IN: 'template_3wbzery',
  TEMPLATE_CASH_OUT: 'template_fzimfn7'
};

// EmailJS Account 3 - For booking approval/rejection emails
const EMAILJS_CONFIG_ACCOUNT3 = {
  SERVICE_ID: 'service_mwd78t3',
  USER_ID: 'ta272NDNmuGloHUZu', // Public Key for Account 3
  TEMPLATE_APPROVED: 'template_j8neka1',
  TEMPLATE_REJECTED: 'template_th1vx1c'
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
 * Send booking notification email (unified function for booking types only)
 * Uses template_8kvqbzd with email_type parameter
 * Supports: booking (approval/rejection/cancellation) ONLY
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
      email: guestEmail, // Also send as 'email' for backward compatibility with templates that use {{email}}
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
 * Uses Account 3 - service_mwd78t3, template_th1vx1c
 */
export const sendBookingApprovalEmail = async (guestEmail, guestName, bookingDetails) => {
  try {
    if (typeof window === 'undefined' || !window.emailjs) {
      console.warn('EmailJS not available. Skipping approval email.');
      return;
    }

    // Initialize EmailJS Account 3
    try {
      window.emailjs.init(EMAILJS_CONFIG_ACCOUNT3.USER_ID);
    } catch (initError) {
      console.warn('EmailJS Account 3 already initialized or init failed:', initError);
    }

    const templateParams = {
      to_email: guestEmail,
      email: guestEmail,
      guest_name: guestName || 'Guest',
      listing_title: bookingDetails.listingTitle || 'Your Booking',
      booking_id: bookingDetails.bookingId || 'N/A',
      check_in: bookingDetails.checkIn || 'N/A',
      check_out: bookingDetails.checkOut || 'N/A',
      total_amount: bookingDetails.totalAmount ? `₱${bookingDetails.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '₱0.00',
      host_name: bookingDetails.hostName || 'Host'
    };

    console.log('📧 Sending booking approval email to:', guestEmail);
    console.log('📧 Using Account 3 - Service ID:', EMAILJS_CONFIG_ACCOUNT3.SERVICE_ID);
    console.log('📧 Using Template ID:', EMAILJS_CONFIG_ACCOUNT3.TEMPLATE_APPROVED);

    try {
      const response = await window.emailjs.send(
        EMAILJS_CONFIG_ACCOUNT3.SERVICE_ID,
        EMAILJS_CONFIG_ACCOUNT3.TEMPLATE_APPROVED,
        templateParams
      );

      console.log('✅ Booking approval email sent successfully via Account 3:', response);
      return response;
    } catch (account3Error) {
      // Log the full error for debugging
      console.error('❌ Account 3 error details:', {
        status: account3Error.status,
        text: account3Error.text,
        message: account3Error.message,
        serviceId: EMAILJS_CONFIG_ACCOUNT3.SERVICE_ID,
        templateId: EMAILJS_CONFIG_ACCOUNT3.TEMPLATE_APPROVED,
        userId: EMAILJS_CONFIG_ACCOUNT3.USER_ID
      });

      // Only fallback if service ID is not found - don't fallback for other errors
      const errorText = account3Error.text || account3Error.message || '';
      const isServiceNotFound = account3Error.status === 400 && 
        (errorText.toLowerCase().includes('service id not found') || 
         errorText.toLowerCase().includes('service id') ||
         errorText.toLowerCase().includes('service not found'));
      
      if (isServiceNotFound) {
        console.warn('⚠️ Account 3 service not found. Please verify:');
        console.warn('   - Service ID:', EMAILJS_CONFIG_ACCOUNT3.SERVICE_ID);
        console.warn('   - USER_ID:', EMAILJS_CONFIG_ACCOUNT3.USER_ID);
        console.warn('   - Make sure service_mwd78t3 exists in the account with this USER_ID');
        console.warn('⚠️ NOT using fallback - approval emails require Account 3 templates');
        // Don't use fallback - Account 3 is required for proper approval emails
        throw new Error(`Account 3 service not found. Please configure service_mwd78t3 in EmailJS account with USER_ID: ${EMAILJS_CONFIG_ACCOUNT3.USER_ID}`);
      }
      
      // For other errors, throw them
      throw account3Error;
    }
  } catch (error) {
    console.error('❌ Error sending booking approval email:', error);
    console.error('Error details:', {
      status: error.status,
      text: error.text,
      message: error.message
    });
    // Don't throw - this is a non-critical notification
    return null;
  }
};

/**
 * Send booking rejection email to guest
 * Uses Account 3 - service_mwd78t3, template_fvwyzwg
 */
export const sendBookingRejectionEmail = async (guestEmail, guestName, bookingDetails) => {
  try {
    if (typeof window === 'undefined' || !window.emailjs) {
      console.warn('EmailJS not available. Skipping rejection email.');
      return;
    }

    // Initialize EmailJS Account 3
    try {
      window.emailjs.init(EMAILJS_CONFIG_ACCOUNT3.USER_ID);
    } catch (initError) {
      console.warn('EmailJS Account 3 already initialized or init failed:', initError);
    }

    const templateParams = {
      to_email: guestEmail,
      email: guestEmail,
      guest_name: guestName || 'Guest',
      listing_title: bookingDetails.listingTitle || 'Your Booking',
      booking_id: bookingDetails.bookingId || 'N/A',
      check_in: bookingDetails.checkIn || 'N/A',
      check_out: bookingDetails.checkOut || 'N/A',
      total_amount: bookingDetails.totalAmount ? `₱${bookingDetails.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '₱0.00',
      host_name: bookingDetails.hostName || 'Host',
      rejection_reason: bookingDetails.rejectionReason || 'Host unavailable for these dates'
    };

    console.log('📧 Sending booking rejection email to:', guestEmail);
    console.log('📧 Using Account 3 - Service ID:', EMAILJS_CONFIG_ACCOUNT3.SERVICE_ID);
    console.log('📧 Using Template ID:', EMAILJS_CONFIG_ACCOUNT3.TEMPLATE_REJECTED);

    try {
      const response = await window.emailjs.send(
        EMAILJS_CONFIG_ACCOUNT3.SERVICE_ID,
        EMAILJS_CONFIG_ACCOUNT3.TEMPLATE_REJECTED,
        templateParams
      );

      console.log('✅ Booking rejection email sent successfully:', response);
      return response;
    } catch (account3Error) {
      // Log the full error for debugging
      console.error('❌ Account 3 error details:', {
        status: account3Error.status,
        text: account3Error.text,
        message: account3Error.message,
        serviceId: EMAILJS_CONFIG_ACCOUNT3.SERVICE_ID,
        templateId: EMAILJS_CONFIG_ACCOUNT3.TEMPLATE_REJECTED,
        userId: EMAILJS_CONFIG_ACCOUNT3.USER_ID
      });

      // Only fallback if service ID is not found - don't fallback for other errors
      const errorText = account3Error.text || account3Error.message || '';
      const isServiceNotFound = account3Error.status === 400 && 
        (errorText.toLowerCase().includes('service id not found') || 
         errorText.toLowerCase().includes('service id') ||
         errorText.toLowerCase().includes('service not found'));
      
      if (isServiceNotFound) {
        console.warn('⚠️ Account 3 service not found. Please verify:');
        console.warn('   - Service ID:', EMAILJS_CONFIG_ACCOUNT3.SERVICE_ID);
        console.warn('   - USER_ID:', EMAILJS_CONFIG_ACCOUNT3.USER_ID);
        console.warn('   - Make sure service_mwd78t3 exists in the account with this USER_ID');
        console.warn('⚠️ NOT using fallback - rejection emails require Account 3 templates');
        // Don't use fallback - Account 3 is required for proper rejection emails
        throw new Error(`Account 3 service not found. Please configure service_mwd78t3 in EmailJS account with USER_ID: ${EMAILJS_CONFIG_ACCOUNT3.USER_ID}`);
      }
      
      // For other errors, throw them
      throw account3Error;
    }
  } catch (error) {
    console.error('❌ Error sending booking rejection email:', error);
    console.error('Error details:', {
      status: error.status,
      text: error.text,
      message: error.message
    });
    // Don't throw - this is a non-critical notification
    return null;
  }
};

/**
 * Send cancellation refund email to guest
 * Uses Account 1 - service_z8ms74u, template_8kvqbzd
 */
export const sendCancellationRefundEmail = async (guestEmail, guestName, cancellationDetails) => {
  try {
    if (typeof window === 'undefined' || !window.emailjs) {
      console.warn('EmailJS not available. Skipping cancellation refund email.');
      return;
    }

    // Initialize EmailJS Account 1
    try {
      window.emailjs.init(EMAILJS_CONFIG.USER_ID);
    } catch (initError) {
      console.warn('EmailJS Account 1 already initialized or init failed:', initError);
    }

    const templateParams = {
      to_email: guestEmail,
      email: guestEmail,
      guest_name: guestName || 'Guest',
      listing_title: cancellationDetails.listingTitle || 'Your Booking',
      booking_id: cancellationDetails.bookingId || 'N/A',
      cancellation_date: cancellationDetails.cancellationDate || new Date().toLocaleDateString('en-US'),
      original_amount: cancellationDetails.originalAmount ? `₱${cancellationDetails.originalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '₱0.00',
      cancellation_fee: cancellationDetails.cancellationFee ? `₱${cancellationDetails.cancellationFee.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '₱0.00',
      admin_deduction: cancellationDetails.adminDeduction ? `₱${cancellationDetails.adminDeduction.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '₱0.00',
      refund_amount: cancellationDetails.refundAmount ? `₱${cancellationDetails.refundAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '₱0.00',
      cancellation_policy: cancellationDetails.cancellationPolicy || 'Standard cancellation policy'
    };

    console.log('📧 Sending cancellation refund email to:', guestEmail);
    console.log('📧 Using Account 1 - Service ID:', EMAILJS_CONFIG.SERVICE_ID);
    console.log('📧 Using Template ID:', EMAILJS_CONFIG.TEMPLATE_BOOKING_NOTIFICATIONS);

    const response = await window.emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.TEMPLATE_BOOKING_NOTIFICATIONS,
      templateParams
    );

    console.log('✅ Cancellation refund email sent successfully:', response);
    return response;
  } catch (error) {
    console.error('❌ Error sending cancellation refund email:', error);
    // Don't throw - this is a non-critical notification
    return null;
  }
};


/**
 * Send auto-confirmation notification to guest
 * Uses booking approval email since auto-confirmation is a type of booking approval
 */
export const sendAutoConfirmationEmail = async (guestEmail, guestName, bookingDetails) => {
  try {
    const details = {
      ...bookingDetails,
      autoConfirmed: true,
      autoConfirmReason: 'Your booking was automatically confirmed because the host did not respond within 24 hours.'
    };
    
    // Use the same approval email function
    return sendBookingApprovalEmail(guestEmail, guestName, details);
  } catch (error) {
    console.error('❌ Error sending auto-confirmation email:', error);
    // Don't throw - this is a non-critical notification
  }
};

/**
 * Send booking reminder email (check-in reminders)
 * NOTE: This function is kept for backward compatibility but does not send emails
 * as template_8kvqbzd is ONLY for booking, cancellation, and refund emails
 */
export const sendBookingReminderEmail = async (guestEmail, guestName, reminderDetails) => {
  // Removed - template_8kvqbzd is only for booking, cancellation, and refund
  console.log('📧 Booking reminder skipped - template_8kvqbzd is only for booking, cancellation, and refund emails');
  return;
};

/**
 * Send review reminder email after check-out
 * NOTE: This function is kept for backward compatibility but does not send emails
 * as template_8kvqbzd is ONLY for booking, cancellation, and refund emails
 */
export const sendReviewReminderEmail = async (guestEmail, guestName, bookingDetails) => {
  // Removed - template_8kvqbzd is only for booking, cancellation, and refund
  console.log('📧 Review reminder skipped - template_8kvqbzd is only for booking, cancellation, and refund emails');
  return;
};

/**
 * Send booking completion notification to guest and host
 * NOTE: This function is kept for backward compatibility but does not send emails
 * as template_8kvqbzd is ONLY for booking, cancellation, and refund emails
 */
export const sendBookingCompletionEmail = async (email, name, bookingDetails, userType = 'guest') => {
  // Removed - template_8kvqbzd is only for booking, cancellation, and refund
  console.log('📧 Booking completion notification skipped - template_8kvqbzd is only for booking, cancellation, and refund emails');
  return;
};

/**
 * Send cash-in confirmation email (Account 2)
 * Uses separate template for cash-in transactions
 */
export const sendCashInConfirmationEmail = async (email, name, cashInDetails) => {
  try {
    if (typeof window === 'undefined' || !window.emailjs) {
      console.warn('EmailJS not available. Skipping cash-in confirmation.');
      return;
    }

    // Initialize EmailJS Account 2
    try {
      window.emailjs.init(EMAILJS_CONFIG_ACCOUNT2.USER_ID);
    } catch (initError) {
      console.warn('EmailJS Account 2 already initialized or init failed:', initError);
    }

    const amount = cashInDetails.amount || 0;
    const newBalance = cashInDetails.newBalance || 0;
    const dateTime = cashInDetails.dateTime 
      ? (cashInDetails.dateTime instanceof Date 
          ? cashInDetails.dateTime.toLocaleString('en-US', { 
              year: 'numeric', 
              month: 'numeric', 
              day: 'numeric', 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit',
              hour12: true 
            })
          : new Date(cashInDetails.dateTime).toLocaleString('en-US', { 
              year: 'numeric', 
              month: 'numeric', 
              day: 'numeric', 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit',
              hour12: true 
            }))
      : new Date().toLocaleString('en-US', { 
          year: 'numeric', 
          month: 'numeric', 
          day: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit',
          hour12: true 
        });

    const templateParams = {
      to_email: email,
      email: email,
      name: name || 'User',
      guest_name: name || 'User',
      amount: `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
      amount_added: `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
      new_balance: `₱${newBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
      new_wallet_balance: `₱${newBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
      date_time: dateTime,
      transaction_id: cashInDetails.transactionId || `cashin_${Date.now()}`,
      transaction_date: dateTime
    };

    console.log('📧 Sending cash-in confirmation to:', email);
    console.log('📧 Using Account 2 - Service ID:', EMAILJS_CONFIG_ACCOUNT2.SERVICE_ID);
    console.log('📧 Using Template ID:', EMAILJS_CONFIG_ACCOUNT2.TEMPLATE_CASH_IN);

    const response = await window.emailjs.send(
      EMAILJS_CONFIG_ACCOUNT2.SERVICE_ID,
      EMAILJS_CONFIG_ACCOUNT2.TEMPLATE_CASH_IN,
      templateParams
    );

    console.log('✅ Cash-in confirmation sent successfully:', response);
    return response;
  } catch (error) {
    console.error('❌ Error sending cash-in confirmation:', error);
    // Don't throw - this is a non-critical notification
    return null;
  }
};

/**
 * Send withdrawal confirmation email (Account 2)
 * Uses separate template for withdrawal transactions
 */
export const sendWithdrawalConfirmationEmail = async (email, name, withdrawalDetails) => {
  try {
    if (typeof window === 'undefined' || !window.emailjs) {
      console.warn('EmailJS not available. Skipping withdrawal confirmation.');
      return;
    }

    // Initialize EmailJS Account 2
    try {
      window.emailjs.init(EMAILJS_CONFIG_ACCOUNT2.USER_ID);
    } catch (initError) {
      console.warn('EmailJS Account 2 already initialized or init failed:', initError);
    }

    const amount = withdrawalDetails.amount || 0;
    const newBalance = withdrawalDetails.newBalance || 0;
    const paypalEmail = withdrawalDetails.paypalEmail || 'N/A';
    const payoutId = withdrawalDetails.payoutId || 'N/A';
    const dateTime = withdrawalDetails.dateTime 
      ? (withdrawalDetails.dateTime instanceof Date 
          ? withdrawalDetails.dateTime.toLocaleString('en-US', { 
              year: 'numeric', 
              month: 'numeric', 
              day: 'numeric', 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit',
              hour12: true 
            })
          : new Date(withdrawalDetails.dateTime).toLocaleString('en-US', { 
              year: 'numeric', 
              month: 'numeric', 
              day: 'numeric', 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit',
              hour12: true 
            }))
      : new Date().toLocaleString('en-US', { 
          year: 'numeric', 
          month: 'numeric', 
          day: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit',
          hour12: true 
        });

    const templateParams = {
      to_email: email,
      email: email,
      name: name || 'User',
      guest_name: name || 'User',
      amount: `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
      amount_withdrawn: `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
      new_balance: `₱${newBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
      new_wallet_balance: `₱${newBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
      paypal_email: paypalEmail,
      payout_id: payoutId,
      date_time: dateTime,
      transaction_id: payoutId,
      transaction_date: dateTime
    };

    console.log('📧 Sending withdrawal confirmation to:', email);
    console.log('📧 Using Account 2 - Service ID:', EMAILJS_CONFIG_ACCOUNT2.SERVICE_ID);
    console.log('📧 Using Template ID:', EMAILJS_CONFIG_ACCOUNT2.TEMPLATE_CASH_OUT);

    const response = await window.emailjs.send(
      EMAILJS_CONFIG_ACCOUNT2.SERVICE_ID,
      EMAILJS_CONFIG_ACCOUNT2.TEMPLATE_CASH_OUT,
      templateParams
    );

    console.log('✅ Withdrawal confirmation sent successfully:', response);
    return response;
  } catch (error) {
    console.error('❌ Error sending withdrawal confirmation:', error);
    // Don't throw - this is a non-critical notification
    return null;
  }
};

/**
 * Send booking created notification to host
 * NOTE: This function is kept for backward compatibility but does not send emails
 * as template_8kvqbzd is ONLY for booking, cancellation, and refund emails
 */
export const sendNewBookingNotificationToHost = async (hostEmail, hostName, bookingDetails) => {
  // Removed - template_8kvqbzd is only for booking, cancellation, and refund
  console.log('📧 Host booking notification skipped - template_8kvqbzd is only for booking, cancellation, and refund emails');
  return;
};

