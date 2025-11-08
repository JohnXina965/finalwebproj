import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  linkWithCredential,
  fetchSignInMethodsForEmail
} from 'firebase/auth';
import { auth } from '../Firebase';
import { createOrUpdateUserDocument } from '../services/UserService';

const AuthContext = createContext();

// Auth Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth Provider
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingUser, setPendingUser] = useState(null);

  // Define checkEmailExists first so it can be used by completeSignup
  const checkEmailExists = async (email) => {
    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);
      // If methods array has any items (like 'password' or 'google.com'), the email is already registered
      console.log('Email check result:', email, 'Methods:', methods);
      return methods.length > 0;
    } catch (error) {
      // Handle specific Firebase errors
      console.error('Error checking email:', error.code, error.message);
      // If it's an invalid email error, still return false to allow validation
      if (error.code === 'auth/invalid-email') {
        return false;
      }
      // For other errors, assume email might exist to be safe
      // But log the error for debugging
      return false;
    }
  };

  const checkEmailAuthMethod = async (email) => {
    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);
      return methods; // Returns array like ['password'] or ['google.com'] or ['password', 'google.com']
    } catch (error) {
      console.error('Error checking email auth method:', error);
      return [];
    }
  };

  const completeSignup = async (userData) => {
    try {
      const { email, password, name } = userData;
      
      // Double-check if email exists before creating account (safety check)
      const emailExists = await checkEmailExists(email);
      if (emailExists) {
        const error = new Error('This email is already registered. Please use the login page instead.');
        error.code = 'auth/email-already-in-use';
        throw error;
      }
      
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      if (name) {
        await updateProfile(user, {
          displayName: name
        });
      }
      
      // Create user document in Firestore
      await createOrUpdateUserDocument(user, {
        name: name,
        role: 'guest' // Default role for new signups
      });
      
      console.log('User created successfully after OTP verification');
      return user;
    } catch (error) {
      console.error('Error completing signup:', error);
      // Provide user-friendly error message
      if (error.code === 'auth/email-already-in-use') {
        const friendlyError = new Error('This email is already registered. If you signed in with Google, please use "Sign in with Google" on the login page.');
        friendlyError.code = error.code;
        throw friendlyError;
      }
      throw error;
    }
  };

  const setPendingUserData = (userData) => {
    setPendingUser(userData);
  };

  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  // Logout function - redirects to login page
  const logout = async () => {
    try {
      await signOut(auth);
      // Store redirect preference before logout
      const wasHostMode = window.location.pathname.startsWith('/host');
      if (wasHostMode) {
        localStorage.setItem('ecoexpress_redirect_mode', 'host');
      } else {
        localStorage.setItem('ecoexpress_redirect_mode', 'guest');
      }
      // Redirect will be handled by App.jsx navigation logic
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const resetPassword = (email) => {
    return sendPasswordResetEmail(auth, email);
  };

  const signInWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      if (!auth.currentUser) {
        throw new Error('No user is currently signed in');
      }

      if (!auth.currentUser.email) {
        throw new Error('User does not have an email address');
      }

      // Re-authenticate user
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        currentPassword
      );
      
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      // Update password
      await updatePassword(auth.currentUser, newPassword);
      
      return true;
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  };

  const linkGoogleAccount = async () => {
    try {
      if (!auth.currentUser) {
        throw new Error('No user is currently signed in');
      }

      // Check if Google is already linked
      const methods = await fetchSignInMethodsForEmail(auth, auth.currentUser.email);
      if (methods.includes('google.com')) {
        throw new Error('Google account is already linked');
      }

      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Get the credential from the result
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential && auth.currentUser) {
        // Link the credential to current user
        await linkWithCredential(auth.currentUser, credential);
      }
      
      return true;
    } catch (error) {
      console.error('Error linking Google account:', error);
      throw error;
    }
  };

  const deleteAccount = async (password) => {
    try {
      if (!auth.currentUser) {
        throw new Error('No user is currently signed in');
      }

      // If user has email/password, re-authenticate first
      if (auth.currentUser.email && password) {
        const credential = EmailAuthProvider.credential(
          auth.currentUser.email,
          password
        );
        await reauthenticateWithCredential(auth.currentUser, credential);
      }

      // Delete user account
      await deleteUser(auth.currentUser);
      
      return true;
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  };

  const getLinkedAccounts = async () => {
    try {
      if (!auth.currentUser || !auth.currentUser.email) {
        return [];
      }

      const methods = await fetchSignInMethodsForEmail(auth, auth.currentUser.email);
      return methods;
    } catch (error) {
      console.error('Error fetching linked accounts:', error);
      return [];
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      // Create or update user document when user logs in
      if (user) {
        try {
          await createOrUpdateUserDocument(user);
        } catch (error) {
          console.error('Error creating user document on auth state change:', error);
          // Don't block auth flow if Firestore fails
        }
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Alias signOut to logout (for HostNav compatibility)
  const signOutFunc = logout;

  const authValue = {
    currentUser,
    pendingUser,
    login,
    logout,
    signOut: signOutFunc, // Alias for logout
    resetPassword,
    signInWithGoogle,
    completeSignup,
    setPendingUserData,
    checkEmailExists,
    checkEmailAuthMethod,
    changePassword,
    linkGoogleAccount,
    deleteAccount,
    getLinkedAccounts
  };

  return (
    <AuthContext.Provider value={authValue}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;