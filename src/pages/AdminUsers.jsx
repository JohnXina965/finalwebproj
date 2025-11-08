import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../Firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';

function AdminUsers() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [filterRole, setFilterRole] = useState('all'); // 'all', 'host', 'guest'

  useEffect(() => {
    if (!currentUser) {
      navigate('/admin/login');
      return;
    }

    checkAdminAccess();
    loadUsers();
  }, [currentUser, navigate]);

  useEffect(() => {
    filterUsers();
  }, [filterRole, users]);

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

  const loadUsers = async () => {
    try {
      setLoading(true);

      // Get all users (excluding admin)
      const usersSnapshot = await getDocs(collection(db, 'users'));
      
      // Get all listings
      const listingsSnapshot = await getDocs(collection(db, 'listings'));
      const listingsData = listingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get all bookings
      const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
      const bookingsData = bookingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get all wallets
      const walletsSnapshot = await getDocs(collection(db, 'wallets'));

      // Process users
      const usersData = [];

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;

        // Skip admin users
        if (userData.role === 'admin') continue;

        // Determine roles
        const roles = [];
        if (userData.role === 'guest' || !userData.role) {
          roles.push('guest');
        }
        if (userData.role === 'host') {
          roles.push('host');
        }
        // Check if user has listings (they're a host)
        const hasListings = listingsData.some(listing => listing.hostId === userId);
        if (hasListings && !roles.includes('host')) {
          roles.push('host');
        }
        // If no role specified but has listings, they're a host
        if (roles.length === 0 && hasListings) {
          roles.push('host');
        }
        // Default to guest if no role
        if (roles.length === 0) {
          roles.push('guest');
        }

        // Count listings (as host)
        const listingsCount = listingsData.filter(listing => listing.hostId === userId).length;

        // Count bookings (as guest)
        const bookingsCount = bookingsData.filter(booking => booking.guestId === userId).length;

        // Get wallet balance
        const walletDoc = walletsSnapshot.docs.find(doc => doc.id === userId);
        const walletBalance = walletDoc?.data()?.balance || 0;

        // Get subscription plan
        const subscriptionPlan = userData.subscriptionPlan;
        let planName = 'None';
        if (subscriptionPlan) {
          if (typeof subscriptionPlan === 'string') {
            // Map plan IDs to names
            const planMap = {
              'basic': 'Basic',
              'professional': 'Professional',
              'enterprise': 'Enterprise',
              'starter': 'Starter',
              'elite': 'Elite'
            };
            planName = planMap[subscriptionPlan.toLowerCase()] || subscriptionPlan;
          } else if (subscriptionPlan.name) {
            planName = subscriptionPlan.name;
          } else if (subscriptionPlan.id) {
            const planMap = {
              'basic': 'Basic',
              'professional': 'Professional',
              'enterprise': 'Enterprise',
              'starter': 'Starter',
              'elite': 'Elite'
            };
            planName = planMap[subscriptionPlan.id.toLowerCase()] || subscriptionPlan.id;
          }
        }

        usersData.push({
          id: userId,
          name: userData.displayName || userData.name || userData.email?.split('@')[0] || 'Unknown User',
          email: userData.email || '',
          roles: roles,
          listingsCount: listingsCount,
          bookingsCount: bookingsCount,
          walletBalance: walletBalance,
          plan: planName,
          createdAt: userData.createdAt?.toDate ? 
            userData.createdAt.toDate() : 
            (userData.createdAt?.seconds ? new Date(userData.createdAt.seconds * 1000) : new Date())
        });
      }

      // Sort by creation date (oldest first, or by name)
      usersData.sort((a, b) => a.name.localeCompare(b.name));

      setUsers(usersData);
      setFilteredUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    if (filterRole === 'all') {
      setFilteredUsers(users);
    } else {
      setFilteredUsers(users.filter(user => user.roles.includes(filterRole)));
    }
  };

  const handleExportPDF = () => {
    // TODO: Implement PDF export functionality
    alert('PDF export functionality will be implemented soon');
  };

  const formatRoles = (roles) => {
    return roles.join(', ');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="lg:ml-64 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        </div>

        {/* Filter Buttons and Export */}
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setFilterRole('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterRole === 'all'
                  ? 'bg-orange-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterRole('host')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterRole === 'host'
                  ? 'bg-orange-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Host
            </button>
            <button
              onClick={() => setFilterRole('guest')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterRole === 'guest'
                  ? 'bg-orange-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Guest
            </button>
          </div>
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 bg-blue-800 hover:bg-blue-900 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Export PDF Report
          </button>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    NAME
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    EMAIL
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    ROLE(S)
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    LISTINGS
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    BOOKINGS
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    WALLET
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    PLAN
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user, index) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {user.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatRoles(user.roles)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.listingsCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.bookingsCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ₱{user.walletBalance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {user.plan}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center text-gray-400">
                      {filterRole === 'all' ? 'No users found.' : `No ${filterRole}s found.`}
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

export default AdminUsers;

