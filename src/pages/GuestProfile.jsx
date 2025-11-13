import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../Firebase';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

function GuestProfile() {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [guestReviews, setGuestReviews] = useState([]);
  const [guestRating, setGuestRating] = useState({ average: 0, count: 0 });
  const [roles, setRoles] = useState([]);
  const [accountActivity, setAccountActivity] = useState({
    lastSeen: null,
    profileUpdated: null
  });
  const [stats, setStats] = useState({
    totalTrips: 0,
    totalWishlist: 0,
    totalSpent: 0
  });

  useEffect(() => {
    if (currentUser) {
      loadProfile();
      loadGuestReviews();
      loadStats();
      loadRoles();
      loadAccountActivity();
    }
  }, [currentUser]);

  const loadGuestReviews = async () => {
    if (!currentUser) return;

    try {
      const q = query(
        collection(db, 'guestReviews'),
        where('guestId', '==', currentUser.uid)
      );

      const snapshot = await getDocs(q);
      const reviewsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000) : new Date())
        };
      });

      setGuestReviews(reviewsData);

      // Calculate average rating
      if (reviewsData.length > 0) {
        const totalRating = reviewsData.reduce((sum, review) => sum + (review.ratings?.overall || 0), 0);
        const averageRating = totalRating / reviewsData.length;
        setGuestRating({
          average: averageRating.toFixed(1),
          count: reviewsData.length
        });
      }
    } catch (error) {
      console.error('Error loading guest reviews:', error);
    }
  };

  const loadRoles = async () => {
    if (!currentUser) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const rolesList = [];
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Check for admin role
        if (userData.role === 'admin' || userData.isAdmin === true) {
          rolesList.push({ name: 'Admin', color: 'bg-red-100 text-red-700 border-red-300' });
        }
        
        // Check for host role (has host profile or listings)
        const hostDoc = await getDoc(doc(db, 'hosts', currentUser.uid));
        const listingsQuery = query(collection(db, 'listings'), where('hostId', '==', currentUser.uid));
        const listingsSnapshot = await getDocs(listingsQuery);
        
        if (hostDoc.exists() || !listingsSnapshot.empty) {
          rolesList.push({ name: 'Host', color: 'bg-blue-100 text-blue-700 border-blue-300' });
        }
        
        // Everyone is a guest by default
        rolesList.push({ name: 'Guest', color: 'bg-green-100 text-green-700 border-green-300' });
      } else {
        // Default to guest if no user document
        rolesList.push({ name: 'Guest', color: 'bg-green-100 text-green-700 border-green-300' });
      }
      
      setRoles(rolesList);
    } catch (error) {
      console.error('Error loading roles:', error);
      setRoles([{ name: 'Guest', color: 'bg-green-100 text-green-700 border-green-300' }]);
    }
  };

  const loadAccountActivity = async () => {
    if (!currentUser) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};
      
      setAccountActivity({
        lastSeen: new Date().toLocaleString('en-US', { 
          month: 'numeric', 
          day: 'numeric', 
          year: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit' 
        }),
        profileUpdated: (userData.updatedAt?.toDate() || profile?.createdAt)?.toLocaleString('en-US', {
          month: 'numeric',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }) || 'Not available'
      });
    } catch (error) {
      console.error('Error loading account activity:', error);
    }
  };

  const loadProfile = async () => {
    if (!currentUser) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setProfile({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          displayName: data.displayName || currentUser.displayName || currentUser.email,
          bio: data.bio || '',
          phone: data.phone || '',
          website: data.website || '',
          avatar: data.avatar || currentUser.photoURL || '',
          email: currentUser.email || '',
          emailVerified: currentUser.emailVerified || false,
          userId: currentUser.uid,
          createdAt: data.createdAt?.toDate() || currentUser.metadata.creationTime
        });
      } else {
        setProfile({
          displayName: currentUser.displayName || currentUser.email,
          avatar: currentUser.photoURL || '',
          email: currentUser.email || '',
          emailVerified: currentUser.emailVerified || false,
          userId: currentUser.uid,
          createdAt: currentUser.metadata.creationTime
        });
      }
      setError(null);
    } catch (error) {
      console.error('Error loading profile:', error);
      setError('Failed to load profile');
      setProfile({
        displayName: currentUser.displayName || currentUser.email,
        avatar: currentUser.photoURL || '',
        email: currentUser.email || '',
        emailVerified: currentUser.emailVerified || false,
        userId: currentUser.uid,
        createdAt: currentUser.metadata.creationTime
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!currentUser) return;

    try {
      // Get total trips
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('guestId', '==', currentUser.uid)
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const totalTrips = bookingsSnapshot.size;

      // Calculate total spent
      let totalSpent = 0;
      bookingsSnapshot.forEach(doc => {
        const booking = doc.data();
        if (booking.totalAmount) {
          totalSpent += booking.totalAmount;
        }
      });

      // Get total wishlist items
      const homesFav = localStorage.getItem('ee_favorites_home');
      const experiencesFav = localStorage.getItem('ee_favorites_experiences');
      const servicesFav = localStorage.getItem('ee_favorites_services');
      const totalWishlist = (homesFav ? JSON.parse(homesFav).length : 0) +
                           (experiencesFav ? JSON.parse(experiencesFav).length : 0) +
                           (servicesFav ? JSON.parse(servicesFav).length : 0);

      setStats({
        totalTrips,
        totalWishlist,
        totalSpent
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white rounded-xl shadow-sm p-8 mb-6 animate-pulse">
          <div className="flex gap-6">
            <div className="w-32 h-32 bg-gray-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-64 mb-4"></div>
              <div className="flex gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-6 bg-gray-200 rounded w-24"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
              <div className="h-12 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 pb-12 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-md text-center" data-aos="fade-up">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Error Loading Profile</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              loadProfile();
            }}
            className="bg-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const memberSince = profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { 
    month: 'numeric', 
    day: 'numeric', 
    year: 'numeric' 
  }) : new Date().toLocaleDateString('en-US', { 
    month: 'numeric', 
    day: 'numeric', 
    year: 'numeric' 
  });

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Profile Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6"
        >
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="w-32 h-32 rounded-full bg-teal-100 flex items-center justify-center overflow-hidden flex-shrink-0">
              {profile?.avatar ? (
                <img src={profile.avatar} alt={profile.displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-teal-600 text-4xl font-semibold">
                  {profile?.displayName?.charAt(0)?.toUpperCase() || currentUser?.email?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              )}
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {profile?.displayName || currentUser?.displayName || 'Guest User'}
              </h1>
              {profile?.bio && (
                <p className="text-gray-600 mb-4">{profile.bio}</p>
              )}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-gray-500">
                {guestRating.count > 0 && (
                  <div className="flex items-center gap-2 bg-yellow-50 px-3 py-1 rounded-full">
                    <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                    <span className="font-semibold text-gray-900">{guestRating.average}</span>
                    <span className="text-gray-600">({guestRating.count} {guestRating.count === 1 ? 'review' : 'reviews'})</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>{profile?.email || currentUser?.email}</span>
                  {profile?.emailVerified && (
                    <span className="text-green-600 font-semibold">(Verified)</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Joined {memberSince}</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                  <span>User ID: {profile?.userId || currentUser?.uid}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Link
                to="/settings"
                className="px-6 py-2 bg-[#4CAF50] text-white rounded-lg font-semibold hover:bg-[#2E7D32] transition-all duration-200 shadow-sm hover:shadow-md text-center"
              >
                Edit Profile
              </Link>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Left Column - Personal Information & Account Activity */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <div className="bg-white rounded-xl shadow-sm p-6" data-aos="fade-up">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-[#C8E6C9] flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#4CAF50]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">Personal Information</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <label className="text-sm font-medium text-gray-700">Bio</label>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-700">
                    {profile?.bio || 'Not provided'}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <label className="text-sm font-medium text-gray-700">Phone Number</label>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-700">
                    {profile?.phone || 'Not provided'}
                  </div>
                </div>

                {profile?.website && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                      <label className="text-sm font-medium text-gray-700">Website</label>
                    </div>
                    <div className="bg-gray-50 rounded-lg px-4 py-3">
                      <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:text-teal-700">
                        {profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Account Activity */}
            <div className="bg-white rounded-xl shadow-sm p-6" data-aos="fade-up" data-aos-delay="100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-[#C8E6C9] flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#4CAF50]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">Account Activity</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Last Seen</label>
                  <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-700">
                    {accountActivity.lastSeen || 'Not available'}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Profile Updated</label>
                  <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-700">
                    {accountActivity.profileUpdated || 'Not available'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Roles & Permissions & Account Security */}
          <div className="space-y-6">
            {/* Roles & Permissions */}
            <div className="bg-white rounded-xl shadow-sm p-6" data-aos="fade-up" data-aos-delay="200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-[#C8E6C9] flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#4CAF50]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">Roles & Permissions</h2>
              </div>
              
              {roles.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {roles.map((role, index) => (
                    <span
                      key={index}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold border ${role.color}`}
                    >
                      {role.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No roles assigned</p>
              )}
            </div>

            {/* Account Security */}
            <div className="bg-white rounded-xl shadow-sm p-6" data-aos="fade-up" data-aos-delay="300">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-[#C8E6C9] flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#4CAF50]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">Account Security</h2>
              </div>
              
              <div className="space-y-3">
                <Link
                  to="/settings"
                  className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Change Email</p>
                      <p className="text-sm text-gray-600">Update your login email address</p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                <Link
                  to="/settings"
                  className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Change Password</p>
                      <p className="text-sm text-gray-600">Set a new password</p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Link
            to="/trips"
            className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm p-6 hover:shadow-md transition-all transform hover:-translate-y-1 border border-blue-200"
            data-aos="fade-up"
            data-aos-delay="100"
          >
            <div className="text-3xl mb-2">✈️</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Trips</h3>
            <p className="text-2xl font-bold text-blue-600 mb-1">{stats.totalTrips}</p>
            <p className="text-gray-600 text-sm">Total bookings</p>
          </Link>
          
          <Link
            to="/wishlist"
            className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl shadow-sm p-6 hover:shadow-md transition-all transform hover:-translate-y-1 border border-pink-200"
            data-aos="fade-up"
            data-aos-delay="200"
          >
            <div className="text-3xl mb-2">❤️</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Favorites</h3>
            <p className="text-2xl font-bold text-pink-600 mb-1">{stats.totalWishlist}</p>
            <p className="text-gray-600 text-sm">Saved listings</p>
          </Link>
          
          <Link
            to="/messages"
            className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm p-6 hover:shadow-md transition-all transform hover:-translate-y-1 border border-green-200"
            data-aos="fade-up"
            data-aos-delay="300"
          >
            <div className="text-3xl mb-2">💬</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Messages</h3>
            <p className="text-gray-600 text-sm">Chat with hosts</p>
          </Link>
          
          <div
            className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl shadow-sm p-6 border border-yellow-200"
            data-aos="fade-up"
            data-aos-delay="400"
          >
            <div className="text-3xl mb-2">💰</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Total Spent</h3>
            <p className="text-2xl font-bold text-yellow-600 mb-1">
              ₱{stats.totalSpent.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-gray-600 text-sm">All time</p>
          </div>
        </div>

        {/* Guest Reviews Section */}
        {guestReviews.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6" data-aos="fade-up" data-aos-delay="300">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Reviews from Hosts</h2>
            <div className="space-y-4">
              {guestReviews.map(review => (
                <div key={review.id} className="border-2 border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900">{review.hostName || 'Host'}</h4>
                        <span className="text-gray-300">·</span>
                        <span className="text-sm text-gray-600">
                          {review.createdAt?.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) || 'Recently'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`w-4 h-4 ${i < (review.ratings?.overall || 0) ? 'text-yellow-500 fill-current' : 'text-gray-300'}`}
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
                      <p className="text-gray-700 text-sm">{review.comment || 'No comment provided.'}</p>
                      {review.listingTitle && (
                        <p className="text-xs text-gray-500 mt-2">
                          Booking: {review.listingTitle}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* About Section */}
        {profile?.bio && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6" data-aos="fade-up" data-aos-delay="400">
            <h2 className="text-xl font-bold text-gray-900 mb-4">About</h2>
            <p className="text-gray-700 leading-relaxed">{profile.bio}</p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm p-6" data-aos="fade-up" data-aos-delay="500">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Link
              to="/guest/homes"
              className="px-4 py-3 bg-teal-50 text-teal-700 rounded-lg font-semibold hover:bg-teal-100 transition-colors text-center"
            >
              Explore Homes
            </Link>
            <Link
              to="/guest/experiences"
              className="px-4 py-3 bg-emerald-50 text-emerald-700 rounded-lg font-semibold hover:bg-emerald-100 transition-colors text-center"
            >
              Explore Experiences
            </Link>
            <Link
              to="/guest/services"
              className="px-4 py-3 bg-green-50 text-green-700 rounded-lg font-semibold hover:bg-green-100 transition-colors text-center"
            >
              Explore Services
            </Link>
            <Link
              to="/wallet"
              className="px-4 py-3 bg-blue-50 text-blue-700 rounded-lg font-semibold hover:bg-blue-100 transition-colors text-center"
            >
              View Wallet
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GuestProfile;

