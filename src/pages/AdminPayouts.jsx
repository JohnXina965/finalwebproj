import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../Firebase';
import { collection, getDocs, query, orderBy, doc, getDoc, onSnapshot } from 'firebase/firestore';
import toast from 'react-hot-toast';

function AdminPayouts() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState([]);
  const [filter, setFilter] = useState('all'); // all, pending, released
  const [stats, setStats] = useState({
    totalPending: 0,
    totalReleased: 0,
    totalAmount: 0
  });

  useEffect(() => {
    if (!currentUser) {
      navigate('/admin/login');
      return;
    }

    checkAdminAccess();
    loadPayouts();
  }, [currentUser, navigate]);

  const checkAdminAccess = async () => {
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists() || userDoc.data().role !== 'admin') {
        navigate('/admin/login');
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/admin/login');
    }
  };

  const loadPayouts = () => {
    try {
      setLoading(true);
      
      const q = query(
        collection(db, 'bookings'),
        orderBy('createdAt', 'desc')
      );
      
      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const payoutsData = [];
        
        for (const bookingDoc of snapshot.docs) {
          const booking = bookingDoc.data();
          const bookingId = bookingDoc.id;
          
          // Calculate host payout amount (totalAmount - serviceFee)
          const hostPayoutAmount = (booking.totalAmount || 0) - (booking.serviceFee || 0);
          
          // Determine payout status based on booking status
          let payoutStatus = 'pending';
          if (booking.status === 'completed' || booking.status === 'confirmed') {
            payoutStatus = 'released';
          } else if (booking.status === 'cancelled') {
            payoutStatus = 'on-hold';
          }
          
          // Determine due date (checkOut date or checkIn date if no checkOut)
          const checkOutDate = booking.checkOut?.toDate ? 
            booking.checkOut.toDate() : 
            (booking.checkOut?.seconds ? new Date(booking.checkOut.seconds * 1000) : null);
          
          const checkInDate = booking.checkIn?.toDate ? 
            booking.checkIn.toDate() : 
            (booking.checkIn?.seconds ? new Date(booking.checkIn.seconds * 1000) : new Date());
          
          const dueDate = checkOutDate || checkInDate;
          
          // Get listing type
          let listingType = 'Place';
          if (booking.listingType === 'experience') {
            listingType = 'Experience';
          } else if (booking.listingType === 'service') {
            listingType = 'Service';
          }
          
          payoutsData.push({
            id: bookingId,
            type: listingType,
            hostName: booking.hostName || 'Host',
            guestName: booking.guestName || 'Guest',
            listingId: booking.listingId || bookingId,
            amount: hostPayoutAmount,
            dueDate: dueDate,
            payoutStatus: payoutStatus,
            bookingStatus: booking.status || 'pending',
            totalAmount: booking.totalAmount || 0,
            serviceFee: booking.serviceFee || 0,
            createdAt: booking.createdAt?.toDate ? 
              booking.createdAt.toDate() : 
              (booking.createdAt?.seconds ? new Date(booking.createdAt.seconds * 1000) : new Date())
          });
        }
        
        setPayouts(payoutsData);
        
        // Calculate stats
        const stats = {
          totalPending: payoutsData.filter(p => p.payoutStatus === 'pending').length,
          totalReleased: payoutsData.filter(p => p.payoutStatus === 'released').length,
          totalAmount: payoutsData.filter(p => p.payoutStatus === 'pending').reduce((sum, p) => sum + (p.amount || 0), 0)
        };
        setStats(stats);
        setLoading(false);
      }, (error) => {
        console.error('Error loading payouts:', error);
        toast.error('Failed to load payouts');
        setLoading(false);
      });
      
      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up payouts listener:', error);
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredPayouts = payouts.filter(payout => {
    if (filter === 'all') return true;
    if (filter === 'pending') return payout.payoutStatus === 'pending';
    if (filter === 'released') return payout.payoutStatus === 'released';
    return true;
  });

  const handleExportPDF = () => {
    toast.success('PDF export feature coming soon!');
    // TODO: Implement PDF export
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payouts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="lg:ml-64 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Payout Control Center</h1>
              <p className="text-gray-600 mt-1">Manage host payouts from bookings</p>
            </div>
          </div>
          <button
            onClick={handleExportPDF}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export PDF Report
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl shadow-sm p-2 mb-6 flex gap-2">
          {[
            { key: 'all', label: 'All', count: payouts.length },
            { key: 'pending', label: 'Pending / On Hold', count: stats.totalPending },
            { key: 'released', label: 'Released', count: stats.totalReleased }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                filter === tab.key
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {tab.label} {tab.count > 0 && `(${tab.count})`}
            </button>
          ))}
        </div>

        {/* Payouts Table */}
        {filteredPayouts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">💸</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No payouts found</h3>
            <p className="text-gray-600">
              {filter === 'all' 
                ? 'No booking payouts available'
                : `No ${filter} payouts`}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">#</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Host Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Guest Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Listing ID</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Payout Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPayouts.map((payout, index) => (
                    <tr key={payout.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payout.type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{payout.hostName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payout.guestName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{payout.listingId.slice(0, 20)}...</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-teal-600">
                        ₱{payout.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(payout.dueDate)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          payout.payoutStatus === 'released' 
                            ? 'bg-green-100 text-green-700 border border-green-200' 
                            : payout.payoutStatus === 'on-hold'
                            ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                            : 'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}>
                          {payout.payoutStatus === 'released' ? 'RELEASED' : 
                           payout.payoutStatus === 'on-hold' ? 'ON HOLD' : 
                           'PENDING'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">-</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

export default AdminPayouts;
