import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../Firebase';

const HostFeedback = ({ onClose, listingId = null, bookingId = null, guestId = null }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Get IDs from URL params if not provided as props
  const finalListingId = listingId || searchParams.get('listingId');
  const finalBookingId = bookingId || searchParams.get('bookingId');
  const finalGuestId = guestId || searchParams.get('guestId');
  
  const [formData, setFormData] = useState({
    type: 'guest_behavior',
    urgency: 'medium',
    subject: '',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const feedbackTypes = [
    { value: 'guest_behavior', label: 'Guest Behavior', icon: '👤', description: 'Inappropriate or concerning guest behavior' },
    { value: 'platform_issue', label: 'Platform Issue', icon: '🔧', description: 'Technical problems or bugs' },
    { value: 'support_request', label: 'Support Request', icon: '🆘', description: 'Need help or assistance' },
    { value: 'general', label: 'General Feedback', icon: '💬', description: 'Suggestions or general comments' }
  ];

  const urgencyLevels = [
    { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-700' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700' },
    { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-700' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.subject.trim()) {
      toast.error('Please enter a subject');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Please describe the issue');
      return;
    }

    if (!currentUser) {
      toast.error('Please log in to submit feedback');
      navigate('/login');
      return;
    }

    try {
      setSubmitting(true);

      const feedbackData = {
        userId: currentUser.uid,
        userType: 'host',
        userName: currentUser.displayName || currentUser.email,
        userEmail: currentUser.email,
        type: formData.type,
        urgency: formData.urgency,
        subject: formData.subject.trim(),
        description: formData.description.trim(),
        relatedBookingId: finalBookingId || null,
        relatedListingId: finalListingId || null,
        relatedGuestId: finalGuestId || null,
        status: 'open',
        adminResponse: null,
        adminRespondedAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'feedback'), feedbackData);

      toast.success('✅ Feedback submitted successfully! We will review it soon.');
      
      if (onClose) {
        onClose();
      } else {
        navigate(-1);
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-2xl font-bold text-gray-900">Report an Issue</h3>
          <button
            onClick={onClose || (() => navigate(-1))}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Feedback Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              What type of issue is this? *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {feedbackTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: type.value })}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    formData.type === type.value
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{type.icon}</span>
                    <span className="font-semibold text-gray-900">{type.label}</span>
                  </div>
                  <p className="text-xs text-gray-600">{type.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Urgency Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              How urgent is this? *
            </label>
            <div className="flex gap-3">
              {urgencyLevels.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, urgency: level.value })}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all border-2 ${
                    formData.urgency === level.value
                      ? `${level.color} border-current`
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject *
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Brief summary of the issue"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Provide detailed information about the issue..."
              rows={6}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-teal-500 focus:outline-none resize-none"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.description.length}/1000 characters
            </p>
          </div>

          {/* Context Info */}
          {(finalListingId || finalBookingId || finalGuestId) && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Related to:</p>
              {finalListingId && (
                <p className="text-sm font-medium text-gray-900">Listing ID: {finalListingId}</p>
              )}
              {finalBookingId && (
                <p className="text-sm font-medium text-gray-900">Booking ID: {finalBookingId}</p>
              )}
              {finalGuestId && (
                <p className="text-sm font-medium text-gray-900">Guest ID: {finalGuestId}</p>
              )}
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose || (() => navigate(-1))}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !formData.subject.trim() || !formData.description.trim()}
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
                'Submit Feedback'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HostFeedback;

