import React, { createContext, useContext, useState } from 'react';
import { 
  collection, 
  addDoc, 
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../Firebase';
import { useAuth } from './AuthContext';
import { canCreateListing, getSubscriptionPlan } from '../services/SubscriptionService';

const HostContext = createContext();

// Host Hook
export const useHost = () => {
  const context = useContext(HostContext);
  if (!context) {
    throw new Error('useHost must be used within a HostProvider');
  }
  return context;
};

// Host Provider
export const HostProvider = ({ children }) => {
  const { currentUser } = useAuth();
  
  const [hostData, setHostData] = useState({
    propertyType: '',
    currentStep: 1,
    homeDetails: null,
    experienceDetails: null,
    serviceDetails: null,
    location: null,
    pricing: null,
    photos: []
  });
  
  const [loading, setLoading] = useState(false);

  // Update host data
  const updateHostData = (newData) => {
    // Remove undefined values before updating
    const cleanData = Object.fromEntries(
      Object.entries(newData).filter(([_, value]) => value !== undefined)
    );
    setHostData(prev => ({ ...prev, ...cleanData }));
    // Reduced logging - only log significant updates
    // Uncomment for debugging: console.log('Host Data Updated:', cleanData);
  };

  // Clear host data
  const clearHostData = () => {
    setHostData({
      propertyType: '',
      currentStep: 1,
      homeDetails: null,
      experienceDetails: null,
      serviceDetails: null,
      location: null,
      pricing: null,
      photos: [],
      policiesAccepted: null,
      policyAcceptedAt: null,
      subscriptionPlan: null,
      subscriptionStatus: 'pending',
      paypalSubscriptionId: null,
      paymentVerified: false
    });
    console.log('Host Data Cleared');
  };

  // Load draft from Firestore
  const loadDraft = async (draftId) => {
    setLoading(true);
    try {
      if (!currentUser) {
        throw new Error('You must be logged in to load a draft');
      }

      const draftRef = doc(db, 'drafts', draftId);
      const draftSnap = await getDoc(draftRef);

      if (!draftSnap.exists()) {
        throw new Error('Draft not found');
      }

      const draftData = draftSnap.data();

      // Verify this draft belongs to the current user
      if (draftData.hostId !== currentUser.uid) {
        throw new Error('You do not have permission to access this draft');
      }

      // Load the draft data into state
      setHostData({
        propertyType: draftData.propertyType || '',
        currentStep: draftData.currentStep || 1,
        homeDetails: draftData.homeDetails || null,
        experienceDetails: draftData.experienceDetails || null,
        serviceDetails: draftData.serviceDetails || null,
        location: draftData.location || null,
        pricing: draftData.pricing || null,
        photos: draftData.photos || [],
        policiesAccepted: draftData.policiesAccepted || null,
        policyAcceptedAt: draftData.policyAcceptedAt || null,
        subscriptionPlan: draftData.subscriptionPlan || null,
        subscriptionStatus: draftData.subscriptionStatus || 'pending',
        paypalSubscriptionId: draftData.paypalSubscriptionId || null,
        paymentVerified: draftData.paymentVerified || false,
        draftId: draftId // Store the draft ID so we can delete it when publishing
      });

      // Only log in development to reduce console spam - removed full object logging
      // The toast notification in HostCreateListing is sufficient for user feedback

      setLoading(false);
      return draftData;
    } catch (error) {
      console.error('❌ Failed to load draft:', error);
      setLoading(false);
      throw error;
    }
  };

  // Upload photo to Firebase Storage
  const uploadPhoto = async (file) => {
    try {
      if (!currentUser) {
        throw new Error('You must be logged in to upload photos');
      }

      const fileRef = ref(storage, `listings/${currentUser.uid}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return {
        id: Date.now().toString(),
        url: downloadURL,
        isPrimary: false,
        fileName: file.name
      };
    } catch (error) {
      console.error('Error uploading photo:', error);
      throw error;
    }
  };

  // ✅ CORRECTED: Save as Draft function - MOVED INSIDE the component
  const saveAsDraft = async () => {
    setLoading(true);
    try {
      if (!currentUser) {
        throw new Error('You must be logged in to save a draft');
      }

      // Build draft data, excluding undefined values
      const draftData = {
        hostId: currentUser.uid,
        hostName: currentUser.displayName || currentUser.email,
        hostEmail: currentUser.email,
        status: 'draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastSaved: serverTimestamp()
      };

      // Add property type if exists
      if (hostData.propertyType) {
        draftData.propertyType = hostData.propertyType;
      }

      // Add details based on property type
      if (hostData.propertyType === 'home' && hostData.homeDetails) {
        draftData.homeDetails = hostData.homeDetails;
      } else if (hostData.propertyType === 'experience' && hostData.experienceDetails) {
        draftData.experienceDetails = hostData.experienceDetails;
      } else if (hostData.propertyType === 'service' && hostData.serviceDetails) {
        draftData.serviceDetails = hostData.serviceDetails;
      }

      // Add location if exists
      if (hostData.location && hostData.location.address) {
        draftData.location = hostData.location;
      }

      // Add pricing if exists
      if (hostData.pricing && hostData.pricing.basePrice) {
        draftData.pricing = hostData.pricing;
      }

      // Add photos if exists
      if (hostData.photos && hostData.photos.length > 0) {
        draftData.photos = hostData.photos;
      }

      // Add current step
      if (hostData.currentStep) {
        draftData.currentStep = hostData.currentStep;
      }

      // Remove any undefined values
      const cleanDraftData = Object.fromEntries(
        Object.entries(draftData).filter(([_, value]) => value !== undefined)
      );

      console.log('💾 Saving draft to Firebase...');

      // Save to Firestore in a 'drafts' collection
      const docRef = await addDoc(collection(db, 'drafts'), cleanDraftData);
      
      // Store the draft ID in hostData so we can delete it later when publishing
      updateHostData({ draftId: docRef.id });
      
      console.log('✅ Draft saved successfully! ID:', docRef.id);
      return docRef.id;
      
    } catch (error) {
      console.error('❌ Failed to save draft:', error);
      throw new Error(`Failed to save draft: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Publish listing to Firebase
  const publishListing = async () => {
    setLoading(true);
    try {
      if (!currentUser) {
        throw new Error('You must be logged in to publish a listing');
      }

      // Validate required data
      if (!hostData.propertyType) {
        throw new Error('Property type is required');
      }

      if (!hostData.location) {
        throw new Error('Location information is required');
      }

      if (!hostData.pricing) {
        throw new Error('Pricing information is required');
      }

      // Get subscription plan from hostData or host profile
      let subscriptionPlan = hostData.subscriptionPlan;
      let subscriptionStatus = hostData.subscriptionStatus || 'active';
      let additionalSlots = 0;
      
      // If not in hostData, try to get from host profile
      if (!subscriptionPlan) {
        try {
          const hostDocRef = doc(db, 'hosts', currentUser.uid);
          const hostDoc = await getDoc(hostDocRef);
          if (hostDoc.exists()) {
            const hostProfile = hostDoc.data();
            subscriptionPlan = hostProfile.subscriptionPlan;
            subscriptionStatus = hostProfile.subscriptionStatus || subscriptionStatus;
            additionalSlots = hostProfile.additionalListingSlots || 0;
          }
        } catch (error) {
          console.warn('Could not fetch subscription from host profile:', error);
        }
      } else {
        // Get additional slots from host profile if subscription plan is in hostData
        try {
          const hostDocRef = doc(db, 'hosts', currentUser.uid);
          const hostDoc = await getDoc(hostDocRef);
          if (hostDoc.exists()) {
            const hostProfile = hostDoc.data();
            additionalSlots = hostProfile.additionalListingSlots || 0;
          }
        } catch (error) {
          console.warn('Could not fetch additional slots from host profile:', error);
        }
      }

      // Check listing limit before publishing
      const subscriptionPlanId = subscriptionPlan?.id || subscriptionPlan || 'basic';
      
      // Get current listing count
      let currentListingCount = 0;
      try {
        const listingsQuery = query(
          collection(db, 'listings'),
          where('hostId', '==', currentUser.uid),
          where('status', '==', 'published')
        );
        const listingsSnapshot = await getDocs(listingsQuery);
        currentListingCount = listingsSnapshot.size;
      } catch (error) {
        // Fallback: try without status filter if index issue
        console.warn('Error checking listing count with status filter, trying fallback:', error);
        try {
          const fallbackQuery = query(
            collection(db, 'listings'),
            where('hostId', '==', currentUser.uid)
          );
          const fallbackSnapshot = await getDocs(fallbackQuery);
          // Filter client-side for published listings
          currentListingCount = fallbackSnapshot.docs.filter(doc => {
            const data = doc.data();
            return data.status === 'published';
          }).length;
        } catch (fallbackError) {
          console.error('Error checking listing count:', fallbackError);
          // If we can't check, allow the listing creation (fail-safe)
          currentListingCount = 0;
        }
      }

      // Check if host can create more listings
      const listingAvailability = canCreateListing(subscriptionPlanId, currentListingCount, additionalSlots);
      
      if (!listingAvailability.allowed) {
        const plan = getSubscriptionPlan(subscriptionPlanId);
        const limit = plan.listingLimit === -1 ? 'Unlimited' : (plan.listingLimit + additionalSlots);
        throw new Error(`Listing limit reached! You have ${currentListingCount} / ${limit} listings. Please upgrade your subscription or purchase additional listing slots to create more listings.`);
      }

      // Calculate expiration date based on subscription plan
      let expiresAt = null;
      let subscriptionFeatures = [];
      
      if (subscriptionPlan) {
        // Use SubscriptionService to get plan details
        const selectedPlan = getSubscriptionPlan(subscriptionPlanId);
        
        if (selectedPlan) {
          subscriptionFeatures = selectedPlan.features;
          
          // Calculate expiration date
          const now = new Date();
          const expirationDate = new Date(now);
          
          if (selectedPlan.postingDurationUnit === 'years') {
            expirationDate.setFullYear(now.getFullYear() + selectedPlan.postingDuration);
          } else if (selectedPlan.postingDurationUnit === 'months') {
            expirationDate.setMonth(now.getMonth() + selectedPlan.postingDuration);
          } else if (selectedPlan.postingDurationUnit === 'days') {
            expirationDate.setDate(now.getDate() + selectedPlan.postingDuration);
          }
          
          expiresAt = expirationDate;
        } else if (typeof subscriptionPlan === 'object' && subscriptionPlan.postingDuration) {
          // If subscriptionPlan is an object with postingDuration, use it directly
          const now = new Date();
          const expirationDate = new Date(now);
          
          if (subscriptionPlan.postingDurationUnit === 'years') {
            expirationDate.setFullYear(now.getFullYear() + subscriptionPlan.postingDuration);
          } else if (subscriptionPlan.postingDurationUnit === 'months') {
            expirationDate.setMonth(now.getMonth() + subscriptionPlan.postingDuration);
          } else if (subscriptionPlan.postingDurationUnit === 'days') {
            expirationDate.setDate(now.getDate() + subscriptionPlan.postingDuration);
          }
          
          expiresAt = expirationDate;
        }
      }

      // Prepare listing data for Firebase (only include defined values)
      const listingData = {
        // Basic info
        propertyType: hostData.propertyType,
        title: getPropertyTitle(),
        description: getPropertyDescription(),
        
        // Details based on property type
        ...(hostData.homeDetails && { homeDetails: hostData.homeDetails }),
        ...(hostData.experienceDetails && { experienceDetails: hostData.experienceDetails }),
        ...(hostData.serviceDetails && { serviceDetails: hostData.serviceDetails }),
        
        // Location
        location: hostData.location,
        
        // Pricing
        pricing: hostData.pricing,
        
        // Photos
        photos: hostData.photos || [],
        
        // Host info
        hostId: currentUser.uid,
        hostName: currentUser.displayName || 'Host',
        hostEmail: currentUser.email,
        hostPhotoURL: currentUser.photoURL || null,
        
        // Subscription info (only include if exists)
        ...(subscriptionPlanId && { subscriptionPlan: subscriptionPlanId }),
        ...(subscriptionStatus && { subscriptionStatus: subscriptionStatus }),
        ...(subscriptionFeatures.length > 0 && { subscriptionFeatures: subscriptionFeatures }),
        
        // Expiration (only include if exists)
        ...(expiresAt && { expiresAt: expiresAt }),
        
        // Listing status
        status: 'published',
        isActive: true,
        isApproved: true,
        
        // Timestamps
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        publishedAt: serverTimestamp(),
        
        // Stats
        views: 0,
        bookings: 0,
        rating: 0,
        reviewCount: 0,
        favorites: 0,
        
        // Search optimization
        searchKeywords: generateSearchKeywords()
      };

      // Remove any undefined values (Firestore doesn't allow undefined)
      const cleanListingData = Object.fromEntries(
        Object.entries(listingData).filter(([_, value]) => value !== undefined)
      );

      console.log('📤 Publishing listing to Firebase...', cleanListingData);

      // Save to Firestore
      const docRef = await addDoc(collection(db, 'listings'), cleanListingData);
      
      console.log('✅ Listing published successfully! ID:', docRef.id);
      return docRef.id;
      
    } catch (error) {
      console.error('❌ Failed to publish listing:', error);
      throw new Error(`Failed to publish listing: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get property title
  const getPropertyTitle = () => {
    switch(hostData.propertyType) {
      case 'home':
        return hostData.homeDetails?.title || 'Beautiful Property';
      case 'experience':
        return hostData.experienceDetails?.title || 'Amazing Experience';
      case 'service':
        return hostData.serviceDetails?.title || 'Professional Service';
      default:
        return 'New Listing';
    }
  };

  // Helper function to get property description
  const getPropertyDescription = () => {
    switch(hostData.propertyType) {
      case 'home':
        return hostData.homeDetails?.description || '';
      case 'experience':
        return hostData.experienceDetails?.description || '';
      case 'service':
        return hostData.serviceDetails?.description || '';
      default:
        return '';
    }
  };

  // Helper function to generate search keywords
  const generateSearchKeywords = () => {
    const keywords = [];
    
    // Add property type
    keywords.push(hostData.propertyType);
    
    // Add location keywords
    if (hostData.location) {
      keywords.push(hostData.location.city, hostData.location.state, hostData.location.country);
    }
    
    // Add amenities/features based on property type
    if (hostData.propertyType === 'home' && hostData.homeDetails?.amenities) {
      keywords.push(...hostData.homeDetails.amenities);
    }
    
    if (hostData.propertyType === 'experience' && hostData.experienceDetails?.experienceType) {
      keywords.push(hostData.experienceDetails.experienceType);
    }
    
    if (hostData.propertyType === 'service' && hostData.serviceDetails?.serviceCategory) {
      keywords.push(hostData.serviceDetails.serviceCategory);
    }
    
    // Add eco-friendly keywords if applicable
    if (hostData.pricing?.ecoDiscount || hostData.pricing?.sustainableChoice) {
      keywords.push('eco', 'sustainable', 'green', 'environmental');
    }
    
    return keywords.filter(keyword => keyword).map(keyword => keyword.toLowerCase());
  };

  // Create host profile
  const createHostProfile = async (hostProfileData) => {
    setLoading(true);
    try {
      if (!currentUser) {
        throw new Error('You must be logged in to create a host profile');
      }

      const profileData = {
        ...hostProfileData,
        userId: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        listingsCount: 0,
        totalEarnings: 0,
        rating: 0,
        isVerified: false,
        hostSince: serverTimestamp()
      };

      // Save host profile to Firestore
      await setDoc(doc(db, 'hosts', currentUser.uid), profileData);
      console.log('✅ Host profile created successfully');
      return true;
      
    } catch (error) {
      console.error('Error creating host profile:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const hostValue = {
    hostData,
    setHostData,
    updateHostData,
    clearHostData,
    publishListing,
    saveAsDraft, // ✅ Now this will work correctly
    uploadPhoto,
    loadDraft, // ✅ New function to load drafts
    loading,
    createHostProfile
  };

  return (
    <HostContext.Provider value={hostValue}>
      {children}
    </HostContext.Provider>
  );
};

export default HostContext;