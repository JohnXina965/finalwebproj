/**
 * Wish Service
 * Handles guest wishes/suggestions for hosts
 */

import { collection, addDoc, query, where, getDocs, doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../Firebase';

/**
 * Create a wish/suggestion from guest to host
 * @param {Object} wishData - Wish data containing guestId, hostId, listingId, listingType, message
 * @returns {Promise<string>} Wish document ID
 */
export const createWish = async (wishData) => {
  try {
    const wishRef = await addDoc(collection(db, 'wishes'), {
      guestId: wishData.guestId,
      hostId: wishData.hostId,
      listingId: wishData.listingId || null,
      listingType: wishData.listingType, // 'home', 'experience', 'service'
      message: wishData.message,
      guestName: wishData.guestName || '',
      guestEmail: wishData.guestEmail || '',
      status: 'pending', // 'pending', 'read', 'acknowledged'
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return wishRef.id;
  } catch (error) {
    console.error('Error creating wish:', error);
    throw error;
  }
};

/**
 * Get wishes sent by a guest
 * @param {string} guestId - Guest user ID
 * @returns {Promise<Array>} Array of wish objects
 */
export const getGuestWishes = async (guestId) => {
  try {
    const wishesQuery = query(
      collection(db, 'wishes'),
      where('guestId', '==', guestId)
    );

    const wishesSnapshot = await getDocs(wishesQuery);
    const wishes = wishesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : 
                   (data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000) : new Date()),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : 
                   (data.updatedAt?.seconds ? new Date(data.updatedAt.seconds * 1000) : null)
      };
    });

    // Sort by date (newest first)
    wishes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return wishes;
  } catch (error) {
    console.error('Error fetching guest wishes:', error);
    throw error;
  }
};

/**
 * Get wishes received by a host
 * @param {string} hostId - Host user ID
 * @returns {Promise<Array>} Array of wish objects
 */
export const getHostWishes = async (hostId) => {
  try {
    const wishesQuery = query(
      collection(db, 'wishes'),
      where('hostId', '==', hostId)
    );

    const wishesSnapshot = await getDocs(wishesQuery);
    const wishes = wishesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : 
                   (data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000) : new Date()),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : 
                   (data.updatedAt?.seconds ? new Date(data.updatedAt.seconds * 1000) : null)
      };
    });

    // Sort by date (newest first)
    wishes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return wishes;
  } catch (error) {
    console.error('Error fetching host wishes:', error);
    throw error;
  }
};

/**
 * Update wish status
 * @param {string} wishId - Wish document ID
 * @param {string} status - New status ('pending', 'read', 'acknowledged')
 * @returns {Promise<void>}
 */
export const updateWishStatus = async (wishId, status) => {
  try {
    await updateDoc(doc(db, 'wishes', wishId), {
      status: status,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating wish status:', error);
    throw error;
  }
};

/**
 * Delete a wish
 * @param {string} wishId - Wish document ID
 * @returns {Promise<void>}
 */
export const deleteWish = async (wishId) => {
  try {
    await deleteDoc(doc(db, 'wishes', wishId));
  } catch (error) {
    console.error('Error deleting wish:', error);
    throw error;
  }
};

