import React, { createContext, useState, useContext } from 'react';
import { sendEmail } from '../services/EmailService';
import { useAuth } from './AuthContext';

const OTPContext = createContext();

export const useOTP = () => {
  const context = useContext(OTPContext);
  if (!context) {
    throw new Error('useOTP must be used within an OTPProvider');
  }
  return context;
};

export const OTPProvider = ({ children }) => {
  const [otpData, setOtpData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { completeSignup, setPendingUserData } = useAuth();

  const generateOTP = (length = 6) => {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
  };

  // ADD THIS FUNCTION - storeOTPData
  const storeOTPData = (data) => {
    setOtpData(data);
    console.log('OTP data stored:', data);
  };

  // In OTPContext.js - update the sendVerificationOTP function
const sendVerificationOTP = async (email, userData = {}) => {
  try {
    setLoading(true);
    setError('');
    
    const otp = generateOTP();
    const expiresAt = Date.now() + 15 * 60 * 1000;
    
    const otpInfo = {
      email,
      otp,
      expiresAt,
      userData
    };
    
    setOtpData(otpInfo);
    setPendingUserData(userData);
    
    // PASS userData to sendEmail function - ADD userData HERE
    await sendEmail(email, otp, userData); // ← This is the fix!
    console.log('OTP sent successfully to:', email);
    
    return true;
  } catch (error) {
    setError('Failed to send OTP. Please try again.');
    console.error('OTP send error:', error);
    return false;
  } finally {
    setLoading(false);
  }
};

  const verifyOTP = async (enteredOTP) => {
    if (!otpData) {
      setError('No OTP found. Please request a new one.');
      return false;
    }

    const isExpired = Date.now() > otpData.expiresAt;
    const isMatch = enteredOTP === otpData.otp;

    if (isExpired) {
      setError('OTP has expired. Please request a new one.');
      return false;
    }

    if (!isMatch) {
      setError('Invalid OTP code.');
      return false;
    }

    try {
      await completeSignup(otpData.userData);
      setOtpData(null);
      setError('');
      return true;
    } catch (error) {
      setError('Failed to complete registration. Please try again.');
      console.error('Registration error:', error);
      return false;
    }
  };

  const clearOTP = () => {
    setOtpData(null);
    setError('');
  };

  const value = {
    otpData,
    loading,
    error,
    sendVerificationOTP,
    verifyOTP,
    clearOTP,
    storeOTPData // ADD THIS TO THE EXPORTED VALUE
  };

  return (
    <OTPContext.Provider value={value}>
      {children}
    </OTPContext.Provider>
  );
};

export default OTPContext;