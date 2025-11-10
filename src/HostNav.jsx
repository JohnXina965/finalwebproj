import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useWallet } from './contexts/WalletContext';
import { motion, AnimatePresence } from 'framer-motion';
import WalletModal from './components/WalletModal';
import logo from './assets/logo.png';

const HostNav = () => {
  const { currentUser, signOut } = useAuth();
  const { balance } = useWallet();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Track scroll for navbar background effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    if (signingOut) return;
    
    setSigningOut(true);
    try {
      console.log('🚪 Attempting to sign out...');
      
      if (typeof signOut !== 'function') {
        throw new Error('signOut function is not available');
      }
      
      await signOut();
      console.log('✅ Signed out successfully');
      setShowDropdown(false);
      
    } catch (error) {
      console.error('❌ Sign out failed:', error);
      alert(`Sign out failed: ${error.message}`);
      window.history.replaceState(null, '', '/login');
      window.location.replace('/login');
    } finally {
      setSigningOut(false);
    }
  };

  // Get user's first name from displayName or email
  const getUserFirstName = () => {
    if (!currentUser) return 'U';
    
    if (currentUser.displayName) {
      return currentUser.displayName.split(' ')[0];
    }
    
    return currentUser.email?.split('@')[0] || 'User';
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-[9999] transition-all duration-300 ${
          isScrolled 
            ? 'bg-white shadow-md border-b border-gray-200' 
            : 'bg-white'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left side - Logo */}
            <div className="flex items-center space-x-4">
              <Link 
                to="/host/dashboard" 
                className="flex items-center space-x-3"
                onClick={() => setShowDropdown(false)}
              >
                <div className="w-10 h-10 rounded-lg bg-teal-500 flex items-center justify-center overflow-hidden">
                  <img 
                    src={logo} 
                    alt="Eco Express Logo" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xl font-bold text-gray-800">
                    EcoExpress
                  </span>
                  <span className="text-xs font-semibold text-white bg-teal-500 px-2 py-1 rounded-full">
                    Host
                  </span>
                </div>
              </Link>
            </div>

            {/* Right side - User Menu and Actions */}
            <div className="flex items-center space-x-4">
              {/* User Profile Dropdown */}
              <div className="relative user-menu-trigger">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDropdown(!showDropdown);
                  }}
                  disabled={signingOut}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-9 h-9 bg-teal-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                    {currentUser?.photoURL ? (
                      <img 
                        src={currentUser.photoURL} 
                        alt="Profile" 
                        className="w-full h-full rounded-full object-cover" 
                      />
                    ) : (
                      getUserFirstName().charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="hidden md:block text-sm text-gray-700 font-medium">
                    {getUserFirstName()}
                  </span>
                  <svg
                    className={`w-4 h-4 text-gray-500 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {showDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-3 w-72 bg-white rounded-lg border border-gray-200 shadow-xl py-2 z-[10000] overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* User Info Section */}
                      <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                            {currentUser?.photoURL ? (
                              <img 
                                src={currentUser.photoURL} 
                                alt="Profile" 
                                className="w-full h-full rounded-full object-cover" 
                              />
                            ) : (
                              getUserFirstName().charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{getUserFirstName()}</p>
                            <p className="text-xs text-gray-500 truncate">{currentUser?.email}</p>
                          </div>
                        </div>
                      </div>

                      {/* Wallet */}
                      <button
                        onClick={() => {
                          setShowWalletModal(true);
                          setShowDropdown(false);
                        }}
                        className="w-full flex items-center justify-between px-5 py-4 bg-teal-50 border-b border-gray-200 hover:bg-teal-100 transition-colors text-left"
                      >
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">💳</span>
                          <div>
                            <p className="text-xs text-gray-500">My Wallet</p>
                            <p className="text-sm font-semibold text-teal-600">
                              ₱{balance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                        <span className="text-teal-600 text-xl">→</span>
                      </button>

                      {/* Menu Items */}
                      <div className="py-2">
                        {[
                          { name: 'My Profile', path: '/host/profile', icon: '👤' },
                          { name: 'Settings', path: '/host/settings', icon: '⚙️' },
                        ].map((item) => (
                          <Link
                            key={item.name}
                            to={item.path}
                            onClick={() => setShowDropdown(false)}
                            className="flex items-center px-5 py-3 text-sm text-gray-700 hover:text-teal-600 hover:bg-gray-50 transition-colors"
                          >
                            <span className="text-lg mr-3">{item.icon}</span>
                            {item.name}
                          </Link>
                        ))}

                        <div className="border-t border-gray-200 my-2" />

                        <Link
                          to="/"
                          onClick={() => setShowDropdown(false)}
                          className="flex items-center px-5 py-3 text-sm text-gray-700 hover:text-teal-600 hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-lg mr-3">👀</span>
                          Switch to Guest
                        </Link>

                        <button
                          onClick={handleSignOut}
                          disabled={signingOut}
                          className={`flex items-center w-full px-5 py-3 text-sm transition-colors mt-2 border-t border-gray-200 ${
                            signingOut 
                              ? 'text-gray-400 cursor-not-allowed' 
                              : 'text-red-600 hover:text-red-700 hover:bg-red-50'
                          }`}
                        >
                          <span className="text-lg mr-3">{signingOut ? '⏳' : '🚪'}</span>
                          {signingOut ? 'Signing Out...' : 'Sign Out'}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Wallet Modal */}
      <WalletModal 
        isOpen={showWalletModal} 
        onClose={() => setShowWalletModal(false)}
        userType="host"
      />
    </>
  );
};

export default HostNav;
