import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
// import { useHost } from './contexts/HostContext';

const HostNav = () => {
  const { currentUser, signOut } = useAuth();
//   const { hostData } = useHost();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo and Main Links */}
          <div className="flex items-center space-x-8">
            {/* Logo */}
            <Link to="/host/dashboard" className="flex items-center">
              <span className="text-xl font-bold text-teal-600">EcoExpress</span>
              <span className="ml-2 text-sm text-gray-500 bg-teal-100 px-2 py-1 rounded-full">Host</span>
            </Link>
           
          </div>

          {/* Right side - User Menu and Actions */}
          <div className="flex items-center space-x-4">
            {/* Create New Listing Button */}
            {/* <Link
              to="/host/onboarding"
              className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors flex items-center space-x-2"
            >
              <span>+</span>
              <span>Create Listing</span>
            </Link> */}

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                  <span className="text-teal-600 font-medium text-sm">
                    {currentUser?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <span className="hidden md:block text-sm text-gray-700 font-medium">
                  {currentUser?.email?.split('@')[0] || 'User'}
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
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <Link
                    to="/host/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setShowDropdown(false)}
                  >
                    👤 My Profile
                  </Link>
                  
                  <Link
                    to="/host/settings"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setShowDropdown(false)}
                  >
                    ⚙️ Settings
                  </Link>
                  
                  <div className="border-t border-gray-100 my-1"></div>
                  
                  <Link
                    to="/"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setShowDropdown(false)}
                  >
                    👀 Switch to Guest
                  </Link>
                  
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      handleSignOut();
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                  >
                    🚪 Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-gray-200 py-2">
          <div className="flex space-x-4 overflow-x-auto">
            <Link
              to="/host/dashboard"
              className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                isActiveRoute('/host/dashboard') 
                  ? 'text-teal-600 bg-teal-50' 
                  : 'text-gray-600 hover:text-teal-600'
              }`}
            >
              🏠 Dashboard
            </Link>
            <Link
              to="/host/listings"
              className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                isActiveRoute('/host/listings') 
                  ? 'text-teal-600 bg-teal-50' 
                  : 'text-gray-600 hover:text-teal-600'
              }`}
            >
              📋 Listings
            </Link>
            <Link
              to="/host/calendar"
              className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                isActiveRoute('/host/calendar') 
                  ? 'text-teal-600 bg-teal-50' 
                  : 'text-gray-600 hover:text-teal-600'
              }`}
            >
              📅 Calendar
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default HostNav;