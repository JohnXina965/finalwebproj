import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useWallet } from '../../contexts/WalletContext';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../Firebase';
import { uploadToCloudinary } from '../../utils/Cloudinary';
import PayPalButton from '../../components/PayPalButton';
import { paypalPaymentConfig } from '../../config/paypal';
import toast from 'react-hot-toast';

const HostOnBoarding = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { balance, deduct } = useWallet();
  
  // All state declarations first (before useEffect hooks that use them)
  const [currentStep, setCurrentStep] = useState(1);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  
  // Step 2: Subscription
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPayPalModal, setShowPayPalModal] = useState(false);
  const [subscriptionPaid, setSubscriptionPaid] = useState(false);
  
  // Step 3: Profile Photo
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // Step 4: Host Information
  const [fullName, setFullName] = useState('');
  const [professionalBio, setProfessionalBio] = useState('');
  const [hostingExperience, setHostingExperience] = useState('');
  
  // Step 5: Payout Setup
  const [paypalEmail, setPaypalEmail] = useState('');
  
  // Step 6: Profile Preview
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  const [processing, setProcessing] = useState(false);
  
  // Check if user has already completed onboarding and load saved progress
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!currentUser) {
        navigate('/login');
        return;
      }
      
      try {
        const hostDocRef = doc(db, 'hosts', currentUser.uid);
        const hostDoc = await getDoc(hostDocRef);
        
        if (hostDoc.exists()) {
          const hostData = hostDoc.data();
          // If onboarding is already completed, redirect to host dashboard
          if (hostData.onboardingCompleted === true) {
            toast.success('You have already completed onboarding!');
            navigate('/host/dashboard');
            return;
          }
          
          // Load saved progress
          if (hostData.onboardingProgress) {
            const progress = hostData.onboardingProgress;
            setPolicyAccepted(progress.policyAccepted || false);
            setSelectedPlan(progress.selectedPlan || null);
            setSubscriptionPaid(progress.subscriptionPaid || false);
            setProfilePhotoUrl(progress.profilePhotoUrl || '');
            setFullName(progress.fullName || '');
            setProfessionalBio(progress.professionalBio || '');
            setHostingExperience(progress.hostingExperience || '');
            setPaypalEmail(progress.paypalEmail || '');
            setTermsAccepted(progress.termsAccepted || false);
            setCurrentStep(progress.currentStep || 1);
            
            if (progress.currentStep > 1) {
              toast.success('Your progress has been restored!');
            }
          }
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkOnboardingStatus();
  }, [currentUser, navigate]);
  
  // Auto-save progress whenever important data changes
  useEffect(() => {
    const saveProgress = async () => {
      if (!currentUser || loading) return;
      
      try {
        const hostDocRef = doc(db, 'hosts', currentUser.uid);
        await setDoc(hostDocRef, {
          onboardingProgress: {
            currentStep,
            policyAccepted,
            selectedPlan,
            subscriptionPaid,
            profilePhotoUrl,
            fullName,
            professionalBio,
            hostingExperience,
            paypalEmail,
            termsAccepted
          },
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (error) {
        console.error('Error saving progress:', error);
      }
    };
    
    // Debounce auto-save
    const timeoutId = setTimeout(saveProgress, 1000);
    return () => clearTimeout(timeoutId);
  }, [currentUser, currentStep, policyAccepted, selectedPlan, subscriptionPaid, profilePhotoUrl, fullName, professionalBio, hostingExperience, paypalEmail, termsAccepted, loading]);

  // Subscription plans (matching the images)
  const subscriptionPlans = [
    {
      id: 'starter',
      name: 'Starter',
      price: 299,
      currency: 'PHP',
      period: 'year',
      listings: 3,
      duration: '1 year',
      bestFor: 'New hosts',
      description: 'Perfect for new hosts looking to grow',
      popular: false
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 699,
      currency: 'PHP',
      period: 'year',
      listings: 10,
      duration: '1 year',
      bestFor: 'Growing hosts',
      description: 'Perfect for growing hosts looking to grow',
      popular: true
    },
    {
      id: 'elite',
      name: 'Elite',
      price: 1299,
      currency: 'PHP',
      period: 'year',
      listings: 1000,
      duration: '1 year',
      bestFor: 'Businesses',
      description: 'Perfect for businesses looking to grow',
      popular: false
    }
  ];

  // Auto-fill full name from current user
  useEffect(() => {
    if (currentUser && currentStep === 4) {
      setFullName(currentUser.displayName || currentUser.email?.split('@')[0] || '');
    }
  }, [currentUser, currentStep]);

  const totalSteps = 6;
  const progressPercentage = Math.round((currentStep / totalSteps) * 100);

  // Step 1: Welcome + Policy
  const handleGetStarted = () => {
    if (!policyAccepted) {
      toast.error('Please review and accept the Policy and Compliance to continue');
      return;
    }
    setCurrentStep(2);
  };

  // Step 2: Subscription
  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
  };

  const handleContinueToPayment = () => {
    if (!selectedPlan) {
      toast.error('Please select a subscription plan');
      return;
    }
    setShowPayPalModal(true);
  };

  const handleSubscriptionPaymentSuccess = async (paymentData) => {
    try {
      setProcessing(true);
      setSubscriptionPaid(true);
      setShowPayPalModal(false);
      toast.success('Subscription payment successful!');
      setCurrentStep(3);
    } catch (error) {
      console.error('Subscription payment error:', error);
      toast.error('Payment processing error. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Step 3: Profile Photo
  const handlePhotoSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a JPG, PNG, or WebP image');
      setValidationErrors(prev => ({ ...prev, photo: 'Invalid file type. Please use JPG, PNG, or WebP.' }));
      return;
    }

    // Validate file size
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      setValidationErrors(prev => ({ ...prev, photo: 'File size must be less than 5MB.' }));
      return;
    }

    setUploadingPhoto(true);
    setValidationErrors(prev => ({ ...prev, photo: null }));
    
    try {
      const result = await uploadToCloudinary(file);
      setProfilePhotoUrl(result.url);
      setProfilePhoto(file);
      toast.success('Profile photo uploaded successfully!');
    } catch (error) {
      console.error('Photo upload error:', error);
      const errorMessage = error.message || 'Failed to upload photo. Please check your internet connection and try again.';
      toast.error(errorMessage);
      setValidationErrors(prev => ({ ...prev, photo: errorMessage }));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSkipPhoto = () => {
    setProfilePhotoUrl('');
    setProfilePhoto(null);
    setCurrentStep(4);
    toast.info('You can add a profile photo later in your host settings');
  };

  const handleContinueFromPhoto = () => {
    // Photo is now optional, so we can proceed without it
    setValidationErrors(prev => ({ ...prev, photo: null }));
    setCurrentStep(4);
  };

  // Step 4: Host Information
  const validateHostInfo = () => {
    const errors = {};
    
    if (!fullName.trim()) {
      errors.fullName = 'Full name is required';
    } else if (fullName.trim().length < 2) {
      errors.fullName = 'Full name must be at least 2 characters';
    }
    
    if (!professionalBio.trim()) {
      errors.professionalBio = 'Professional bio is required';
    } else if (professionalBio.trim().length < 20) {
      errors.professionalBio = 'Bio must be at least 20 characters';
    } else if (professionalBio.trim().length > 500) {
      errors.professionalBio = 'Bio must be less than 500 characters';
    }
    
    if (!hostingExperience) {
      errors.hostingExperience = 'Please select your hosting experience';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleContinueFromInfo = () => {
    if (!validateHostInfo()) {
      toast.error('Please fix the errors before continuing');
      return;
    }
    setCurrentStep(5);
  };

  // Step 5: Payout Setup
  const validatePaypalEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleContinueFromPayout = () => {
    const email = paypalEmail.trim();
    
    if (!email) {
      setValidationErrors({ paypalEmail: 'PayPal email is required' });
      toast.error('Please enter your PayPal email address');
      return;
    }
    
    if (!validatePaypalEmail(email)) {
      setValidationErrors({ paypalEmail: 'Please enter a valid email address' });
      toast.error('Please enter a valid PayPal email address');
      return;
    }
    
    setValidationErrors({ paypalEmail: null });
    setCurrentStep(6);
  };

  // Step 6: Profile Preview & Finish
  const handleFinishOnboarding = async () => {
    if (!termsAccepted) {
      toast.error('Please accept the Hosting Terms and Conditions');
      return;
    }

    try {
      setProcessing(true);

      // Save host profile to Firestore
      const hostProfileRef = doc(db, 'hosts', currentUser.uid);
      await setDoc(hostProfileRef, {
        userId: currentUser.uid,
        fullName: fullName,
        professionalBio: professionalBio,
        hostingExperience: hostingExperience,
        profilePhotoUrl: profilePhotoUrl,
        paypalEmail: paypalEmail,
        subscriptionPlan: selectedPlan,
        subscriptionPaid: subscriptionPaid,
        policyAccepted: policyAccepted,
        policyAcceptedAt: serverTimestamp(),
        termsAccepted: termsAccepted,
        termsAcceptedAt: serverTimestamp(),
        onboardingCompleted: true,
        onboardingCompletedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Update user document with host role
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, {
        isHost: true,
        hostProfileCompleted: true,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Show success modal
      setShowSuccessModal(true);
      
      // Clear saved progress
      const hostDocRef = doc(db, 'hosts', currentUser.uid);
      await setDoc(hostDocRef, {
        onboardingProgress: null
      }, { merge: true });
    } catch (error) {
      console.error('Error completing onboarding:', error);
      const errorMessage = error.message || 'Failed to complete onboarding. Please check your connection and try again.';
      toast.error(errorMessage);
      setValidationErrors({ general: errorMessage });
    } finally {
      setProcessing(false);
    }
  };
  
  const handleContinueToCreateListing = () => {
    setShowSuccessModal(false);
    navigate('/host/create-listing');
  };

  const handleExit = () => {
    if (window.confirm('Are you sure you want to exit? Your progress will be saved.')) {
      navigate('/guest/homes');
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Render Step 1: Welcome + Policy
  const renderStep1 = () => (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <svg className="w-12 h-12 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to Hosting, {currentUser?.displayName?.split(' ')[0] || 'Host'}!
        </h1>
        <p className="text-gray-600 text-lg">
          Let's create your professional hosting profile and get you ready to host amazing events on EcoExpress.
        </p>
      </div>

      <div className="mb-6">
        <p className="text-gray-700 text-center">
          Please review our{' '}
          <button
            onClick={() => setShowPolicyModal(true)}
            className="text-orange-600 underline font-semibold hover:text-orange-700"
          >
            Policy and Compliance
          </button>
          {' '}before continuing.
        </p>
      </div>

      <div className="text-center">
        <button
          onClick={handleGetStarted}
          disabled={!policyAccepted}
          className="bg-orange-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Get Started
        </button>
      </div>
    </div>
  );

  // Render Step 2: Subscription
  const renderStep2 = () => (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Choose Your Plan</h2>
        <p className="text-gray-600">Select the perfect plan for your hosting needs</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {subscriptionPlans.map((plan) => (
          <div
            key={plan.id}
            onClick={() => handlePlanSelect(plan)}
            className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all ${
              selectedPlan?.id === plan.id
                ? 'border-orange-500 bg-orange-50'
                : 'border-gray-200 hover:border-orange-300'
            }`}
          >
            {plan.popular && (
              <div className="absolute top-4 right-4 bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                Most Popular
              </div>
            )}
            
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
            <div className="mb-4">
              <span className="text-3xl font-bold text-gray-900">₱{plan.price.toLocaleString()}</span>
              <span className="text-gray-600"> / {plan.period}</span>
            </div>
            
            <div className="space-y-2 mb-4 text-sm text-gray-700">
              <p><strong>Listings:</strong> {plan.listings}</p>
              <p><strong>Duration:</strong> {plan.duration}</p>
              <p><strong>Best for:</strong> {plan.bestFor}</p>
            </div>
            
            <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
            
            {selectedPlan?.id === plan.id && (
              <div className="text-orange-600 font-semibold">✓ Selected</div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleBack}
          className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleContinueToPayment}
          disabled={!selectedPlan}
          className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue to Payment
        </button>
      </div>
    </div>
  );

  // Render Step 3: Profile Photo
  const renderStep3 = () => (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Profile Photo</h2>
        <p className="text-gray-600">Add a professional photo to build trust with your guests</p>
      </div>

      <div className="mb-8">
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-orange-400 transition-colors">
          {profilePhotoUrl ? (
            <div className="space-y-4">
              <img
                src={profilePhotoUrl}
                alt="Profile"
                className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-orange-500"
              />
              <button
                onClick={() => document.getElementById('photo-upload').click()}
                className="text-orange-600 hover:text-orange-700 font-semibold"
              >
                Change Photo
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-gray-600">Add Photo</p>
              <button
                onClick={() => document.getElementById('photo-upload').click()}
                className="px-6 py-2 border-2 border-orange-500 text-orange-500 rounded-lg font-semibold hover:bg-orange-50 transition-colors"
              >
                Choose Photo
              </button>
            </div>
          )}
          <input
            id="photo-upload"
            type="file"
            accept="image/*"
            onChange={handlePhotoSelect}
            className="hidden"
          />
        </div>
        {uploadingPhoto && (
          <div className="text-center mt-4">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
            <p className="text-gray-600 mt-2">Uploading...</p>
          </div>
        )}
      </div>

      {validationErrors.photo && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{validationErrors.photo}</p>
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={handleBack}
          className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleSkipPhoto}
          className="px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Skip for Now
        </button>
        <button
          onClick={handleContinueFromPhoto}
          disabled={uploadingPhoto}
          className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploadingPhoto ? 'Uploading...' : profilePhotoUrl ? 'Continue' : 'Continue Without Photo'}
        </button>
      </div>
    </div>
  );

  // Render Step 4: Host Information
  const renderStep4 = () => (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Host Information</h2>
        <p className="text-gray-600">Tell us about your hosting experience and background</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Full Name *
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              setValidationErrors(prev => ({ ...prev, fullName: null }));
            }}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none ${
              validationErrors.fullName ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter your full name"
          />
          {validationErrors.fullName && (
            <p className="text-sm text-red-600 mt-1">{validationErrors.fullName}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Professional Bio * ({professionalBio.length}/500)
          </label>
          <textarea
            value={professionalBio}
            onChange={(e) => {
              setProfessionalBio(e.target.value);
              setValidationErrors(prev => ({ ...prev, professionalBio: null }));
            }}
            rows={5}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none ${
              validationErrors.professionalBio ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Describe your hosting style, expertise, and what guests can expect..."
            maxLength={500}
          />
          {validationErrors.professionalBio && (
            <p className="text-sm text-red-600 mt-1">{validationErrors.professionalBio}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Hosting Experience *
          </label>
          <select
            value={hostingExperience}
            onChange={(e) => {
              setHostingExperience(e.target.value);
              setValidationErrors(prev => ({ ...prev, hostingExperience: null }));
            }}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none ${
              validationErrors.hostingExperience ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">Select your experience</option>
            <option value="first-time">First-time Host</option>
            <option value="experienced">Experienced Host</option>
            <option value="professional">Professional Event Host</option>
          </select>
          {validationErrors.hostingExperience && (
            <p className="text-sm text-red-600 mt-1">{validationErrors.hostingExperience}</p>
          )}
        </div>
      </div>

      <div className="flex gap-4 mt-8">
        <button
          onClick={handleBack}
          className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleContinueFromInfo}
          disabled={!fullName.trim() || !professionalBio.trim() || !hostingExperience}
          className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Payout Method
        </button>
      </div>
    </div>
  );

  // Render Step 5: Payout Setup
  const renderStep5 = () => (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Payout Setup</h2>
        <p className="text-gray-600">Add your PayPal email to receive your host earnings</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            PayPal Email *
          </label>
          <input
            type="email"
            value={paypalEmail}
            onChange={(e) => {
              setPaypalEmail(e.target.value);
              setValidationErrors(prev => ({ ...prev, paypalEmail: null }));
            }}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none ${
              validationErrors.paypalEmail ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter your PayPal email"
          />
          {validationErrors.paypalEmail && (
            <p className="text-sm text-red-600 mt-1">{validationErrors.paypalEmail}</p>
          )}
          <p className="text-sm text-gray-600 mt-2">
            Make sure this is the same email linked to your PayPal account. It's where EcoExpress will send your payouts.
          </p>
        </div>
      </div>

      <div className="flex gap-4 mt-8">
        <button
          onClick={handleBack}
          className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleContinueFromPayout}
          disabled={!paypalEmail.trim() || !paypalEmail.includes('@')}
          className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Preview Profile
        </button>
      </div>
    </div>
  );

  // Render Step 6: Profile Preview
  const renderStep6 = () => {
    const getExperienceLabel = (exp) => {
      switch (exp) {
        case 'first-time': return 'New Host';
        case 'experienced': return 'Experienced Host';
        case 'professional': return 'Professional Host';
        default: return 'Host';
      }
    };

    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Profile Preview</h2>
        </div>

        {/* Profile Preview Card */}
        <div className="bg-gray-50 rounded-xl p-6 mb-6 border-2 border-gray-200">
          <div className="bg-gray-800 text-white rounded-t-lg p-4 mb-4 flex justify-between items-center">
            <div>
              <div className="font-bold text-lg">EcoExpress</div>
              <div className="text-sm text-gray-300">Certified Host</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">ID: {currentUser?.uid?.substring(0, 8).toUpperCase()}</span>
              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {profilePhotoUrl ? (
                <img src={profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-10 h-10 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-bold text-gray-900">{fullName}</h3>
                <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                  {getExperienceLabel(hostingExperience)}
                </span>
                {selectedPlan && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                    {selectedPlan.name} Plan
                  </span>
                )}
              </div>
              
              <div className="mt-4">
                <p className="text-sm font-semibold text-gray-700 mb-1">BIO</p>
                <p className="text-gray-600 text-sm">{professionalBio || 'No bio provided.'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Terms Checkbox */}
        <div className="mb-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-1 w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
            />
            <span className="text-sm text-gray-700">
              I agree to the{' '}
              <button className="text-orange-600 underline font-semibold hover:text-orange-700">
                Hosting Terms and Conditions
              </button>
              {' '}and confirm that all information provided is accurate and true.
            </span>
          </label>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleBack}
            className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleFinishOnboarding}
            disabled={!termsAccepted || processing}
            className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? 'Processing...' : 'Finish Onboarding'}
          </button>
        </div>
      </div>
    );
  };

  // Show loading state while checking onboarding status
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Header with Exit Button */}
      <div className="container mx-auto px-4 mb-6">
        <div className="flex justify-end">
          <button
            onClick={handleExit}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
          >
            Exit
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="container mx-auto px-4 mb-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">
              Step {currentStep} of {totalSteps}
            </span>
            <span className="text-sm font-semibold text-green-600">
              {progressPercentage}% Complete
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="container mx-auto px-4">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}
        {currentStep === 6 && renderStep6()}
      </div>

      {/* Policy & Compliance Modal */}
      {showPolicyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowPolicyModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">EcoExpress Policy & Compliance Guidelines</h2>
              <button
                onClick={() => setShowPolicyModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="overflow-y-auto p-6 flex-1">
              <div className="space-y-6 text-sm text-gray-700">
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">General Guidelines</h3>
                  <p>
                    All hosts must comply with local laws and regulations. Listings must be accurate and represent the actual property or service. 
                    Booking disputes should be resolved through the EcoExpress Support Center. All reports are reviewed by our compliance team, 
                    and necessary actions—including warnings, suspension, or legal escalation—may be taken.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Privacy & Data Protection</h3>
                  <p>
                    EcoExpress collects and processes user data in accordance with applicable privacy laws. All personal and financial information 
                    is encrypted and never shared with third parties without consent. Users may request deletion or review of their personal data 
                    by contacting EcoExpress Support.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Liability Disclaimer</h3>
                  <p>
                    EcoExpress acts solely as an intermediary between guests and hosts. The platform is not liable for property damages, personal injury, 
                    or disputes arising between users. Both parties are responsible for ensuring the legality and safety of their transactions.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Policy Enforcement</h3>
                  <p>
                    Failure to comply with these rules may result in temporary or permanent account suspension, withholding of payouts, removal of listings, 
                    or legal action. EcoExpress reserves the right to update these policies at any time. Users will be notified of major updates via the 
                    platform or email.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => {
                  setPolicyAccepted(true);
                  setShowPolicyModal(false);
                  toast.success('Policy and Compliance accepted');
                }}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors"
              >
                I Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">🎉 Welcome to Hosting!</h2>
            <p className="text-gray-600 mb-6">
              Your host profile has been created successfully! You're now ready to create your first listing and start hosting amazing events.
            </p>
            <button
              onClick={handleContinueToCreateListing}
              className="w-full px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors"
            >
              Create Your First Listing
            </button>
          </div>
        </div>
      )}

      {/* PayPal Payment Modal for Subscription */}
      {showPayPalModal && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowPayPalModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Pay with PayPal — {selectedPlan.name} Plan</h2>
              <button
                onClick={() => setShowPayPalModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-2">Total amount:</p>
              <p className="text-2xl font-bold text-gray-900">₱{selectedPlan.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
            </div>

            <div className="mb-6">
              <PayPalButton
                amount={selectedPlan.price}
                description={`${selectedPlan.name} Plan Subscription`}
                onSuccess={handleSubscriptionPaymentSuccess}
                onError={(err) => {
                  console.error('PayPal error:', err);
                  toast.error('Payment failed. Please try again.');
                  setShowPayPalModal(false);
                }}
                onCancel={() => {
                  setShowPayPalModal(false);
                }}
                disabled={processing}
              />
            </div>

            <p className="text-xs text-gray-500 text-center mb-4">Powered by PayPal</p>

            <button
              onClick={() => setShowPayPalModal(false)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HostOnBoarding;
