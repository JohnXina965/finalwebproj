/**
 * Booking Reminder Service
 * Sends reminders for upcoming check-ins and prompts for reviews after check-out
 */

import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc, 
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../Firebase';
import { sendBookingReminderEmail, sendReviewReminderEmail } from './EmailService';

// Reminder times (in milliseconds)
const CHECK_IN_REMINDER_1_DAY_MS = 24 * 60 * 60 * 1000; // 1 day before
const CHECK_IN_REMINDER_DAY_OF_MS = 0; // On check-in day
const REVIEW_REMINDER_AFTER_CHECKOUT_MS = 24 * 60 * 60 * 1000; // 1 day after check-out

/**
 * Check and send reminders for upcoming check-ins
 * Should be called periodically (e.g., every hour or on app load)
 */
export const checkAndSendCheckInReminders = async () => {
  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + CHECK_IN_REMINDER_1_DAY_MS);
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    
    // Get confirmed bookings with check-in dates
    const q = query(
      collection(db, 'bookings'),
      where('status', '==', 'confirmed')
    );
    
    const snapshot = await getDocs(q);
    const remindersSent = [];
    const bookingsToProcess = [];
    
    // Collect all bookings that need processing
    snapshot.forEach((docSnap) => {
      const booking = docSnap.data();
      const bookingId = docSnap.id;
      
      // Skip if reminder already sent
      if (booking.checkInReminder1DaySent && booking.checkInReminderDayOfSent) {
        return;
      }
      
      const checkInDate = booking.checkIn?.toDate 
        ? booking.checkIn.toDate() 
        : (booking.checkIn?.seconds 
          ? new Date(booking.checkIn.seconds * 1000) 
          : null);
      
      if (!checkInDate) return;
      
      bookingsToProcess.push({ bookingId, booking, checkInDate });
    });
    
    // Process each booking sequentially
    for (const { bookingId, booking, checkInDate } of bookingsToProcess) {
      const checkInDateOnly = new Date(checkInDate);
      checkInDateOnly.setHours(0, 0, 0, 0);
      const tomorrowDateOnly = new Date(tomorrow);
      tomorrowDateOnly.setHours(0, 0, 0, 0);
      const todayDateOnly = new Date(today);
      todayDateOnly.setHours(0, 0, 0, 0);
      
      // Check if check-in is tomorrow (1 day reminder)
      if (checkInDateOnly.getTime() === tomorrowDateOnly.getTime() && !booking.checkInReminder1DaySent) {
        try {
          await sendBookingReminderEmail(
            booking.guestEmail,
            booking.guestName,
            {
              bookingId: bookingId,
              listingTitle: booking.listingTitle || 'Booking',
              checkIn: checkInDate.toLocaleDateString('en-US'),
              checkOut: booking.checkOut?.toDate ? booking.checkOut.toDate().toLocaleDateString('en-US') : 'N/A',
              reminderType: 'check_in_1_day',
              reminderMessage: 'Your check-in is tomorrow! Get ready for your stay.'
            }
          );
          
          // Mark reminder as sent
          await updateDoc(doc(db, 'bookings', bookingId), {
            checkInReminder1DaySent: true,
            checkInReminder1DaySentAt: serverTimestamp()
          });
          
          remindersSent.push({ bookingId, type: 'check_in_1_day' });
          console.log(`✅ Sent 1-day check-in reminder for booking: ${bookingId}`);
        } catch (error) {
          console.error(`❌ Error sending 1-day check-in reminder for ${bookingId}:`, error);
        }
      }
      
      // Check if check-in is today (day-of reminder)
      if (checkInDateOnly.getTime() === todayDateOnly.getTime() && !booking.checkInReminderDayOfSent) {
        try {
          await sendBookingReminderEmail(
            booking.guestEmail,
            booking.guestName,
            {
              bookingId: bookingId,
              listingTitle: booking.listingTitle || 'Booking',
              checkIn: checkInDate.toLocaleDateString('en-US'),
              checkOut: booking.checkOut?.toDate ? booking.checkOut.toDate().toLocaleDateString('en-US') : 'N/A',
              reminderType: 'check_in_day_of',
              reminderMessage: 'Today is your check-in day! Have a wonderful stay.'
            }
          );
          
          // Mark reminder as sent
          await updateDoc(doc(db, 'bookings', bookingId), {
            checkInReminderDayOfSent: true,
            checkInReminderDayOfSentAt: serverTimestamp()
          });
          
          remindersSent.push({ bookingId, type: 'check_in_day_of' });
          console.log(`✅ Sent day-of check-in reminder for booking: ${bookingId}`);
        } catch (error) {
          console.error(`❌ Error sending day-of check-in reminder for ${bookingId}:`, error);
        }
      }
    }
    
    return {
      checked: snapshot.size,
      remindersSent: remindersSent.length
    };
    
  } catch (error) {
    console.error('❌ Error checking check-in reminders:', error);
    throw error;
  }
};

/**
 * Check and send review reminders after check-out
 * Should be called periodically (e.g., daily)
 */
export const checkAndSendReviewReminders = async () => {
  try {
    const now = new Date();
    const yesterday = new Date(now.getTime() - REVIEW_REMINDER_AFTER_CHECKOUT_MS);
    yesterday.setHours(0, 0, 0, 0);
    
    // Get completed bookings
    const q = query(
      collection(db, 'bookings'),
      where('status', '==', 'completed')
    );
    
    const snapshot = await getDocs(q);
    const remindersSent = [];
    const bookingsToProcess = [];
    
    // Collect all bookings that need processing
    snapshot.forEach((docSnap) => {
      const booking = docSnap.data();
      const bookingId = docSnap.id;
      
      // Skip if review reminder already sent
      if (booking.reviewReminderSent) {
        return;
      }
      
      const checkOutDate = booking.checkOut?.toDate 
        ? booking.checkOut.toDate() 
        : (booking.checkOut?.seconds 
          ? new Date(booking.checkOut.seconds * 1000) 
          : null);
      
      if (!checkOutDate) return;
      
      bookingsToProcess.push({ bookingId, booking, checkOutDate });
    });
    
    // Process each booking sequentially
    for (const { bookingId, booking, checkOutDate } of bookingsToProcess) {
      const checkOutDateOnly = new Date(checkOutDate);
      checkOutDateOnly.setHours(0, 0, 0, 0);
      const yesterdayDateOnly = new Date(yesterday);
      yesterdayDateOnly.setHours(0, 0, 0, 0);
      
      // Check if check-out was yesterday (1 day after)
      if (checkOutDateOnly.getTime() === yesterdayDateOnly.getTime()) {
        try {
          // Send reminder to guest
          await sendReviewReminderEmail(
            booking.guestEmail,
            booking.guestName,
            {
              bookingId: bookingId,
              listingTitle: booking.listingTitle || 'Booking',
              checkIn: booking.checkIn?.toDate ? booking.checkIn.toDate().toLocaleDateString('en-US') : 'N/A',
              checkOut: checkOutDate.toLocaleDateString('en-US'),
              hostName: booking.hostName || 'Host'
            }
          );
          
          // Mark reminder as sent
          await updateDoc(doc(db, 'bookings', bookingId), {
            reviewReminderSent: true,
            reviewReminderSentAt: serverTimestamp()
          });
          
          remindersSent.push({ bookingId, type: 'review_reminder' });
          console.log(`✅ Sent review reminder for booking: ${bookingId}`);
        } catch (error) {
          console.error(`❌ Error sending review reminder for ${bookingId}:`, error);
        }
      }
    }
    
    return {
      checked: snapshot.size,
      remindersSent: remindersSent.length
    };
    
  } catch (error) {
    console.error('❌ Error checking review reminders:', error);
    throw error;
  }
};

/**
 * Get booking status timeline
 * @param {Object} booking - Booking object
 * @returns {Array} Array of status events with dates
 */
export const getBookingStatusTimeline = (booking) => {
  const timeline = [];
  
  // Created
  if (booking.createdAt) {
    const createdAt = booking.createdAt?.toDate 
      ? booking.createdAt.toDate() 
      : (booking.createdAt?.seconds 
        ? new Date(booking.createdAt.seconds * 1000) 
        : null);
    
    if (createdAt) {
      timeline.push({
        status: 'created',
        label: 'Booking Created',
        date: createdAt,
        description: 'Your booking request was submitted',
        icon: '📝'
      });
    }
  }
  
  // Confirmed
  if (booking.status === 'confirmed' || booking.status === 'completed' || booking.status === 'cancelled') {
    const confirmedAt = booking.confirmedAt?.toDate 
      ? booking.confirmedAt.toDate() 
      : (booking.confirmedAt?.seconds 
        ? new Date(booking.confirmedAt.seconds * 1000) 
        : (booking.autoConfirmed ? booking.createdAt?.toDate || new Date() : null));
    
    if (confirmedAt) {
      timeline.push({
        status: 'confirmed',
        label: booking.autoConfirmed ? 'Auto-Confirmed' : 'Booking Confirmed',
        date: confirmedAt,
        description: booking.autoConfirmed 
          ? 'Booking was automatically confirmed (host did not respond within 24 hours)'
          : 'Your booking has been confirmed by the host',
        icon: booking.autoConfirmed ? '⏰' : '✅'
      });
    }
  }
  
  // Check-in reminder sent
  if (booking.checkInReminder1DaySent && booking.checkInReminder1DaySentAt) {
    const reminderDate = booking.checkInReminder1DaySentAt?.toDate 
      ? booking.checkInReminder1DaySentAt.toDate() 
      : (booking.checkInReminder1DaySentAt?.seconds 
        ? new Date(booking.checkInReminder1DaySentAt.seconds * 1000) 
        : null);
    
    if (reminderDate) {
      timeline.push({
        status: 'reminder',
        label: 'Check-in Reminder Sent',
        date: reminderDate,
        description: 'Reminder sent 1 day before check-in',
        icon: '🔔'
      });
    }
  }
  
  // Check-in date
  if (booking.checkIn) {
    const checkInDate = booking.checkIn?.toDate 
      ? booking.checkIn.toDate() 
      : (booking.checkIn?.seconds 
        ? new Date(booking.checkIn.seconds * 1000) 
        : new Date(booking.checkIn));
    
    timeline.push({
      status: 'check_in',
      label: 'Check-in Date',
      date: checkInDate,
      description: 'Your stay begins',
      icon: '🚪',
      isUpcoming: checkInDate > new Date()
    });
  }
  
  // Check-out date
  if (booking.checkOut) {
    const checkOutDate = booking.checkOut?.toDate 
      ? booking.checkOut.toDate() 
      : (booking.checkOut?.seconds 
        ? new Date(booking.checkOut.seconds * 1000) 
        : new Date(booking.checkOut));
    
    timeline.push({
      status: 'check_out',
      label: 'Check-out Date',
      date: checkOutDate,
      description: 'Your stay ends',
      icon: '🚶',
      isUpcoming: checkOutDate > new Date()
    });
  }
  
  // Completed
  if (booking.status === 'completed' && booking.completedAt) {
    const completedAt = booking.completedAt?.toDate 
      ? booking.completedAt.toDate() 
      : (booking.completedAt?.seconds 
        ? new Date(booking.completedAt.seconds * 1000) 
        : null);
    
    if (completedAt) {
      timeline.push({
        status: 'completed',
        label: 'Stay Completed',
        date: completedAt,
        description: 'Your stay has been completed',
        icon: '🏁'
      });
    }
  }
  
  // Cancelled
  if (booking.status === 'cancelled' && booking.cancelledAt) {
    const cancelledAt = booking.cancelledAt?.toDate 
      ? booking.cancelledAt.toDate() 
      : (booking.cancelledAt?.seconds 
        ? new Date(booking.cancelledAt.seconds * 1000) 
        : null);
    
    if (cancelledAt) {
      timeline.push({
        status: 'cancelled',
        label: 'Booking Cancelled',
        date: cancelledAt,
        description: booking.cancelledBy === 'host' 
          ? 'Booking was cancelled by the host' 
          : 'Booking was cancelled',
        icon: '❌'
      });
    }
  }
  
  // Review reminder sent
  if (booking.reviewReminderSent && booking.reviewReminderSentAt) {
    const reminderDate = booking.reviewReminderSentAt?.toDate 
      ? booking.reviewReminderSentAt.toDate() 
      : (booking.reviewReminderSentAt?.seconds 
        ? new Date(booking.reviewReminderSentAt.seconds * 1000) 
        : null);
    
    if (reminderDate) {
      timeline.push({
        status: 'review_reminder',
        label: 'Review Reminder Sent',
        date: reminderDate,
        description: 'Reminder to leave a review',
        icon: '⭐'
      });
    }
  }
  
  // Sort timeline by date
  timeline.sort((a, b) => a.date.getTime() - b.date.getTime());
  
  return timeline;
};

