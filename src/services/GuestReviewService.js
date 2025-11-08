import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../Firebase';

/**
 * Create a guest review
 */
export const createGuestReview = async (reviewData) => {
  try {
    const reviewWithMetadata = {
      ...reviewData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'guestReviews'), reviewWithMetadata);
    console.log('✅ Guest review created with ID: ', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error creating guest review: ', error);
    throw error;
  }
};

/**
 * Update a guest review
 */
export const updateGuestReview = async (reviewId, updates) => {
  try {
    const reviewRef = doc(db, 'guestReviews', reviewId);
    await updateDoc(reviewRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    console.log('✅ Guest review updated:', reviewId);
  } catch (error) {
    console.error('❌ Error updating guest review:', error);
    throw error;
  }
};

/**
 * Get guest reviews by guest ID
 */
export const getGuestReviews = async (guestId) => {
  try {
    const q = query(
      collection(db, 'guestReviews'),
      where('guestId', '==', guestId)
    );

    const snapshot = await getDocs(q);
    const reviews = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000) : null)
      };
    });

    return reviews;
  } catch (error) {
    console.error('❌ Error fetching guest reviews:', error);
    throw error;
  }
};

/**
 * Get guest review by booking ID
 */
export const getGuestReviewByBooking = async (bookingId, hostId) => {
  try {
    const q = query(
      collection(db, 'guestReviews'),
      where('bookingId', '==', bookingId),
      where('hostId', '==', hostId)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const reviewDoc = snapshot.docs[0];
    const data = reviewDoc.data();
    return {
      id: reviewDoc.id,
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000) : null)
    };
  } catch (error) {
    console.error('❌ Error fetching guest review by booking:', error);
    throw error;
  }
};

/**
 * Calculate guest average rating
 */
export const calculateGuestRating = (reviews) => {
  if (!reviews || reviews.length === 0) {
    return { average: 0, count: 0 };
  }

  const totalRating = reviews.reduce((sum, review) => sum + (review.ratings?.overall || 0), 0);
  const averageRating = totalRating / reviews.length;

  return {
    average: parseFloat(averageRating.toFixed(1)),
    count: reviews.length
  };
};

