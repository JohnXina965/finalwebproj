import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc,
  doc, 
  getDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../Firebase';

const HostReviewGuest = ({ booking, onReviewSubmitted, onClose }) => {
  const { currentUser } = useAuth();
  const [ratings, setRatings] = useState({
    communication: 0,
    cleanliness: 0,
    respectfulness: 0,
    overall: 0
  });
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [existingReview, setExistingReview] = useState(null);

  useEffect(() => {
    checkExistingReview();
  }, [booking, currentUser]);

  const checkExistingReview = async () => {
    if (!booking || !currentUser) return;
    
    try {
      const q = query(
        collection(db, 'guestReviews'),
        where('bookingId', '==', booking.id),
        where('hostId', '==', currentUser.uid),
        where('guestId', '==', booking.guestId)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const reviewDoc = snapshot.docs[0];
        const reviewData = reviewDoc.data();
        setExistingReview({ id: reviewDoc.id, ...reviewData });
        setHasReviewed(true);
        setRatings({
          communication: reviewData.ratings?.communication || 0,
          cleanliness: reviewData.ratings?.cleanliness || 0,
          respectfulness: reviewData.ratings?.respectfulness || 0,
          overall: reviewData.ratings?.overall || 0
        });
        setComment(reviewData.comment || '');
      }
    } catch (error) {
      console.error('Error checking existing review:', error);
    }
  };

  const handleRatingChange = (category, value) => {
    setRatings(prev => ({
      ...prev,
      [category]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (ratings.overall === 0) {
      toast.error('Please provide an overall rating');
      return;
    }

    if (!comment.trim()) {
      toast.error('Please write a review comment');
      return;
    }

    try {
      setSubmitting(true);

      const reviewData = {
        guestId: booking.guestId,
        guestName: booking.guestName || booking.guestEmail || 'Guest',
        guestEmail: booking.guestEmail,
        hostId: currentUser.uid,
        hostName: currentUser.displayName || currentUser.email,
        bookingId: booking.id,
        listingId: booking.listingId,
        listingTitle: booking.listingTitle || 'Listing',
        ratings: {
          communication: ratings.communication,
          cleanliness: ratings.cleanliness,
          respectfulness: ratings.respectfulness,
          overall: ratings.overall
        },
        comment: comment.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (hasReviewed && existingReview) {
        // Update existing review
        await updateDoc(doc(db, 'guestReviews', existingReview.id), {
          ...reviewData,
          updatedAt: serverTimestamp()
        });
        toast.success('✅ Review updated successfully!');
      } else {
        // Create new review
        await addDoc(collection(db, 'guestReviews'), reviewData);
        toast.success('✅ Review submitted successfully!');
      }

      if (onReviewSubmitted) {
        onReviewSubmitted();
      }
      
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({ value, onChange, label }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`transition-transform hover:scale-110 ${
              star <= value ? 'text-yellow-500' : 'text-gray-300'
            }`}
          >
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
          </button>
        ))}
        {value > 0 && (
          <span className="text-sm text-gray-600 ml-2">{value}/5</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-2xl font-bold text-gray-900">
            {hasReviewed ? 'Update Review' : 'Review Guest'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Guest Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Reviewing</p>
            <p className="font-semibold text-gray-900">
              {booking.guestName || booking.guestEmail || 'Guest'}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Booking: {booking.listingTitle || 'Listing'}
            </p>
          </div>

          {/* Rating Categories */}
          <div className="space-y-6">
            <StarRating
              label="Overall Rating *"
              value={ratings.overall}
              onChange={(value) => handleRatingChange('overall', value)}
            />
            
            <StarRating
              label="Communication"
              value={ratings.communication}
              onChange={(value) => handleRatingChange('communication', value)}
            />
            
            <StarRating
              label="Cleanliness"
              value={ratings.cleanliness}
              onChange={(value) => handleRatingChange('cleanliness', value)}
            />
            
            <StarRating
              label="Respectfulness"
              value={ratings.respectfulness}
              onChange={(value) => handleRatingChange('respectfulness', value)}
            />
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Review Comment *
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience with this guest..."
              rows={5}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-teal-500 focus:outline-none resize-none"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {comment.length}/500 characters
            </p>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || ratings.overall === 0 || !comment.trim()}
              className="flex-1 px-4 py-3 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Submitting...
                </span>
              ) : (
                hasReviewed ? 'Update Review' : 'Submit Review'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HostReviewGuest;

