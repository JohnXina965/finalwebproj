import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useOTP } from './contexts/OTPContext';
import forestbg from './assets/FORESTBG.png';
import logonobg from './assets/logonobg.png';

const Signup = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [videoError, setVideoError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const videoRef = useRef(null);
  const navigate = useNavigate();

  // Use sendVerificationOTP instead of storeOTPData
  const { sendVerificationOTP } = useOTP();

  // ✅ Mount transition
  useEffect(() => {
    setMounted(true);
  }, []);

  // ✅ EXACT SAME VIDEO HANDLER AS LOGIN
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const handleError = () => {
        console.error('Video failed to load');
        setVideoError(true);
      };
      
      video.addEventListener('error', handleError);
      
      // Force play attempt
      setTimeout(() => {
        video.play().catch(e => {
          console.log('Auto-play failed, but video might still work');
        });
      }, 1000);

      return () => {
        video.removeEventListener('error', handleError);
      };
    }
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setMessage('❌ Passwords do not match');
      setMessageType('error');
      return;
    }

    if (formData.password.length < 6) {
      setMessage('❌ Password must be at least 6 characters');
      setMessageType('error');
      return;
    }

    if (!formData.name.trim()) {
      setMessage('❌ Please enter your name');
      setMessageType('error');
      return;
    }

    try {
      setMessage('');
      setLoading(true);

      // Use sendVerificationOTP which handles OTP generation, storage, and email sending
      const otpSent = await sendVerificationOTP(formData.email, {
        name: formData.name,
        email: formData.email,
        password: formData.password
      });

      if (otpSent) {
        setMessage('✅ Verification OTP sent! Please check your email for the 6-digit code.');
        setMessageType('success');
        
        setTimeout(() => {
          navigate('/verify-otp', { 
            state: { email: formData.email } 
          });
        }, 2000);
      } else {
        throw new Error('Failed to send OTP');
      }
      
    } catch (error) {
      console.error('Signup error:', error);
      setMessage(`❌ Failed to create account: ${error.message}`);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    // ✅ EXACT SAME STRUCTURE AS LOGIN WITH DELAY TRANSITIONS
    <div className={`min-h-screen py-8 px-4 sm:px-6 lg:px-8 animate-multi-layer transition-all duration-1000 ${
      mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
    }`}>
      <div className="max-w-6xl mx-auto bg-white p-6 sm:p-8 rounded-2xl shadow-md w-full transition-all duration-700 delay-200">
        <div className="flex flex-col lg:flex-row justify-center items-stretch min-h-[70vh]">
          
          {/* ✅ VIDEO SECTION WITH STAGGERED DELAYS */}
          <div className="relative w-full lg:w-1/2 flex items-center justify-center text-center lg:text-left text-white overflow-hidden rounded-l-2xl min-h-[400px] lg:min-h-auto bg-gray-800 transition-all duration-1000 delay-300">
            
            {/* ✅ CORRECT VIDEO PATH FOR VITE PUBLIC FOLDER */}
            <video
              ref={videoRef}
              className="absolute top-0 left-0 w-full h-full object-cover transition-all duration-1000 delay-500"
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
            >
              <source src="/videos/philippines2.mp4" type="video/mp4" />
            </video>

            {/* ✅ ERROR MESSAGE WITH DELAY */}
            {videoError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800 transition-all duration-1000 delay-700">
                <div className="text-center transition-all duration-700 delay-1000">
                  <p className="text-white text-lg mb-4 transition-all duration-500 delay-1200">❌ Video failed to load</p>
                  <div 
                    className="w-full h-64 bg-cover bg-center rounded-lg transition-all duration-700 delay-1500"
                    style={{
                      backgroundImage: `url(${forestbg})`
                    }}
                  />
                </div>
              </div>
            )}

            {/* ✅ TEXT CONTENT WITH STAGGERED DELAYS */}
            <div className="relative z-10 px-6 max-w-md transition-all duration-700 delay-500">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight transition-all duration-700 delay-600">
                Join Eco Express
              </h1>
              <p className="text-gray-200 text-base sm:text-lg leading-relaxed transition-all duration-700 delay-700">
                Create your account to discover eco-friendly accommodations and sustainable 
                travel experiences. Start your journey with us today.
              </p>
            </div>
          </div>

          {/* ✅ FORM SECTION WITH STAGGERED DELAYS */}
          <div className="w-full lg:w-1/2 flex items-center justify-center p-4 lg:p-8 transition-all duration-700 delay-400">
            <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md w-full max-w-md transition-all duration-700 delay-600">
              
              {/* ✅ LOGO ANIMATION WITH DELAY */}
              <div className="flex justify-center mb-6 transition-all duration-700 delay-700">
                <div 
                  className="bg-teal-500 w-16 h-16 rounded-full flex items-center justify-center overflow-hidden transform transition-all duration-500 hover:scale-110 hover:rotate-12 delay-800"
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                >
                  <img 
                    src={logonobg} 
                    alt="Eco Express Logo" 
                    className={`w-10 h-10 object-cover transition-all duration-500 delay-900 ${
                      isHovered ? 'scale-110' : 'scale-100'
                    }`}
                  />
                </div>
              </div>

              <h2 className="text-2xl font-bold text-center text-teal-700 mb-6 transition-all duration-700 delay-800">
                Create your account
              </h2>

              <form className="space-y-4 transition-all duration-700 delay-900" onSubmit={handleSubmit}>
                {/* Name Field */}
                <div className="transition-all duration-500 delay-1000">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1 transition-all duration-500 delay-1100">
                    Full Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-4 py-3 focus:ring-2 focus:ring-teal-500 focus:outline-none text-base transition-all duration-300 focus:scale-[1.02] focus:shadow-lg delay-1200"
                    placeholder="Enter your full name"
                  />
                </div>

                {/* Email */}
                <div className="transition-all duration-500 delay-1100">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1 transition-all duration-500 delay-1200">
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-4 py-3 focus:ring-2 focus:ring-teal-500 focus:outline-none text-base transition-all duration-300 focus:scale-[1.02] focus:shadow-lg delay-1300"
                    placeholder="Enter your email"
                  />
                </div>

                {/* Password */}
                <div className="transition-all duration-500 delay-1200">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1 transition-all duration-500 delay-1300">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-4 py-3 focus:ring-2 focus:ring-teal-500 focus:outline-none text-base transition-all duration-300 focus:scale-[1.02] focus:shadow-lg delay-1400"
                    placeholder="At least 6 characters"
                  />
                </div>

                {/* Confirm Password */}
                <div className="transition-all duration-500 delay-1300">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1 transition-all duration-500 delay-1400">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-4 py-3 focus:ring-2 focus:ring-teal-500 focus:outline-none text-base transition-all duration-300 focus:scale-[1.02] focus:shadow-lg delay-1500"
                    placeholder="Confirm your password"
                  />
                </div>

                {/* Message Display */}
                {message && (
                  <div className={`p-3 rounded-md transition-all duration-500 ease-in-out transform delay-1600 ${
                    messageType === 'success' 
                      ? 'bg-green-50 text-green-700 border border-green-200' 
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {message}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-teal-600 hover:bg-teal-500 disabled:bg-teal-400 text-white font-medium py-3 rounded-md transition-all duration-300 flex items-center justify-center hover:shadow-lg hover:-translate-y-0.5 delay-1700"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white transition-all duration-300 delay-1800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending OTP...
                    </>
                  ) : (
                    'Send Verification Code'
                  )}
                </button>
              </form>

              {/* Sign in link */}
              <div className="text-center mt-4 transition-all duration-500 delay-1800">
                <p className="text-gray-800 transition-all duration-500 delay-1900">
                  Already have an account?{' '}
                  <Link to="/login" className="text-teal-500 hover:text-teal-600 font-medium transition-colors duration-200 delay-2000">
                    Sign in here
                  </Link>
                </p>
              </div>

              {/* Email Not Receiving Info */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200 transition-all duration-500 delay-2000">
                <p className="text-xs text-blue-700 text-center transition-all duration-500 delay-2100">
                  <strong>📧 Email Not Working?</strong><br/>
                  Check spam folder or try a different email provider.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;