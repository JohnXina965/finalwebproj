/**
 * Booking Auto-Confirm Service
 * Automatically confirms pending bookings after a specified time period
 * if the host hasn't responded
 */

import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../Firebase';
import { updateBookingStatus } from './BookingService';

// Auto-confirm time: 24 hours (in milliseconds)
const AUTO_CONFIRM_DELAY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check and auto-confirm pending bookings that have exceeded the auto-confirm delay
 * This should be called periodically (e.g., via a scheduled function or on app load)
 */
export const checkAndAutoConfirmBookings = async () => {
  try {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - AUTO_CONFIRM_DELAY_MS);
    
    // Query pending bookings older than the auto-confirm delay
    const q = query(
      collection(db, 'bookings'),
      where('status', '==', 'pending')
    );
    
    const snapshot = await getDocs(q);
    const bookingsToConfirm = [];
    
    snapshot.forEach((docSnap) => {
      const booking = docSnap.data();
      const createdAt = booking.createdAt?.toDate 
        ? booking.createdAt.toDate() 
        : (booking.createdAt?.seconds 
          ? new Date(booking.createdAt.seconds * 1000) 
          : null);
      
      if (createdAt && createdAt < cutoffTime) {
        bookingsToConfirm.push({
          id: docSnap.id,
          ...booking
        });
      }
    });
    
    // Auto-confirm each booking
    for (const booking of bookingsToConfirm) {
      try {
        await updateBookingStatus(booking.id, 'confirmed', {
          autoConfirmed: true,
          autoConfirmedAt: serverTimestamp(),
          autoConfirmReason: 'Host did not respond within 24 hours'
        });
        
        console.log(`✅ Auto-confirmed booking: ${booking.id}`);
      } catch (error) {
        console.error(`❌ Error auto-confirming booking ${booking.id}:`, error);
      }
    }
    
    return {
      checked: snapshot.size,
      confirmed: bookingsToConfirm.length
    };
    
  } catch (error) {
    console.error('❌ Error checking auto-confirm bookings:', error);
    throw error;
  }
};

/**
 * Check if a booking is eligible for auto-confirmation
 * @param {Object} booking - Booking object
 * @returns {Object} Eligibility info
 */
export const getAutoConfirmEligibility = (booking) => {
  if (booking.status !== 'pending') {
    return {
      eligible: false,
      reason: 'Booking is not pending'
    };
  }
  
  const createdAt = booking.createdAt?.toDate 
    ? booking.createdAt.toDate() 
    : (booking.createdAt?.seconds 
      ? new Date(booking.createdAt.seconds * 1000) 
      : null);
  
  if (!createdAt) {
    return {
      eligible: false,
      reason: 'Invalid creation date'
    };
  }
  
  const now = new Date();
  const elapsed = now.getTime() - createdAt.getTime();
  const remaining = AUTO_CONFIRM_DELAY_MS - elapsed;
  
  return {
    eligible: remaining <= 0,
    remainingMs: Math.max(0, remaining),
    remainingHours: Math.max(0, Math.ceil(remaining / (60 * 60 * 1000))),
    createdAt,
    willAutoConfirmAt: new Date(createdAt.getTime() + AUTO_CONFIRM_DELAY_MS)
  };
};

/**
 * Get the auto-confirm delay in hours
 */
export const getAutoConfirmDelayHours = () => {
  return AUTO_CONFIRM_DELAY_MS / (60 * 60 * 1000);
};

