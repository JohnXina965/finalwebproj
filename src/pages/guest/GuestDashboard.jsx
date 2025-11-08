import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useWallet } from '../../contexts/WalletContext';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../Firebase';
import { getGuestRecommendations } from '../../services/RecommendationService';
import toast from 'react-hot-toast';

function GuestDashboard() {
  const { currentUser } = useAuth();
  const { balance } = useWallet();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTrips: 0,
    upcomingTrips: 0,
    totalFavorites: 0,
    totalReviews: 0,
    totalSpent: 0
  });
  const [upcomingTrips, setUpcomingTrips] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    if (currentUser) {
      loadDashboardData();
    }
  }, [currentUser]);

  const loadDashboardData = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);

      // Load all data in parallel
      await Promise.all([
        loadStats(),
        loadUpcomingTrips(),
        loadRecentActivity(),
        loadRecommendations(),
        loadFavorites()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Get total trips
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('guestId', '==', currentUser.uid)
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const bookings = bookingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        checkIn: doc.data().checkIn?.toDate ? doc.data().checkIn.toDate() : 
                 (doc.data().checkIn?.seconds ? new Date(doc.data().checkIn.seconds * 1000) : null),
        checkOut: doc.data().checkOut?.toDate ? doc.data().checkOut.toDate() : 
                  (doc.data().checkOut?.seconds ? new Date(doc.data().checkOut.seconds * 1000) : null)
      }));

      const totalTrips = bookings.length;
      const now = new Date();
      const upcomingTripsCount = bookings.filter(b => 
        b.status === 'confirmed' && 
        b.checkIn && 
        b.checkIn > now
      ).length;

      // Calculate total spent
      const totalSpent = bookings
        .filter(b => b.status === 'completed' || b.status === 'confirmed')
        .reduce((sum, b) => sum + (parseFloat(b.totalAmount) || 0), 0);

      // Get total favorites
      const homesFav = JSON.parse(localStorage.getItem('ee_favorites_home') || '[]');
      const experiencesFav = JSON.parse(localStorage.getItem('ee_favorites_experiences') || '[]');
      const servicesFav = JSON.parse(localStorage.getItem('ee_favorites_services') || '[]');
      const totalFavorites = homesFav.length + experiencesFav.length + servicesFav.length;

      // Get total reviews
      const reviewsQuery = query(
        collection(db, 'reviews'),
        where('guestId', '==', currentUser.uid)
      );
      const reviewsSnapshot = await getDocs(reviewsQuery);
      const totalReviews = reviewsSnapshot.size;

      setStats({
        totalTrips,
        upcomingTrips: upcomingTripsCount,
        totalFavorites,
        totalReviews,
        totalSpent
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadUpcomingTrips = async () => {
    try {
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('guestId', '==', currentUser.uid)
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const now = new Date();
      
      const trips = [];
      for (const bookingDoc of bookingsSnapshot.docs) {
        const booking = bookingDoc.data();
        const checkIn = booking.checkIn?.toDate ? booking.checkIn.toDate() : 
                       (booking.checkIn?.seconds ? new Date(booking.checkIn.seconds * 1000) : null);
        
        if (checkIn && checkIn > now && (booking.status === 'confirmed' || booking.status === 'pending')) {
          try {
            const listingDoc = await getDoc(doc(db, 'listings', booking.listingId));
            if (listingDoc.exists()) {
              const listingData = listingDoc.data();
              trips.push({
                id: bookingDoc.id,
                ...booking,
                checkIn,
                checkOut: booking.checkOut?.toDate ? booking.checkOut.toDate() : 
                         (booking.checkOut?.seconds ? new Date(booking.checkOut.seconds * 1000) : null),
                listing: {
                  id: listingDoc.id,
                  ...listingData,
                  title: listingData.homeDetails?.title || 
                         listingData.experienceDetails?.title || 
                         listingData.serviceDetails?.title || 
                         'Listing',
                  image: listingData.photos?.[0]?.url || 
                         listingData.photos?.[0] ||
                         listingData.homeDetails?.photos?.[0]?.url ||
                         listingData.experienceDetails?.photos?.[0]?.url ||
                         listingData.serviceDetails?.photos?.[0]?.url
                }
              });
            }
          } catch (err) {
            console.error('Error loading listing:', err);
          }
        }
      }

      // Sort by check-in date (earliest first)
      trips.sort((a, b) => {
        const aTime = a.checkIn?.getTime() || 0;
        const bTime = b.checkIn?.getTime() || 0;
        return aTime - bTime;
      });

      setUpcomingTrips(trips.slice(0, 5)); // Show only next 5 trips
    } catch (error) {
      console.error('Error loading upcoming trips:', error);
    }
  };

  const loadRecentActivity = async () => {
    try {
      const activities = [];

      // Get recent bookings (last 10)
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('guestId', '==', currentUser.uid)
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const bookings = bookingsSnapshot.docs.map(doc => ({
        id: doc.id,
        type: 'booking',
        ...doc.data(),
        timestamp: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : 
                   (doc.data().createdAt?.seconds ? new Date(doc.data().createdAt.seconds * 1000) : new Date())
      }));

      // Get recent reviews (last 10)
      const reviewsQuery = query(
        collection(db, 'reviews'),
        where('guestId', '==', currentUser.uid)
      );
      const reviewsSnapshot = await getDocs(reviewsQuery);
      const reviews = reviewsSnapshot.docs.map(doc => ({
        id: doc.id,
        type: 'review',
        ...doc.data(),
        timestamp: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : 
                   (doc.data().createdAt?.seconds ? new Date(doc.data().createdAt.seconds * 1000) : new Date())
      }));

      // Combine and sort by timestamp
      activities.push(...bookings, ...reviews);
      activities.sort((a, b) => {
        const aTime = a.timestamp?.getTime() || 0;
        const bTime = b.timestamp?.getTime() || 0;
        return bTime - aTime; // Newest first
      });

      setRecentActivity(activities.slice(0, 10));
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  };

  const loadRecommendations = async () => {
    try {
      // Get recommendations for homes - returns listing objects
      const homeRecs = await getGuestRecommendations(currentUser.uid, 'home', 6);
      
      // Format recommendations
      const recommendationsList = homeRecs.map(listing => ({
        id: listing.id,
        ...listing,
        title: listing.homeDetails?.title || 
               listing.experienceDetails?.title || 
               listing.serviceDetails?.title || 
               'Listing',
        image: listing.photos?.[0]?.url || 
               listing.photos?.[0] ||
               listing.homeDetails?.photos?.[0]?.url ||
               listing.experienceDetails?.photos?.[0]?.url ||
               listing.serviceDetails?.photos?.[0]?.url,
        propertyType: listing.propertyType || 'home',
        location: listing.location?.city || 
                 listing.location?.address || 
                 'Location not specified',
        price: listing.pricing?.basePrice || 0,
        rating: listing.rating || 0,
        reviewCount: listing.reviewCount || 0
      }));

      setRecommendations(recommendationsList);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    }
  };

  const loadFavorites = async () => {
    try {
      const homesFav = JSON.parse(localStorage.getItem('ee_favorites_home') || '[]');
      const experiencesFav = JSON.parse(localStorage.getItem('ee_favorites_experiences') || '[]');
      const servicesFav = JSON.parse(localStorage.getItem('ee_favorites_services') || '[]');
      const allFavorites = [...homesFav, ...experiencesFav, ...servicesFav];

      // Fetch favorite listings
      const favoritesList = [];
      for (const favId of allFavorites.slice(0, 6)) {
        try {
          const listingDoc = await getDoc(doc(db, 'listings', favId));
          if (listingDoc.exists()) {
            const listingData = listingDoc.data();
            favoritesList.push({
              id: listingDoc.id,
              ...listingData,
              title: listingData.homeDetails?.title || 
                     listingData.experienceDetails?.title || 
                     listingData.serviceDetails?.title || 
                     'Listing',
              image: listingData.photos?.[0]?.url || 
                     listingData.photos?.[0] ||
                     listingData.homeDetails?.photos?.[0]?.url ||
                     listingData.experienceDetails?.photos?.[0]?.url ||
                     listingData.serviceDetails?.photos?.[0]?.url,
              propertyType: listingData.propertyType || 'home',
              location: listingData.location?.city || 
                       listingData.location?.address || 
                       'Location not specified',
              price: listingData.pricing?.basePrice || 0,
              rating: listingData.rating || 0,
              reviewCount: listingData.reviewCount || 0
            });
          }
        } catch (err) {
          console.error('Error loading favorite:', err);
        }
      }

      setFavorites(favoritesList);
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatTime = (date) => {
    if (!date) return '';
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    if (minutes < 10080) return `${Math.floor(minutes / 1440)}d ago`;
    return formatDate(date);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4CAF50] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Welcome back, {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Guest'}! 👋
          </h1>
          <p className="text-gray-600">Here's an overview of your EcoExpress experience</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Trips</p>
              <span className="text-2xl">✈️</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalTrips}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Upcoming</p>
              <span className="text-2xl">📅</span>
            </div>
            <p className="text-3xl font-bold text-[#4CAF50]">{stats.upcomingTrips}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Favorites</p>
              <span className="text-2xl">❤️</span>
            </div>
            <p className="text-3xl font-bold text-red-500">{stats.totalFavorites}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Reviews</p>
              <span className="text-2xl">⭐</span>
            </div>
            <p className="text-3xl font-bold text-yellow-500">{stats.totalReviews}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Wallet</p>
              <span className="text-2xl">💳</span>
            </div>
            <p className="text-2xl font-bold text-[#4CAF50]">
              ₱{balance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Upcoming Trips & Recent Activity */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upcoming Trips */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Upcoming Trips</h2>
                <Link
                  to="/trips"
                  className="text-sm text-[#4CAF50] hover:text-[#2E7D32] font-semibold"
                >
                  View All →
                </Link>
              </div>
              {upcomingTrips.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">✈️</div>
                  <p className="text-gray-600 mb-4">No upcoming trips</p>
                  <Link
                    to="/guest/homes"
                    className="inline-block px-6 py-3 bg-[#4CAF50] text-white rounded-lg font-semibold hover:bg-[#2E7D32] transition-colors"
                  >
                    Start Planning
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingTrips.map((trip) => {
                    const daysUntil = trip.checkIn 
                      ? Math.ceil((trip.checkIn.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                      : null;
                    
                    return (
                      <Link
                        key={trip.id}
                        to={`/trips`}
                        className="block p-4 border-2 border-gray-200 rounded-lg hover:border-[#4CAF50] hover:shadow-md transition-all"
                      >
                        <div className="flex items-start gap-4">
                          {trip.listing?.image && (
                            <img
                              src={trip.listing.image}
                              alt={trip.listing.title}
                              className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 mb-1 truncate">
                              {trip.listing?.title || 'Listing'}
                            </h3>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-2">
                              {trip.checkIn && (
                                <span>📅 {formatDate(trip.checkIn)}</span>
                              )}
                              {trip.checkOut && (
                                <span>→ {formatDate(trip.checkOut)}</span>
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                trip.status === 'confirmed' 
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {trip.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                              </span>
                              {daysUntil !== null && (
                                <span className="text-sm text-gray-600">
                                  {daysUntil === 0 
                                    ? 'Today!' 
                                    : daysUntil === 1 
                                    ? 'Tomorrow' 
                                    : `${daysUntil} days to go`}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
              </div>
              {recentActivity.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">📋</div>
                  <p className="text-gray-600">No recent activity</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#C8E6C9] flex items-center justify-center flex-shrink-0">
                        {activity.type === 'booking' ? (
                          <span className="text-xl">✈️</span>
                        ) : (
                          <span className="text-xl">⭐</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.type === 'booking' 
                            ? `Booked ${activity.listingTitle || 'a listing'}`
                            : `Left a review for ${activity.listingTitle || 'a listing'}`}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatTime(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Recommendations & Favorites */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Link
                  to="/guest/homes"
                  className="block w-full px-4 py-3 bg-[#4CAF50] text-white rounded-lg font-semibold hover:bg-[#2E7D32] transition-colors text-center"
                >
                  🏠 Browse Homes
                </Link>
                <Link
                  to="/guest/experiences"
                  className="block w-full px-4 py-3 bg-[#66BB6A] text-white rounded-lg font-semibold hover:bg-[#4CAF50] transition-colors text-center"
                >
                  🎯 Browse Experiences
                </Link>
                <Link
                  to="/guest/services"
                  className="block w-full px-4 py-3 bg-[#81C784] text-white rounded-lg font-semibold hover:bg-[#66BB6A] transition-colors text-center"
                >
                  🔧 Browse Services
                </Link>
                <Link
                  to="/trips"
                  className="block w-full px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors text-center"
                >
                  📋 View All Trips
                </Link>
              </div>
            </div>

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Recommended for You</h2>
                  <Link
                    to="/guest/homes"
                    className="text-sm text-[#4CAF50] hover:text-[#2E7D32] font-semibold"
                  >
                    See All →
                  </Link>
                </div>
                <div className="space-y-3">
                  {recommendations.slice(0, 3).map((listing) => (
                    <Link
                      key={listing.id}
                      to={`/listing/${listing.id}`}
                      className="block group"
                    >
                      <div className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        {listing.image && (
                          <img
                            src={listing.image}
                            alt={listing.title}
                            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-gray-900 mb-1 truncate group-hover:text-[#4CAF50] transition-colors">
                            {listing.title}
                          </h3>
                          <p className="text-xs text-gray-600 truncate mb-1">
                            {listing.location}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-[#4CAF50]">
                              ₱{parseFloat(listing.price).toLocaleString('en-PH')}
                            </span>
                            {listing.rating > 0 && (
                              <div className="flex items-center gap-1">
                                <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                </svg>
                                <span className="text-xs text-gray-600">{listing.rating.toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Favorites */}
            {favorites.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Your Favorites</h2>
                  <Link
                    to="/wishlist"
                    className="text-sm text-[#4CAF50] hover:text-[#2E7D32] font-semibold"
                  >
                    See All →
                  </Link>
                </div>
                <div className="space-y-3">
                  {favorites.slice(0, 3).map((listing) => (
                    <Link
                      key={listing.id}
                      to={`/listing/${listing.id}`}
                      className="block group"
                    >
                      <div className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        {listing.image && (
                          <img
                            src={listing.image}
                            alt={listing.title}
                            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-gray-900 mb-1 truncate group-hover:text-[#4CAF50] transition-colors">
                            {listing.title}
                          </h3>
                          <p className="text-xs text-gray-600 truncate mb-1">
                            {listing.location}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-[#4CAF50]">
                              ₱{parseFloat(listing.price).toLocaleString('en-PH')}
                            </span>
                            {listing.rating > 0 && (
                              <div className="flex items-center gap-1">
                                <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                </svg>
                                <span className="text-xs text-gray-600">{listing.rating.toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GuestDashboard;

