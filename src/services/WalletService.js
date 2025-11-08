/**
 * Wallet Service - Admin Operations
 * Functions for admin to manage user wallets
 */

import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { db } from '../Firebase';

/**
 * Deduct amount from a user's wallet (admin operation)
 */
export const deductFromUserWallet = async (userId, amount, description = 'Payout processed') => {
  try {
    if (!amount || amount <= 0) {
      throw new Error('Invalid amount');
    }

    // Get user's wallet
    const walletRef = doc(db, 'wallets', userId);
    const walletSnap = await getDoc(walletRef);

    let currentBalance = 0;
    if (walletSnap.exists()) {
      currentBalance = walletSnap.data().balance || 0;
    } else {
      // Create wallet if it doesn't exist
      await setDoc(walletRef, {
        userId: userId,
        balance: 0,
        currency: 'PHP',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    if (currentBalance < amount) {
      throw new Error(`Insufficient wallet balance. Current: ₱${currentBalance.toLocaleString()}, Required: ₱${amount.toLocaleString()}`);
    }

    const newBalance = currentBalance - amount;

    // Update wallet balance
    await updateDoc(walletRef, {
      balance: newBalance,
      updatedAt: serverTimestamp()
    });

    // Create transaction record
    await addDoc(collection(db, 'walletTransactions'), {
      userId: userId,
      type: 'payout',
      amount: amount,
      balanceAfter: newBalance,
      status: 'completed',
      description: description,
      createdAt: serverTimestamp()
    });

    return { success: true, newBalance, previousBalance: currentBalance };
  } catch (error) {
    console.error('Error deducting from user wallet:', error);
    throw error;
  }
};

/**
 * Get user's wallet balance
 */
export const getUserWalletBalance = async (userId) => {
  try {
    const walletRef = doc(db, 'wallets', userId);
    const walletSnap = await getDoc(walletRef);

    if (walletSnap.exists()) {
      return walletSnap.data().balance || 0;
    }
    return 0;
  } catch (error) {
    console.error('Error getting user wallet balance:', error);
    return 0;
  }
};

