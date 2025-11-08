import { 
  collection, 
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  getDoc,
  setDoc,
  Timestamp,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../Firebase';

/**
 * Create a booking for a listing
 * @param {Object} bookingData - Booking information
 * @param {string} bookingData.listingId - ID of the listing
 * @param {string} bookingData.guestId - ID of the guest
 * @param {string} bookingData.hostId - ID of the host
 * @param {Date} bookingData.checkIn - Check-in date
 * @param {Date} bookingData.checkOut - Check-out date (optional for experiences/services)
 * @param {number} bookingData.guests - Number of guests
 * @param {number} bookingData.totalAmount - Total booking amount
 * @param {string} bookingData.paymentMethod - Payment method ('wallet', 'paypal')
 * @param {Object} bookingData.listingInfo - Listing details (title, type, location)
 * @returns {Promise<string>} Booking ID
 */
export const createBooking = async (bookingData) => {
  try {
    const {
      listingId,
      guestId,
      hostId,
      checkIn,
      checkOut,
      guests,
      totalAmount,
      serviceFee,
      paymentMethod,
      listingInfo
    } = bookingData;

    // Validate required fields
    if (!listingId || !guestId || !hostId || !checkIn || !guests || !totalAmount) {
      throw new Error('Missing required booking information');
    }

    // Create booking document
    const bookingDoc = {
      listingId,
      guestId,
      hostId,
      guestName: bookingData.guestName || 'Guest',
      guestEmail: bookingData.guestEmail || '',
      hostName: bookingData.hostName || 'Host',
      listingTitle: listingInfo?.title || 'Unknown Listing',
      listingType: listingInfo?.type || 'accommodation',
      location: listingInfo?.location || '',
      
      // Dates
      checkIn: checkIn instanceof Date ? checkIn : new Date(checkIn),
      checkOut: checkOut ? (checkOut instanceof Date ? checkOut : new Date(checkOut)) : null,
      
      // Guests
      guests: Number(guests),
      
      // Pricing
      basePrice: bookingData.basePrice || totalAmount,
      // Use provided serviceFee or calculate using current service fee percentage
      serviceFee: serviceFee || (() => {
        const { calculateServiceFee: calcFee } = require('./ServiceFeeService');
        return calcFee(totalAmount);
      })(),
      totalAmount: Number(totalAmount),
      
      // Payment
      paymentMethod: paymentMethod || 'paypal',
      paymentStatus: paymentMethod === 'paypal' ? 'paid' : (paymentMethod === 'wallet' ? 'paid' : 'pending'),
      paymentDetails: bookingData.paymentDetails || null,
      
      // Status
      status: 'pending', // pending, confirmed, cancelled, completed
      
      // Timestamps
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // Save booking to Firestore
    const bookingRef = await addDoc(collection(db, 'bookings'), bookingDoc);
    
      // Send notification to host about new booking
      try {
        const { sendNewBookingNotificationToHost } = await import('./EmailService');
        const hostUserRef = doc(db, 'users', hostId);
        const hostUserSnap = await getDoc(hostUserRef);
      const hostUserData = hostUserSnap.exists() ? hostUserSnap.data() : {};
      const hostEmail = hostUserData.email || bookingData.hostEmail || '';
      
      if (hostEmail) {
        await sendNewBookingNotificationToHost(
          hostEmail,
          bookingData.hostName || 'Host',
          {
            bookingId: bookingRef.id,
            listingTitle: listingInfo?.title || 'Listing',
            guestName: bookingData.guestName || 'Guest',
            checkIn: bookingDoc.checkIn,
            checkOut: bookingDoc.checkOut,
            guests: guests,
            totalAmount: totalAmount
          }
        );
      }
    } catch (notificationError) {
      console.error('Error sending new booking notification to host:', notificationError);
      // Don't throw - booking was created successfully
    }
    
    // Create payout record instead of directly crediting host
    // Payment goes to admin PayPal account first, then admin releases to host
    if (paymentMethod === 'paypal' && bookingData.paymentDetails) {
      try {
        const basePrice = bookingData.basePrice || (totalAmount - (serviceFee || 0));
        
        // Calculate due date (e.g., 7 days after booking or after check-in)
        const dueDate = new Date(checkIn instanceof Date ? checkIn : new Date(checkIn));
        dueDate.setDate(dueDate.getDate() + 7); // 7 days after check-in
        
        // Create payout record in 'payouts' collection
        // Payment goes to admin PayPal account first, admin will release to host later
        await addDoc(collection(db, 'payouts'), {
          type: listingInfo?.type === 'home' ? 'Place' : (listingInfo?.type === 'experience' ? 'Experience' : 'Service'),
          bookingId: bookingRef.id,
          listingId: listingId,
          hostId: hostId,
          hostName: bookingData.hostName || 'Host',
          hostEmail: bookingData.hostEmail || '',
          guestId: guestId,
          guestName: bookingData.guestName || 'Guest',
          guestEmail: bookingData.guestEmail || '',
          amount: basePrice,
          serviceFee: serviceFee || 0,
          totalAmount: totalAmount,
          payoutStatus: 'PENDING', // PENDING, ON_HOLD, RELEASED, REFUNDED
          paymentMethod: 'paypal',
          paymentDetails: bookingData.paymentDetails,
          adminPaypalEmail: 'sb-xivle46740431@business.admin.com', // Admin PayPal account
          dueDate: Timestamp.fromDate(dueDate),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        console.log(`✅ Payout record created: ₱${basePrice} pending release to host ${hostId}`);
      } catch (walletError) {
        console.error('Error crediting host wallet:', walletError);
        // Don't throw - booking was created successfully, wallet can be updated later
      }
    } else if (paymentMethod === 'wallet') {
      // Wallet payment - create payout record (funds already deducted from guest wallet)
      try {
        const basePrice = bookingData.basePrice || (totalAmount - (serviceFee || 0));
        
        // Calculate due date
        const dueDate = new Date(checkIn instanceof Date ? checkIn : new Date(checkIn));
        dueDate.setDate(dueDate.getDate() + 7);
        
        // Create payout record
        await addDoc(collection(db, 'payouts'), {
          type: listingInfo?.type === 'home' ? 'Place' : (listingInfo?.type === 'experience' ? 'Experience' : 'Service'),
          bookingId: bookingRef.id,
          listingId: listingId,
          hostId: hostId,
          hostName: bookingData.hostName || 'Host',
          hostEmail: bookingData.hostEmail || '',
          guestId: guestId,
          guestName: bookingData.guestName || 'Guest',
          guestEmail: bookingData.guestEmail || '',
          amount: basePrice,
          serviceFee: serviceFee || 0,
          totalAmount: totalAmount,
          payoutStatus: 'PENDING',
          paymentMethod: 'wallet',
          adminPaypalEmail: 'sb-xivle46740431@business.admin.com',
          dueDate: Timestamp.fromDate(dueDate),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        console.log(`✅ Wallet payout record created: ₱${basePrice} pending release to host ${hostId}`);
      } catch (payoutError) {
        console.error('Error creating wallet payout record:', payoutError);
        // Don't throw - booking was created successfully
      }
    }
    
    // Update listing bookings count
    try {
      const listingRef = doc(db, 'listings', listingId);
      const listingSnap = await getDoc(listingRef);
      
      if (listingSnap.exists()) {
        const currentBookings = listingSnap.data().bookings || 0;
        await updateDoc(listingRef, {
          bookings: currentBookings + 1,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error updating listing bookings count:', error);
      // Don't throw - booking was created successfully
    }

    console.log('✅ Booking created successfully:', bookingRef.id);
    return bookingRef.id;
    
  } catch (error) {
    console.error('❌ Error creating booking:', error);
    throw new Error(`Failed to create booking: ${error.message}`);
  }
};

/**
 * Update booking status
 * @param {string} bookingId - Booking ID
 * @param {string} status - New status (pending, confirmed, cancelled, completed)
 * @param {Object} additionalData - Additional data to update
 */
export const updateBookingStatus = async (bookingId, status, additionalData = {}) => {
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingSnap = await getDoc(bookingRef);
    
    if (!bookingSnap.exists()) {
      throw new Error('Booking not found');
    }

    const bookingData = bookingSnap.data();
    const updates = {
      status,
      updatedAt: serverTimestamp(),
      ...additionalData
    };

    if (status === 'confirmed') {
      updates.confirmedAt = serverTimestamp();
      
      // Send confirmation notification to guest
      try {
        const { sendBookingApprovalEmail, sendAutoConfirmationEmail } = await import('./EmailService');
        const isAutoConfirmed = additionalData.autoConfirmed === true;
        
        if (isAutoConfirmed) {
          // Send auto-confirmation email
          await sendAutoConfirmationEmail(
            bookingData.guestEmail,
            bookingData.guestName,
            {
              bookingId: bookingId,
              listingTitle: bookingData.listingTitle || 'Listing',
              checkIn: bookingData.checkIn?.toDate ? bookingData.checkIn.toDate().toLocaleDateString('en-US') : 'N/A',
              checkOut: bookingData.checkOut?.toDate ? bookingData.checkOut.toDate().toLocaleDateString('en-US') : 'N/A',
              totalAmount: bookingData.totalAmount,
              hostName: bookingData.hostName || 'Host',
              autoConfirmReason: additionalData.autoConfirmReason || 'Host did not respond within 24 hours'
            }
          );
        } else {
          // Send regular approval email
          await sendBookingApprovalEmail(
            bookingData.guestEmail,
            bookingData.guestName,
            {
              bookingId: bookingId,
              listingTitle: bookingData.listingTitle || 'Listing',
              checkIn: bookingData.checkIn?.toDate ? bookingData.checkIn.toDate().toLocaleDateString('en-US') : 'N/A',
              checkOut: bookingData.checkOut?.toDate ? bookingData.checkOut.toDate().toLocaleDateString('en-US') : 'N/A',
              totalAmount: bookingData.totalAmount,
              hostName: bookingData.hostName || 'Host'
            }
          );
        }
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError);
        // Don't throw - booking status was updated successfully
      }
      
      // When booking is confirmed, update payout status to ON_HOLD (ready for admin to release)
      // Don't credit host wallet yet - admin will release payout manually through Payout Control Center
      try {
        // Find related payout record
        const payoutsQuery = query(
          collection(db, 'payouts'),
          where('bookingId', '==', bookingId)
        );
        const payoutsSnapshot = await getDocs(payoutsQuery);
        
        if (!payoutsSnapshot.empty) {
          const payoutDoc = payoutsSnapshot.docs[0];
          await updateDoc(doc(db, 'payouts', payoutDoc.id), {
            payoutStatus: 'ON_HOLD', // Ready for admin to release
            updatedAt: serverTimestamp()
          });
          console.log(`✅ Payout status updated to ON_HOLD for booking ${bookingId}`);
        }
      } catch (payoutError) {
        console.error('Error updating payout status:', payoutError);
        // Don't throw - booking status was updated successfully
      }
    } else if (status === 'cancelled' || status === 'rejected') {
      updates.cancelledAt = serverTimestamp();
      
      // Send cancellation/rejection notification to guest
      try {
        if (status === 'rejected') {
          const { sendBookingRejectionEmail } = await import('./EmailService');
          await sendBookingRejectionEmail(
            bookingData.guestEmail,
            bookingData.guestName,
            {
              bookingId: bookingId,
              listingTitle: bookingData.listingTitle || 'Listing',
              checkIn: bookingData.checkIn?.toDate ? bookingData.checkIn.toDate().toLocaleDateString('en-US') : 'N/A',
              checkOut: bookingData.checkOut?.toDate ? bookingData.checkOut.toDate().toLocaleDateString('en-US') : 'N/A',
              totalAmount: bookingData.totalAmount,
              hostName: bookingData.hostName || 'Host',
              rejectionReason: additionalData.rejectionReason || 'Host unavailable for these dates'
            }
          );
        } else if (status === 'cancelled' && additionalData.refundAmount !== undefined) {
          // Cancellation with refund
          const { sendCancellationRefundEmail } = await import('./EmailService');
          await sendCancellationRefundEmail(
            bookingData.guestEmail,
            bookingData.guestName,
            {
              bookingId: bookingId,
              listingTitle: bookingData.listingTitle || 'Booking',
              checkIn: bookingData.checkIn?.toDate ? bookingData.checkIn.toDate().toLocaleDateString('en-US') : 'N/A',
              checkOut: bookingData.checkOut?.toDate ? bookingData.checkOut.toDate().toLocaleDateString('en-US') : 'N/A',
              originalAmount: bookingData.totalAmount,
              refundAmount: additionalData.refundAmount,
              adminDeduction: additionalData.adminDeduction || 0,
              cancellationFee: additionalData.cancellationFee || 0,
              policyDescription: additionalData.policyDescription || 'Standard cancellation policy'
            }
          );
        }
      } catch (emailError) {
        console.error('Error sending cancellation/rejection email:', emailError);
        // Don't throw - booking status was updated successfully
      }
      
      // Process refund - create refund payout record (refunds go through admin account)
      const refundAmount = additionalData.refundAmount || bookingData.totalAmount || 0;
      
      if (refundAmount > 0) {
        try {
          // Find related payout record and mark as REFUNDED
          const payoutsQuery = query(
            collection(db, 'payouts'),
            where('bookingId', '==', bookingId)
          );
          const payoutsSnapshot = await getDocs(payoutsQuery);
          
          if (!payoutsSnapshot.empty) {
            // Update existing payout to REFUNDED
            const payoutDoc = payoutsSnapshot.docs[0];
            await updateDoc(doc(db, 'payouts', payoutDoc.id), {
              payoutStatus: 'REFUNDED',
              refundAmount: refundAmount,
              refundedAt: serverTimestamp(),
              refundedBy: 'system',
              updatedAt: serverTimestamp()
            });
          } else {
            // Create new refund payout record if no existing payout found
            await addDoc(collection(db, 'payouts'), {
              type: 'Refund',
              bookingId: bookingId,
              listingId: bookingData.listingId || '',
              hostId: bookingData.hostId || '',
              hostName: bookingData.hostName || 'Host',
              guestId: bookingData.guestId,
              guestName: bookingData.guestName || 'Guest',
              guestEmail: bookingData.guestEmail || '',
              amount: refundAmount,
              totalAmount: refundAmount,
              payoutStatus: 'REFUNDED',
              paymentMethod: bookingData.paymentMethod || 'paypal',
              adminPaypalEmail: 'sb-xivle46740431@business.admin.com',
              refundedAt: serverTimestamp(),
              refundedBy: 'system',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }
          
          // If wallet payment, refund to guest wallet
          if (bookingData.paymentMethod === 'wallet') {
            const guestId = bookingData.guestId;
            
            // Get guest's wallet
            const guestWalletRef = doc(db, 'wallets', guestId);
            const guestWalletSnap = await getDoc(guestWalletRef);
            
            const currentBalance = guestWalletSnap.exists() ? (guestWalletSnap.data().balance || 0) : 0;
            const newBalance = currentBalance + refundAmount;
            
            // Update guest wallet
            await setDoc(guestWalletRef, {
              userId: guestId,
              balance: newBalance,
              currency: 'PHP',
              updatedAt: serverTimestamp()
            }, { merge: true });
            
            // Create transaction record for guest (refund)
            const transactionRef = doc(collection(db, 'walletTransactions'));
            await setDoc(transactionRef, {
              userId: guestId,
              type: 'refund',
              amount: refundAmount,
              balanceBefore: currentBalance,
              balanceAfter: newBalance,
              status: 'completed',
              description: `Refund for cancelled/rejected booking: ${bookingData.listingTitle || 'Listing'}`,
              bookingId: bookingId,
              createdAt: serverTimestamp()
            });
            
            console.log(`✅ Guest wallet refunded: ₱${refundAmount} to guest ${guestId}`);
          } else if (bookingData.paymentMethod === 'paypal') {
            // PayPal refund - refund payout record already created above
            // Actual PayPal refund would be processed via PayPal API from admin account (sb-xivle46740431@business.admin.com)
            console.log(`✅ Refund payout record created: ₱${refundAmount} for PayPal payment`);
          }
        } catch (refundError) {
          console.error('Error processing refund:', refundError);
          // Don't throw - booking status was updated successfully
        }
      }
    } else if (status === 'completed') {
      updates.completedAt = serverTimestamp();
      
      // Send completion notifications to both guest and host
      try {
        const { sendBookingCompletionEmail } = await import('./EmailService');
        
        const bookingDetails = {
          bookingId: bookingId,
          listingTitle: bookingData.listingTitle || 'Booking',
          checkIn: bookingData.checkIn?.toDate ? bookingData.checkIn.toDate().toLocaleDateString('en-US') : 'N/A',
          checkOut: bookingData.checkOut?.toDate ? bookingData.checkOut.toDate().toLocaleDateString('en-US') : 'N/A',
          totalAmount: bookingData.totalAmount,
          guestName: bookingData.guestName || 'Guest',
          hostName: bookingData.hostName || 'Host'
        };
        
        // Send to guest
        if (bookingData.guestEmail) {
          await sendBookingCompletionEmail(
            bookingData.guestEmail,
            bookingData.guestName,
            bookingDetails,
            'guest'
          );
        }
        
        // Send to host
        const hostUserRef = doc(db, 'users', bookingData.hostId);
        const hostUserSnap = await getDoc(hostUserRef);
        const hostUserData = hostUserSnap.exists() ? hostUserSnap.data() : {};
        const hostEmail = hostUserData.email || '';
        
        if (hostEmail) {
          await sendBookingCompletionEmail(
            hostEmail,
            bookingData.hostName,
            bookingDetails,
            'host'
          );
        }
      } catch (emailError) {
        console.error('Error sending completion emails:', emailError);
        // Don't throw - booking status was updated successfully
      }
    }

    await updateDoc(bookingRef, updates);
    console.log('✅ Booking status updated:', bookingId, status);
    
  } catch (error) {
    console.error('❌ Error updating booking status:', error);
    throw new Error(`Failed to update booking: ${error.message}`);
  }
};

