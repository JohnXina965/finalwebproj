import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../Firebase';
import { signOut } from 'firebase/auth';
import { auth } from '../Firebase';

function AdminNav() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/admin/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setShowDropdown(false);
    };

    if (showDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showDropdown]);

  const navItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/admin/subscriptions', label: 'Subscriptions', icon: '💳' },
    { path: '/admin/reviews', label: 'Reviews', icon: '⭐' },
    { path: '/admin/bookings', label: 'Bookings', icon: '📋' },
    { path: '/admin/users', label: 'Users', icon: '👥' },
    { path: '/admin/payouts', label: 'Payouts', icon: '💰' },
    { path: '/admin/settings', label: 'Settings', icon: '⚙️' },
    { path: '/admin/policy', label: 'Policy', icon: '📜' },
    { path: '/admin/reports', label: 'Reports', icon: '📊' },
    { path: '/admin/feedback', label: 'Feedback', icon: '💬' }
  ];

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full bg-gradient-to-b from-[#2E7D32] to-[#4CAF50] shadow-2xl z-50
        transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'w-64' : 'w-20'}
        ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-[#1B5E20]">
          {sidebarOpen && (
            <Link to="/admin/dashboard" className="flex items-center space-x-2">
              <span className="text-xl font-bold text-white tracking-tight">EcoExpress</span>
              <span className="text-xs text-[#C8E6C9] bg-[#1B5E20] px-2 py-1 rounded-full font-medium">Admin</span>
            </Link>
          )}
          {!sidebarOpen && (
            <Link to="/admin/dashboard" className="flex items-center justify-center w-full">
              <span className="text-xl font-bold text-white">E</span>
            </Link>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[#1B5E20] text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="space-y-1 px-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileSidebarOpen(false)}
                className={`
                  flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200
                  ${isActiveRoute(item.path)
                    ? 'bg-[#1B5E20] text-white shadow-lg'
                    : 'text-[#C8E6C9] hover:bg-[#1B5E20] hover:text-white'
                  }
                `}
              >
                <span className="text-xl flex-shrink-0">{item.icon}</span>
                {sidebarOpen && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </Link>
            ))}
          </div>
        </nav>

        {/* Sidebar Footer - User Profile */}
        <div className="border-t border-[#1B5E20] p-4">
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDropdown(!showDropdown);
              }}
              className={`
                w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-[#1B5E20] transition-colors
                ${sidebarOpen ? 'justify-start' : 'justify-center'}
              `}
            >
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-[#4CAF50] font-bold text-sm">
                  {currentUser?.email?.charAt(0).toUpperCase() || 'A'}
                </span>
              </div>
              {sidebarOpen && (
                <>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-white">
                      {currentUser?.email?.split('@')[0] || 'Admin'}
                    </p>
                    <p className="text-xs text-[#C8E6C9] truncate opacity-80">
                      {currentUser?.email || 'admin@ecoexpress.com'}
                    </p>
                  </div>
                  <svg
                    className={`w-4 h-4 text-white transition-transform flex-shrink-0 ${showDropdown ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </>
              )}
            </button>

            {showDropdown && sidebarOpen && (
              <div
                className="absolute bottom-full left-0 mb-2 w-full bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
                  Admin Account
                  <br />
                  <span className="font-medium text-gray-700">{currentUser?.email}</span>
                </div>
                <Link
                  to="/"
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    setShowDropdown(false);
                    setMobileSidebarOpen(false);
                  }}
                >
                  <span className="mr-2">👀</span>
                  View Site
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center w-full text-left px-4 py-2 text-sm text-[#4CAF50] hover:bg-[#C8E6C9] hover:bg-opacity-10 transition-colors"
                >
                  <span className="mr-2">🚪</span>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[#4CAF50] text-white rounded-lg shadow-lg hover:bg-[#2E7D32] transition-all duration-200"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </>
  );
}

export default AdminNav;

