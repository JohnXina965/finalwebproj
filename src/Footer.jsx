import { Link } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import logo from './assets/logo.png';

function Footer() {
  const { currentUser } = useAuth();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-teal-500 flex items-center justify-center overflow-hidden">
                <img src={logo} alt="EcoExpress Logo" className="w-full h-full object-cover" />
              </div>
              <span className="text-2xl font-bold text-white">EcoExpress</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Discover amazing places and unique experiences around the world. Connect with local hosts and create unforgettable memories.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-lg">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <Link 
                  to="/" 
                  className="text-gray-400 hover:text-teal-400 transition-colors text-sm"
                >
                  Browse Listings
                </Link>
              </li>
              <li>
                {currentUser ? (
                  <Link 
                    to="/host/onboarding" 
                    className="text-gray-400 hover:text-teal-400 transition-colors text-sm"
                  >
                    Become a Host
                  </Link>
                ) : (
                  <Link 
                    to="/login" 
                    className="text-gray-400 hover:text-teal-400 transition-colors text-sm"
                  >
                    Become a Host
                  </Link>
                )}
              </li>
              {currentUser && (
                <>
                  <li>
                    <Link 
                      to="/trips" 
                      className="text-gray-400 hover:text-teal-400 transition-colors text-sm"
                    >
                      My Trips
                    </Link>
                  </li>
                  <li>
                    <Link 
                      to="/wishlist" 
                      className="text-gray-400 hover:text-teal-400 transition-colors text-sm"
                    >
                      Favorites
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-lg">Support</h3>
            <ul className="space-y-3">
              <li>
                <Link 
                  to="/help" 
                  className="text-gray-400 hover:text-teal-400 transition-colors text-sm"
                >
                  Help Center
                </Link>
              </li>
              <li>
                <Link 
                  to="/safety" 
                  className="text-gray-400 hover:text-teal-400 transition-colors text-sm"
                >
                  Safety Guidelines
                </Link>
              </li>
              <li>
                <Link 
                  to="/contact" 
                  className="text-gray-400 hover:text-teal-400 transition-colors text-sm"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link 
                  to="/report" 
                  className="text-gray-400 hover:text-teal-400 transition-colors text-sm"
                >
                  Report Issue
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-lg">Legal</h3>
            <ul className="space-y-3">
              <li>
                <Link 
                  to="/privacy" 
                  className="text-gray-400 hover:text-teal-400 transition-colors text-sm"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link 
                  to="/terms" 
                  className="text-gray-400 hover:text-teal-400 transition-colors text-sm"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link 
                  to="/cookies" 
                  className="text-gray-400 hover:text-teal-400 transition-colors text-sm"
                >
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link 
                  to="/accessibility" 
                  className="text-gray-400 hover:text-teal-400 transition-colors text-sm"
                >
                  Accessibility
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-gray-400 text-sm">
              © {currentYear} EcoExpress. All rights reserved.
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">Language:</span>
              <select className="bg-gray-800 border border-gray-700 text-gray-300 text-sm px-3 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 hover:bg-gray-750 transition-colors">
                <option value="en-US">English (US)</option>
                <option value="en-PH">English (PH)</option>
                <option value="fil">Filipino</option>
                <option value="es">Español</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
