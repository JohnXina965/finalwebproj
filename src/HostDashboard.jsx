import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useHost } from './contexts/HostContext';

const HostDashboard = () => {
  const { currentUser } = useAuth();
  const { hostData } = useHost();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [stats, setStats] = useState({
    totalListings: 0,
    activeBookings: 0,
    unreadMessages: 0,
    totalEarnings: 0,
    pendingReviews: 0,
    occupancyRate: 0
  });
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Dashboard sections with cleaner icons
  const sections = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'listings', label: 'Listings', icon: '🏠' },
    { id: 'bookings', label: 'Bookings', icon: '📋' },
    { id: 'messages', label: 'Messages', icon: '💬' },
    { id: 'calendar', label: 'Calendar', icon: '📅' },
    { id: 'coupons', label: 'Coupons', icon: '🎫' },
    { id: 'promotions', label: 'Promotions', icon: '⭐' }
  ];

  // Mock data - replace with actual API calls
  useEffect(() => {
    const loadStats = async () => {
      setStats({
        totalListings: 3,
        activeBookings: 2,
        unreadMessages: 5,
        totalEarnings: 1250,
        pendingReviews: 3,
        occupancyRate: 65
      });
    };
    
    loadStats();
  }, []);

  const handleSectionChange = (sectionId) => {
    if (sectionId === activeSection) return;
    
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveSection(sectionId);
      setIsTransitioning(false);
    }, 300); // Match this with CSS transition duration
  };

  const renderSectionContent = () => {
    return (
      <div className={`transition-all duration-300 ease-in-out ${
        isTransitioning ? 'opacity-0 transform translate-y-4' : 'opacity-100 transform translate-y-0'
      }`}>
        {(() => {
          switch (activeSection) {
            case 'dashboard':
              return <DashboardOverview stats={stats} />;
            case 'listings':
              return <ListingsSection />;
            case 'bookings':
              return <BookingsSection />;
            case 'messages':
              return <MessagesSection />;
            case 'calendar':
              return <CalendarSection />;
            case 'coupons':
              return <CouponsSection />;
            case 'promotions':
              return <PromotionsSection />;
            default:
              return <DashboardOverview stats={stats} />;
          }
        })()}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Main Dashboard Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 transition-all duration-500 ease-out">
                Welcome back, {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Host'}!
              </h1>
              <p className="text-gray-600 mt-2 transition-all duration-500 ease-out delay-100">
                Manage your listings and grow your hosting business
              </p>
            </div>
            <div className="hidden md:flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200 transition-all duration-300 hover:shadow-md">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-700">Online</span>
            </div>
          </div>
        </div>

        {/* Dashboard Navigation - Modern Design */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 mb-8 backdrop-blur-sm transition-all duration-300 hover:shadow-md">
          <div className="flex overflow-x-auto scrollbar-hide p-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => handleSectionChange(section.id)}
                className={`flex items-center space-x-3 px-6 py-4 rounded-xl transition-all duration-300 ease-out whitespace-nowrap mx-1 ${
                  activeSection === section.id
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/25 transform scale-105'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:scale-102'
                }`}
              >
                <span className="text-lg transition-transform duration-300">{section.icon}</span>
                <span className="font-semibold">{section.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Stats Cards - Only show on Dashboard section with transition */}
        <div className={`transition-all duration-500 ease-in-out ${
          activeSection === 'dashboard' 
            ? 'opacity-100 max-h-[500px] overflow-visible mb-8' 
            : 'opacity-0 max-h-0 overflow-hidden mb-0'
        }`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard
              title="Total Listings"
              value={stats.totalListings}
              change="+2 this month"
              icon="🏠"
              color="blue"
              trend="up"
              delay={0}
            />
            <StatCard
              title="Active Bookings"
              value={stats.activeBookings}
              change="+1 today"
              icon="📋"
              color="green"
              trend="up"
              delay={100}
            />
            <StatCard
              title="Unread Messages"
              value={stats.unreadMessages}
              change="Waiting for reply"
              icon="💬"
              color="yellow"
              trend="neutral"
              delay={200}
            />
            <StatCard
              title="Total Earnings"
              value={`$${stats.totalEarnings.toLocaleString()}`}
              change="+$250 this week"
              icon="💰"
              color="purple"
              trend="up"
              delay={300}
            />
            <StatCard
              title="Pending Reviews"
              value={stats.pendingReviews}
              change="Need attention"
              icon="⭐"
              color="orange"
              trend="neutral"
              delay={400}
            />
            <StatCard
              title="Occupancy Rate"
              value={`${stats.occupancyRate}%`}
              change="+5% this month"
              icon="📈"
              color="teal"
              trend="up"
              delay={500}
            />
          </div>
        </div>

        {/* Section Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:shadow-lg">
          {renderSectionContent()}
        </div>
      </div>
    </div>
  );
};

// Enhanced Stat Card Component with staggered animation
const StatCard = ({ title, value, change, icon, color, trend, delay = 0 }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-cyan-500',
    green: 'from-emerald-500 to-green-500',
    yellow: 'from-amber-500 to-yellow-500',
    purple: 'from-purple-500 to-indigo-500',
    orange: 'from-orange-500 to-amber-500',
    teal: 'from-teal-500 to-emerald-500'
  };

  const trendIcons = {
    up: '↗️',
    down: '↘️',
    neutral: '→'
  };

  return (
    <div 
      className={`group bg-white rounded-2xl shadow-sm border border-gray-200/60 p-6 hover:shadow-lg hover:border-gray-300/60 transition-all duration-500 backdrop-blur-sm transform hover:scale-105`}
      style={{
        transitionDelay: `${delay}ms`,
        animationDelay: `${delay}ms`
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide transition-colors duration-300">
            {title}
          </p>
          <p className="text-3xl font-bold text-gray-900 mt-2 transition-colors duration-300">
            {value}
          </p>
          <div className="flex items-center space-x-1 mt-2">
            <span className={`text-sm font-medium transition-colors duration-300 ${
              trend === 'up' ? 'text-green-600' : 
              trend === 'down' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {trendIcons[trend]} {change}
            </span>
          </div>
        </div>
        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
          <span className="text-2xl text-white transition-transform duration-300">{icon}</span>
        </div>
      </div>
    </div>
  );
};

// Enhanced Dashboard Overview Section
const DashboardOverview = ({ stats }) => (
  <div className="p-8">
    <div className="flex items-center justify-between mb-8">
      <h2 className="text-2xl font-bold text-gray-900 transition-all duration-500">Business Overview</h2>
      <div className="flex items-center space-x-2 text-sm text-gray-500 transition-all duration-500 delay-100">
        <span>Today's Schedule</span>
      </div>
    </div>
    
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Quick Actions - Enhanced */}
      <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border border-gray-200/60 transition-all duration-500 hover:shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center transition-all duration-300">
          <span className="w-2 h-2 bg-teal-500 rounded-full mr-3 animate-pulse"></span>
          Quick Actions
        </h3>
        <div className="space-y-4">
          <button className="flex items-center justify-between w-full p-4 bg-white rounded-xl border border-gray-200/60 hover:border-teal-300 hover:shadow-md transition-all duration-300 group transform hover:scale-102">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-all duration-300 group-hover:scale-110">
                <span className="text-xl transition-transform duration-300">📅</span>
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900 transition-colors duration-300">Update Calendar</p>
                <p className="text-sm text-gray-500 transition-colors duration-300">Manage availability</p>
              </div>
            </div>
            <span className="text-gray-400 group-hover:text-teal-600 transition-all duration-300 transform group-hover:translate-x-1">→</span>
          </button>
          
          <button className="flex items-center justify-between w-full p-4 bg-white rounded-xl border border-gray-200/60 hover:border-teal-300 hover:shadow-md transition-all duration-300 group transform hover:scale-102">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center group-hover:bg-green-100 transition-all duration-300 group-hover:scale-110">
                <span className="text-xl transition-transform duration-300">💰</span>
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900 transition-colors duration-300">View Earnings</p>
                <p className="text-sm text-gray-500 transition-colors duration-300">Check revenue</p>
              </div>
            </div>
            <span className="text-gray-400 group-hover:text-teal-600 transition-all duration-300 transform group-hover:translate-x-1">→</span>
          </button>
        </div>
      </div>

      {/* Today's Schedule - New Section */}
      <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border border-gray-200/60 transition-all duration-500 hover:shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center transition-all duration-300">
          <span className="w-2 h-2 bg-purple-500 rounded-full mr-3 animate-pulse"></span>
          Today's Schedule
        </h3>
        
        <div className="space-y-6">
          {[
            { title: 'Active Bookings', status: 'This month', color: 'green', text: '2 ongoing bookings', delay: 0 },
            { title: 'Upcoming Bookings', status: '+12%', color: 'blue', text: '5 bookings next week', delay: 100 },
            { title: 'Current Guests', status: 'Average Rating', color: 'amber', text: 'No reviews yet', delay: 200 }
          ].map((item, index) => (
            <div 
              key={item.title}
              className="transition-all duration-500 transform hover:scale-102"
              style={{ transitionDelay: `${item.delay}ms` }}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900 transition-colors duration-300">{item.title}</h4>
                <span className={`text-sm ${
                  item.title === 'Upcoming Bookings' 
                    ? 'text-green-600 bg-green-50' 
                    : 'text-gray-500 bg-gray-100'
                } px-2 py-1 rounded-full transition-all duration-300`}>
                  {item.status}
                </span>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200/60 transition-all duration-300 hover:border-gray-300/80 hover:shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 bg-${item.color}-400 rounded-full transition-all duration-300 ${
                    item.title === 'Active Bookings' ? 'animate-pulse' : ''
                  }`}></div>
                  <p className="text-sm text-gray-600 transition-colors duration-300">{item.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Enhanced Listings Section with transitions
const ListingsSection = () => (
  <div className="p-8">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 transition-all duration-500">Your Listings</h2>
        <p className="text-gray-600 mt-2 transition-all duration-500 delay-100">Manage and create new property listings</p>
      </div>
      <Link
        to="/host/onboarding"
        className="px-8 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl hover:shadow-lg hover:shadow-teal-500/25 transition-all duration-500 font-semibold flex items-center space-x-2 transform hover:scale-105"
      >
        <span className="transition-transform duration-300">+</span>
        <span>Create New Listing</span>
      </Link>
    </div>
    
    <div className="text-center py-16 transition-all duration-500">
      <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mx-auto mb-6 transition-all duration-500 hover:scale-110">
        <span className="text-4xl transition-transform duration-500">🏠</span>
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-3 transition-all duration-500 delay-100">No listings yet</h3>
      <p className="text-gray-600 max-w-md mx-auto transition-all duration-500 delay-200">
        Create your first listing to start hosting guests and earning money
      </p>
    </div>
  </div>
);

// Enhanced Other Sections with transitions
const createSection = (title, description, icon, bgGradient) => (
  <div className="p-8">
    <h2 className="text-2xl font-bold text-gray-900 mb-2 transition-all duration-500">{title}</h2>
    <p className="text-gray-600 mb-8 transition-all duration-500 delay-100">{description}</p>
    <div className="text-center py-16 transition-all duration-500">
      <div className={`w-24 h-24 ${bgGradient} rounded-3xl flex items-center justify-center mx-auto mb-6 transition-all duration-500 hover:scale-110`}>
        <span className="text-4xl transition-transform duration-500">{icon}</span>
      </div>
      <p className="text-gray-600 transition-all duration-500 delay-200">{description}</p>
    </div>
  </div>
);

const BookingsSection = () => createSection(
  'Bookings Management',
  'Manage your current and upcoming bookings',
  '📋',
  'bg-gradient-to-br from-blue-50 to-blue-100'
);

const MessagesSection = () => createSection(
  'Guest Messages',
  'Communicate with your guests',
  '💬',
  'bg-gradient-to-br from-green-50 to-green-100'
);

const CalendarSection = () => createSection(
  'Availability Calendar',
  'Manage your property availability',
  '📅',
  'bg-gradient-to-br from-orange-50 to-orange-100'
);

const CouponsSection = () => createSection(
  'Coupon Management',
  'Create and manage discount coupons',
  '🎫',
  'bg-gradient-to-br from-purple-50 to-purple-100'
);

const PromotionsSection = () => createSection(
  'Promotions & Marketing',
  'Boost your listings with promotions',
  '⭐',
  'bg-gradient-to-br from-yellow-50 to-yellow-100'
);

export default HostDashboard;