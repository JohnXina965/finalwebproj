import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, provider, db } from '../../Firebase.js';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import logonobg from '../../assets/logonobg.png';

function Login() {
  const [isHovered, setIsHovered] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [videoError, setVideoError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const videoRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Mount transition
  useEffect(() => {
    setMounted(true);
  }, []);

  // Video handler
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

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Check for redirect result on component mount
  useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          console.log('Google login successful via redirect:', result.user);
          setLoading(true);
          
          const redirectPath = await getRedirectPath(result.user.uid);
          navigate(redirectPath);
        }
      } catch (error) {
        console.error('Error processing redirect result:', error);
        if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
          setError('Failed to complete Google login');
        }
      } finally {
        setLoading(false);
      }
    };

    checkRedirectResult();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const getRedirectPath = async (userId) => {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const isAdmin = userData.role === 'admin' || userData.isAdmin === true;
        
        if (isAdmin) {
          console.log('User is admin, redirecting to admin dashboard');
          localStorage.removeItem('ecoexpress_redirect_mode');
          return '/admin/dashboard';
        }
      }
    } catch (error) {
      console.error('Error checking admin role:', error);
    }

    const savedMode = localStorage.getItem('ecoexpress_redirect_mode');
    if (savedMode === 'host') {
      localStorage.removeItem('ecoexpress_redirect_mode');
      return '/host/dashboard';
    }
    if (savedMode === 'guest') {
      localStorage.removeItem('ecoexpress_redirect_mode');
      return '/guest/homes';
    }

    try {
      const hostDocRef = doc(db, 'hosts', userId);
      const hostDoc = await getDoc(hostDocRef);
      
      if (hostDoc.exists()) {
        const hostData = hostDoc.data();
        if (hostData.onboardingCompleted === true) {
          console.log('User has completed host onboarding - redirecting to host dashboard');
          return '/host/dashboard';
        }
      }
      
      const userDocRef = doc(db, 'users', userId);
      const userDocCheck = await getDoc(userDocRef);
      if (userDocCheck.exists()) {
        const userData = userDocCheck.data();
        if ((userData.isHost === true || userData.role === 'host') && !hostDoc.exists()) {
          console.log('Warning: User document has host flags but no completed host profile. User will be redirected to guest page.');
        }
      }
    } catch (error) {
      console.error('Error checking host status:', error);
    }

    return '/guest/homes';
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { user } = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      console.log('Login successful:', user);
      
      const redirectPath = await getRedirectPath(user.uid);
      navigate(redirectPath); 
    } catch (error) {
      console.error('Login error:', error);
      switch (error.code) {
        case 'auth/invalid-email':
          setError('Invalid email address');
          break;
        case 'auth/user-not-found':
          setError('No account found with this email');
          break;
        case 'auth/wrong-password':
          setError('Incorrect password');
          break;
        case 'auth/too-many-requests':
          setError('Too many failed attempts. Try again later');
          break;
        case 'auth/user-disabled':
          setError('This account has been disabled');
          break;
        case 'auth/network-request-failed':
          setError('Network error. Please check your connection');
          break;
        default:
          setError('Failed to log in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      try {
        const result = await signInWithPopup(auth, provider);
        const { user } = result;
        console.log('Google login successful:', user);
        
        const redirectPath = await getRedirectPath(user.uid);
        navigate(redirectPath);
      } catch (popupError) {
        if (
          popupError.code === 'auth/popup-blocked' ||
          popupError.code === 'auth/popup-closed-by-user' ||
          popupError.code === 'auth/cancelled-popup-request' ||
          popupError.message?.includes('Cross-Origin-Opener-Policy')
        ) {
          console.log('Popup blocked or failed, using redirect method...');
          await signInWithRedirect(auth, provider);
          return;
        }
        throw popupError;
      }
    } catch (error) {
      console.error('Google login error:', error);
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        setError('Login cancelled. Please try again.');
      } else if (error.code === 'auth/popup-blocked') {
        setError('Popup blocked. Please allow popups and try again, or use email/password login.');
      } else {
        setError('Failed to login with Google. Please try again.');
      }
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setError('Please enter your email address first');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, formData.email);
      toast.success('📧 Password reset email sent! Check your inbox.');
    } catch (error) {
      console.error('Password reset error:', error);
      setError('Failed to send reset email');
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
                      <p className="text-white/90 text-lg mb-4 font-medium">Experience Premium Eco Travel</p>
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
                      Welcome to Eco Express
                    </h1>
                    <p className="text-green-100/90 text-lg leading-relaxed font-light">
                      Your exclusive gateway to luxury eco-friendly accommodations and sustainable travel experiences.
                    </p>
                  </div>
                  
                  {/* Premium Features List */}
                  
                </div>
              </div>

              {/* Premium Right Side - Login Card */}
              <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12 transition-all duration-700 delay-400">
                <div className="w-full max-w-md">
                  
                  {/* Premium Header */}
                  <div className="text-center mb-8 transition-all duration-700 delay-600">
                    <h2 className="text-3xl font-bold text-white mb-3 bg-gradient-to-r from-white via-green-100 to-emerald-200 bg-clip-text text-transparent">
                      Welcome Back
                    </h2>
                    <p className="text-gray-400 font-light">
                      Sign in to your account
                    </p>
                  </div>

                  {/* Success Message */}
                  {successMessage && (
                    <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 text-green-200 px-4 py-3 rounded-xl mb-6 backdrop-blur-sm transition-all duration-500 delay-700">
                      {successMessage}
                    </div>
                  )}
                  
                  {/* Error Message */}
                  {error && (
                    <div className="bg-gradient-to-r from-red-500/20 to-pink-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded-xl mb-6 backdrop-blur-sm transition-all duration-500 delay-700">
                      {error}
                    </div>
                  )}
                  
                  {/* Premium Login Form */}
                  <form onSubmit={handleEmailLogin} className="space-y-6 transition-all duration-700 delay-800">
                    <div className="transition-all duration-500 delay-900">
                      <div className="relative">
                        <input
                          type="email"
                          name="email"
                          placeholder="Email address"
                          value={formData.email}
                          onChange={handleChange}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 backdrop-blur-sm transition-all duration-300 focus:scale-[1.02]"
                          required
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    <div className="transition-all duration-500 delay-1000">
                      <div className="relative">
                        <input
                          type="password"
                          name="password"
                          placeholder="Password"
                          value={formData.password}
                          onChange={handleChange}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 backdrop-blur-sm transition-all duration-300 focus:scale-[1.02]"
                          required
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    {/* Remember me and Forgot password */}
                    <div className="flex justify-between items-center transition-all duration-500 delay-1100">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <div className="relative">
                          <input 
                            type="checkbox" 
                            className="sr-only"
                          />
                          <div className="w-4 h-4 bg-white/10 border border-white/20 rounded-sm flex items-center justify-center">
                            <svg className="w-3 h-3 text-emerald-400 opacity-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                        <span className="text-gray-400 text-sm">Remember me</span>
                      </label>
                      <button 
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-green-400 hover:text-green-300 text-sm font-medium transition-colors duration-200 hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    
                    {/* Premium Login button */}
                    <div className="transition-all duration-500 delay-1200">
                      <button 
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-green-500 disabled:to-emerald-500 text-white font-semibold py-4 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg shadow-green-600/30 hover:shadow-xl hover:shadow-green-600/40 hover:scale-[1.02] disabled:scale-100"
                      >
                        {loading ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>Signing in...</span>
                          </>
                        ) : (
                          <>
                            <span>Sign In</span>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                    
                  {/* Premium Divider */}
                  <div className="relative flex items-center my-8 transition-all duration-500 delay-1300">
                    <div className="flex-grow border-t border-white/10 transition-all duration-500"></div>
                    <span className="flex-shrink mx-4 text-gray-400 text-sm font-light">or continue with</span>
                    <div className="flex-grow border-t border-white/10 transition-all duration-500"></div>
                  </div>
                  
                  {/* Premium Google login button */}
                  <div className="transition-all duration-500 delay-1400">
                    <button 
                      onClick={handleGoogleLogin}
                      disabled={loading}
                      className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-4 rounded-xl transition-all duration-300 flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:scale-100 backdrop-blur-sm"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      <span>Continue with Google</span>
                    </button>
                  </div>
                  
                  {/* Premium Sign up link */}
                  <div className="text-center mt-8 transition-all duration-500 delay-1500">
                    <p className="text-gray-400 font-light">
                      Don't have an account?{' '}
                      <Link to="/signup" className="text-green-400 hover:text-green-300 font-semibold transition-colors duration-200 hover:underline">
                        Create account
                      </Link>
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
}

export default Login;