import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
  getDocs
} from 'firebase/firestore';
import { db } from '../Firebase';
import { useAuth } from './AuthContext';

const WalletContext = createContext();

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export const WalletProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);

  // Load wallet data from Firestore
  useEffect(() => {
    if (!currentUser) {
      setBalance(0);
      setTransactions([]);
      setLoading(false);
      return;
    }

    loadWalletData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const loadWalletData = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      
      // Get wallet balance
      const walletRef = doc(db, 'wallets', currentUser.uid);
      const walletSnap = await getDoc(walletRef);

      if (walletSnap.exists()) {
        const walletData = walletSnap.data();
        setBalance(walletData.balance || 0);
      } else {
        // Create wallet if it doesn't exist
        await setDoc(walletRef, {
          userId: currentUser.uid,
          balance: 0,
          currency: 'PHP',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        setBalance(0);
      }

      // Load transaction history
      await loadTransactions();

    } catch (error) {
      console.error('Error loading wallet data:', error);
      setBalance(0);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    if (!currentUser) return;

    try {
      const transactionsRef = collection(db, 'walletTransactions');
      const q = query(
        transactionsRef,
        where('userId', '==', currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      
      const transactionsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt?.seconds * 1000 || 0);
        return {
          id: doc.id,
          ...data,
          createdAt
        };
      }).sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)); // Sort client-side
      
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Error loading transactions:', error);
      setTransactions([]);
    }
  };

  // Cash in money to wallet (via PayPal)
  const cashIn = async (amount, paymentMethod = 'paypal', paymentDetails = {}) => {
    if (!currentUser) {
      throw new Error('You must be logged in to cash in');
    }

    if (!amount || amount <= 0) {
      throw new Error('Invalid amount');
    }

    try {
      setLoading(true);

      const walletRef = doc(db, 'wallets', currentUser.uid);
      const walletSnap = await getDoc(walletRef);

      const newBalance = (walletSnap.exists() ? (walletSnap.data().balance || 0) : 0) + amount;

      // Update wallet balance
      await setDoc(walletRef, {
        userId: currentUser.uid,
        balance: newBalance,
        currency: 'PHP',
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Create transaction record
      const transactionRef = doc(collection(db, 'walletTransactions'));
      await setDoc(transactionRef, {
        userId: currentUser.uid,
        type: 'cash_in',
        amount: amount,
        balanceAfter: newBalance,
        paymentMethod: paymentMethod,
        paymentDetails: paymentDetails,
        status: 'completed',
        createdAt: serverTimestamp(),
        description: `Cash in via ${paymentMethod.toUpperCase()}`
      });

      setBalance(newBalance);
      await loadTransactions();

      return { success: true, newBalance };
    } catch (error) {
      console.error('Error cashing in:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Deduct money from wallet (for payments)
  const deduct = async (amount, description = 'Payment', bookingId = null) => {
    if (!currentUser) {
      throw new Error('You must be logged in');
    }

    if (!amount || amount <= 0) {
      throw new Error('Invalid amount');
    }

    if (balance < amount) {
      throw new Error('Insufficient wallet balance');
    }

    try {
      setLoading(true);

      const walletRef = doc(db, 'wallets', currentUser.uid);
      const newBalance = balance - amount;

      // Update wallet balance
      await updateDoc(walletRef, {
        balance: newBalance,
        updatedAt: serverTimestamp()
      });

      // Create transaction record
      const transactionRef = doc(collection(db, 'walletTransactions'));
      await setDoc(transactionRef, {
        userId: currentUser.uid,
        type: 'payment',
        amount: amount,
        balanceAfter: newBalance,
        status: 'completed',
        description: description,
        bookingId: bookingId || null,
        createdAt: serverTimestamp()
      });

      setBalance(newBalance);
      await loadTransactions();

      return { success: true, newBalance };
    } catch (error) {
      console.error('Error deducting from wallet:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Add money to wallet (for refunds and other additions)
  const addToWallet = async (amount, description = 'Funds added') => {
    if (!currentUser) {
      throw new Error('You must be logged in');
    }

    if (!amount || amount <= 0) {
      throw new Error('Invalid amount');
    }

    try {
      setLoading(true);

      const walletRef = doc(db, 'wallets', currentUser.uid);
      const walletSnap = await getDoc(walletRef);

      const currentBalance = walletSnap.exists() ? (walletSnap.data().balance || 0) : 0;
      const newBalance = currentBalance + amount;

      // Update wallet balance
      await setDoc(walletRef, {
        userId: currentUser.uid,
        balance: newBalance,
        currency: 'PHP',
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Create transaction record
      const transactionRef = doc(collection(db, 'walletTransactions'));
      await setDoc(transactionRef, {
        userId: currentUser.uid,
        type: 'refund',
        amount: amount,
        balanceAfter: newBalance,
        status: 'completed',
        description: description,
        createdAt: serverTimestamp()
      });

      setBalance(newBalance);
      await loadTransactions();

      return { success: true, newBalance };
    } catch (error) {
      console.error('Error adding to wallet:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Add money to wallet (for hosts receiving payments)
  const receivePayment = async (amount, bookingId, description = 'Payment received') => {
    if (!currentUser) {
      throw new Error('You must be logged in');
    }

    if (!amount || amount <= 0) {
      throw new Error('Invalid amount');
    }

    try {
      setLoading(true);

      const walletRef = doc(db, 'wallets', currentUser.uid);
      const walletSnap = await getDoc(walletRef);

      const currentBalance = walletSnap.exists() ? (walletSnap.data().balance || 0) : 0;
      const newBalance = currentBalance + amount;

      // Update wallet balance
      await setDoc(walletRef, {
        userId: currentUser.uid,
        balance: newBalance,
        currency: 'PHP',
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Create transaction record
      const transactionRef = doc(collection(db, 'walletTransactions'));
      await setDoc(transactionRef, {
        userId: currentUser.uid,
        type: 'payment_received',
        amount: amount,
        balanceAfter: newBalance,
        status: 'completed',
        description: description,
        bookingId: bookingId,
        createdAt: serverTimestamp()
      });

      setBalance(newBalance);
      await loadTransactions();

      return { success: true, newBalance };
    } catch (error) {
      console.error('Error receiving payment:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Cash out money from wallet to PayPal
  const cashOut = async (amount, paypalEmail, description = 'Cash out to PayPal') => {
    if (!currentUser) {
      throw new Error('You must be logged in to cash out');
    }

    if (!amount || amount <= 0) {
      throw new Error('Invalid amount');
    }

    if (!paypalEmail || !paypalEmail.includes('@')) {
      throw new Error('Please provide a valid PayPal email address');
    }

    try {
      setLoading(true);

      // Read current balance from Firestore to ensure we have the latest balance
      const walletRef = doc(db, 'wallets', currentUser.uid);
      const walletSnap = await getDoc(walletRef);

      if (!walletSnap.exists()) {
        throw new Error('Wallet not found. Please contact support.');
      }

      const currentBalance = walletSnap.data().balance || 0;

      if (currentBalance < amount) {
        throw new Error(`Insufficient wallet balance. Current balance: ₱${currentBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`);
      }

      // Import PayPal Payouts service
      const { processPayPalPayout } = await import('../services/PayPalPayoutService');

      // Process PayPal payout (admin → host PayPal)
      const payoutResult = await processPayPalPayout(
        amount,
        paypalEmail,
        `withdrawal_${currentUser.uid}_${Date.now()}`
      );

      if (!payoutResult.success) {
        throw new Error(payoutResult.error || 'Failed to process PayPal payout');
      }

      // Deduct from wallet balance only after successful PayPal payout
      const newBalance = currentBalance - amount;

      await updateDoc(walletRef, {
        balance: newBalance,
        updatedAt: serverTimestamp()
      });

      // Create transaction record with completed status
      const transactionRef = doc(collection(db, 'walletTransactions'));
      await setDoc(transactionRef, {
        userId: currentUser.uid,
        type: 'cash_out',
        amount: amount,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        status: 'completed', // PayPal payout succeeded
        description: `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} withdrawn to PayPal (${paypalEmail})`,
        paypalEmail: paypalEmail,
        payoutId: payoutResult.payoutId || payoutResult.batchId,
        payoutBatchId: payoutResult.batchId,
        createdAt: serverTimestamp()
      });

      // Update local state
      setBalance(newBalance);
      
      // Reload transactions to show the new cash-out transaction
      await loadTransactions();

      console.log(`✅ Cash-out successful: ₱${amount} to ${paypalEmail}. New balance: ₱${newBalance}`);
      console.log(`✅ PayPal Payout ID: ${payoutResult.payoutId}`);

      return { 
        success: true, 
        newBalance, 
        transactionId: transactionRef.id,
        payoutId: payoutResult.payoutId
      };
    } catch (error) {
      console.error('❌ Error cashing out:', error);
      console.error('Error details:', {
        amount,
        paypalEmail,
        userId: currentUser?.uid,
        errorMessage: error.message,
        errorCode: error.code
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const walletValue = {
    balance,
    transactions,
    loading,
    cashIn,
    deduct,
    addToWallet,
    receivePayment,
    cashOut,
    loadWalletData,
    refreshTransactions: loadTransactions
  };

  return (
    <WalletContext.Provider value={walletValue}>
      {children}
    </WalletContext.Provider>
  );
};

export default WalletContext;

