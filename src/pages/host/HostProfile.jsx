import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../Firebase';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

function HostProfile() {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [hostProfile, setHostProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roles, setRoles] = useState([]);
  const [stats, setStats] = useState({
    totalListings: 0,
    totalBookings: 0,
    totalEarnings: 0,
    averageRating: 0
  });
  const [accountActivity, setAccountActivity] = useState({
    lastSeen: null,
    profileUpdated: null
  });

  useEffect(() => {
    if (currentUser) {
      loadProfile();
      loadRoles();
      loadStats();
      loadAccountActivity();
    }
  }, [currentUser]);

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

  const loadProfile = async () => {
    if (!currentUser) return;

    try {
      // Load user profile
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      let userData = {};
      
      if (userDoc.exists()) {
        userData = userDoc.data();
      }

      // Load host profile
      const hostDoc = await getDoc(doc(db, 'hosts', currentUser.uid));
      let hostData = {};
      
      if (hostDoc.exists()) {
        hostData = hostDoc.data();
      }

      setProfile({
        firstName: userData.firstName || hostData.firstName || '',
        lastName: userData.lastName || hostData.lastName || '',
        displayName: userData.displayName || hostData.displayName || currentUser.displayName || currentUser.email,
        bio: userData.bio || hostData.bio || hostData.professionalBio || '',
        experience: hostData.experience || 'Not provided',
        phone: userData.phone || hostData.phone || '',
        website: userData.website || hostData.website || '',
        avatar: currentUser.photoURL || hostData.photoURL || hostData.profilePhotoUrl || userData.avatar || '',
        email: currentUser.email || '',
        emailVerified: currentUser.emailVerified || false,
        userId: currentUser.uid,
        createdAt: userData.createdAt?.toDate() || hostData.createdAt?.toDate() || currentUser.metadata.creationTime
      });

      setHostProfile(hostData);
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
      // Get total listings
      const listingsQuery = query(
        collection(db, 'listings'),
        where('hostId', '==', currentUser.uid)
      );
      const listingsSnapshot = await getDocs(listingsQuery);
      const totalListings = listingsSnapshot.size;

      // Get total bookings
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('hostId', '==', currentUser.uid)
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const totalBookings = bookingsSnapshot.size;

      // Calculate total earnings
      let totalEarnings = 0;
      bookingsSnapshot.forEach(doc => {
        const booking = doc.data();
        if (booking.status === 'confirmed' || booking.status === 'active' || booking.status === 'completed') {
          if (booking.totalAmount) {
            totalEarnings += booking.totalAmount;
          }
        }
      });

      // Get average rating from host reviews
      const reviewsQuery = query(
        collection(db, 'hostReviews'),
        where('hostId', '==', currentUser.uid)
      );
      const reviewsSnapshot = await getDocs(reviewsQuery);
      let averageRating = 0;
      if (!reviewsSnapshot.empty) {
        const ratings = reviewsSnapshot.docs.map(doc => doc.data().ratings?.overall || 0);
        const sum = ratings.reduce((a, b) => a + b, 0);
        averageRating = sum / ratings.length;
      }

      setStats({
        totalListings,
        totalBookings,
        totalEarnings,
        averageRating: averageRating.toFixed(1)
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadAccountActivity = async () => {
    if (!currentUser) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const hostDoc = await getDoc(doc(db, 'hosts', currentUser.uid));
      
      const userData = userDoc.exists() ? userDoc.data() : {};
      const hostData = hostDoc.exists() ? hostDoc.data() : {};
      
      setAccountActivity({
        lastSeen: new Date().toLocaleString('en-US', { 
          month: 'numeric', 
          day: 'numeric', 
          year: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit' 
        }),
        profileUpdated: (hostData.updatedAt?.toDate() || userData.updatedAt?.toDate() || profile?.createdAt)?.toLocaleString('en-US', {
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

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12">
      <div className="container mx-auto px-4 max-w-6xl">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        <div className="bg-white rounded-xl shadow-sm p-8 mb-6" data-aos="fade-down">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="w-32 h-32 rounded-full bg-teal-100 flex items-center justify-center overflow-hidden flex-shrink-0">
              {profile?.avatar ? (
                <img src={profile.avatar} alt={profile.displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-teal-600 text-4xl font-semibold">
                  {profile?.displayName?.charAt(0)?.toUpperCase() || currentUser?.email?.charAt(0)?.toUpperCase() || 'H'}
                </span>
              )}
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {profile?.displayName || currentUser?.displayName || 'Host User'}
              </h1>
              {profile?.bio && (
                <p className="text-gray-600 mb-4">{profile.bio}</p>
              )}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-gray-500">
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
                to="/host/settings"
                className="px-6 py-2 bg-[#4CAF50] text-white rounded-lg font-semibold hover:bg-[#2E7D32] transition-all duration-200 shadow-sm hover:shadow-md text-center flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Profile
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <label className="text-sm font-medium text-gray-700">Experience</label>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-700">
                    {profile?.experience || 'Not provided'}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 2.498a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <label className="text-sm font-medium text-gray-700">Phone Number</label>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-700">
                    {profile?.phone || 'Not provided'}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <label className="text-sm font-medium text-gray-700">Past Events</label>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-700">
                    Not provided
                  </div>
                </div>
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
                  to="/host/settings"
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
                  to="/host/settings"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <Link
            to="/host/dashboard"
            className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm p-6 hover:shadow-md transition-all transform hover:-translate-y-1 border border-blue-200"
            data-aos="fade-up"
            data-aos-delay="400"
          >
            <div className="text-3xl mb-2">🏠</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Listings</h3>
            <p className="text-2xl font-bold text-blue-600 mb-1">{stats.totalListings}</p>
            <p className="text-gray-600 text-sm">Total properties</p>
          </Link>
          
          <Link
            to="/host/dashboard"
            className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm p-6 hover:shadow-md transition-all transform hover:-translate-y-1 border border-green-200"
            data-aos="fade-up"
            data-aos-delay="500"
          >
            <div className="text-3xl mb-2">📅</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Bookings</h3>
            <p className="text-2xl font-bold text-green-600 mb-1">{stats.totalBookings}</p>
            <p className="text-gray-600 text-sm">Total reservations</p>
          </Link>
          
          <div
            className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl shadow-sm p-6 border border-yellow-200"
            data-aos="fade-up"
            data-aos-delay="600"
          >
            <div className="text-3xl mb-2">💰</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Earnings</h3>
            <p className="text-2xl font-bold text-yellow-600 mb-1">
              ₱{stats.totalEarnings.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-gray-600 text-sm">Total revenue</p>
          </div>
          
          {stats.averageRating > 0 && (
            <div
              className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-sm p-6 border border-purple-200"
              data-aos="fade-up"
              data-aos-delay="700"
            >
              <div className="text-3xl mb-2">⭐</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Rating</h3>
              <p className="text-2xl font-bold text-purple-600 mb-1">{stats.averageRating}</p>
              <p className="text-gray-600 text-sm">Average rating</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HostProfile;

