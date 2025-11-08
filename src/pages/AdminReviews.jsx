import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../Firebase';
import { collection, getDocs, query, where, doc, getDoc, updateDoc } from 'firebase/firestore';

function AdminReviews() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hosts, setHosts] = useState([]);
  const [filteredHosts, setFilteredHosts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('default');

  useEffect(() => {
    if (!currentUser) {
      navigate('/admin/login');
      return;
    }

    checkAdminAccess();
    loadHostReviews();
  }, [currentUser, navigate]);

  useEffect(() => {
    filterAndSortHosts();
  }, [searchQuery, sortBy, hosts]);

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

  const loadHostReviews = async () => {
    try {
      setLoading(true);

      // Get all hosts
      const hostsQuery = query(collection(db, 'users'), where('role', '==', 'host'));
      const hostsSnapshot = await getDocs(hostsQuery);
      
      // Get all listings
      const listingsSnapshot = await getDocs(collection(db, 'listings'));
      const listingsData = listingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get all reviews
      const reviewsSnapshot = await getDocs(collection(db, 'reviews'));
      const reviewsData = reviewsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Process hosts with their listings and ratings
      const hostsData = [];
      
      hostsSnapshot.forEach(hostDoc => {
        const hostData = hostDoc.data();
        const hostId = hostDoc.id;

        // Get host's listings
        const hostListings = listingsData.filter(listing => listing.hostId === hostId);
        const activeListings = hostListings.filter(listing => 
          listing.status === 'published' || listing.status === 'active'
        );

        // Get reviews for host's listings
        const listingIds = hostListings.map(l => l.id);
        const hostReviews = reviewsData.filter(review => 
          listingIds.includes(review.listingId)
        );

        // Calculate average rating
        let avgRating = 0;
        if (hostReviews.length > 0) {
          const totalRating = hostReviews.reduce((sum, review) => {
            const rating = review.rating || review.ratings?.overall || 0;
            return sum + rating;
          }, 0);
          avgRating = totalRating / hostReviews.length;
        }

        // Determine status
        let status = 'good';
        let statusLabel = 'Good';
        if (activeListings.length === 0 && avgRating === 0) {
          status = 'critical';
          statusLabel = 'Critical';
        } else if (avgRating < 4.0 && avgRating > 0) {
          status = 'needsAttention';
          statusLabel = 'Needs Attention';
        } else if (avgRating === 0 && activeListings.length > 0) {
          status = 'needsAttention';
          statusLabel = 'Needs Attention';
        }

        hostsData.push({
          id: hostId,
          name: hostData.displayName || hostData.name || hostData.email?.split('@')[0] || 'Unknown Host',
          email: hostData.email || '',
          phone: hostData.phone || hostData.phoneNumber || '',
          profilePhoto: hostData.photoURL || hostData.profilePhoto || null,
          listingsCount: activeListings.length,
          avgRating: avgRating,
          reviewCount: hostReviews.length,
          status: status,
          statusLabel: statusLabel,
          hostData: hostData
        });
      });

      setHosts(hostsData);
      setFilteredHosts(hostsData);
    } catch (error) {
      console.error('Error loading host reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortHosts = () => {
    let filtered = [...hosts];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(host => 
        host.name.toLowerCase().includes(query) ||
        host.email.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    switch (sortBy) {
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'rating':
        filtered.sort((a, b) => b.avgRating - a.avgRating);
        break;
      case 'listings':
        filtered.sort((a, b) => b.listingsCount - a.listingsCount);
        break;
      case 'status':
        filtered.sort((a, b) => {
          const statusOrder = { 'critical': 0, 'needsAttention': 1, 'good': 2 };
          return statusOrder[a.status] - statusOrder[b.status];
        });
        break;
      default:
        // Default: Critical first, then Needs Attention, then Good
        filtered.sort((a, b) => {
          const statusOrder = { 'critical': 0, 'needsAttention': 1, 'good': 2 };
          if (statusOrder[a.status] !== statusOrder[b.status]) {
            return statusOrder[a.status] - statusOrder[b.status];
          }
          return b.avgRating - a.avgRating;
        });
    }

    setFilteredHosts(filtered);
  };

  const handleWarn = async (hostId) => {
    if (window.confirm('Are you sure you want to send a warning to this host?')) {
      try {
        // TODO: Implement warning system (could add a warning field to user document)
        const hostRef = doc(db, 'users', hostId);
        await updateDoc(hostRef, {
          lastWarning: new Date(),
          warningCount: (hosts.find(h => h.id === hostId)?.hostData?.warningCount || 0) + 1
        });
        alert('Warning sent successfully');
        loadHostReviews(); // Reload data
      } catch (error) {
        console.error('Error sending warning:', error);
        alert('Failed to send warning. Please try again.');
      }
    }
  };

  const handleTerminate = async (hostId) => {
    if (window.confirm('⚠️ WARNING: This will terminate the host account. Are you absolutely sure?')) {
      const confirmTerminate = window.confirm('This action cannot be undone. Type "TERMINATE" to confirm.');
      if (confirmTerminate) {
        try {
          // TODO: Implement account termination (could disable account or mark as terminated)
          const hostRef = doc(db, 'users', hostId);
          await updateDoc(hostRef, {
            status: 'terminated',
            terminatedAt: new Date(),
            terminatedBy: currentUser.uid
          });
          alert('Host account terminated successfully');
          loadHostReviews(); // Reload data
        } catch (error) {
          console.error('Error terminating host:', error);
          alert('Failed to terminate host. Please try again.');
        }
      }
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'critical': { bg: 'bg-red-100', text: 'text-red-800', label: 'Critical' },
      'needsAttention': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Needs Attention' },
      'good': { bg: 'bg-green-100', text: 'text-green-800', label: 'Good' }
    };
    
    const config = statusConfig[status] || statusConfig.good;
    return (
      <span className={`px-3 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getActionButton = (host) => {
    if (host.status === 'critical') {
      return (
        <button
          onClick={() => handleTerminate(host.id)}
          className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-full flex items-center gap-1.5 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Terminate
        </button>
      );
    } else if (host.status === 'needsAttention') {
      return (
        <button
          onClick={() => handleWarn(host.id)}
          className="px-4 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-gray-900 text-xs font-medium rounded-full flex items-center gap-1.5 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Warn
        </button>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading host reviews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="lg:ml-64 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Host Review Management</h1>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search host by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 appearance-none cursor-pointer pr-8"
            >
              <option value="default">Sort by Default</option>
              <option value="name">Sort by Name</option>
              <option value="rating">Sort by Rating</option>
              <option value="listings">Sort by Listings</option>
              <option value="status">Sort by Status</option>
            </select>
          </div>
        </div>

        {/* Host Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Host
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Listings
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Avg Rating
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredHosts.length > 0 ? (
                  filteredHosts.map((host) => (
                    <tr key={host.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 h-10 w-10">
                            {host.profilePhoto ? (
                              <img
                                src={host.profilePhoto}
                                alt={host.name}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <span className="text-gray-600 font-medium text-sm">
                                  {host.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{host.name}</div>
                            {host.phone && (
                              <div className="text-xs text-gray-500">{host.phone}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {host.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {host.listingsCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <svg className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                          </svg>
                          <span className="text-sm font-medium text-gray-900">
                            {host.avgRating.toFixed(1)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(host.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getActionButton(host)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                      {searchQuery ? 'No hosts found matching your search.' : 'No hosts found.'}
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

export default AdminReviews;

