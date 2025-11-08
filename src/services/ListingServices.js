import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDocs, 
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../Firebase';

// Save a new listing to Firestore
export const createListing = async (listingData) => {
  try {
    const listingWithMetadata = {
      ...listingData,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      views: 0,
      bookings: 0,
      rating: 0,
      reviewCount: 0
    };

    const docRef = await addDoc(collection(db, 'listings'), listingWithMetadata);
    console.log('✅ Listing created with ID: ', docRef.id);
    
    return docRef.id;
  } catch (error) {
    console.error('❌ Error creating listing: ', error);
    throw error;
  }
};

// Get all listings
export const getAllListings = async () => {
  try {
    const q = query(
      collection(db, 'listings'), 
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const listings = [];
    querySnapshot.forEach((doc) => {
      listings.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return listings;
  } catch (error) {
    console.error('❌ Error getting listings: ', error);
    throw error;
  }
};

// Get listings by host
export const getListingsByHost = async (hostId) => {
  try {
    const q = query(
      collection(db, 'listings'), 
      where('hostId', '==', hostId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const listings = [];
    querySnapshot.forEach((doc) => {
      listings.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return listings;
  } catch (error) {
    console.error('❌ Error getting host listings: ', error);
    throw error;
  }
};

// Get single listing by ID
export const getListingById = async (listingId) => {
  try {
    const docRef = doc(db, 'listings', listingId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      };
    } else {
      throw new Error('Listing not found');
    }
  } catch (error) {
    console.error('❌ Error getting listing: ', error);
    throw error;
  }
};

// Update listing
export const updateListing = async (listingId, updates) => {
  try {
    const listingRef = doc(db, 'listings', listingId);
    await updateDoc(listingRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Listing updated successfully');
  } catch (error) {
    console.error('❌ Error updating listing: ', error);
    throw error;
  }
};

// Delete listing (soft delete by setting status to inactive)
export const deleteListing = async (listingId) => {
  try {
    const listingRef = doc(db, 'listings', listingId);
    await updateDoc(listingRef, {
      status: 'inactive',
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Listing deleted successfully');
  } catch (error) {
    console.error('❌ Error deleting listing: ', error);
    throw error;
  }
};

// Track listing view (increment view count)
export const trackListingView = async (listingId) => {
  try {
    const listingRef = doc(db, 'listings', listingId);
    const listingSnap = await getDoc(listingRef);
    
    if (listingSnap.exists()) {
      const currentViews = listingSnap.data().views || 0;
      await updateDoc(listingRef, {
        views: currentViews + 1,
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('❌ Error tracking listing view: ', error);
    // Don't throw error - view tracking should not break the user experience
  }
};