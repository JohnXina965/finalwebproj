import { useState } from "react";
import { Link } from "react-router-dom";
import logo from './assets/logo.png';

function LoginSignupNav() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-white text-gray-800 shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo/Brand - Using Link for Home */}
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-teal-500 flex items-center justify-center overflow-hidden">
              <img 
                src={logo} 
                alt="Eco Express Logo" 
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-xl font-semibold text-gray-900">EcoExpress</span>
          </Link>

          {/* Right Section - Using Link for Auth Pages */}
          <div className="hidden md:flex items-center space-x-3">
            <Link 
              to="/login" 
              className="text-gray-600 hover:text-teal-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Log in
            </Link>
            <Link 
              to="/signup" 
              className="bg-teal-500 text-white hover:bg-teal-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              Sign up
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-600 hover:text-teal-600 hover:bg-gray-50 focus:outline-none transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu - Simplified */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100 bg-white">
            <div className="flex flex-col space-y-2">
              {/* Mobile Auth Buttons - Using Link */}
              <Link 
                to="/login" 
                className="w-full text-gray-600 hover:text-teal-600 px-4 py-3 rounded-lg text-base font-medium text-left transition-colors block"
                onClick={() => setIsMenuOpen(false)}
              >
                Log in
              </Link>
              <Link 
                to="/signup" 
                className="w-full bg-teal-500 text-white hover:bg-teal-600 px-4 py-3 rounded-lg text-base font-medium transition-colors block text-center"
                onClick={() => setIsMenuOpen(false)}
              >
                Sign up
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

export default LoginSignupNav;