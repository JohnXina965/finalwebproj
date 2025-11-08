// firebase.js - COMPLETE VERSION
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  fetchSignInMethodsForEmail,
  linkWithCredential,
  EmailAuthProvider
} from "firebase/auth";
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCx6_cMK7SkYUqGM21CbNgtu6e-T4R9_nE",
  authDomain: "ecoexpress-3eae1.firebaseapp.com",
  projectId: "ecoexpress-3eae1",
  storageBucket: "ecoexpress-3eae1.firebasestorage.app",
  messagingSenderId: "921346132419",
  appId: "1:921346132419:web:4a69e355f01c7066135576"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

// Add scopes for profile information
provider.addScope('profile');
provider.addScope('email');
provider.setCustomParameters({
  prompt: 'select_account'
});

// Export ALL auth functions you need
export { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  fetchSignInMethodsForEmail,
  linkWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider
};

export const db = getFirestore(app);
export const storage = getStorage(app);