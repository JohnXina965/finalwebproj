import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useHost } from './contexts/HostContext';

const HostPublishReview = () => {
  const { hostData, updateHostData, clearHostData, publishListing, saveAsDraft } = useHost();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [publishing, setPublishing] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [publishedListingId, setPublishedListingId] = useState(null);

  // DEBUG: Add this to see what's in hostData
  console.log('🔍 DEBUG hostData:', hostData);

  // Check if subscription is active
  const canPublish = hostData.paymentVerified && hostData.subscriptionStatus === 'active';

  // Get the appropriate details based on property type
  const getPropertyDetails = () => {
    switch(hostData.propertyType) {
      case 'home':
        return hostData.homeDetails;
      case 'experience':
        return hostData.experienceDetails;
      case 'service':
        return hostData.serviceDetails;
      default:
        return null;
    }
  };

  const getPropertyTypeLabel = () => {
    switch(hostData.propertyType) {
      case 'home': return 'Property';
      case 'experience': return 'Experience';
      case 'service': return 'Service';
      default: return 'Listing';
    }
  };

  const getPropertyIcon = () => {
    switch(hostData.propertyType) {
      case 'home': return '🏠';
      case 'experience': return '🎭';
      case 'service': return '🔧';
      default: return '📄';
    }
  };

  // Save as Draft function
  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const draftId = await saveAsDraft();
      console.log('✅ Draft saved with ID:', draftId);
      alert('Draft saved successfully! You can return later to publish.');
    } catch (error) {
      console.error('❌ Failed to save draft:', error);
      alert('Failed to save draft. Please try again.');
    } finally {
      setSavingDraft(false);
    }
  };

  const handlePublish = async () => {
    // Check subscription status before publishing
    if (!canPublish) {
      alert('Please complete your subscription payment before publishing your listing.');
      navigate('/host/subscription');
      return;
    }

    setPublishing(true);
    
    try {
      const listingId = await publishListing();
      setIsPublished(true);
      setPublishedListingId(listingId);
      console.log('✅ Listing published successfully! ID:', listingId);
      
    } catch (error) {
      console.error('❌ Failed to publish listing:', error);
      alert(`Failed to publish listing: ${error.message}`);
    } finally {
      setPublishing(false);
    }
  };

  const handleCreateNew = () => {
    clearHostData();
    navigate('/host/onboarding');
  };

  const propertyDetails = getPropertyDetails();

  if (!propertyDetails) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 animate-multi-layer">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Listing Not Found</h1>
          <p className="text-gray-600 mb-6">It seems your listing data is incomplete.</p>
          <Link
            to="/host/onboarding"
            className="px-6 py-3 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
          >
            Start Over
          </Link>
        </div>
      </div>
    );
  }

  if (isPublished) {
    return (
      <div className={`min-h-screen bg-gray-50 py-8 animate-multi-layer transition-all duration-1000 ${
        mounted ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="max-w-2xl mx-auto px-4">
          {/* Success Celebration */}
          <div className={`text-center mb-8 transition-all duration-700 delay-200 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-500 delay-300 hover:scale-110">
              <span className="text-3xl transition-all duration-500 delay-400">🎉</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 transition-all duration-700 delay-400">
              Congratulations!
            </h1>
            <p className="text-gray-600 text-lg transition-all duration-700 delay-500">
              Your {getPropertyTypeLabel().toLowerCase()} is now live on EcoExpress!
            </p>
            {publishedListingId && (
              <p className="text-sm text-teal-600 mt-2 transition-all duration-700 delay-600">
                Listing ID: {publishedListingId}
              </p>
            )}
          </div>

          <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 transition-all duration-700 delay-300 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 transition-all duration-700 delay-400">
                {getPropertyIcon()} {propertyDetails.title}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 transition-all duration-700 delay-500">
                <div className="text-center transition-all duration-500 delay-600 hover:scale-110">
                  <div className="text-2xl font-bold text-teal-600 transition-all duration-500 delay-700">0</div>
                  <div className="text-sm text-gray-600 transition-all duration-500 delay-800">Views</div>
                </div>
                <div className="text-center transition-all duration-500 delay-700 hover:scale-110">
                  <div className="text-2xl font-bold text-teal-600 transition-all duration-500 delay-800">0</div>
                  <div className="text-sm text-gray-600 transition-all duration-500 delay-900">Bookmarks</div>
                </div>
                <div className="text-center transition-all duration-500 delay-800 hover:scale-110">
                  <div className="text-2xl font-bold text-teal-600 transition-all duration-500 delay-900">0</div>
                  <div className="text-sm text-gray-600 transition-all duration-500 delay-1000">Inquiries</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center transition-all duration-700 delay-600">
                <button
                  onClick={() => navigate('/host/dashboard')}
                  className="px-6 py-3 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-all duration-300 delay-700 hover:shadow-lg hover:-translate-y-0.5"
                >
                  🏠 Go to Dashboard
                </button>
                <button
                  onClick={handleCreateNew}
                  className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-all duration-300 delay-800 hover:shadow-md hover:-translate-y-0.5"
                >
                  ➕ Create Another Listing
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-all duration-300 delay-900 hover:shadow-md hover:-translate-y-0.5"
                >
                  👀 View as Guest
                </button>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className={`bg-blue-50 border border-blue-200 rounded-lg p-6 transition-all duration-700 delay-700 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            <h3 className="text-lg font-medium text-blue-900 mb-4 transition-all duration-700 delay-800">
              🚀 Next Steps
            </h3>
            <div className="space-y-3 transition-all duration-700 delay-900">
              <div className="flex items-start transition-all duration-500 delay-1000 hover:translate-x-2">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5 transition-all duration-500 delay-1100 hover:scale-110">
                  <span className="text-sm font-medium text-blue-600">1</span>
                </div>
                <div className="ml-3">
                  <p className="text-blue-800 font-medium transition-all duration-500 delay-1200">Go to your dashboard</p>
                  <p className="text-blue-700 text-sm transition-all duration-500 delay-1300">Manage your listing, bookings, and messages</p>
                </div>
              </div>
              <div className="flex items-start transition-all duration-500 delay-1100 hover:translate-x-2">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5 transition-all duration-500 delay-1200 hover:scale-110">
                  <span className="text-sm font-medium text-blue-600">2</span>
                </div>
                <div className="ml-3">
                  <p className="text-blue-800 font-medium transition-all duration-500 delay-1300">Set up your calendar</p>
                  <p className="text-blue-700 text-sm transition-all duration-500 delay-1400">Manage your availability for bookings</p>
                </div>
              </div>
              <div className="flex items-start transition-all duration-500 delay-1200 hover:translate-x-2">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5 transition-all duration-500 delay-1300 hover:scale-110">
                  <span className="text-sm font-medium text-blue-600">3</span>
                </div>
                <div className="ml-3">
                  <p className="text-blue-800 font-medium transition-all duration-500 delay-1400">Share your listing</p>
                  <p className="text-blue-700 text-sm transition-all duration-500 delay-1500">Get your first bookings by sharing on social media</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 py-8 animate-multi-layer transition-all duration-1000 ${
      mounted ? 'opacity-100' : 'opacity-0'
    }`}>
      <div className="max-w-4xl mx-auto px-4">
        {/* Progress Bar - FINAL STEP! (Now Step 9 of 9) */}
        <div className={`mb-8 transition-all duration-700 delay-200 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <div className="flex items-center justify-between mb-2 transition-all duration-500 delay-300">
            <span className="text-sm font-medium text-teal-600">Step 9 of 9</span>
            <span className="text-sm text-gray-500">Review & Publish</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 transition-all duration-500 delay-400">
            <div className="bg-teal-600 h-2 rounded-full w-9/9 transition-all duration-700 delay-500"></div>
          </div>
        </div>

        <div className={`text-center mb-8 transition-all duration-700 delay-300 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 transition-all duration-700 delay-400">
            Review Your Listing
          </h1>
          <p className="text-gray-600 transition-all duration-700 delay-500">
            Almost there! Review your information and publish your listing.
          </p>
        </div>

        {/* Subscription Status */}
        {hostData.subscriptionPlan && (
          <div className={`rounded-lg p-6 mb-6 transition-all duration-700 delay-400 ${
            canPublish 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-yellow-50 border border-yellow-200'
          } ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="flex items-center justify-between transition-all duration-500 delay-500">
              <div>
                <h3 className={`font-semibold text-lg transition-all duration-500 delay-600 ${
                  canPublish ? 'text-green-900' : 'text-yellow-900'
                }`}>
                  {canPublish ? '✅ Subscription Active' : '⚠️ Subscription Required'}
                </h3>
                <p className={`transition-all duration-500 delay-700 ${
                  canPublish ? 'text-green-700' : 'text-yellow-700'
                }`}>
                  {hostData.subscriptionPlan.name} Plan - ${hostData.subscriptionPlan.price}/{hostData.subscriptionPlan.period}
                  {!canPublish && ' - Payment verification pending'}
                </p>
              </div>
              {!canPublish && (
                <button
                  onClick={() => navigate('/host/subscription')}
                  className="px-4 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-all duration-300 delay-800 hover:shadow-lg hover:-translate-y-0.5 text-sm"
                >
                  Complete Payment
                </button>
              )}
            </div>
          </div>
        )}

        {/* Policy Compliance Status */}
        {hostData.policiesAccepted && (
          <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 transition-all duration-700 delay-500 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            <div className="flex items-center justify-between transition-all duration-500 delay-600">
              <div>
                <h4 className="font-semibold text-blue-900 transition-all duration-500 delay-700">📋 Policies Accepted</h4>
                <p className="text-blue-700 text-sm transition-all duration-500 delay-800">
                  All required policies and compliance requirements have been accepted on {new Date(hostData.policyAcceptedAt).toLocaleDateString()}
                </p>
              </div>
              <span className="text-blue-600 text-2xl transition-all duration-500 delay-900 hover:scale-110">✅</span>
            </div>
          </div>
        )}

        {/* Listing Preview Cards */}
        <div className={`space-y-6 mb-8 transition-all duration-700 delay-600 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          {/* Property Overview */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all duration-500 delay-700 hover:shadow-lg hover:-translate-y-1">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center transition-all duration-500 delay-800">
              {getPropertyIcon()} <span className="ml-2">Property Overview</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-500 delay-900">
              <div>
                <h3 className="font-medium text-gray-900 text-lg transition-all duration-500 delay-1000">{propertyDetails.title}</h3>
                <p className="text-gray-600 mt-1 transition-all duration-500 delay-1100">{propertyDetails.description}</p>
                
                {/* Property-specific details */}
                {hostData.propertyType === 'home' && (
                  <div className="flex space-x-4 mt-3 text-sm text-gray-600 transition-all duration-500 delay-1200">
                    <span className="transition-all duration-300 delay-1300 hover:scale-110">🛏️ {propertyDetails.bedrooms} bedrooms</span>
                    <span className="transition-all duration-300 delay-1400 hover:scale-110">🚿 {propertyDetails.bathrooms} bathrooms</span>
                    <span className="transition-all duration-300 delay-1500 hover:scale-110">👥 {propertyDetails.maxGuests} guests</span>
                  </div>
                )}
                
                {hostData.propertyType === 'experience' && (
                  <div className="flex space-x-4 mt-3 text-sm text-gray-600 transition-all duration-500 delay-1200">
                    <span className="transition-all duration-300 delay-1300 hover:scale-110">⏱️ {propertyDetails.duration} hours</span>
                    <span className="transition-all duration-300 delay-1400 hover:scale-110">👥 {propertyDetails.groupSize} guests max</span>
                    <span className="transition-all duration-300 delay-1500 hover:scale-110">🎯 {propertyDetails.experienceType}</span>
                  </div>
                )}
                
                {hostData.propertyType === 'service' && (
                  <div className="flex space-x-4 mt-3 text-sm text-gray-600 transition-all duration-500 delay-1200">
                    <span className="transition-all duration-300 delay-1300 hover:scale-110">🛠️ {propertyDetails.serviceCategory}</span>
                    <span className="transition-all duration-300 delay-1400 hover:scale-110">📅 {propertyDetails.experienceYears} years experience</span>
                    <span className="transition-all duration-300 delay-1500 hover:scale-110">📍 {propertyDetails.serviceRadius} mile radius</span>
                  </div>
                )}
              </div>
              
              <div className="text-right transition-all duration-500 delay-1300">
                <div className="text-2xl font-bold text-teal-600 transition-all duration-500 delay-1400">
                  ${hostData.pricing?.basePrice}
                  <span className="text-sm font-normal text-gray-600 transition-all duration-500 delay-1500">
                    {hostData.propertyType === 'home' && '/night'}
                    {hostData.propertyType === 'experience' && '/person'}
                    {hostData.propertyType === 'service' && '/service'}
                  </span>
                </div>
                {hostData.pricing?.cleaningFee && (
                  <div className="text-sm text-gray-600 mt-1 transition-all duration-500 delay-1600">
                    +${hostData.pricing.cleaningFee} cleaning fee
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all duration-500 delay-800 hover:shadow-lg hover:-translate-y-1">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 transition-all duration-500 delay-900">📍 Location</h2>
            <div className="text-gray-600 transition-all duration-500 delay-1000">
              <p className="font-medium transition-all duration-500 delay-1100">{hostData.location?.address}</p>
              {hostData.location?.apartment && <p className="transition-all duration-500 delay-1200">{hostData.location.apartment}</p>}
              <p className="transition-all duration-500 delay-1300">{hostData.location?.city}, {hostData.location?.state} {hostData.location?.zipCode}</p>
              <p className="transition-all duration-500 delay-1400">{hostData.location?.country}</p>
            </div>
          </div>

          {/* Photos Preview */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all duration-500 delay-900 hover:shadow-lg hover:-translate-y-1">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 transition-all duration-500 delay-1000">📸 Photos</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 transition-all duration-500 delay-1100">
              {hostData.photos?.map((photo, index) => (
                <div key={photo.id} className="relative transition-all duration-300 delay-1200 hover:scale-105">
                  <img
                    src={photo.url}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg transition-all duration-300"
                  />
                  {photo.isPrimary && (
                    <span className="absolute top-1 left-1 bg-teal-100 text-teal-800 text-xs px-2 py-1 rounded-full transition-all duration-300">
                      Primary
                    </span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-3 transition-all duration-500 delay-1300">
              {hostData.photos?.length || 0} photos uploaded
            </p>
          </div>

          {/* Eco-Friendly Badges */}
          {(hostData.pricing?.ecoDiscount || hostData.pricing?.sustainableChoice) && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 transition-all duration-500 delay-1000 hover:shadow-lg hover:-translate-y-1">
              <h2 className="text-xl font-semibold text-green-900 mb-4 transition-all duration-500 delay-1100">🌱 Eco-Friendly Features</h2>
              <div className="flex flex-wrap gap-2 transition-all duration-500 delay-1200">
                {hostData.pricing?.ecoDiscount && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 transition-all duration-300 delay-1300 hover:scale-105">
                    🌿 Eco Discount Available
                  </span>
                )}
                {hostData.pricing?.sustainableChoice && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 transition-all duration-300 delay-1400 hover:scale-105">
                    ♻️ Sustainable Choice
                  </span>
                )}
                {hostData.serviceDetails?.ecoFriendly && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 transition-all duration-300 delay-1500 hover:scale-105">
                    💚 Eco-Friendly Service
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all duration-700 delay-700 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0 transition-all duration-500 delay-800">
            <Link
              to="/host/subscription"
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-all duration-300 delay-900 hover:shadow-md hover:-translate-y-0.5"
            >
              ← Back to Subscription
            </Link>
            
            <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 transition-all duration-500 delay-1000">
              <button
                onClick={handleSaveDraft}
                disabled={savingDraft}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-all duration-300 delay-1100 hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {savingDraft ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>💾 Save as Draft</span>
                )}
              </button>
              
              <button
                onClick={handlePublish}
                disabled={publishing || !canPublish}
                className={`px-8 py-3 font-medium rounded-lg transition-all duration-300 delay-1200 flex items-center space-x-2 ${
                  canPublish && !publishing
                    ? 'bg-teal-600 text-white hover:bg-teal-700 hover:shadow-lg hover:-translate-y-0.5'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {publishing ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <span>🚀 {canPublish ? 'Publish Listing' : 'Complete Payment First'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Publishing Requirements */}
        {!canPublish && (
          <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6 transition-all duration-700 delay-800 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            <div className="flex items-start transition-all duration-500 delay-900">
              <div className="flex-shrink-0 transition-all duration-500 delay-1000">
                <svg className="h-5 w-5 text-yellow-400 transition-all duration-500 delay-1100" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 transition-all duration-500 delay-1200">
                <h3 className="text-sm font-medium text-yellow-800 transition-all duration-500 delay-1300">Subscription Required</h3>
                <p className="text-sm text-yellow-700 mt-1 transition-all duration-500 delay-1400">
                  You need to complete your subscription payment before publishing. 
                  Your listing will be saved as a draft until payment is verified.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Privacy Note */}
        <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6 transition-all duration-700 delay-900 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <div className="flex items-start transition-all duration-500 delay-1000">
            <div className="flex-shrink-0 transition-all duration-500 delay-1100">
              <svg className="h-5 w-5 text-blue-400 transition-all duration-500 delay-1200" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 transition-all duration-500 delay-1300">
              <h3 className="text-sm font-medium text-blue-800 transition-all duration-500 delay-1400">
                {canPublish ? 'Your listing will go live immediately' : 'Your listing is ready for publication'}
              </h3>
              <p className="text-sm text-blue-700 mt-1 transition-all duration-500 delay-1500">
                {canPublish 
                  ? 'Once published, your listing will be visible to potential guests and customers. You can edit or unpublish it anytime from your host dashboard.'
                  : 'Complete your subscription payment to make your listing visible to potential guests and customers.'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostPublishReview;