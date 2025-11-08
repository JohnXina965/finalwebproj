/**
 * Refund Calculation Service
 * Calculates refund amounts based on cancellation policies
 */

// Admin deduction percentage (configurable)
const ADMIN_DEDUCTION_PERCENTAGE = 0.10; // 10% of original amount

/**
 * Calculate refund amount based on cancellation policy and timing
 * @param {Object} booking - Booking object
 * @param {Date} cancellationDate - Date of cancellation
 * @returns {Object} Refund details
 */
export const calculateRefund = (booking, cancellationDate = new Date()) => {
  const originalAmount = booking.totalAmount || 0;
  const checkInDate = booking.checkIn instanceof Date 
    ? booking.checkIn 
    : (booking.checkIn?.toDate ? booking.checkIn.toDate() : new Date(booking.checkIn));
  
  // Calculate days until check-in
  const daysUntilCheckIn = Math.ceil((checkInDate - cancellationDate) / (1000 * 60 * 60 * 24));
  
  // Get cancellation policy (default: moderate)
  const cancellationPolicy = booking.cancellationPolicy || 'moderate';
  
  let refundPercentage = 0;
  let cancellationFee = 0;
  
  // Calculate refund based on policy
  switch (cancellationPolicy) {
    case 'flexible':
      // Full refund if cancelled 24+ hours before check-in
      if (daysUntilCheckIn >= 1) {
        refundPercentage = 1.0; // 100% refund
        cancellationFee = 0;
      } else {
        refundPercentage = 0.5; // 50% refund
        cancellationFee = originalAmount * 0.5;
      }
      break;
      
    case 'moderate':
      // Full refund if cancelled 5+ days before check-in
      if (daysUntilCheckIn >= 5) {
        refundPercentage = 1.0; // 100% refund
        cancellationFee = 0;
      } else if (daysUntilCheckIn >= 1) {
        refundPercentage = 0.5; // 50% refund
        cancellationFee = originalAmount * 0.5;
      } else {
        refundPercentage = 0; // No refund
        cancellationFee = originalAmount;
      }
      break;
      
    case 'strict':
      // Full refund if cancelled 14+ days before check-in
      if (daysUntilCheckIn >= 14) {
        refundPercentage = 0.5; // 50% refund
        cancellationFee = originalAmount * 0.5;
      } else if (daysUntilCheckIn >= 7) {
        refundPercentage = 0.25; // 25% refund
        cancellationFee = originalAmount * 0.75;
      } else {
        refundPercentage = 0; // No refund
        cancellationFee = originalAmount;
      }
      break;
      
    default:
      // Default to moderate policy
      if (daysUntilCheckIn >= 5) {
        refundPercentage = 1.0;
        cancellationFee = 0;
      } else if (daysUntilCheckIn >= 1) {
        refundPercentage = 0.5;
        cancellationFee = originalAmount * 0.5;
      } else {
        refundPercentage = 0;
        cancellationFee = originalAmount;
      }
  }
  
  // Calculate amounts
  const refundAmountBeforeDeduction = originalAmount * refundPercentage;
  const adminDeduction = refundAmountBeforeDeduction * ADMIN_DEDUCTION_PERCENTAGE;
  const finalRefundAmount = refundAmountBeforeDeduction - adminDeduction;
  
  return {
    originalAmount,
    refundPercentage: refundPercentage * 100, // Convert to percentage
    refundAmountBeforeDeduction,
    adminDeduction,
    cancellationFee,
    finalRefundAmount,
    daysUntilCheckIn,
    cancellationPolicy,
    policyDescription: getPolicyDescription(cancellationPolicy, daysUntilCheckIn)
  };
};

/**
 * Get human-readable policy description
 */
const getPolicyDescription = (policy, daysUntilCheckIn) => {
  switch (policy) {
    case 'flexible':
      if (daysUntilCheckIn >= 1) {
        return 'Full refund (cancelled 24+ hours before check-in)';
      } else {
        return '50% refund (cancelled less than 24 hours before check-in)';
      }
    case 'moderate':
      if (daysUntilCheckIn >= 5) {
        return 'Full refund (cancelled 5+ days before check-in)';
      } else if (daysUntilCheckIn >= 1) {
        return '50% refund (cancelled 1-4 days before check-in)';
      } else {
        return 'No refund (cancelled less than 24 hours before check-in)';
      }
    case 'strict':
      if (daysUntilCheckIn >= 14) {
        return '50% refund (cancelled 14+ days before check-in)';
      } else if (daysUntilCheckIn >= 7) {
        return '25% refund (cancelled 7-13 days before check-in)';
      } else {
        return 'No refund (cancelled less than 7 days before check-in)';
      }
    default:
      return 'Standard cancellation policy applies';
  }
};

/**
 * Get admin deduction percentage (for display purposes)
 */
export const getAdminDeductionPercentage = () => {
  return ADMIN_DEDUCTION_PERCENTAGE * 100; // Return as percentage
};

