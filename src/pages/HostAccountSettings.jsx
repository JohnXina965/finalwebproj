import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile } from 'firebase/auth';
import { auth } from '../Firebase';
import toast from 'react-hot-toast';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../Firebase';
import { uploadToCloudinary } from '../utils/Cloudinary';

const HostAccountSettings = () => {
  const { currentUser, changePassword, deleteAccount, getLinkedAccounts, linkGoogleAccount } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    // Check if we should open coupons tab (from pricing page)
    const tab = sessionStorage.getItem('settingsTab');
    if (tab) {
      sessionStorage.removeItem('settingsTab');
      return tab;
    }
    return 'profile';
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  // Profile state
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    displayName: '',
    bio: '',
    phone: '',
    website: '',
    avatar: '',
    paypalEmail: ''
  });

  // Security state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Account Management state
  const [deleteAccountData, setDeleteAccountData] = useState({
    confirmPassword: ''
  });
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Bookings settings state
  const [bookingSettings, setBookingSettings] = useState({
    instantBooking: true,
    advanceNotice: 24,
    checkInTime: '15:00',
    checkOutTime: '11:00',
    cancellationPolicy: 'moderate',
    autoConfirm: false,
    minimumStay: 1,
    maximumStay: 30
  });
  
  // Coupons state
  const [coupons, setCoupons] = useState([]);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [couponForm, setCouponForm] = useState({
    code: '',
    discountType: 'percentage', // 'percentage' or 'fixed'
    discountValue: 10,
    minAmount: 0,
    maxDiscount: null,
    validFrom: '',
    validUntil: '',
    usageLimit: null,
    applicableTo: 'all' // 'all', 'home', 'experience', 'service'
  });

  // Load profile data
  useEffect(() => {
    if (currentUser) {
      loadProfile();
      loadBookingSettings();
      loadCoupons();
      loadLinkedAccounts();
    }
  }, [currentUser]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const hostRef = doc(db, 'hosts', currentUser.uid);
      const hostSnap = await getDoc(hostRef);
      
      if (hostSnap.exists()) {
        const data = hostSnap.data();
        const displayName = currentUser.displayName || data.displayName || '';
        const nameParts = displayName.split(' ');
        setProfileData({
          firstName: data.firstName || nameParts[0] || '',
          lastName: data.lastName || nameParts.slice(1).join(' ') || '',
          displayName: displayName,
          bio: data.bio || data.professionalBio || '',
          phone: data.phone || '',
          website: data.website || '',
          avatar: currentUser.photoURL || data.photoURL || data.profilePhotoUrl || '',
          paypalEmail: data.paypalEmail || ''
        });
      } else {
        const displayName = currentUser.displayName || '';
        const nameParts = displayName.split(' ');
        setProfileData({
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          displayName: displayName,
          bio: '',
          phone: '',
          website: '',
          avatar: currentUser.photoURL || ''
        });
      }
      setError(null);
    } catch (error) {
      console.error('Error loading profile:', error);
      setError('Failed to load profile settings. Please refresh.');
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const loadBookingSettings = async () => {
    try {
      const settingsRef = doc(db, 'hostBookingSettings', currentUser.uid);
      const settingsSnap = await getDoc(settingsRef);
      
      if (settingsSnap.exists()) {
        setBookingSettings({ ...bookingSettings, ...settingsSnap.data() });
      }
    } catch (error) {
      console.error('Error loading booking settings:', error);
    }
  };

  const loadCoupons = async () => {
    try {
      // Remove orderBy to avoid index requirement - sort client-side instead
      const q = query(
        collection(db, 'coupons'),
        where('hostId', '==', currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      const couponsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt?.seconds * 1000 || 0)
      })).sort((a, b) => {
        // Sort by createdAt descending (newest first)
        return (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);
      });
      setCoupons(couponsList);
    } catch (error) {
      console.error('Error loading coupons:', error);
    }
  };

  const loadLinkedAccounts = async () => {
    try {
      const methods = await getLinkedAccounts();
      setLinkedAccounts(methods || []);
    } catch (error) {
      console.error('Error loading linked accounts:', error);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fullName = `${profileData.firstName} ${profileData.lastName}`.trim() || profileData.displayName;
      
      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, {
        displayName: fullName,
        photoURL: profileData.avatar
      });

      // Validate PayPal email if provided
      if (profileData.paypalEmail && !profileData.paypalEmail.includes('@')) {
        toast.error('Please enter a valid PayPal email address');
        setSaving(false);
        return;
      }

      // Update Firestore host document
      const hostRef = doc(db, 'hosts', currentUser.uid);
      await setDoc(hostRef, {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        displayName: fullName,
        bio: profileData.bio,
        professionalBio: profileData.bio, // Keep both for compatibility
        phone: profileData.phone,
        website: profileData.website,
        photoURL: profileData.avatar,
        profilePhotoUrl: profileData.avatar, // Keep both for compatibility
        paypalEmail: profileData.paypalEmail || '', // Save PayPal email
        updatedAt: serverTimestamp()
      }, { merge: true });

      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    setSaving(true);
    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword);
      alert('Password updated successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error changing password:', error);
      if (error.code === 'auth/wrong-password') {
        alert('Current password is incorrect');
      } else if (error.code === 'auth/weak-password') {
        alert('Password is too weak. Please choose a stronger password');
      } else {
        alert('Failed to change password. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLinkGoogle = async () => {
    try {
      setSaving(true);
      await linkGoogleAccount();
      alert('Google account linked successfully!');
      await loadLinkedAccounts();
    } catch (error) {
      console.error('Error linking Google account:', error);
      if (error.code === 'auth/credential-already-in-use') {
        alert('This Google account is already linked to another account');
      } else {
        alert('Failed to link Google account. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteAccountData.confirmPassword) {
      alert('Please enter your password to confirm');
      return;
    }

    if (!window.confirm('Are you absolutely sure? This action cannot be undone. All your data will be permanently deleted.')) {
      return;
    }

    try {
      setSaving(true);
      await deleteAccount(deleteAccountData.confirmPassword);
      alert('Account deleted successfully');
      window.location.href = '/';
    } catch (error) {
      console.error('Error deleting account:', error);
      if (error.code === 'auth/wrong-password') {
        alert('Incorrect password');
      } else {
        alert('Failed to delete account. Please try again.');
      }
    } finally {
      setSaving(false);
      setShowDeleteModal(false);
      setDeleteAccountData({ confirmPassword: '' });
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    try {
      setSaving(true);
      const result = await uploadToCloudinary(file);
      setProfileData({ ...profileData, avatar: result.url });
      alert('Avatar uploaded successfully! Click "Save Changes" to apply.');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Failed to upload avatar. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleBookingSettingsSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const settingsRef = doc(db, 'hostBookingSettings', currentUser.uid);
      await setDoc(settingsRef, {
        ...bookingSettings,
        updatedAt: serverTimestamp()
      }, { merge: true });

      alert('Booking settings saved successfully!');
    } catch (error) {
      console.error('Error saving booking settings:', error);
      alert('Failed to save booking settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCouponSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const couponData = {
        ...couponForm,
        hostId: currentUser.uid,
        hostName: currentUser.displayName || currentUser.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        usageCount: 0,
        isActive: true
      };

      if (editingCoupon) {
        // Update existing coupon
        const couponRef = doc(db, 'coupons', editingCoupon.id);
        await updateDoc(couponRef, {
          ...couponData,
          updatedAt: serverTimestamp()
        });
        alert('Coupon updated successfully!');
      } else {
        // Create new coupon
        await addDoc(collection(db, 'coupons'), couponData);
        alert('Coupon created successfully!');
      }

      // Reset form
      setCouponForm({
        code: '',
        discountType: 'percentage',
        discountValue: 10,
        minAmount: 0,
        maxDiscount: null,
        validFrom: '',
        validUntil: '',
        usageLimit: null,
        applicableTo: 'all'
      });
      setShowCouponForm(false);
      setEditingCoupon(null);
      loadCoupons();
    } catch (error) {
      console.error('Error saving coupon:', error);
      alert('Failed to save coupon. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCoupon = async (couponId) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) return;

    try {
      await deleteDoc(doc(db, 'coupons', couponId));
      alert('Coupon deleted successfully!');
      loadCoupons();
    } catch (error) {
      console.error('Error deleting coupon:', error);
      alert('Failed to delete coupon. Please try again.');
    }
  };

  const handleEditCoupon = (coupon) => {
    setEditingCoupon(coupon);
    
    // Handle date conversion for Firestore Timestamps
    const formatDate = (dateValue) => {
      if (!dateValue) return '';
      if (dateValue.toDate) {
        return dateValue.toDate().toISOString().split('T')[0];
      }
      if (dateValue.seconds) {
        return new Date(dateValue.seconds * 1000).toISOString().split('T')[0];
      }
      if (typeof dateValue === 'string' && dateValue.includes('T')) {
        return dateValue.split('T')[0];
      }
      return dateValue;
    };
    
    setCouponForm({
      code: coupon.code,
      discountType: coupon.discountType || 'percentage',
      discountValue: coupon.discountValue || 10,
      minAmount: coupon.minAmount || 0,
      maxDiscount: coupon.maxDiscount || null,
      validFrom: formatDate(coupon.validFrom),
      validUntil: formatDate(coupon.validUntil),
      usageLimit: coupon.usageLimit || null,
      applicableTo: coupon.applicableTo || 'all'
    });
    setShowCouponForm(true);
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'security', label: 'Security & Privacy', icon: '🔒' },
    { id: 'account', label: 'Account Management', icon: '⚙️' },
    { id: 'bookings', label: 'Bookings', icon: '📋' },
    { id: 'coupons', label: 'Coupons', icon: '🎫' }
  ];

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-8">
          <div className="h-8 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-3 animate-pulse">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-10 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm p-8 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-48 mb-6"></div>
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error && !profileData.displayName) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 pb-12 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-md text-center" data-aos="fade-up">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Error Loading Settings</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              setError(null);
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8" data-aos="fade-down">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Account Settings</h1>
          <p className="text-gray-600">Customize your account preferences and manage your security settings</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6" data-aos="fade-up" data-aos-delay="100">
          <div className="flex border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-6 py-4 text-center font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <form onSubmit={handleProfileUpdate} className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Profile Information</h2>
                  
                  {/* Avatar Upload */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo</label>
                    <div className="flex items-center space-x-4">
                      <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                        {profileData.avatar ? (
                          <img src={profileData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-3xl text-gray-400">👤</span>
                        )}
                      </div>
                      <div>
                        <label className="cursor-pointer inline-block px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            className="hidden"
                          />
                          Upload Photo
                        </label>
                        <p className="text-xs text-gray-500 mt-1">JPG, PNG up to 5MB</p>
                      </div>
                    </div>
                  </div>

                  {/* Personal Information */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                    
                    {/* First Name */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                      <input
                        type="text"
                        value={profileData.firstName}
                        onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>

                    {/* Last Name */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                      <input
                        type="text"
                        value={profileData.lastName}
                        onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>

                    {/* Linked Email Addresses */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Linked Email Addresses</label>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center space-x-3">
                            <span className="text-gray-700">{currentUser.email}</span>
                            <span className="px-2 py-1 bg-teal-100 text-teal-700 text-xs font-medium rounded">Primary</span>
                          </div>
                          <span className="text-xs text-gray-500">Email cannot be changed from settings</span>
                        </div>
                        
                        <div className="text-sm text-gray-600 mt-2">
                          <p className="mb-2 font-medium">Link Additional Accounts</p>
                          <p className="text-xs text-gray-500 mb-2">
                            You can link your Google account to enable easier sign-in. Visit the setup page to link additional authentication methods.
                          </p>
                          {linkedAccounts.includes('google.com') ? (
                            <div className="flex items-center space-x-2 text-green-600">
                              <span>✓</span>
                              <span>Google account linked</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={handleLinkGoogle}
                              disabled={saving}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {saving ? 'Linking...' : 'Link Google Account'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                    <textarea
                      value={profileData.bio}
                      onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                      rows="4"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      placeholder="Tell guests about yourself..."
                    />
                  </div>

                  {/* Phone */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      placeholder="Enter your phone number"
                    />
                  </div>

                  {/* PayPal Email */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      PayPal Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={profileData.paypalEmail}
                      onChange={(e) => setProfileData({ ...profileData, paypalEmail: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      placeholder="your-email@paypal.com"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This email is used to receive your earnings from bookings. Make sure it's a valid PayPal account.
                    </p>
                  </div>

                  {/* Website */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                    <input
                      type="url"
                      value={profileData.website}
                      onChange={(e) => setProfileData({ ...profileData, website: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      placeholder="https://example.com"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}

            {/* Security & Privacy Tab */}
            {activeTab === 'security' && (
              <form onSubmit={handlePasswordChange} className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Security & Privacy</h2>
                  <p className="text-gray-600 mb-6">Manage your password and account security</p>
                  
                  <div className="bg-gray-50 rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                        <input
                          type="password"
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          placeholder="Enter current password"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                        <input
                          type="password"
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          placeholder="Enter new password"
                          required
                          minLength={6}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                        <input
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          placeholder="Confirm new password"
                          required
                          minLength={6}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={saving || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                      className="mt-6 px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Account Management Tab */}
            {activeTab === 'account' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Management</h2>
                  <p className="text-gray-600 mb-8">Manage your account and data</p>
                  
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-red-900 mb-2">Delete Account</h3>
                    <p className="text-red-800 mb-4">
                      Once you delete your account, there is no going back. This action cannot be undone.
                    </p>
                    
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                    >
                      Delete My Account
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Bookings Tab */}
            {activeTab === 'bookings' && (
              <form onSubmit={handleBookingSettingsSave} className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Booking Preferences</h2>
                  
                  <div className="space-y-6">
                    {/* Instant Booking */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Instant Booking</label>
                        <p className="text-xs text-gray-600">Allow guests to book without confirmation</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={bookingSettings.instantBooking}
                          onChange={(e) => setBookingSettings({ ...bookingSettings, instantBooking: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                      </label>
                    </div>

                    {/* Advance Notice */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Advance Notice (hours)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={bookingSettings.advanceNotice}
                        onChange={(e) => setBookingSettings({ ...bookingSettings, advanceNotice: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>

                    {/* Check-in/Check-out Times */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Check-in Time</label>
                        <input
                          type="time"
                          value={bookingSettings.checkInTime}
                          onChange={(e) => setBookingSettings({ ...bookingSettings, checkInTime: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Check-out Time</label>
                        <input
                          type="time"
                          value={bookingSettings.checkOutTime}
                          onChange={(e) => setBookingSettings({ ...bookingSettings, checkOutTime: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Minimum/Maximum Stay */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Stay (nights)</label>
                        <input
                          type="number"
                          min="1"
                          value={bookingSettings.minimumStay}
                          onChange={(e) => setBookingSettings({ ...bookingSettings, minimumStay: parseInt(e.target.value) })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Stay (nights)</label>
                        <input
                          type="number"
                          min="1"
                          value={bookingSettings.maximumStay}
                          onChange={(e) => setBookingSettings({ ...bookingSettings, maximumStay: parseInt(e.target.value) })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Cancellation Policy */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Cancellation Policy</label>
                      <select
                        value={bookingSettings.cancellationPolicy}
                        onChange={(e) => setBookingSettings({ ...bookingSettings, cancellationPolicy: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      >
                        <option value="flexible">Flexible - Full refund 1 day before</option>
                        <option value="moderate">Moderate - Full refund 5 days before</option>
                        <option value="strict">Strict - 50% refund up to 1 week before</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="mt-6 px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </form>
            )}

            {/* Coupons Tab */}
            {activeTab === 'coupons' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Discount Coupons</h2>
                  <button
                    onClick={() => {
                      setShowCouponForm(true);
                      setEditingCoupon(null);
                      setCouponForm({
                        code: '',
                        discountType: 'percentage',
                        discountValue: 10,
                        minAmount: 0,
                        maxDiscount: null,
                        validFrom: '',
                        validUntil: '',
                        usageLimit: null,
                        applicableTo: 'all'
                      });
                    }}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors"
                  >
                    + Create Coupon
                  </button>
                </div>

                {/* Coupon Form */}
                {showCouponForm && (
                  <form onSubmit={handleCouponSubmit} className="bg-gray-50 rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
                    </h3>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Coupon Code *</label>
                        <input
                          type="text"
                          value={couponForm.code}
                          onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          placeholder="SAVE10"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Discount Type *</label>
                        <select
                          value={couponForm.discountType}
                          onChange={(e) => setCouponForm({ ...couponForm, discountType: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          required
                        >
                          <option value="percentage">Percentage (%)</option>
                          <option value="fixed">Fixed Amount (₱)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Discount Value *</label>
                        <input
                          type="number"
                          min="0"
                          step={couponForm.discountType === 'percentage' ? '1' : '0.01'}
                          value={couponForm.discountValue}
                          onChange={(e) => setCouponForm({ ...couponForm, discountValue: parseFloat(e.target.value) })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Amount (₱)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={couponForm.minAmount}
                          onChange={(e) => setCouponForm({ ...couponForm, minAmount: parseFloat(e.target.value) || 0 })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Valid From *</label>
                        <input
                          type="date"
                          value={couponForm.validFrom}
                          onChange={(e) => setCouponForm({ ...couponForm, validFrom: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Valid Until *</label>
                        <input
                          type="date"
                          value={couponForm.validUntil}
                          onChange={(e) => setCouponForm({ ...couponForm, validUntil: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Usage Limit</label>
                        <input
                          type="number"
                          min="1"
                          value={couponForm.usageLimit || ''}
                          onChange={(e) => setCouponForm({ ...couponForm, usageLimit: e.target.value ? parseInt(e.target.value) : null })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          placeholder="Unlimited"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Applicable To</label>
                        <select
                          value={couponForm.applicableTo}
                          onChange={(e) => setCouponForm({ ...couponForm, applicableTo: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        >
                          <option value="all">All Listings</option>
                          <option value="home">Homes Only</option>
                          <option value="experience">Experiences Only</option>
                          <option value="service">Services Only</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex space-x-4 mt-6">
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? 'Saving...' : editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCouponForm(false);
                          setEditingCoupon(null);
                        }}
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {/* Coupons List */}
                {coupons.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-600 mb-4">No coupons created yet</p>
                    <p className="text-sm text-gray-500">Create your first discount coupon to attract more guests!</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {coupons.map((coupon) => (
                      <div key={coupon.id} className="bg-white border border-gray-200 rounded-lg p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="text-xl font-bold text-gray-900">{coupon.code}</h4>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                coupon.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                              }`}>
                                {coupon.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <div className="grid md:grid-cols-2 gap-4 mt-4">
                              <div>
                                <p className="text-sm text-gray-600">Discount</p>
                                <p className="text-lg font-semibold text-gray-900">
                                  {coupon.discountType === 'percentage' 
                                    ? `${coupon.discountValue}%` 
                                    : `₱${coupon.discountValue.toLocaleString('en-PH')}`}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Valid Period</p>
                                <p className="text-sm font-medium text-gray-900">
                                  {coupon.validFrom && (
                                    coupon.validFrom.toDate ? coupon.validFrom.toDate().toLocaleDateString() : 
                                    coupon.validFrom.seconds ? new Date(coupon.validFrom.seconds * 1000).toLocaleDateString() :
                                    new Date(coupon.validFrom).toLocaleDateString()
                                  )} - {' '}
                                  {coupon.validUntil && (
                                    coupon.validUntil.toDate ? coupon.validUntil.toDate().toLocaleDateString() : 
                                    coupon.validUntil.seconds ? new Date(coupon.validUntil.seconds * 1000).toLocaleDateString() :
                                    new Date(coupon.validUntil).toLocaleDateString()
                                  )}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Usage</p>
                                <p className="text-sm font-medium text-gray-900">
                                  {coupon.usageCount || 0} / {coupon.usageLimit || '∞'}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Applicable To</p>
                                <p className="text-sm font-medium text-gray-900 capitalize">
                                  {coupon.applicableTo === 'all' ? 'All Listings' : coupon.applicableTo}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2 ml-4">
                            <button
                              onClick={() => handleEditCoupon(coupon)}
                              className="px-4 py-2 text-sm text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteCoupon(coupon.id)}
                              className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-red-900 mb-4">Delete Account</h3>
            <p className="text-gray-600 mb-4">
              Are you absolutely sure? This action cannot be undone. All your data will be permanently deleted.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
              <input
                type="password"
                value={deleteAccountData.confirmPassword}
                onChange={(e) => setDeleteAccountData({ confirmPassword: e.target.value })}
                className="w-full px-4 py-3 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Enter your password to confirm"
                required
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleDeleteAccount}
                disabled={saving || !deleteAccountData.confirmPassword}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Deleting...' : 'Yes, Delete My Account'}
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteAccountData({ confirmPassword: '' });
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HostAccountSettings;

