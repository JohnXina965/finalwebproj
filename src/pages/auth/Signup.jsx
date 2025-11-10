import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useOTP } from '../../contexts/OTPContext';
import logonobg from '../../assets/logonobg.png';

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

  const { sendVerificationOTP } = useOTP();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const handleError = () => {
        console.error('Video failed to load');
        setVideoError(true);
      };
      
      video.addEventListener('error', handleError);
      
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
    <div className="min-h-screen bg-gradient-to-br from-green-950 via-emerald-950 to-green-900 relative overflow-hidden">
      {/* Premium Animated Background Elements - Dark Army Green Palette */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 bg-gradient-to-r from-green-700/25 to-emerald-800/25 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-gradient-to-r from-emerald-800/25 to-green-800/25 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-green-600/15 to-emerald-700/15 rounded-full blur-3xl animate-pulse delay-500"></div>
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-gradient-to-r from-emerald-700/20 to-green-700/20 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      <div className={`relative z-10 min-h-screen flex items-center justify-center py-22 px-4 sm:px-6 lg:px-8 transition-all duration-1000 ${
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}>
        <div className="max-w-6xl w-full mx-auto">
          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden transition-all duration-1000 delay-200">
            <div className="flex flex-col lg:flex-row min-h-[80vh]">
              
              {/* Premium Left Side - Video Section */}
              <div className="relative w-full lg:w-1/2 flex items-center justify-center text-center lg:text-left text-white overflow-hidden transition-all duration-1000 delay-300">
                <div className="absolute inset-0 bg-gradient-to-br from-green-950/90 via-emerald-950/80 to-green-900/90 z-10"></div>
                
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

                {videoError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-green-950 via-emerald-950 to-green-900 z-20 transition-all duration-1000 delay-700">
                    <div className="text-center">
                      <div className="w-32 h-32 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-green-600/50">
                        <span className="text-4xl">🌿</span>
                      </div>
                      <p className="text-white/90 text-lg mb-4 font-medium">Join Our Community</p>
                    </div>
                  </div>
                )}

                {/* Premium Text Content */}
                <div className="relative z-20 px-8 max-w-md transition-all duration-700 delay-500">
                  <div className="mb-8">
                    <div className="w-20 h-20 bg-none rounded-2xl flex items-center justify-center mb-6 mx-auto lg:mx-0 transform hover:rotate-6 transition-transform duration-500">
                      <img 
                        src={logonobg} 
                        alt="Eco Express Logo" 
                        className="w-12 h-12 object-cover filter brightness-0 invert"
                      />
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight bg-gradient-to-r from-white via-green-100 to-emerald-200 bg-clip-text text-transparent">
                      Join Eco Express
                    </h1>
                    <p className="text-green-100/90 text-lg leading-relaxed font-light">
                      Create your exclusive account for luxury eco-friendly accommodations and sustainable travel experiences.
                    </p>
                  </div>
                  
                  {/* Premium Features List */}
                  
                </div>
              </div>

              {/* Premium Right Side - Signup Card */}
              <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12 transition-all duration-700 delay-400">
                <div className="w-full max-w-md">
                  
                  {/* Premium Header */}
                  <div className="text-center mb-8 transition-all duration-700 delay-600">
                    <h2 className="text-3xl font-bold text-white mb-3 bg-gradient-to-r from-white via-green-100 to-emerald-200 bg-clip-text text-transparent">
                      Create Account
                    </h2>
                    <p className="text-gray-400 font-light">
                      Join our community today
                    </p>
                  </div>

                  {/* Premium Signup Form */}
                  <form className="space-y-6 transition-all duration-700 delay-700" onSubmit={handleSubmit}>
                    {/* Name Field */}
                    <div className="transition-all duration-500 delay-800">
                      <div className="relative">
                        <input
                          id="name"
                          name="name"
                          type="text"
                          autoComplete="name"
                          required
                          value={formData.name}
                          onChange={handleChange}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 backdrop-blur-sm transition-all duration-300 focus:scale-[1.02]"
                          placeholder="Full name"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Email */}
                    <div className="transition-all duration-500 delay-900">
                      <div className="relative">
                        <input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          required
                          value={formData.email}
                          onChange={handleChange}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 backdrop-blur-sm transition-all duration-300 focus:scale-[1.02]"
                          placeholder="Email address"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Password */}
                    <div className="transition-all duration-500 delay-1000">
                      <div className="relative">
                        <input
                          id="password"
                          name="password"
                          type="password"
                          autoComplete="new-password"
                          required
                          value={formData.password}
                          onChange={handleChange}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 backdrop-blur-sm transition-all duration-300 focus:scale-[1.02]"
                          placeholder="Password (min. 6 characters)"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="transition-all duration-500 delay-1100">
                      <div className="relative">
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type="password"
                          autoComplete="new-password"
                          required
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 backdrop-blur-sm transition-all duration-300 focus:scale-[1.02]"
                          placeholder="Confirm password"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Message Display */}
                    {message && (
                      <div className={`p-4 rounded-xl backdrop-blur-sm border transition-all duration-500 ease-in-out transform delay-1200 ${
                        messageType === 'success' 
                          ? 'bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-green-500/30 text-green-200' 
                          : 'bg-gradient-to-r from-red-500/20 to-pink-500/20 border-red-500/30 text-red-200'
                      }`}>
                        {message}
                      </div>
                    )}

                    {/* Premium Submit Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-green-500 disabled:to-emerald-500 text-white font-semibold py-4 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg shadow-green-600/30 hover:shadow-xl hover:shadow-green-600/40 hover:scale-[1.02] disabled:scale-100 transition-all duration-500 delay-1300"
                    >
                      {loading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>Creating Account...</span>
                        </>
                      ) : (
                        <>
                          <span>Create Account</span>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </>
                      )}
                    </button>
                  </form>

                  {/* Premium Sign in link */}
                  <div className="text-center mt-8 transition-all duration-500 delay-1400">
                    <p className="text-gray-400 font-light">
                      Already have an account?{' '}
                      <Link to="/login" className="text-green-400 hover:text-green-300 font-semibold transition-colors duration-200 hover:underline">
                        Sign in here
                      </Link>
                    </p>
                  </div>

                  {/* Premium Email Info */}
                  <div className="mt-6 p-4 bg-gradient-to-r from-green-600/10 to-emerald-600/10 rounded-xl border border-green-500/20 backdrop-blur-sm transition-all duration-500 delay-1500">
                    <p className="text-xs text-green-200 text-center font-medium">
                      <strong>📧 Support</strong><br/>
                      Can't find the email? Check spam or contact our support team.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;