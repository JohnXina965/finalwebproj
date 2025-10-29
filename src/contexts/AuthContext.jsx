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
  updateProfile
} from 'firebase/auth';
import { auth } from '../Firebase';

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

  const completeSignup = async (userData) => {
    try {
      const { email, password, name } = userData;
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      if (name) {
        await updateProfile(user, {
          displayName: name
        });
      }
      console.log('User created successfully after OTP verification');
      return user;
    } catch (error) {
      console.error('Error completing signup:', error);
      throw error;
    }
  };

  const setPendingUserData = (userData) => {
    setPendingUser(userData);
  };

  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = () => {
    return signOut(auth);
  };

  const resetPassword = (email) => {
    return sendPasswordResetEmail(auth, email);
  };

  const signInWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const authValue = {
    currentUser,
    pendingUser,
    login,
    logout,
    resetPassword,
    signInWithGoogle,
    completeSignup,
    setPendingUserData
  };

  return (
    <AuthContext.Provider value={authValue}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;