import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { 
  collection, 
  query, 
  getDocs, 
  updateDoc, 
  doc, 
  getDoc,
  serverTimestamp,
  orderBy 
} from 'firebase/firestore';
import { db } from '../Firebase';

function AdminFeedback() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState([]);
  const [filteredFeedback, setFilteredFeedback] = useState([]);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [adminResponse, setAdminResponse] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    urgency: 'all',
    userType: 'all'
  });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!currentUser) {
      navigate('/admin/login');
      return;
    }
    checkAdminAccess();
    loadFeedback();
  }, [currentUser, navigate]);

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

  const loadFeedback = async () => {
    try {
      setLoading(true);
      // Remove orderBy to avoid index requirement - sort client-side instead
      const q = query(collection(db, 'feedback'));
      
      const snapshot = await getDocs(q);
      const feedbackData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000) : new Date()),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt?.seconds ? new Date(data.updatedAt.seconds * 1000) : null),
          adminRespondedAt: data.adminRespondedAt?.toDate ? data.adminRespondedAt.toDate() : (data.adminRespondedAt?.seconds ? new Date(data.adminRespondedAt.seconds * 1000) : null)
        };
      });

      // Sort client-side by createdAt (newest first)
      feedbackData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      setFeedback(feedbackData);
      setFilteredFeedback(feedbackData);
    } catch (error) {
      console.error('Error loading feedback:', error);
      toast.error('Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    filterFeedback();
  }, [filters, searchQuery, feedback]);

  const filterFeedback = () => {
    let filtered = [...feedback];

    // Filter by status
    if (filters.status !== 'all') {
      filtered = filtered.filter(f => f.status === filters.status);
    }

    // Filter by type
    if (filters.type !== 'all') {
      filtered = filtered.filter(f => f.type === filters.type);
    }

    // Filter by urgency
    if (filters.urgency !== 'all') {
      filtered = filtered.filter(f => f.urgency === filters.urgency);
    }

    // Filter by userType
    if (filters.userType !== 'all') {
      filtered = filtered.filter(f => f.userType === filters.userType);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(f => 
        f.subject.toLowerCase().includes(query) ||
        f.description.toLowerCase().includes(query) ||
        f.userName.toLowerCase().includes(query) ||
        f.userEmail.toLowerCase().includes(query)
      );
    }

    setFilteredFeedback(filtered);
  };

  const handleStatusChange = async (feedbackId, newStatus) => {
    try {
      const feedbackRef = doc(db, 'feedback', feedbackId);
      await updateDoc(feedbackRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      toast.success(`Feedback marked as ${newStatus}`);
      loadFeedback();
    } catch (error) {
      console.error('Error updating feedback status:', error);
      toast.error('Failed to update feedback status');
    }
  };

  const handleRespond = async () => {
    if (!adminResponse.trim()) {
      toast.error('Please enter a response');
      return;
    }

    try {
      const feedbackRef = doc(db, 'feedback', selectedFeedback.id);
      await updateDoc(feedbackRef, {
        adminResponse: adminResponse.trim(),
        adminRespondedAt: serverTimestamp(),
        status: 'resolved',
        updatedAt: serverTimestamp()
      });

      toast.success('Response sent successfully');
      setShowResponseModal(false);
      setSelectedFeedback(null);
      setAdminResponse('');
      loadFeedback();
    } catch (error) {
      console.error('Error responding to feedback:', error);
      toast.error('Failed to send response');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      open: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Open' },
      in_progress: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'In Progress' },
      resolved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Resolved' },
      closed: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Closed' }
    };
    const badge = badges[status] || badges.open;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const getUrgencyBadge = (urgency) => {
    const badges = {
      low: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Low' },
      medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Medium' },
      high: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'High' },
      critical: { bg: 'bg-red-100', text: 'text-red-700', label: 'Critical' }
    };
    const badge = badges[urgency] || badges.medium;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const getTypeLabel = (type) => {
    const types = {
      listing_issue: 'Listing Issue',
      host_behavior: 'Host Behavior',
      guest_behavior: 'Guest Behavior',
      platform_issue: 'Platform Issue',
      support_request: 'Support Request',
      general: 'General Feedback'
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const stats = {
    total: feedback.length,
    open: feedback.filter(f => f.status === 'open').length,
    in_progress: feedback.filter(f => f.status === 'in_progress').length,
    resolved: feedback.filter(f => f.status === 'resolved').length,
    critical: feedback.filter(f => f.urgency === 'critical').length
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Feedback Management</h1>
          <p className="text-gray-600">Review and respond to user feedback and complaints</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-600 mb-1">Total</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-600 mb-1">Open</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.open}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-600 mb-1">In Progress</p>
            <p className="text-2xl font-bold text-blue-600">{stats.in_progress}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-600 mb-1">Resolved</p>
            <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-600 mb-1">Critical</p>
            <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search feedback..."
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
              >
                <option value="all">All Types</option>
                <option value="listing_issue">Listing Issue</option>
                <option value="host_behavior">Host Behavior</option>
                <option value="guest_behavior">Guest Behavior</option>
                <option value="platform_issue">Platform Issue</option>
                <option value="support_request">Support Request</option>
                <option value="general">General</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Urgency</label>
              <select
                value={filters.urgency}
                onChange={(e) => setFilters({ ...filters, urgency: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
              >
                <option value="all">All Urgency</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">User Type</label>
              <select
                value={filters.userType}
                onChange={(e) => setFilters({ ...filters, userType: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
              >
                <option value="all">All Users</option>
                <option value="guest">Guest</option>
                <option value="host">Host</option>
              </select>
            </div>
          </div>
        </div>

        {/* Feedback List */}
        <div className="space-y-4">
          {filteredFeedback.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-12 text-center">
              <p className="text-gray-600 text-lg">No feedback found</p>
            </div>
          ) : (
            filteredFeedback.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => {
                  setSelectedFeedback(item);
                  setShowResponseModal(true);
                  setAdminResponse(item.adminResponse || '');
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-lg text-gray-900">{item.subject}</h3>
                      {getStatusBadge(item.status)}
                      {getUrgencyBadge(item.urgency)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <span className="capitalize">{item.userType}</span>
                      <span>•</span>
                      <span>{item.userName}</span>
                      <span>•</span>
                      <span>{item.userEmail}</span>
                      <span>•</span>
                      <span>{getTypeLabel(item.type)}</span>
                      <span>•</span>
                      <span>{item.createdAt.toLocaleDateString()}</span>
                    </div>
                    <p className="text-gray-700 line-clamp-2">{item.description}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFeedback(item);
                      setShowResponseModal(true);
                      setAdminResponse(item.adminResponse || '');
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors text-sm"
                  >
                    {item.adminResponse ? 'View/Edit Response' : 'Respond'}
                  </button>
                  {item.status === 'open' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange(item.id, 'in_progress');
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm"
                    >
                      Mark In Progress
                    </button>
                  )}
                  {item.status === 'resolved' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange(item.id, 'closed');
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors text-sm"
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Response Modal */}
        {showResponseModal && selectedFeedback && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900">Feedback Details</h3>
                <button
                  onClick={() => {
                    setShowResponseModal(false);
                    setSelectedFeedback(null);
                    setAdminResponse('');
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Feedback Info */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Subject</h4>
                    <p className="text-gray-700">{selectedFeedback.subject}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedFeedback.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">User</h4>
                      <p className="text-gray-700 capitalize">{selectedFeedback.userType}: {selectedFeedback.userName}</p>
                      <p className="text-sm text-gray-600">{selectedFeedback.userEmail}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Details</h4>
                      <p className="text-gray-700">{getTypeLabel(selectedFeedback.type)}</p>
                      <p className="text-sm text-gray-600">Urgency: {getUrgencyBadge(selectedFeedback.urgency)}</p>
                    </div>
                  </div>
                </div>

                {/* Admin Response */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Response
                  </label>
                  <textarea
                    value={adminResponse}
                    onChange={(e) => setAdminResponse(e.target.value)}
                    placeholder="Enter your response..."
                    rows={5}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-red-500 focus:outline-none resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setShowResponseModal(false);
                      setSelectedFeedback(null);
                      setAdminResponse('');
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRespond}
                    disabled={!adminResponse.trim()}
                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                  >
                    {selectedFeedback.adminResponse ? 'Update Response' : 'Send Response'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminFeedback;

