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
      <div className="min-h-screen bg-gradient-to-br from-green-950 via-emerald-950 to-green-900 flex items-center justify-center relative overflow-hidden pt-20">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-32 w-80 h-80 bg-gradient-to-r from-green-700/25 to-emerald-800/25 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-gradient-to-r from-emerald-800/25 to-green-800/25 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
        
        <div className={`relative z-10 text-center transition-all duration-1000 delay-300 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4 bg-gradient-to-r from-white via-green-100 to-emerald-200 bg-clip-text text-transparent transition-all duration-700 delay-500">
              No OTP Request Found
            </h2>
            <p className="mt-2 text-green-100/90 mb-6 transition-all duration-700 delay-600">
              Please sign up first to receive an OTP.
            </p>
            <button 
              onClick={() => navigate('/signup')}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 delay-700 hover:shadow-xl hover:shadow-green-600/40 hover:scale-105"
            >
              Go to Signup
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-950 via-emerald-950 to-green-900 relative overflow-hidden pt-20">
      {/* Premium Animated Background Elements - Dark Army Green Palette */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 bg-gradient-to-r from-green-700/25 to-emerald-800/25 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-gradient-to-r from-emerald-800/25 to-green-800/25 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-green-600/15 to-emerald-700/15 rounded-full blur-3xl animate-pulse delay-500"></div>
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-gradient-to-r from-emerald-700/20 to-green-700/20 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      <div className={`relative z-10 min-h-screen flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8 transition-all duration-1000 ${
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}>
        <div className="w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl p-8 sm:p-10 transition-all duration-1000 delay-200">
            
            {/* Premium Header with Icon */}
            <div className="text-center mb-8 transition-all duration-700 delay-400">
              <div className="flex justify-center mb-6 transition-all duration-700 delay-500">
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl shadow-green-600/50 transform transition-all duration-500 hover:scale-110 hover:rotate-12 delay-600">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>

              <h2 className="text-3xl font-bold text-white mb-3 bg-gradient-to-r from-white via-green-100 to-emerald-200 bg-clip-text text-transparent transition-all duration-700 delay-600">
                Verify Your Email
              </h2>
              <p className="text-green-100/90 text-sm transition-all duration-700 delay-700">
                We sent a 6-digit code to <strong className="text-green-300">{email}</strong>
              </p>
            </div>

            <form className="space-y-6 transition-all duration-700 delay-800" onSubmit={handleSubmit}>
              
              {/* Premium OTP Inputs */}
              <div className="transition-all duration-500 delay-900">
                <label className="block text-sm font-medium text-green-100/90 mb-4 text-center transition-all duration-500 delay-1000">
                  Enter verification code
                </label>
                <div className="flex justify-center space-x-3 transition-all duration-500 delay-1100">
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
                      className="w-14 h-14 text-center text-2xl font-bold text-white bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:bg-white/15 focus:scale-110 focus:bg-white/15 delay-1200"
                      placeholder="0"
                    />
                  ))}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-gradient-to-r from-red-500/20 to-pink-500/20 border border-red-500/30 text-red-200 text-sm text-center py-3 px-4 rounded-xl backdrop-blur-sm transition-all duration-500 delay-1300">
                  {error}
                </div>
              )}

              {/* Timer and Resend */}
              <div className="text-center transition-all duration-500 delay-1400">
                <p className="text-sm text-green-100/90 transition-all duration-500 delay-1500">
                  Time remaining: <span className={`font-semibold transition-colors duration-300 ${timeLeft < 60 ? 'text-red-400' : 'text-green-300'}`}>
                    {formatTime(timeLeft)}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={timeLeft > 0}
                  className={`text-sm font-medium mt-3 transition-all duration-300 delay-1600 ${
                    timeLeft > 0 
                      ? 'text-gray-400 cursor-not-allowed' 
                      : 'text-green-400 hover:text-green-300 hover:scale-105 hover:underline'
                  }`}
                >
                  Didn't receive code? Resend OTP
                </button>
              </div>

              {/* Premium Verify Button */}
              <div className="transition-all duration-500 delay-1700">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-green-500 disabled:to-emerald-500 text-white font-semibold py-4 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg shadow-green-600/30 hover:shadow-xl hover:shadow-green-600/40 hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed delay-1800"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify Account</span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Back to Signup */}
            <div className="mt-6 text-center transition-all duration-500 delay-2000">
              <button
                onClick={() => navigate('/signup')}
                className="text-sm text-green-200/80 hover:text-green-200 transition-colors duration-200 delay-2100 hover:underline"
              >
                Wrong email? Go back to signup
              </button>
            </div>

            {/* Premium Help Info */}
            <div className="mt-6 p-4 bg-gradient-to-r from-green-600/10 to-emerald-600/10 rounded-xl border border-green-500/20 backdrop-blur-sm transition-all duration-500 delay-2200">
              <p className="text-xs text-green-200 text-center font-medium transition-all duration-500 delay-2300">
                <strong>💡 Verification Tip:</strong><br/>
                Check your spam folder if you don't see the email within a few minutes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;