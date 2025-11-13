import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../Firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { getServiceFeePercentage, updateServiceFeePercentage } from '../services/ServiceFeeService';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

// Icon components
const HostIcon = () => (
  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-3-3h-4a3 3 0 00-3 3v2zM14 10h5a2 2 0 012 2v1M14 10V8a2 2 0 00-2-2H9a2 2 0 00-2 2v2m5 0v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m5 0H9" />
  </svg>
);

const RevenueIcon = () => (
  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const BookingIcon = () => (
  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const ListingIcon = () => (
  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

function AdminDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalHosts: 0,
    totalIncome: 0,
    totalBookings: 0,
    activeListings: 0
  });
  const [topRatedHosts, setTopRatedHosts] = useState([]);
  const [needsImprovementHosts, setNeedsImprovementHosts] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [monthlyIncome, setMonthlyIncome] = useState([]);
  const [planDistribution, setPlanDistribution] = useState({});
  const [bookingStatusDistribution, setBookingStatusDistribution] = useState({});
  const [revenueBreakdown, setRevenueBreakdown] = useState({ serviceFees: 0, subscriptions: 0 });
  const [revenueTrends, setRevenueTrends] = useState([]);
  const [serviceFeePercentage, setServiceFeePercentage] = useState(10);
  const [isUpdatingFee, setIsUpdatingFee] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      navigate('/admin/login');
      return;
    }

    checkAdminAccess();
    loadDashboardData();
    loadServiceFee();
  }, [currentUser, navigate]);

  const loadServiceFee = async () => {
    try {
      const fee = await getServiceFeePercentage();
      setServiceFeePercentage(fee * 100); // Convert to percentage
    } catch (error) {
      console.error('Error loading service fee:', error);
    }
  };

  const handleUpdateServiceFee = async (newPercentage) => {
    if (newPercentage < 0 || newPercentage > 100) {
      toast.error('Service fee must be between 0% and 100%');
      return;
    }

    setIsUpdatingFee(true);
    try {
      await updateServiceFeePercentage(newPercentage / 100); // Convert to decimal
      setServiceFeePercentage(newPercentage);
      toast.success(`Service fee updated to ${newPercentage}%`);
    } catch (error) {
      console.error('Error updating service fee:', error);
      toast.error('Failed to update service fee');
    } finally {
      setIsUpdatingFee(false);
    }
  };

  const checkAdminAccess = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (!userDoc.exists()) {
        console.error('User document does not exist');
        navigate('/admin/login');
        return;
      }
      
      const userData = userDoc.data();
      const isAdmin = userData.role === 'admin' || userData.isAdmin === true;
      
      console.log('AdminDashboard - Admin check:', { 
        uid: currentUser.uid, 
        role: userData.role, 
        isAdmin: userData.isAdmin,
        isAdminResult: isAdmin 
      });
      
      if (!isAdmin) {
        console.warn('User is not an admin, redirecting to login');
        navigate('/admin/login');
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/admin/login');
    }
  };

  const getPlanPrice = (plan) => {
    if (typeof plan === 'string') {
      const prices = {
        'basic': 9.99,
        'professional': 19.99,
        'enterprise': 49.99
      };
      return prices[plan.toLowerCase()] || 0;
    }
    return plan.price || 0;
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Get total hosts
      const hostsQuery = query(collection(db, 'users'), where('role', '==', 'host'));
      const hostsSnapshot = await getDocs(hostsQuery);
      const hostsData = hostsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get total listings
      const listingsSnapshot = await getDocs(collection(db, 'listings'));
      const activeListings = listingsSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.status === 'published' || data.status === 'active';
      });

      // Get total bookings
      const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
      
      // Calculate ADMIN REVENUE (service fees from bookings + subscription payments)
      let totalIncome = 0;
      const transactions = [];
      
      // 1. Calculate service fees from bookings (uses configured percentage)
      const { calculateServiceFee } = require('../services/ServiceFeeService');
      bookingsSnapshot.forEach(doc => {
        const booking = doc.data();
        const bookingTotal = booking.totalAmount || booking.totalPrice || 0;
        // Use stored serviceFee if available, otherwise calculate using current percentage
        const serviceFee = booking.serviceFee || calculateServiceFee(bookingTotal);
        
        // Only count service fees as admin revenue (not the full booking amount)
        totalIncome += serviceFee;
        
        transactions.push({
          id: doc.id,
          ...booking,
          createdAt: booking.createdAt?.toDate ? booking.createdAt.toDate() : 
                     (booking.createdAt?.seconds ? new Date(booking.createdAt.seconds * 1000) : new Date()),
          adminRevenue: serviceFee // Track admin's cut
        });
      });
      
      // 2. Add host subscription payments to admin revenue
      hostsData.forEach(host => {
        const subscriptionPlan = host.subscriptionPlan;
        const subscriptionStatus = host.subscriptionStatus || 'pending';
        const paymentVerified = host.paymentVerified || false;
        
        // Only count active, verified subscriptions
        if (subscriptionPlan && subscriptionStatus === 'active' && paymentVerified) {
          const planPrice = getPlanPrice(subscriptionPlan);
          totalIncome += planPrice;
          
          // Add subscription as transaction
          const createdAt = host.subscriptionCreatedAt?.toDate ? 
            host.subscriptionCreatedAt.toDate() : 
            (host.createdAt?.toDate ? host.createdAt.toDate() : new Date());
          
          transactions.push({
            id: `subscription-${host.id}`,
            type: 'subscription',
            customerName: host.displayName || host.name || host.email?.split('@')[0] || 'Unknown Host',
            customerEmail: host.email || '',
            subscriptionPlan: subscriptionPlan.name || subscriptionPlan.id || 'Unknown',
            totalPrice: planPrice,
            totalAmount: planPrice,
            adminRevenue: planPrice,
            status: 'completed',
            paymentStatus: 'paid',
            createdAt: createdAt
          });
        }
      });

      // Sort transactions by date (most recent first) and get last 6
      transactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      const last6Transactions = transactions.slice(0, 6);

      // Calculate host ratings from reviews
      const reviewsSnapshot = await getDocs(collection(db, 'reviews'));
      const reviewsData = reviewsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calculate average rating per host
      const hostRatings = {};
      hostsData.forEach(host => {
        const hostListings = listingsSnapshot.docs
          .filter(doc => doc.data().hostId === host.id)
          .map(doc => doc.id);
        
        const hostReviews = reviewsData.filter(review => 
          hostListings.includes(review.listingId)
        );

        if (hostReviews.length > 0) {
          const avgRating = hostReviews.reduce((sum, review) => {
            return sum + (review.rating || review.ratings?.overall || 0);
          }, 0) / hostReviews.length;
          
          hostRatings[host.id] = {
            rating: avgRating,
            reviewCount: hostReviews.length,
            hostName: host.displayName || host.name || host.email?.split('@')[0] || 'Unknown',
            hostEmail: host.email || '',
            hostData: host
          };
        } else {
          hostRatings[host.id] = {
            rating: 0,
            reviewCount: 0,
            hostName: host.displayName || host.name || host.email?.split('@')[0] || 'Unknown',
            hostEmail: host.email || '',
            hostData: host
          };
        }
      });

      // Separate hosts by rating
      const topRated = [];
      const needsImprovement = [];

      Object.values(hostRatings).forEach(hostRating => {
        if (hostRating.rating >= 4.0 && hostRating.reviewCount > 0) {
          topRated.push(hostRating);
        } else if (hostRating.rating < 4.0 && hostRating.reviewCount > 0) {
          needsImprovement.push(hostRating);
        } else if (hostRating.reviewCount === 0) {
          // Hosts with no reviews go to needs improvement
          needsImprovement.push(hostRating);
        }
      });

      // Sort by rating
      topRated.sort((a, b) => b.rating - a.rating);
      needsImprovement.sort((a, b) => a.rating - b.rating);

      // Calculate monthly income (last 6 months) - Only ADMIN REVENUE
      const monthlyData = {};
      transactions.forEach(transaction => {
        const monthKey = transaction.createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = 0;
        }
        // Use adminRevenue if available (service fees), otherwise use full amount for subscriptions
        const amount = transaction.adminRevenue || transaction.totalPrice || transaction.totalAmount || 0;
        monthlyData[monthKey] += amount;
      });

      const monthlyIncomeArray = Object.entries(monthlyData)
        .map(([month, income]) => ({ month, income }))
        .sort((a, b) => new Date(a.month) - new Date(b.month))
        .slice(-6);

      // Calculate plan distribution (subscription types)
      const planData = {};
      hostsData.forEach(host => {
        const plan = host.subscriptionPlan || 'Free';
        const planName = typeof plan === 'object' ? (plan.name || plan.id || 'Free') : plan;
        planData[planName] = (planData[planName] || 0) + 1;
      });

      // Calculate booking status distribution
      const bookingStatusData = {};
      let totalServiceFees = 0;
      let totalSubscriptions = 0;
      
      bookingsSnapshot.forEach(doc => {
        const booking = doc.data();
        const status = booking.status || 'pending';
        bookingStatusData[status] = (bookingStatusData[status] || 0) + 1;
        
        // Track service fees
        const serviceFee = booking.serviceFee || calculateServiceFee(booking.totalAmount || booking.totalPrice || 0);
        totalServiceFees += serviceFee;
      });
      
      // Track subscriptions
      hostsData.forEach(host => {
        if (host.subscriptionPlan && host.subscriptionStatus === 'active' && host.paymentVerified) {
          totalSubscriptions += getPlanPrice(host.subscriptionPlan);
        }
      });

      // Calculate revenue trends (daily for last 30 days)
      const today = new Date();
      const revenueTrendsData = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        let dailyRevenue = 0;
        transactions.forEach(transaction => {
          const transactionDate = transaction.createdAt;
          if (transactionDate.toDateString() === date.toDateString()) {
            dailyRevenue += transaction.adminRevenue || transaction.totalPrice || transaction.totalAmount || 0;
          }
        });
        
        revenueTrendsData.push({ date: dateKey, revenue: dailyRevenue });
      }

      setStats({
        totalHosts: hostsSnapshot.size,
        totalIncome: totalIncome,
        totalBookings: bookingsSnapshot.size,
        activeListings: activeListings.length
      });

      setTopRatedHosts(topRated);
      setNeedsImprovementHosts(needsImprovement);
      setRecentTransactions(last6Transactions);
      setMonthlyIncome(monthlyIncomeArray);
      setPlanDistribution(planData);
      setBookingStatusDistribution(bookingStatusData);
      setRevenueBreakdown({ serviceFees: totalServiceFees, subscriptions: totalSubscriptions });
      setRevenueTrends(revenueTrendsData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4CAF50] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Calculate percentage change (mock data for now)
  const calculatePercentageChange = (current, previous = 0) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous * 100).toFixed(0);
  };

  const statCards = [
    {
      title: 'Total Hosts',
      value: stats.totalHosts,
      change: `+${calculatePercentageChange(stats.totalHosts, stats.totalHosts)}% from last month`,
      changeColor: 'text-gray-600',
      icon: HostIcon,
      bgColor: 'bg-blue-600',
      borderColor: 'border-blue-600'
    },
    {
      title: 'Total Revenue',
      value: `₱${stats.totalIncome.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: `+${calculatePercentageChange(stats.totalIncome, stats.totalIncome * 0.3)}% from last month`,
      changeColor: 'text-green-600',
      subtitle: 'Service fees + Subscriptions',
      icon: RevenueIcon,
      bgColor: 'bg-[#4CAF50]',
      borderColor: 'border-[#4CAF50]'
    },
    {
      title: 'Total Bookings',
      value: stats.totalBookings,
      change: `+${calculatePercentageChange(stats.totalBookings, stats.totalBookings * 0.98)}% from last month`,
      changeColor: 'text-[#66BB6A]',
      icon: BookingIcon,
      bgColor: 'bg-[#66BB6A]',
      borderColor: 'border-[#66BB6A]'
    },
    {
      title: 'Active Listings',
      value: stats.activeListings,
      change: `+${calculatePercentageChange(stats.activeListings, stats.activeListings)}% from last month`,
      changeColor: 'text-gray-600',
      icon: ListingIcon,
      bgColor: 'bg-purple-600',
      borderColor: 'border-purple-600'
    }
  ];

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      'completed': 'bg-green-100 text-green-800',
      'confirmed': 'bg-blue-100 text-blue-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return statusColors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content Area - Adjusted for Sidebar */}
      <div className="lg:ml-64 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Premium Design */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-600 from-teal-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent mb-1">Admin Dashboard</h1>
          <p className="text-gray-600 text-gray-900/80">Welcome to your management portal</p>
        </motion.div>

        {/* KPI Cards with Glassmorphism */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -4, scale: 1.02 }}
              className="bg-white rounded-2xl shadow-lg border border-white/20 border-gray-200 p-6 hover:shadow-2xl transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                  <stat.icon />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 text-gray-900/70 mb-1">{stat.title}</h3>
              <p className="text-2xl font-bold text-gray-900 text-gray-900 mb-1">{stat.value}</p>
              {stat.subtitle && (
                <p className="text-xs text-gray-500 text-gray-900/60 mb-1">{stat.subtitle}</p>
              )}
              <p className={`text-xs ${stat.changeColor} text-gray-900/80`}>{stat.change}</p>
              <div className={`mt-3 h-1 ${stat.bgColor} rounded-full`}></div>
            </motion.div>
          ))}
        </div>

        {/* Service Fee Management with Glassmorphism */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-white rounded-2xl shadow-lg border border-white/20 border-gray-200 p-6 mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 text-gray-900">Service Fee Management</h3>
              <p className="text-sm text-gray-600 text-gray-900/70">Configure the service fee percentage charged on bookings</p>
            </div>
            <div className="w-12 h-12 bg-[#C8E6C9] rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-[#4CAF50]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-6">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Service Fee: <span className="text-[#4CAF50] font-bold">{serviceFeePercentage}%</span>
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="0.5"
                  value={serviceFeePercentage}
                  onChange={(e) => setServiceFeePercentage(parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
                  style={{
                    background: `linear-gradient(to right, #4CAF50 0%, #4CAF50 ${(serviceFeePercentage / 30) * 100}%, #e5e7eb ${(serviceFeePercentage / 30) * 100}%, #e5e7eb 100%)`
                  }}
                />
                <input
                  type="number"
                  min="0"
                  max="30"
                  step="0.5"
                  value={serviceFeePercentage}
                  onChange={(e) => setServiceFeePercentage(parseFloat(e.target.value) || 0)}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-center font-semibold focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent"
                />
                <span className="text-gray-600 font-medium">%</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Service fee is calculated as {serviceFeePercentage}% of each booking total
              </p>
            </div>
            <button
              onClick={() => handleUpdateServiceFee(serviceFeePercentage)}
              disabled={isUpdatingFee}
              className="px-6 py-3 bg-[#4CAF50] text-white rounded-lg font-semibold hover:bg-[#2E7D32] transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdatingFee ? 'Updating...' : 'Update Fee'}
            </button>
          </div>
        </motion.div>

        {/* Charts Row with Glassmorphism */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue Trends Line Chart */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="bg-white rounded-2xl shadow-lg border border-white/20 border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 text-gray-900">Revenue Trends (Last 30 Days)</h3>
              <svg className="w-5 h-5 text-[#658C58]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="h-64 relative">
              {revenueTrends.length > 0 ? (
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="revenueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#4CAF50" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#4CAF50" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {(() => {
                    const maxRevenue = Math.max(...revenueTrends.map(r => r.revenue), 1);
                    const points = revenueTrends.map((item, index) => {
                      const x = (index / (revenueTrends.length - 1)) * 100;
                      const y = 100 - (item.revenue / maxRevenue) * 80;
                      return `${x},${y}`;
                    }).join(' ');
                    
                    const areaPath = `M 0,100 L ${points} L 100,100 Z`;
                    const linePath = `M ${points}`;
                    
                    return (
                      <>
                        <path d={areaPath} fill="url(#revenueGradient)" />
                        <path 
                          d={linePath} 
                          fill="none" 
                          stroke="#4CAF50" 
                          strokeWidth="0.5" 
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {revenueTrends.map((item, index) => {
                          const x = (index / (revenueTrends.length - 1)) * 100;
                          const y = 100 - (item.revenue / maxRevenue) * 80;
                          return (
                            <circle 
                              key={index}
                              cx={x} 
                              cy={y} 
                              r="1" 
                              fill="#4CAF50"
                              className="hover:r-2 transition-all"
                            />
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <p>No revenue data available</p>
                </div>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
              <span>{revenueTrends[0]?.date || ''}</span>
              <span>{revenueTrends[revenueTrends.length - 1]?.date || ''}</span>
            </div>
          </motion.div>

          {/* Revenue Breakdown */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="bg-white rounded-2xl shadow-lg border border-white/20 border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 text-gray-900">Revenue Breakdown</h3>
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Service Fees</span>
                  <span className="text-sm font-bold text-[#4CAF50] dark:text-green-400">
                    ₱{revenueBreakdown.serviceFees.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div 
                    className="bg-[#4CAF50] h-3 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${revenueBreakdown.serviceFees + revenueBreakdown.subscriptions > 0 
                        ? (revenueBreakdown.serviceFees / (revenueBreakdown.serviceFees + revenueBreakdown.subscriptions)) * 100 
                        : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Subscriptions</span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    ₱{revenueBreakdown.subscriptions.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div 
                    className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${revenueBreakdown.serviceFees + revenueBreakdown.subscriptions > 0 
                        ? (revenueBreakdown.subscriptions / (revenueBreakdown.serviceFees + revenueBreakdown.subscriptions)) * 100 
                        : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Additional Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Monthly Income Overview */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="bg-white rounded-2xl shadow-lg border border-white/20 border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 text-gray-900">Monthly Income Overview</h3>
              <svg className="w-5 h-5 text-[#4CAF50]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 bg-gradient-to-r from-[#4CAF50] to-[#2E7D32] rounded-full"></div>
              <span className="text-sm text-gray-600">Admin Revenue (₱)</span>
            </div>
            <div className="h-64 flex items-end justify-between gap-2">
              {monthlyIncome.length > 0 ? (
                monthlyIncome.map((item, index) => {
                  const maxIncome = Math.max(...monthlyIncome.map(m => m.income), 1);
                  const height = (item.income / maxIncome) * 100;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center group relative">
                      <div className="w-full bg-gray-100 rounded-t-lg relative" style={{ height: '200px' }}>
                        <div 
                          className="w-full bg-gradient-to-t from-[#4CAF50] to-[#2E7D32] rounded-t-lg absolute bottom-0 transition-all duration-500 hover:from-[#2E7D32] hover:to-[#1B5E20] group-hover:shadow-lg"
                          style={{ height: `${height}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500 mt-2 font-medium">{item.month}</span>
                      <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                        ₱{item.income.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="w-full h-64 flex items-center justify-center text-gray-400">
                  <p>No income data available</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Booking Status Distribution */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="bg-white rounded-2xl shadow-lg border border-white/20 border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 text-gray-900">Booking Status Distribution</h3>
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="space-y-4">
              {Object.keys(bookingStatusDistribution).length > 0 ? (
                Object.entries(bookingStatusDistribution).map(([status, count], index) => {
                  const total = Object.values(bookingStatusDistribution).reduce((a, b) => a + b, 0);
                  const percentage = (count / total) * 100;
                  const colors = {
                    'pending': 'bg-yellow-500',
                    'confirmed': 'bg-blue-500',
                    'completed': 'bg-green-500',
                    'cancelled': 'bg-red-500'
                  };
                  const statusColors = colors[status.toLowerCase()] || 'bg-gray-500';
                  
                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{status}</span>
                        <span className="text-sm font-bold text-gray-900 text-gray-900">{count} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div 
                          className={`${statusColors} h-3 rounded-full transition-all duration-500 shadow-sm`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p>No booking data available</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Plan Distribution - Full Width */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Plan Distribution</h3>
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div className="h-64 flex items-center justify-center">
              {Object.keys(planDistribution).length > 0 ? (
                <div className="relative w-48 h-48">
                  <svg className="w-48 h-48 transform -rotate-90">
                    {(() => {
                      const total = Object.values(planDistribution).reduce((a, b) => a + b, 0);
                      let currentAngle = 0;
                      const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
                      return Object.entries(planDistribution).map(([plan, count], index) => {
                        const percentage = (count / total) * 100;
                        const angle = (percentage / 100) * 360;
                        const startAngle = currentAngle;
                        currentAngle += angle;
                        const largeArcFlag = angle > 180 ? 1 : 0;
                        const x1 = 96 + 96 * Math.cos((startAngle * Math.PI) / 180);
                        const y1 = 96 + 96 * Math.sin((startAngle * Math.PI) / 180);
                        const x2 = 96 + 96 * Math.cos((currentAngle * Math.PI) / 180);
                        const y2 = 96 + 96 * Math.sin((currentAngle * Math.PI) / 180);
                        return (
                          <path
                            key={plan}
                            d={`M 96 96 L ${x1} ${y1} A 96 96 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                            fill={colors[index % colors.length]}
                            className="transition-all duration-500"
                          />
                        );
                      });
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{stats.totalHosts}</p>
                      <p className="text-sm text-gray-600">Total Hosts</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-gray-400">
                  <p>No plan data available</p>
                </div>
              )}
            </div>
            <div className="mt-4 space-y-2">
              {Object.entries(planDistribution).map(([plan, count], index) => {
                const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-purple-500'];
                return (
                  <div key={plan} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`}></div>
                      <span className="text-gray-700">{plan}</span>
                    </div>
                    <span className="text-gray-900 font-semibold">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

        {/* Host Performance Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Rated Hosts */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="bg-white rounded-2xl shadow-lg border border-white/20 border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 text-gray-900 mb-2">Top Rated Hosts (4.0+)</h3>
            <p className="text-sm text-gray-600 text-gray-900/70 mb-4">Hosts with excellent performance</p>
            <div className="space-y-3">
              {topRatedHosts.length > 0 ? (
                topRatedHosts.map((host, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50/50 dark:bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-500/20 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 dark:text-blue-400 font-semibold">
                          {host.hostName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-gray-900">{host.hostName}</p>
                        <p className="text-sm text-gray-600 text-gray-900/60">{host.hostEmail}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 text-gray-900">{host.rating.toFixed(1)}</p>
                      <p className="text-xs text-gray-600 text-gray-900/60">{host.reviewCount} reviews</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400 text-gray-900/40">
                  <p>No hosts found in this category.</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Needs Improvement */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.75 }}
            className="bg-white rounded-2xl shadow-lg border border-white/20 border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 text-gray-900 mb-2">Needs Improvement (3.9 and below)</h3>
            <p className="text-sm text-gray-600 text-gray-900/70 mb-4">Hosts that may need support</p>
            <div className="space-y-3">
              {needsImprovementHosts.length > 0 ? (
                needsImprovementHosts.map((host, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50/50 dark:bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#C8E6C9] dark:bg-emerald-500/20 bg-opacity-50 rounded-full flex items-center justify-center shadow-sm">
                        <span className="text-[#4CAF50] dark:text-emerald-400 font-semibold">
                          {host.hostName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-gray-900">{host.hostName}</p>
                        <p className="text-sm text-gray-600 text-gray-900/60">{host.hostEmail}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 text-gray-900">
                        {host.rating > 0 ? host.rating.toFixed(1) : 'N/A'}
                      </p>
                      <p className="text-xs text-gray-600 text-gray-900/60">{host.reviewCount} reviews</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400 text-gray-900/40">
                  <p>No hosts found in this category.</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Recent Transactions */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="bg-white rounded-2xl shadow-lg border border-white/20 border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 text-gray-900 mb-2">Recent Transactions</h3>
          <p className="text-sm text-gray-600 text-gray-900/70 mb-4">Last 6 transactions</p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 text-gray-900/80">Customer</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 text-gray-900/80">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 text-gray-900/80">Plan</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 text-gray-900/80">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 text-gray-900/80">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 text-gray-900/80">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.length > 0 ? (
                  recentTransactions.map((transaction, index) => (
                    <tr key={index} className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50/50 dark:hover:bg-white/5">
                      <td className="py-3 px-4 text-sm text-gray-900 text-gray-900">
                        {transaction.guestName || transaction.customerName || 'Guest'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 text-gray-900/70">
                        {transaction.guestEmail || transaction.customerEmail || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 text-gray-900/70">
                        {transaction.subscriptionPlan || transaction.plan || 'Standard'}
                      </td>
                      <td className="py-3 px-4 text-sm font-semibold text-gray-900">
                        ₱{(transaction.adminRevenue || transaction.totalPrice || transaction.totalAmount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(transaction.status || transaction.paymentStatus)}`}>
                          {transaction.status || transaction.paymentStatus || 'Pending'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {formatDate(transaction.createdAt)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-gray-400">
                      No transactions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
