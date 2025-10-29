import React, { createContext, useContext, useState } from 'react';
import { 
  collection, 
  addDoc, 
  serverTimestamp,
  doc,
  setDoc 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../Firebase';
import { useAuth } from './AuthContext';

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
    setHostData(prev => ({ ...prev, ...newData }));
    console.log('Host Data Updated:', { ...hostData, ...newData });
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

      const draftData = {
        ...hostData,
        hostId: currentUser.uid,
        hostName: currentUser.displayName || currentUser.email,
        hostEmail: currentUser.email,
        status: 'draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastSaved: serverTimestamp()
      };

      console.log('💾 Saving draft to Firebase...', draftData);

      // Save to Firestore in a 'drafts' collection
      const docRef = await addDoc(collection(db, 'drafts'), draftData);
      
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

      // Prepare listing data for Firebase
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
        hostPhotoURL: currentUser.photoURL,
        
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

      console.log('📤 Publishing listing to Firebase...', listingData);

      // Save to Firestore
      const docRef = await addDoc(collection(db, 'listings'), listingData);
      
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