/**
 * PayPal Payouts Service
 * 
 * This service handles PayPal Payouts API integration.
 * Money is sent from the admin's PayPal account to the host's PayPal account.
 * 
 * NOTE: For production, this should be done server-side for security.
 * This client-side implementation works for sandbox testing.
 */

import { paypalPayoutConfig } from '../config/paypal';

/**
 * Get PayPal access token using client credentials
 * @returns {Promise<string>} Access token
 */
const getPayPalAccessToken = async () => {
  const credentials = btoa(`${paypalPayoutConfig.clientId}:${paypalPayoutConfig.clientSecret}`);
  
  const tokenRes = await fetch(`${paypalPayoutConfig.apiBase}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!tokenRes.ok) {
    const errorText = await tokenRes.text();
    console.error('❌ PayPal token error response:', errorText);
    let errorMessage = 'Failed to get PayPal access token';
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.error_description || errorData.error || errorMessage;
    } catch (e) {
      errorMessage = errorText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const tokenData = await tokenRes.json();
  console.log('✅ PayPal access token obtained successfully');
  return tokenData.access_token;
};

/**
 * Process a payout to PayPal using PayPal Payouts API
 * 
 * @param {number} amount - Amount to send (in PHP)
 * @param {string} paypalEmail - Recipient PayPal email
 * @param {string} transactionId - Transaction ID for tracking
 * @returns {Promise<{success: boolean, payoutId?: string, batchId?: string, error?: string}>}
 */
export const processPayPalPayout = async (amount, paypalEmail, transactionId) => {
  try {
    console.log('🔄 Processing PayPal Payout:', {
      amount: amount,
      paypalEmail: paypalEmail,
      transactionId: transactionId
    });

    // 1️⃣ Get PayPal access token using admin credentials
    const accessToken = await getPayPalAccessToken();
    console.log('✅ PayPal access token obtained');

    // 2️⃣ Send payout (admin → host PayPal)
    // Validate PayPal email format (must be a valid email)
    if (!paypalEmail || !paypalEmail.includes('@')) {
      throw new Error('Invalid PayPal email address. Please provide a valid email.');
    }

    // Prepare payout request
    const payoutRequest = {
      sender_batch_header: {
        sender_batch_id: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email_subject: "You've received a payout from EcoExpress",
      },
      items: [
        {
          recipient_type: 'EMAIL',
          amount: { 
            value: amount.toFixed(2), 
            currency: 'PHP' 
          },
          receiver: paypalEmail.trim(),
          note: 'Wallet withdrawal from EcoExpress',
          sender_item_id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        },
      ],
    };

    console.log('📤 Sending PayPal payout request:', JSON.stringify(payoutRequest, null, 2));

    const payoutRes = await fetch(`${paypalPayoutConfig.apiBase}/v1/payments/payouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payoutRequest),
    });

    const payoutData = await payoutRes.json();
    console.log('📦 PayPal payout response status:', payoutRes.status);
    console.log('📦 PayPal payout response data:', JSON.stringify(payoutData, null, 2));

    // 3️⃣ Verify payout succeeded
    if (payoutRes.ok && payoutData.batch_header?.payout_batch_id) {
      const batchId = payoutData.batch_header.payout_batch_id;
      const batchStatus = payoutData.batch_header.batch_status;
      console.log('✅ PayPal payout successful! Batch ID:', batchId, 'Status:', batchStatus);

      return {
        success: true,
        payoutId: batchId,
        batchId: batchId,
        status: batchStatus || 'SUCCESS',
        amount: amount,
        paypalEmail: paypalEmail
      };
    } else {
      // Handle errors from PayPal
      let errorMessage = 'Withdrawal failed. Please check PayPal response.';
      
      if (payoutData.details && payoutData.details.length > 0) {
        // PayPal API error with details
        const details = payoutData.details[0];
        errorMessage = details.issue || details.description || errorMessage;
        console.error('❌ PayPal payout error details:', details);
      } else if (payoutData.message) {
        errorMessage = payoutData.message;
      } else if (payoutData.name) {
        errorMessage = payoutData.name;
      }
      
      console.error('❌ PayPal payout failed:', {
        status: payoutRes.status,
        statusText: payoutRes.statusText,
        error: payoutData
      });
      
      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error('❌ PayPal Payout error:', error);
    console.error('❌ Error stack:', error.stack);
    
    // Provide more helpful error messages
    let errorMessage = error.message || 'Failed to process PayPal payout';
    
    if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      errorMessage = 'PayPal authentication failed. Please check your Client ID and Secret.';
    } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
      errorMessage = 'PayPal access denied. Please check your account permissions.';
    } else if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
      errorMessage = 'PayPal API endpoint not found. Please check the API URL.';
    } else if (errorMessage.includes('INSUFFICIENT_FUNDS')) {
      errorMessage = 'Admin PayPal account has insufficient funds for this payout.';
    } else if (errorMessage.includes('INVALID_EMAIL')) {
      errorMessage = 'Invalid PayPal email address. Please use a valid PayPal sandbox email (e.g., @business.example.com).';
    } else if (errorMessage.includes('RECEIVER_NOT_FOUND')) {
      errorMessage = 'PayPal account not found. Please make sure the email is a valid PayPal sandbox account.';
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Check payout status (for production - would call PayPal API)
 */
export const checkPayoutStatus = async (payoutId) => {
  // In production, this would call PayPal API to check status
  // For sandbox, we'll return a simulated status
  return {
    status: 'SUCCESS',
    payoutId: payoutId,
    note: 'Sandbox simulation - status check not implemented'
  };
};

