/**
 * Listing Expiration Service
 * Handles listing expiration, deletion, and renewal
 */

import { collection, query, where, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../Firebase';

/**
 * Calculate expiration date based on subscription plan
 */
export const calculateExpirationDate = (subscriptionPlan) => {
  if (!subscriptionPlan) return null;

  const now = new Date();
  const expirationDate = new Date(now);

  if (subscriptionPlan.postingDurationUnit === 'years') {
    expirationDate.setFullYear(now.getFullYear() + subscriptionPlan.postingDuration);
  } else if (subscriptionPlan.postingDurationUnit === 'months') {
    expirationDate.setMonth(now.getMonth() + subscriptionPlan.postingDuration);
  } else if (subscriptionPlan.postingDurationUnit === 'days') {
    expirationDate.setDate(now.getDate() + subscriptionPlan.postingDuration);
  }

  return expirationDate;
};

/**
 * Check if a listing is expired
 */
export const isListingExpired = (listing) => {
  if (!listing.expiresAt) return false;
  
  const expirationDate = listing.expiresAt instanceof Date 
    ? listing.expiresAt 
    : (listing.expiresAt?.toDate ? listing.expiresAt.toDate() : new Date(listing.expiresAt));
  
  return expirationDate < new Date();
};

/**
 * Get days until expiration
 */
export const getDaysUntilExpiration = (listing) => {
  if (!listing.expiresAt) return null;
  
  const expirationDate = listing.expiresAt instanceof Date 
    ? listing.expiresAt 
    : (listing.expiresAt?.toDate ? listing.expiresAt.toDate() : new Date(listing.expiresAt));
  
  const now = new Date();
  const diff = expirationDate.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  
  return days;
};

/**
 * Check and expire listings that have passed their expiration date
 * This should be run periodically (e.g., via a scheduled function or on app load)
 */
export const checkAndExpireListings = async () => {
  try {
    const now = new Date();
    
    // Get all published listings
    const listingsQuery = query(
      collection(db, 'listings'),
      where('status', '==', 'published')
    );
    
    const listingsSnapshot = await getDocs(listingsQuery);
    const expiredListings = [];
    
    listingsSnapshot.forEach(async (listingDoc) => {
      const listing = listingDoc.data();
      
      if (listing.expiresAt) {
        const expirationDate = listing.expiresAt?.toDate 
          ? listing.expiresAt.toDate() 
          : new Date(listing.expiresAt);
        
        // If expired, mark as expired
        if (expirationDate < now) {
          expiredListings.push(listingDoc.id);
          
          await updateDoc(doc(db, 'listings', listingDoc.id), {
            status: 'expired',
            expiredAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      }
    });
    
    console.log(`✅ Checked listings. Found ${expiredListings.length} expired listings.`);
    return expiredListings;
  } catch (error) {
    console.error('❌ Error checking expired listings:', error);
    throw error;
  }
};

/**
 * Renew/Extend a listing's expiration date
 */
export const renewListing = async (listingId, subscriptionPlan) => {
  try {
    const newExpirationDate = calculateExpirationDate(subscriptionPlan);
    
    if (!newExpirationDate) {
      throw new Error('Invalid subscription plan');
    }
    
    const listingRef = doc(db, 'listings', listingId);
    const listingDoc = await getDoc(listingRef);
    
    if (!listingDoc.exists()) {
      throw new Error('Listing not found');
    }
    
    const listing = listingDoc.data();
    const currentExpiration = listing.expiresAt?.toDate 
      ? listing.expiresAt.toDate() 
      : (listing.expiresAt ? new Date(listing.expiresAt) : new Date());
    
    // If listing hasn't expired yet, extend from current expiration date
    // Otherwise, extend from now
    const baseDate = currentExpiration > new Date() ? currentExpiration : new Date();
    const extendedExpiration = new Date(baseDate);
    
    if (subscriptionPlan.postingDurationUnit === 'years') {
      extendedExpiration.setFullYear(baseDate.getFullYear() + subscriptionPlan.postingDuration);
    } else if (subscriptionPlan.postingDurationUnit === 'months') {
      extendedExpiration.setMonth(baseDate.getMonth() + subscriptionPlan.postingDuration);
    } else if (subscriptionPlan.postingDurationUnit === 'days') {
      extendedExpiration.setDate(baseDate.getDate() + subscriptionPlan.postingDuration);
    }
    
    await updateDoc(listingRef, {
      expiresAt: extendedExpiration,
      status: 'published', // Reactivate if expired
      updatedAt: serverTimestamp(),
      lastRenewedAt: serverTimestamp(),
      subscriptionPlan: subscriptionPlan.id || subscriptionPlan,
      subscriptionStatus: 'active'
    });
    
    console.log(`✅ Listing ${listingId} renewed until ${extendedExpiration.toLocaleDateString()}`);
    return extendedExpiration;
  } catch (error) {
    console.error('❌ Error renewing listing:', error);
    throw error;
  }
};

/**
 * Delete expired listings (permanent deletion)
 * Use with caution - this permanently removes listings
 */
export const deleteExpiredListings = async (daysAfterExpiration = 30) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAfterExpiration);
    
    const listingsQuery = query(
      collection(db, 'listings'),
      where('status', '==', 'expired')
    );
    
    const listingsSnapshot = await getDocs(listingsQuery);
    const deletedListings = [];
    
    listingsSnapshot.forEach(async (listingDoc) => {
      const listing = listingDoc.data();
      const expiredDate = listing.expiredAt?.toDate 
        ? listing.expiredAt.toDate() 
        : (listing.expiredAt ? new Date(listing.expiredAt) : null);
      
      if (expiredDate && expiredDate < cutoffDate) {
        // Permanently delete listing
        await deleteDoc(doc(db, 'listings', listingDoc.id));
        deletedListings.push(listingDoc.id);
      }
    });
    
    console.log(`✅ Deleted ${deletedListings.length} expired listings older than ${daysAfterExpiration} days.`);
    return deletedListings;
  } catch (error) {
    console.error('❌ Error deleting expired listings:', error);
    throw error;
  }
};

