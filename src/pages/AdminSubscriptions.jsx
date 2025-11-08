import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../Firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';

function AdminSubscriptions() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalTransactions: 0,
    completedPayments: 0,
    pendingFailed: 0
  });
  const [subscriptions, setSubscriptions] = useState([]);
  const [filteredSubscriptions, setFilteredSubscriptions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    if (!currentUser) {
      navigate('/admin/login');
      return;
    }

    checkAdminAccess();
    loadSubscriptionData();
  }, [currentUser, navigate]);

  useEffect(() => {
    filterAndSortSubscriptions();
  }, [searchQuery, sortBy, sortOrder, subscriptions]);

  const checkAdminAccess = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (!userDoc.exists() || userDoc.data().role !== 'admin') {
        navigate('/admin/login');
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/admin/login');
    }
  };

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);

      // Get all hosts with subscriptions
      const hostsQuery = query(collection(db, 'users'), where('role', '==', 'host'));
      const hostsSnapshot = await getDocs(hostsQuery);
      
      const subscriptionsData = [];
      let totalRevenue = 0;
      let completedPayments = 0;
      let pendingFailed = 0;

      hostsSnapshot.forEach(doc => {
        const hostData = doc.data();
        const subscriptionPlan = hostData.subscriptionPlan;
        const subscriptionStatus = hostData.subscriptionStatus || 'pending';
        const paypalSubscriptionId = hostData.paypalSubscriptionId;
        const paymentVerified = hostData.paymentVerified || false;

        // Only include hosts with subscription plans
        if (subscriptionPlan) {
          const planPrice = getPlanPrice(subscriptionPlan);
          const isCompleted = subscriptionStatus === 'active' && paymentVerified;
          const isPendingFailed = subscriptionStatus === 'pending' || subscriptionStatus === 'failed' || !paymentVerified;

          if (isCompleted) {
            totalRevenue += planPrice;
            completedPayments++;
          } else if (isPendingFailed) {
            pendingFailed++;
          }

          // Get subscription dates
          const createdAt = hostData.subscriptionCreatedAt?.toDate ? 
            hostData.subscriptionCreatedAt.toDate() : 
            (hostData.createdAt?.toDate ? hostData.createdAt.toDate() : new Date());
          
          // Calculate expiry date (30 days from creation for monthly plans)
          const expiryDate = new Date(createdAt);
          expiryDate.setMonth(expiryDate.getMonth() + 1);

          subscriptionsData.push({
            id: doc.id,
            name: hostData.displayName || hostData.name || hostData.email?.split('@')[0] || 'Unknown Host',
            email: hostData.email || '',
            plan: subscriptionPlan.name || subscriptionPlan.id || 'Unknown',
            planId: subscriptionPlan.id || 'basic',
            amount: planPrice,
            method: paypalSubscriptionId ? 'PayPal' : 'N/A',
            status: subscriptionStatus === 'active' && paymentVerified ? 'completed' : 
                   subscriptionStatus === 'failed' ? 'failed' : 'pending',
            date: createdAt,
            expiryDate: expiryDate,
            paypalSubscriptionId: paypalSubscriptionId || null,
            paymentVerified: paymentVerified
          });
        }
      });

      // Also get booking payments (service fees from bookings)
      const { calculateServiceFee } = require('../services/ServiceFeeService');
      const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
      bookingsSnapshot.forEach(doc => {
        const booking = doc.data();
        // Use stored serviceFee if available, otherwise calculate using current percentage
        const serviceFee = booking.serviceFee || calculateServiceFee(booking.totalAmount || 0);
        const paymentStatus = booking.paymentStatus || booking.status || 'pending';
        
        if (serviceFee > 0) {
          totalRevenue += serviceFee;
          
          if (paymentStatus === 'paid' || paymentStatus === 'completed') {
            completedPayments++;
          } else {
            pendingFailed++;
          }

          const createdAt = booking.createdAt?.toDate ? 
            booking.createdAt.toDate() : 
            (booking.createdAt?.seconds ? new Date(booking.createdAt.seconds * 1000) : new Date());

          subscriptionsData.push({
            id: `booking-${doc.id}`,
            name: booking.guestName || 'Guest',
            email: booking.guestEmail || '',
            plan: 'Booking Service Fee',
            planId: 'service-fee',
            amount: serviceFee,
            method: booking.paymentMethod === 'paypal' ? 'PayPal' : 
                   booking.paymentMethod === 'wallet' ? 'Wallet' : 'N/A',
            status: paymentStatus === 'paid' || paymentStatus === 'completed' ? 'completed' : 
                   paymentStatus === 'failed' ? 'failed' : 'pending',
            date: createdAt,
            expiryDate: null,
            paypalSubscriptionId: null,
            paymentVerified: paymentStatus === 'paid' || paymentStatus === 'completed',
            isBookingFee: true
          });
        }
      });

      // Sort by date (most recent first)
      subscriptionsData.sort((a, b) => b.date.getTime() - a.date.getTime());

      setStats({
        totalRevenue: totalRevenue,
        totalTransactions: subscriptionsData.length,
        completedPayments: completedPayments,
        pendingFailed: pendingFailed
      });

      setSubscriptions(subscriptionsData);
      setFilteredSubscriptions(subscriptionsData);
    } catch (error) {
      console.error('Error loading subscription data:', error);
    } finally {
      setLoading(false);
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

  const filterAndSortSubscriptions = () => {
    let filtered = [...subscriptions];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(sub => 
        sub.name.toLowerCase().includes(query) ||
        sub.email.toLowerCase().includes(query) ||
        sub.plan.toLowerCase().includes(query) ||
        sub.status.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'email':
          aValue = a.email.toLowerCase();
          bValue = b.email.toLowerCase();
          break;
        case 'plan':
          aValue = a.plan.toLowerCase();
          bValue = b.plan.toLowerCase();
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'status':
          aValue = a.status.toLowerCase();
          bValue = b.status.toLowerCase();
          break;
        case 'date':
          aValue = a.date.getTime();
          bValue = b.date.getTime();
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

    setFilteredSubscriptions(filtered);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleExportPDF = () => {
    // TODO: Implement PDF export functionality
    alert('PDF export functionality will be implemented soon');
  };

  const handleManageSubscriptions = () => {
    // TODO: Navigate to subscription management page or open modal
    alert('Subscription management feature coming soon');
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'completed': { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
      'active': { bg: 'bg-green-100', text: 'text-green-800', label: 'Active' },
      'pending': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      'failed': { bg: 'bg-red-100', text: 'text-red-800', label: 'Failed' },
      'cancelled': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Cancelled' }
    };
    
    const config = statusConfig[status?.toLowerCase()] || statusConfig.pending;
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getSortIcon = (field) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading subscriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="lg:ml-64 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Subscription & Payment Management
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mb-6 flex gap-4">
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Export PDF Report
          </button>
          <button
            onClick={handleManageSubscriptions}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Manage Subscriptions
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Total Revenue</h3>
            <p className="text-3xl font-bold text-green-600">
              ₱{stats.totalRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Total Transactions</h3>
            <p className="text-3xl font-bold text-blue-600">{stats.totalTransactions}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Completed Payments</h3>
            <p className="text-3xl font-bold text-green-600">{stats.completedPayments}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Pending / Failed</h3>
            <p className="text-3xl font-bold text-red-600">{stats.pendingFailed}</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by name, email, plan, or status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-1 hover:text-gray-900"
                    >
                      Name {getSortIcon('name')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('email')}
                      className="flex items-center gap-1 hover:text-gray-900"
                    >
                      Email {getSortIcon('email')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('plan')}
                      className="flex items-center gap-1 hover:text-gray-900"
                    >
                      Plan {getSortIcon('plan')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('amount')}
                      className="flex items-center gap-1 hover:text-gray-900"
                    >
                      Amount {getSortIcon('amount')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('status')}
                      className="flex items-center gap-1 hover:text-gray-900"
                    >
                      Status {getSortIcon('status')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('date')}
                      className="flex items-center gap-1 hover:text-gray-900"
                    >
                      Date {getSortIcon('date')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Expiry
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSubscriptions.length > 0 ? (
                  filteredSubscriptions.map((subscription, index) => (
                    <tr key={subscription.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {subscription.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {subscription.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {subscription.plan}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        ₱{subscription.amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {subscription.method}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(subscription.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(subscription.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {subscription.expiryDate ? formatDate(subscription.expiryDate) : 'N/A'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="px-6 py-8 text-center text-gray-400">
                      {searchQuery ? 'No subscriptions found matching your search.' : 'No subscriptions found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

export default AdminSubscriptions;

