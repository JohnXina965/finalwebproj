import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useWallet } from './contexts/WalletContext';
import WalletModal from './components/WalletModal';

const HostNav = () => {
  const { currentUser, signOut } = useAuth();
  const { balance } = useWallet();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);

  const handleSignOut = async () => {
    if (signingOut) return; // Prevent multiple clicks
    
    setSigningOut(true);
    try {
      console.log('🚪 Attempting to sign out...');
      
      // Check if signOut function exists
      if (typeof signOut !== 'function') {
        throw new Error('signOut function is not available');
      }
      
      await signOut();
      console.log('✅ Signed out successfully');
      
      // Close dropdown
      setShowDropdown(false);
      
      // Navigate to login page
      navigate('/login');
      
    } catch (error) {
      console.error('❌ Sign out failed:', error);
      
      // Show user-friendly error message
      alert(`Sign out failed: ${error.message}`);
      
      // Still navigate to login even if signOut fails
      navigate('/login');
    } finally {
      setSigningOut(false);
    }
  };

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      setShowDropdown(false);
    };

    if (showDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showDropdown]);

  return (
    <>
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left side - Logo and Main Links */}
            <div className="flex items-center space-x-8">
              {/* Logo */}
              <Link 
                to="/host/dashboard" 
                className="flex items-center"
                onClick={() => setShowDropdown(false)}
              >
                <span className="text-xl font-bold text-[#4CAF50] tracking-tight">EcoExpress</span>
                <span className="ml-2 text-sm text-[#4CAF50] bg-[#C8E6C9] bg-opacity-40 px-2 py-1 rounded-full font-medium">Host</span>
              </Link>
            </div>

            {/* Right side - User Menu and Actions */}
            <div className="flex items-center space-x-4">
              {/* User Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDropdown(!showDropdown);
                  }}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
                  disabled={signingOut}
                >
                  <div className="w-8 h-8 bg-[#C8E6C9] bg-opacity-40 rounded-full flex items-center justify-center shadow-sm">
                    <span className="text-[#4CAF50] font-medium text-sm">
                      {currentUser?.email?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <span className="hidden md:block text-sm text-gray-700 font-medium">
                    {currentUser?.email?.split('@')[0] || 'User'}
                  </span>
                  <svg 
                    className={`w-4 h-4 text-gray-500 transition-transform ${showDropdown ? 'rotate-180' : ''} ${signingOut ? 'opacity-50' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {showDropdown && (
                  <div 
                    className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
                      Signed in as<br />
                      <span className="font-medium text-gray-700">{currentUser?.email}</span>
                    </div>

                    {/* Wallet */}
                    <button
                      onClick={() => {
                        setShowWalletModal(true);
                        setShowDropdown(false);
                      }}
                      className="w-full flex items-center justify-between px-4 py-3 bg-[#C8E6C9] bg-opacity-30 hover:bg-[#C8E6C9] hover:bg-opacity-40 transition-all duration-200 border-b border-gray-100 text-left"
                    >
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">💳</span>
                        <div>
                          <p className="text-xs text-gray-500">Wallet</p>
                          <p className="text-sm font-semibold text-[#4CAF50]">
                            ₱{balance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                      <span className="text-[#4CAF50]">→</span>
                    </button>
                    
                    <Link
                      to="/host/profile"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => setShowDropdown(false)}
                    >
                      <span className="mr-2">👤</span>
                      My Profile
                    </Link>
                    
                    <Link
                      to="/host/settings"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => setShowDropdown(false)}
                    >
                      <span className="mr-2">⚙️</span>
                      Settings
                    </Link>
                    
                    <div className="border-t border-gray-100 my-1"></div>
                    
                    <Link
                      to="/"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => setShowDropdown(false)}
                    >
                      <span className="mr-2">👀</span>
                      Switch to Guest
                    </Link>
                    
                    <button
                      onClick={handleSignOut}
                      disabled={signingOut}
                      className={`flex items-center w-full text-left px-4 py-2 text-sm transition-colors ${
                        signingOut 
                          ? 'text-gray-400 cursor-not-allowed' 
                          : 'text-red-600 hover:bg-red-50'
                      }`}
                    >
                      <span className="mr-2">{signingOut ? '⏳' : '🚪'}</span>
                      {signingOut ? 'Signing Out...' : 'Sign Out'}
                    </button>
                  </div>
                )}
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