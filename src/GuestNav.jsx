import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { useWallet } from "./contexts/WalletContext";
import { db } from "./Firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import logo from './assets/logo.png';
import { useNavigate } from "react-router-dom";
import WalletModal from "./components/WalletModal";

function GuestNav() {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [hasHostActivity, setHasHostActivity] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const { currentUser, logout } = useAuth();
  const { balance } = useWallet();

  const navLinks = [
    { name: "Homes", path: "/guest/homes" },
    { name: "Experiences", path: "/guest/experiences" },
    { name: "Services", path: "/guest/services" },
  ];

  // Check if user has host activity (drafts or listings) - optimized with caching
  useEffect(() => {
    if (!currentUser) {
      setHasHostActivity(false);
      return;
    }

    // Use a single query with Promise.all for parallel execution
    const checkHostActivity = async () => {
      try {
        // Execute both queries in parallel for faster results
        const [listingsSnapshot, draftsSnapshot] = await Promise.all([
          getDocs(query(collection(db, 'listings'), where('hostId', '==', currentUser.uid))),
          getDocs(query(collection(db, 'drafts'), where('hostId', '==', currentUser.uid)))
        ]);

        // If user has any listings or drafts, they have host activity
        setHasHostActivity(!listingsSnapshot.empty || !draftsSnapshot.empty);
      } catch (error) {
        console.error('Error checking host activity:', error);
        setHasHostActivity(false);
      }
    };

    // Set a timeout to prevent UI blocking - show button immediately, update if needed
    const timeoutId = setTimeout(checkHostActivity, 100);
    return () => clearTimeout(timeoutId);
  }, [currentUser]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.user-menu-trigger')) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setIsUserMenuOpen(false);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Still navigate to login on error
      navigate('/login');
    }
  };

  // Get user's first name from displayName or email
  const getUserFirstName = () => {
    if (!currentUser) return '';
    
    if (currentUser.displayName) {
      return currentUser.displayName.split(' ')[0];
    }
    
    return currentUser.email.split('@')[0];
  };

  return (
    <>
    <nav className="bg-white text-gray-800 shadow-sm border-b border-gray-100 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo/Brand */}
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-teal-500 flex items-center justify-center overflow-hidden">
              <img src={logo} alt="Eco Express Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-xl font-semibold text-gray-900 tracking-tight">EcoExpress</span>
          </Link>

          {/* Center Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-gray-600 hover:text-teal-600 hover:bg-gray-50"
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Right Section - Guest Navigation */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Become a Host / Switch to Hosting Button */}
            <Link 
              to={hasHostActivity ? "/host/dashboard" : "/host/onboarding"} 
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors text-gray-600 hover:text-teal-600 hover:bg-gray-50"
            >
              {hasHostActivity ? "Switch to Hosting" : "Become a Host"}
            </Link>

            {/* User Menu Dropdown */}
            <div className="relative user-menu-trigger">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {/* User Avatar */}
                <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  {currentUser.photoURL ? (
                    <img src={currentUser.photoURL} alt="Profile" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    getUserFirstName().charAt(0).toUpperCase()
                  )}
                </div>
                
                {/* Hamburger icon */}
                <svg className={`w-4 h-4 text-gray-500 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                  {/* User Info Section */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {currentUser.photoURL ? (
                          <img src={currentUser.photoURL} alt="Profile" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          getUserFirstName().charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{getUserFirstName()}</p>
                        <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* My Wallet */}
                  <button
                    onClick={() => {
                      setShowWalletModal(true);
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 bg-[#C8E6C9] bg-opacity-30 border-b border-gray-100 hover:bg-[#C8E6C9] hover:bg-opacity-40 transition-all duration-200 text-left"
                  >
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">💳</span>
                      <div>
                        <p className="text-xs text-gray-500">My Wallet</p>
                        <p className="text-sm font-semibold text-[#4CAF50]">
                          ₱{balance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                    <span className="text-[#4CAF50]">→</span>
                  </button>

                  {/* Clickable Menu Items */}
                  <div className="py-1">
                    <Link to="/profile" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => setIsUserMenuOpen(false)}>
                      <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Profile
                    </Link>

                    <Link to="/trips" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => setIsUserMenuOpen(false)}>
                      <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Trips
                    </Link>

                    <Link to="/wishlist" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => setIsUserMenuOpen(false)}>
                      <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      Favorites
                    </Link>

                    <Link to="/messages" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => setIsUserMenuOpen(false)}>
                      <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      Messages
                    </Link>

                    <Link to="/reviews" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => setIsUserMenuOpen(false)}>
                      <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      Reviews
                    </Link>

                    <Link to="/settings" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => setIsUserMenuOpen(false)}>
                      <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </Link>

                    <button onClick={handleLogout} className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-50 transition-colors">
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden p-2 rounded-lg text-gray-600 hover:text-teal-600 hover:bg-gray-50 focus:outline-none transition-colors" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100 bg-white">
            <div className="flex flex-col space-y-1">
              {navLinks.map((link) => (
                <Link key={link.name} to={link.path} className="px-4 py-3 rounded-lg text-base font-medium transition-colors text-gray-600 hover:text-teal-600 hover:bg-gray-50" onClick={() => setIsMenuOpen(false)}>
                  {link.name}
                </Link>
              ))}
              
              <div className="pt-4 border-t border-gray-100 space-y-2">
                {/* My Wallet - Mobile */}
                <button
                  onClick={() => {
                    setShowWalletModal(true);
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-gray-600 hover:text-teal-600 px-4 py-3 rounded-lg text-base font-medium text-left transition-colors block"
                >
                  💳 My Wallet: ₱{balance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </button>
                
                <Link 
                  to={hasHostActivity ? "/host/dashboard" : "/host/onboarding"} 
                  className="w-full text-gray-600 hover:text-teal-600 px-4 py-3 rounded-lg text-base font-medium text-left transition-colors block" 
                  onClick={() => setIsMenuOpen(false)}
                >
                  {hasHostActivity ? "Switch to Hosting" : "Become a Host"}
                </Link>
                <Link to="/profile" className="w-full text-gray-600 hover:text-teal-600 px-4 py-3 rounded-lg text-base font-medium text-left transition-colors block" onClick={() => setIsMenuOpen(false)}>
                  Profile
                </Link>
                <Link to="/trips" className="w-full text-gray-600 hover:text-teal-600 px-4 py-3 rounded-lg text-base font-medium text-left transition-colors block" onClick={() => setIsMenuOpen(false)}>
                  Trips
                </Link>
                <Link to="/wishlist" className="w-full text-gray-600 hover:text-teal-600 px-4 py-3 rounded-lg text-base font-medium text-left transition-colors block" onClick={() => setIsMenuOpen(false)}>
                  Favorites
                </Link>
                <Link to="/messages" className="w-full text-gray-600 hover:text-teal-600 px-4 py-3 rounded-lg text-base font-medium text-left transition-colors block" onClick={() => setIsMenuOpen(false)}>
                  Messages
                </Link>
                <Link to="/reviews" className="w-full text-gray-600 hover:text-teal-600 px-4 py-3 rounded-lg text-base font-medium text-left transition-colors block" onClick={() => setIsMenuOpen(false)}>
                  Reviews
                </Link>
                <Link to="/settings" className="w-full text-gray-600 hover:text-teal-600 px-4 py-3 rounded-lg text-base font-medium text-left transition-colors block" onClick={() => setIsMenuOpen(false)}>
                  Settings
                </Link>
                <button onClick={handleLogout} className="w-full text-red-600 hover:bg-gray-50 px-4 py-3 rounded-lg text-base font-medium text-left transition-colors">
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>

    {/* Wallet Modal */}
    <WalletModal 
      isOpen={showWalletModal} 
      onClose={() => setShowWalletModal(false)}
      userType="guest"
    />
    </>
  );
}

export default GuestNav;