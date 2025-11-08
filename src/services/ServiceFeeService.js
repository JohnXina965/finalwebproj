/**
 * Service Fee Management Service
 * Handles service fee configuration and calculation
 */

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../Firebase';

const SERVICE_FEE_DOC_ID = 'admin_settings';
const DEFAULT_SERVICE_FEE = 0.10; // 10% default

/**
 * Get current service fee percentage from Firestore
 * Falls back to default if not set
 */
export const getServiceFeePercentage = async () => {
  try {
    const settingsDoc = await getDoc(doc(db, 'adminSettings', SERVICE_FEE_DOC_ID));
    if (settingsDoc.exists()) {
      const data = settingsDoc.data();
      return data.serviceFeePercentage || DEFAULT_SERVICE_FEE;
    }
    // If no settings exist, return default
    return DEFAULT_SERVICE_FEE;
  } catch (error) {
    console.error('Error fetching service fee:', error);
    return DEFAULT_SERVICE_FEE;
  }
};

/**
 * Get service fee percentage synchronously (for immediate use)
 * Returns default if not yet loaded
 */
export const getServiceFeePercentageSync = () => {
  // This will be set by AdminSettings component
  if (typeof window !== 'undefined' && window.__SERVICE_FEE__) {
    return window.__SERVICE_FEE__;
  }
  return DEFAULT_SERVICE_FEE;
};

/**
 * Update service fee percentage (admin only)
 */
export const updateServiceFeePercentage = async (newPercentage) => {
  try {
    if (newPercentage < 0 || newPercentage > 1) {
      throw new Error('Service fee must be between 0% and 100%');
    }

    await setDoc(
      doc(db, 'adminSettings', SERVICE_FEE_DOC_ID),
      {
        serviceFeePercentage: newPercentage,
        updatedAt: serverTimestamp(),
        updatedBy: 'admin' // Could be enhanced to track admin user ID
      },
      { merge: true }
    );

    // Update global cache
    if (typeof window !== 'undefined') {
      window.__SERVICE_FEE__ = newPercentage;
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating service fee:', error);
    throw error;
  }
};

/**
 * Calculate service fee amount from total
 */
export const calculateServiceFee = (totalAmount, feePercentage = null) => {
  const percentage = feePercentage !== null ? feePercentage : getServiceFeePercentageSync();
  return totalAmount * percentage;
};

/**
 * Get service fee history (if we want to track changes)
 */
export const getServiceFeeHistory = async () => {
  try {
    const settingsDoc = await getDoc(doc(db, 'adminSettings', SERVICE_FEE_DOC_ID));
    if (settingsDoc.exists()) {
      return settingsDoc.data().history || [];
    }
    return [];
  } catch (error) {
    console.error('Error fetching service fee history:', error);
    return [];
  }
};

