import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, provider } from './Firebase.js';
import logonobg from './assets/logonobg.png';
import forestbg from './assets/FORESTBG.png';

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

  // Simple video handler
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

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
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
      navigate('/'); 
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
      await signInWithPopup(auth, provider);
      navigate('/');
    } catch (error) {
      console.error('Google login error:', error);
      setError('Failed to login with Google');
    } finally {
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
      alert('📧 Password reset email sent! Check your inbox.');
    } catch (error) {
      console.error('Password reset error:', error);
      setError('Failed to send reset email');
    }
  };

  return (
    <div className={`min-h-screen py-8 px-4 sm:px-6 lg:px-8 animate-multi-layer transition-all duration-1000 ${
      mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
    }`}>
      <div className="max-w-6xl mx-auto bg-white p-6 sm:p-8 rounded-2xl shadow-md w-full transition-all duration-700 delay-200">
        <div className="flex flex-col lg:flex-row justify-center items-stretch min-h-[70vh]">
          
          {/* Left side - VIDEO SECTION */}
          <div className="relative w-full lg:w-1/2 flex items-center justify-center text-center lg:text-left text-white overflow-hidden rounded-l-2xl min-h-[400px] lg:min-h-auto bg-gray-800 transition-all duration-1000 delay-300">
            
            {/* VIDEO - Using public folder path */}
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

            {/* Simple error message */}
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

            {/* Text content */}
            <div className="relative z-10 px-6 max-w-md transition-all duration-700 delay-500">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight transition-all duration-700 delay-600">
                Welcome to Eco Express
              </h1>
              <p className="text-gray-200 text-base sm:text-lg leading-relaxed transition-all duration-700 delay-700">
                Your trusted platform for eco-friendly accommodations and sustainable
                travel experiences. Log in to explore unique stays.
              </p>
            </div>
          </div>

          {/* Right side - Login Card */}
          <div className="w-full lg:w-1/2 flex items-center justify-center p-4 lg:p-8 transition-all duration-700 delay-400">
            <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md w-full max-w-md transition-all duration-700 delay-600">
              
              {/* Centered Logo with Animation */}
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
                Sign in to your account
              </h2>
              
              {/* Success Message */}
              {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4 text-sm transition-all duration-500 delay-900">
                  {successMessage}
                </div>
              )}
              
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm transition-all duration-500 delay-900">
                  {error}
                </div>
              )}
              
              {/* Login form */}
              <form onSubmit={handleEmailLogin} className="flex flex-col space-y-4 transition-all duration-700 delay-900">
                <div className="transition-all duration-500 delay-1000">
                  <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-4 py-3 focus:ring-2 focus:ring-teal-500 focus:outline-none text-base transition-all duration-300 focus:scale-[1.02] focus:shadow-lg delay-1100"
                    required
                  />
                </div>
                
                <div className="transition-all duration-500 delay-1100">
                  <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-4 py-3 focus:ring-2 focus:ring-teal-500 focus:outline-none text-base transition-all duration-300 focus:scale-[1.02] focus:shadow-lg delay-1200"
                    required
                  />
                </div>
                
                {/* Remember me and Forgot password */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 transition-all duration-500 delay-1200">
                  <div className="flex items-center w-full sm:w-auto justify-between sm:justify-start transition-all duration-500 delay-1300">
                    <div className="flex items-center transition-all duration-500 delay-1400">
                      <input 
                        type="checkbox" 
                        className="mr-2 h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded transition-all duration-300 delay-1500"
                      />
                      <span className="text-gray-600 text-sm sm:text-base transition-all duration-500 delay-1600">Remember me</span>
                    </div>
                    <button 
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-teal-600 hover:text-teal-500 text-sm sm:hidden transition-colors duration-200 delay-1700"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <button 
                    type="button"
                    onClick={handleForgotPassword}
                    className="hidden sm:block text-teal-600 hover:text-teal-500 text-sm sm:text-base transition-colors duration-200 delay-1700"
                  >
                    Forgot password?
                  </button>
                </div>
                
                {/* Login button */}
                <div className="transition-all duration-500 delay-1300">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-teal-600 hover:bg-teal-500 disabled:bg-teal-400 text-white font-medium py-3 rounded-md transition-all duration-300 flex items-center justify-center hover:shadow-lg hover:-translate-y-0.5 delay-1800"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white transition-all duration-300 delay-1900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Logging in...
                      </>
                    ) : (
                      'Log In'
                    )}
                  </button>
                </div>
              </form>
                
              {/* Divider */}
              <div className="relative flex items-center my-4 transition-all duration-500 delay-1400">
                <div className="flex-grow border-t border-gray-300 transition-all duration-500 delay-1500"></div>
                <span className="flex-shrink mx-4 text-gray-500 text-sm transition-all duration-500 delay-1600">or with</span>
                <div className="flex-grow border-t border-gray-300 transition-all duration-500 delay-1700"></div>
              </div>
              
              {/* Google login button */}
              <div className="transition-all duration-500 delay-1500">
                <button 
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full bg-teal-950 hover:bg-teal-900 disabled:bg-teal-800 text-teal-300 font-medium py-3 rounded-md transition-all duration-300 flex items-center justify-center gap-3 text-base hover:shadow-lg hover:-translate-y-0.5 delay-1900"
                >
                  <svg className="w-5 h-5 transition-all duration-300 delay-2000" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>
              </div>
              
              {/* Sign up link */}
              <div className="text-center mt-4 transition-all duration-500 delay-1600">
                <p className="text-gray-800 transition-all duration-500 delay-1700">
                  Don't have an account?{' '}
                  <Link to="/signup" className="text-teal-500 hover:text-teal-600 font-medium transition-colors duration-200 delay-1800">
                    Register here
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;