import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../Firebase';

/**
 * Create or update user document in Firestore
 * This ensures every authenticated user has a corresponding Firestore document
 * @param {Object} user - Firebase Auth user object
 * @param {Object} additionalData - Additional user data to store
 * @returns {Promise<void>}
 */
export const createOrUpdateUserDocument = async (user, additionalData = {}) => {
  if (!user) {
    console.error('No user provided to createOrUpdateUserDocument');
    return;
  }

  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    // Prepare user data
    const userData = {
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'User',
      photoURL: user.photoURL || null,
      emailVerified: user.emailVerified || false,
      updatedAt: serverTimestamp(),
      ...additionalData
    };

    if (!userSnap.exists()) {
      // Create new user document
      await setDoc(userRef, {
        ...userData,
        role: additionalData.role || 'guest', // Default role is 'guest'
        createdAt: serverTimestamp(),
        // Set default profile fields
        firstName: additionalData.firstName || '',
        lastName: additionalData.lastName || '',
        bio: additionalData.bio || '',
        phone: additionalData.phone || '',
        website: additionalData.website || '',
        avatar: additionalData.avatar || user.photoURL || null
      });
      console.log('✅ User document created:', user.uid);
    } else {
      // Update existing user document (merge to preserve existing data)
      const existingData = userSnap.data();
      await setDoc(userRef, {
        ...existingData, // Preserve existing data
        ...userData, // Update with new data
        // Don't overwrite role if it's already set (unless explicitly provided)
        role: additionalData.role || existingData.role || 'guest',
        // Update email and displayName if they changed
        email: user.email || existingData.email,
        displayName: user.displayName || existingData.displayName || user.email?.split('@')[0] || 'User',
        photoURL: user.photoURL || existingData.photoURL || null,
        emailVerified: user.emailVerified !== undefined ? user.emailVerified : existingData.emailVerified
      }, { merge: true });
      console.log('✅ User document updated:', user.uid);
    }
  } catch (error) {
    console.error('Error creating/updating user document:', error);
    // Don't throw - we don't want to break the auth flow if Firestore fails
  }
};

/**
 * Get user document from Firestore
 * @param {string} userId - User UID
 * @returns {Promise<Object|null>} User document data or null
 */
export const getUserDocument = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return { id: userSnap.id, ...userSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting user document:', error);
    return null;
  }
};

