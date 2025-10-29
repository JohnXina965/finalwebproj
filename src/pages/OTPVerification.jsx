import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOTP } from '../contexts/OTPContext';

const OTPVerification = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyOTP, otpData, loading, error, sendVerificationOTP } = useOTP();

  const email = otpData?.email || location.state?.email;

  useEffect(() => {
    setMounted(true);
    
    if (!email) {
      navigate('/signup');
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [email, navigate]);

  const handleOtpChange = (element, index) => {
    if (isNaN(element.value)) return false;

    setOtp(prev => {
      const newOtp = [...prev];
      newOtp[index] = element.value;
      return newOtp;
    });

    if (element.nextSibling && element.value !== '') {
      element.nextSibling.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (otp[index] === '' && e.target.previousSibling) {
        e.target.previousSibling.focus();
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const otpString = otp.join('');
    
    if (otpString.length !== 6) {
      alert('Please enter complete OTP code');
      return;
    }

    const isValid = await verifyOTP(otpString);
    
    if (isValid) {
      navigate('/login', { 
        state: { 
          message: '✅ Account verified successfully! You can now login.' 
        }
      });
    }
  };

  const handleResendOTP = async () => {
    if (timeLeft > 0) {
      alert(`Please wait ${Math.ceil(timeLeft/60)} minutes before requesting a new OTP`);
      return;
    }
    
    const success = await sendVerificationOTP(email, otpData?.userData);
    if (success) {
      setTimeLeft(900);
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => document.getElementById('otp-0')?.focus(), 100);
      alert('New OTP sent to your email!');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!email) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center animate-multi-layer">
        <div className={`text-center transition-all duration-1000 delay-300 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <h2 className="text-2xl font-bold text-gray-900 transition-all duration-700 delay-500">No OTP Request Found</h2>
          <p className="mt-2 text-gray-600 transition-all duration-700 delay-600">Please sign up first to receive an OTP.</p>
          <button 
            onClick={() => navigate('/signup')}
            className="mt-4 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-all duration-300 delay-700 hover:shadow-lg hover:-translate-y-0.5"
          >
            Go to Signup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 animate-multi-layer">
      <div className={`sm:mx-auto sm:w-full sm:max-w-md transition-all duration-1000 delay-200 ${
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}>
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 transition-all duration-700 delay-300">
          
          {/* Header with Icon */}
          <div className="text-center transition-all duration-700 delay-400">
            <div className="flex justify-center mb-6 transition-all duration-700 delay-500">
              <div className="bg-teal-500 w-16 h-16 rounded-full flex items-center justify-center overflow-hidden transform transition-all duration-500 hover:scale-110 hover:rotate-12 delay-600">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 transition-all duration-700 delay-600">
              Verify Your Email
            </h2>
            <p className="mt-2 text-sm text-gray-600 transition-all duration-700 delay-700">
              We sent a 6-digit code to <strong className="text-teal-600">{email}</strong>
            </p>
          </div>

          <form className="mt-8 space-y-6 transition-all duration-700 delay-800" onSubmit={handleSubmit}>
            
            {/* OTP Inputs */}
            <div className="transition-all duration-500 delay-900">
              <label className="block text-sm font-medium text-gray-700 mb-4 transition-all duration-500 delay-1000">
                Enter verification code
              </label>
              <div className="flex justify-center space-x-2 transition-all duration-500 delay-1100">
                {otp.map((data, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    maxLength="1"
                    value={data}
                    onChange={(e) => handleOtpChange(e.target, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    onFocus={(e) => e.target.select()}
                    className="w-12 h-12 text-center text-xl font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-300 hover:scale-105 focus:scale-110 delay-1200"
                    placeholder="0"
                  />
                ))}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-red-600 text-sm text-center bg-red-50 py-2 rounded-lg border border-red-200 transition-all duration-500 delay-1300">
                {error}
              </div>
            )}

            {/* Timer and Resend */}
            <div className="text-center transition-all duration-500 delay-1400">
              <p className="text-sm text-gray-600 transition-all duration-500 delay-1500">
                Time remaining: <span className={`font-semibold transition-colors duration-300 ${timeLeft < 60 ? 'text-red-600' : 'text-gray-900'}`}>
                  {formatTime(timeLeft)}
                </span>
              </p>
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={timeLeft > 0}
                className={`text-sm font-medium mt-2 transition-all duration-300 delay-1600 ${
                  timeLeft > 0 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-teal-600 hover:text-teal-500 hover:scale-105'
                }`}
              >
                Didn't receive code? Resend OTP
              </button>
            </div>

            {/* Verify Button */}
            <div className="transition-all duration-500 delay-1700">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 delay-1800"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white transition-all duration-300 delay-1900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verifying...
                  </>
                ) : (
                  'Verify Account'
                )}
              </button>
            </div>
          </form>

          {/* Back to Signup */}
          <div className="mt-6 text-center transition-all duration-500 delay-2000">
            <button
              onClick={() => navigate('/signup')}
              className="text-sm text-gray-600 hover:text-gray-500 transition-colors duration-200 delay-2100 hover:scale-105"
            >
              Wrong email? Go back to signup
            </button>
          </div>

          {/* Help Info */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200 transition-all duration-500 delay-2200">
            <p className="text-xs text-blue-700 text-center transition-all duration-500 delay-2300">
              <strong>💡 Verification Tip:</strong><br/>
              Check your spam folder if you don't see the email within a few minutes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;