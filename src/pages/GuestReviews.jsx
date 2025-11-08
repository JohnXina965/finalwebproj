import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  updateDoc,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '../Firebase';
import { getGuestReviews } from '../services/GuestReviewService';
import { createWish, getGuestWishes, deleteWish } from '../services/WishService';

function GuestReviews() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('left'); // 'left', 'received', or 'wishes'
  const [listingReviews, setListingReviews] = useState([]);
  const [guestReviews, setGuestReviews] = useState([]);
  const [editingReview, setEditingReview] = useState(null);
  const [editComment, setEditComment] = useState('');
  const [wishes, setWishes] = useState([]);
  const [showWishForm, setShowWishForm] = useState(false);
  const [wishFormData, setWishFormData] = useState({
    hostId: '',
    listingId: '',
    listingType: 'home',
    message: ''
  });
  const [hosts, setHosts] = useState([]); // Hosts from bookings
  const [listings, setListings] = useState([]); // Listings from bookings

  useEffect(() => {
    if (currentUser) {
      loadReviews();
      loadWishes();
      loadHostsAndListings();
    }
  }, [currentUser]);

  const loadReviews = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);

      // Load reviews left by guest (for listings)
      const listingReviewsQuery = query(
        collection(db, 'reviews'),
        where('guestId', '==', currentUser.uid)
      );

      const listingReviewsSnapshot = await getDocs(listingReviewsQuery);
      const listingReviewsData = listingReviewsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000) : new Date())
        };
      });

      // Sort by date (newest first)
      listingReviewsData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setListingReviews(listingReviewsData);

      // Load reviews received from hosts
      const guestReviewsData = await getGuestReviews(currentUser.uid);
      setGuestReviews(guestReviewsData);

    } catch (error) {
      console.error('Error loading reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const loadWishes = async () => {
    if (!currentUser) return;

    try {
      const wishesData = await getGuestWishes(currentUser.uid);
      setWishes(wishesData);
    } catch (error) {
      console.error('Error loading wishes:', error);
      toast.error('Failed to load wishes');
    }
  };

  const loadHostsAndListings = async () => {
    if (!currentUser) return;

    try {
      // Get all bookings for this guest
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('guestId', '==', currentUser.uid)
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);

      const hostsMap = new Map();
      const listingsMap = new Map();

      for (const bookingDoc of bookingsSnapshot.docs) {
        const booking = bookingDoc.data();
        
        // Get host info
        if (booking.hostId && !hostsMap.has(booking.hostId)) {
          try {
            const hostDoc = await getDoc(doc(db, 'hosts', booking.hostId));
            if (hostDoc.exists()) {
              const hostData = hostDoc.data();
              hostsMap.set(booking.hostId, {
                id: booking.hostId,
                name: hostData.displayName || hostData.name || 'Host',
                email: hostData.email || ''
              });
            }
          } catch (err) {
            console.error('Error fetching host:', err);
          }
        }

        // Get listing info
        if (booking.listingId && !listingsMap.has(booking.listingId)) {
          try {
            const listingDoc = await getDoc(doc(db, 'listings', booking.listingId));
            if (listingDoc.exists()) {
              const listingData = listingDoc.data();
              listingsMap.set(booking.listingId, {
                id: booking.listingId,
                title: listingData.homeDetails?.title || 
                       listingData.experienceDetails?.title || 
                       listingData.serviceDetails?.title || 
                       'Listing',
                propertyType: listingData.propertyType || 'home',
                hostId: listingData.hostId
              });
            }
          } catch (err) {
            console.error('Error fetching listing:', err);
          }
        }
      }

      setHosts(Array.from(hostsMap.values()));
      setListings(Array.from(listingsMap.values()));
    } catch (error) {
      console.error('Error loading hosts and listings:', error);
    }
  };

  const handleSubmitWish = async (e) => {
    e.preventDefault();
    
    if (!wishFormData.hostId || !wishFormData.message.trim()) {
      toast.error('Please select a host and enter your wish/suggestion');
      return;
    }

    try {
      const selectedListing = listings.find(l => l.id === wishFormData.listingId);
      
      await createWish({
        guestId: currentUser.uid,
        hostId: wishFormData.hostId,
        listingId: wishFormData.listingId || null,
        listingType: selectedListing?.propertyType || wishFormData.listingType,
        message: wishFormData.message.trim(),
        guestName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Guest',
        guestEmail: currentUser.email || ''
      });

      toast.success('Wish/suggestion submitted successfully!');
      setWishFormData({
        hostId: '',
        listingId: '',
        listingType: 'home',
        message: ''
      });
      setShowWishForm(false);
      loadWishes();
    } catch (error) {
      console.error('Error submitting wish:', error);
      toast.error('Failed to submit wish/suggestion');
    }
  };

  const handleDeleteWish = async (wishId) => {
    if (!window.confirm('Are you sure you want to delete this wish/suggestion?')) {
      return;
    }

    try {
      await deleteWish(wishId);
      toast.success('Wish/suggestion deleted successfully');
      loadWishes();
    } catch (error) {
      console.error('Error deleting wish:', error);
      toast.error('Failed to delete wish/suggestion');
    }
  };

  const canEditReview = (reviewDate) => {
    // Allow editing within 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return reviewDate >= sevenDaysAgo;
  };

  const handleEditReview = (review) => {
    setEditingReview(review.id);
    setEditComment(review.comment || review.content || '');
  };

  const handleSaveEdit = async (reviewId, isListingReview) => {
    if (!editComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    try {
      const reviewRef = doc(db, isListingReview ? 'reviews' : 'guestReviews', reviewId);
      await updateDoc(reviewRef, {
        comment: editComment.trim(),
        content: editComment.trim(),
        updatedAt: new Date()
      });

      toast.success('Review updated successfully');
      setEditingReview(null);
      setEditComment('');
      loadReviews();
    } catch (error) {
      console.error('Error updating review:', error);
      toast.error('Failed to update review');
    }
  };

  const handleDeleteReview = async (reviewId, isListingReview) => {
    if (!window.confirm('Are you sure you want to delete this review? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, isListingReview ? 'reviews' : 'guestReviews', reviewId));
      toast.success('Review deleted successfully');
      loadReviews();
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('Failed to delete review');
    }
  };

  const calculateStats = () => {
    const totalLeft = listingReviews.length;
    const totalReceived = guestReviews.length;
    const avgReceived = guestReviews.length > 0
      ? (guestReviews.reduce((sum, r) => sum + (r.ratings?.overall || 0), 0) / guestReviews.length).toFixed(1)
      : 0;

    return { totalLeft, totalReceived, avgReceived };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Reviews</h1>
          <p className="text-gray-600">Manage your reviews and ratings</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Reviews Left</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalLeft}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Reviews Received</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalReceived}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Average Rating</p>
            <p className="text-3xl font-bold text-yellow-600">
              {stats.avgReceived > 0 ? `${stats.avgReceived}/5` : 'N/A'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('left')}
                className={`flex-1 px-6 py-4 text-center font-semibold transition-colors ${
                  activeTab === 'left'
                    ? 'border-b-2 border-teal-500 text-teal-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Reviews I Left ({stats.totalLeft})
              </button>
              <button
                onClick={() => setActiveTab('received')}
                className={`flex-1 px-6 py-4 text-center font-semibold transition-colors ${
                  activeTab === 'received'
                    ? 'border-b-2 border-teal-500 text-teal-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Reviews I Received ({stats.totalReceived})
              </button>
              <button
                onClick={() => setActiveTab('wishes')}
                className={`flex-1 px-6 py-4 text-center font-semibold transition-colors ${
                  activeTab === 'wishes'
                    ? 'border-b-2 border-teal-500 text-teal-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Wishes & Suggestions ({wishes.length})
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'left' && (
              <div className="space-y-4">
                {listingReviews.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">⭐</div>
                    <p className="text-gray-600 text-lg">You haven't left any reviews yet</p>
                    <Link
                      to="/trips"
                      className="mt-4 inline-block px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors"
                    >
                      View Your Trips
                    </Link>
                  </div>
                ) : (
                  listingReviews.map((review) => {
                    const canEdit = canEditReview(review.createdAt);
                    const isEditing = editingReview === review.id;

                    return (
                      <div key={review.id} className="border-2 border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Link
                                to={`/listing/${review.listingId}`}
                                className="font-bold text-lg text-gray-900 hover:text-teal-600"
                              >
                                {review.listingTitle || 'Listing'}
                              </Link>
                            </div>
                            <div className="flex items-center gap-1 mb-2">
                              {[...Array(5)].map((_, i) => (
                                <svg
                                  key={i}
                                  className={`w-5 h-5 ${i < (review.rating || 0) ? 'text-yellow-500 fill-current' : 'text-gray-300'}`}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                </svg>
                              ))}
                              <span className="text-sm text-gray-600 ml-2">
                                {review.rating || 0}/5
                              </span>
                            </div>
                            {isEditing ? (
                              <div className="mt-4">
                                <textarea
                                  value={editComment}
                                  onChange={(e) => setEditComment(e.target.value)}
                                  rows={3}
                                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                />
                                <div className="flex gap-2 mt-2">
                                  <button
                                    onClick={() => handleSaveEdit(review.id, true)}
                                    className="px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors text-sm"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingReview(null);
                                      setEditComment('');
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors text-sm"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-gray-700">{review.comment || review.content || 'No comment provided.'}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-2">
                              {review.createdAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                          {canEdit && !isEditing && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditReview(review)}
                                className="px-3 py-1 text-sm text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteReview(review.id, true)}
                                className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'received' && (
              <div className="space-y-4">
                {guestReviews.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">👤</div>
                    <p className="text-gray-600 text-lg">No reviews from hosts yet</p>
                    <p className="text-gray-500 text-sm mt-2">Complete bookings to receive reviews from hosts</p>
                  </div>
                ) : (
                  guestReviews.map((review) => (
                    <div key={review.id} className="border-2 border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-bold text-lg text-gray-900">{review.hostName || 'Host'}</h4>
                            <span className="text-gray-300">·</span>
                            <span className="text-sm text-gray-600">
                              {review.createdAt?.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) || 'Recently'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mb-2">
                            {[...Array(5)].map((_, i) => (
                              <svg
                                key={i}
                                className={`w-5 h-5 ${i < (review.ratings?.overall || 0) ? 'text-yellow-500 fill-current' : 'text-gray-300'}`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                              </svg>
                            ))}
                            <span className="text-sm text-gray-600 ml-2">
                              {review.ratings?.overall || 0}/5
                            </span>
                          </div>
                          {review.ratings && (
                            <div className="flex flex-wrap gap-4 text-xs text-gray-600 mb-2">
                              {review.ratings.communication > 0 && (
                                <span>Communication: {review.ratings.communication}/5</span>
                              )}
                              {review.ratings.cleanliness > 0 && (
                                <span>Cleanliness: {review.ratings.cleanliness}/5</span>
                              )}
                              {review.ratings.respectfulness > 0 && (
                                <span>Respectfulness: {review.ratings.respectfulness}/5</span>
                              )}
                            </div>
                          )}
                          <p className="text-gray-700">{review.comment || 'No comment provided.'}</p>
                          {review.listingTitle && (
                            <p className="text-xs text-gray-500 mt-2">
                              Booking: {review.listingTitle}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'wishes' && (
              <div className="space-y-6">
                {/* Add Wish Button */}
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Wishes & Suggestions</h3>
                    <p className="text-sm text-gray-600">Share your wishes and suggestions with hosts</p>
                  </div>
                  <button
                    onClick={() => setShowWishForm(!showWishForm)}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors"
                  >
                    {showWishForm ? 'Cancel' : '+ Add Wish'}
                  </button>
                </div>

                {/* Wish Form */}
                {showWishForm && (
                  <div className="border-2 border-teal-200 rounded-xl p-6 bg-teal-50">
                    <form onSubmit={handleSubmitWish} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Host *
                        </label>
                        <select
                          value={wishFormData.hostId}
                          onChange={(e) => {
                            const selectedHostId = e.target.value;
                            setWishFormData({
                              ...wishFormData,
                              hostId: selectedHostId,
                              listingId: '' // Reset listing when host changes
                            });
                          }}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                          required
                        >
                          <option value="">Choose a host...</option>
                          {hosts.map(host => (
                            <option key={host.id} value={host.id}>{host.name}</option>
                          ))}
                        </select>
                      </div>

                      {wishFormData.hostId && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Listing (Optional)
                          </label>
                          <select
                            value={wishFormData.listingId}
                            onChange={(e) => {
                              const selectedListingId = e.target.value;
                              const selectedListing = listings.find(l => l.id === selectedListingId);
                              setWishFormData({
                                ...wishFormData,
                                listingId: selectedListingId,
                                listingType: selectedListing?.propertyType || wishFormData.listingType
                              });
                            }}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                          >
                            <option value="">General wish/suggestion</option>
                            {listings
                              .filter(l => l.hostId === wishFormData.hostId)
                              .map(listing => (
                                <option key={listing.id} value={listing.id}>
                                  {listing.title} ({listing.propertyType})
                                </option>
                              ))}
                          </select>
                        </div>
                      )}

                      {!wishFormData.listingId && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Listing Type
                          </label>
                          <select
                            value={wishFormData.listingType}
                            onChange={(e) => setWishFormData({ ...wishFormData, listingType: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                          >
                            <option value="home">Home</option>
                            <option value="experience">Experience</option>
                            <option value="service">Service</option>
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Your Wish/Suggestion *
                        </label>
                        <textarea
                          value={wishFormData.message}
                          onChange={(e) => setWishFormData({ ...wishFormData, message: e.target.value })}
                          rows={4}
                          placeholder="Share your wishes, suggestions, or feedback for the host..."
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors"
                      >
                        Submit Wish/Suggestion
                      </button>
                    </form>
                  </div>
                )}

                {/* Wishes List */}
                {wishes.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">💭</div>
                    <p className="text-gray-600 text-lg">No wishes/suggestions yet</p>
                    <p className="text-gray-500 text-sm mt-2">Share your wishes with hosts to help them improve</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {wishes.map((wish) => {
                      const host = hosts.find(h => h.id === wish.hostId);
                      const listing = listings.find(l => l.id === wish.listingId);
                      
                      return (
                        <div key={wish.id} className="border-2 border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-bold text-lg text-gray-900">{host?.name || 'Host'}</h4>
                                <span className="text-gray-300">·</span>
                                <span className="text-sm text-gray-600 capitalize">{wish.listingType}</span>
                                {listing && (
                                  <>
                                    <span className="text-gray-300">·</span>
                                    <Link
                                      to={`/listing/${wish.listingId}`}
                                      className="text-sm text-teal-600 hover:underline"
                                    >
                                      {listing.title}
                                    </Link>
                                  </>
                                )}
                              </div>
                              <p className="text-gray-700 whitespace-pre-wrap mb-2">{wish.message}</p>
                              <p className="text-xs text-gray-500">
                                {wish.createdAt.toLocaleDateString('en-US', { 
                                  month: 'long', 
                                  day: 'numeric', 
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                              <span className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${
                                wish.status === 'acknowledged' 
                                  ? 'bg-green-100 text-green-800' 
                                  : wish.status === 'read'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {wish.status.charAt(0).toUpperCase() + wish.status.slice(1)}
                              </span>
                            </div>
                            <button
                              onClick={() => handleDeleteWish(wish.id)}
                              className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GuestReviews;

