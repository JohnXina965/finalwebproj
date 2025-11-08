import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../Firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  doc, 
  updateDoc, 
  getDoc,
  addDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import { PDFDownloadLink } from '@react-pdf/renderer';
import PayoutPDFDocument from '../../components/PayoutPDFReport';
import { processPayPalPayout } from '../../services/PayPalPayoutService';

const AdminPayouts = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState([]);
  const [walletWithdrawals, setWalletWithdrawals] = useState([]);
  const [activeTab, setActiveTab] = useState('bookings'); // 'bookings' or 'withdrawals'
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'released'
  const [processingPayout, setProcessingPayout] = useState(null);
  const [processingWithdrawal, setProcessingWithdrawal] = useState(null);

  useEffect(() => {
    if (!currentUser) {
      navigate('/admin/login');
      return;
    }

    checkAdminAccess();
    loadPayouts();
    loadWalletWithdrawals();
  }, [currentUser, navigate, filter]);

  const checkAdminAccess = async () => {
    try {
      const { getDoc, doc } = await import('firebase/firestore');
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      
      if (!userDoc.exists()) {
        navigate('/admin/login');
        return;
      }
      
      const userData = userDoc.data();
      const isAdmin = userData.role === 'admin' || userData.isAdmin === true;
      
      if (!isAdmin) {
        navigate('/admin/login');
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/admin/login');
    }
  };

  const loadPayouts = async () => {
    try {
      setLoading(true);
      
      const payoutsQuery = query(
        collection(db, 'payouts'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(payoutsQuery);
      const payoutsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filter payouts based on selected filter
      let filteredPayouts = payoutsData;
      if (filter === 'pending') {
        filteredPayouts = payoutsData.filter(p => 
          p.payoutStatus === 'PENDING' || p.payoutStatus === 'ON_HOLD'
        );
      } else if (filter === 'released') {
        filteredPayouts = payoutsData.filter(p => p.payoutStatus === 'RELEASED');
      }

      setPayouts(filteredPayouts);
    } catch (error) {
      console.error('Error loading payouts:', error);
      toast.error('Failed to load payouts');
    } finally {
      setLoading(false);
    }
  };

  const loadWalletWithdrawals = async () => {
    try {
      const withdrawalsQuery = query(
        collection(db, 'walletTransactions'),
        where('type', '==', 'cash_out'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(withdrawalsQuery);
      const withdrawalsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt?.seconds * 1000 || 0)
      }));

      // Filter based on status
      let filteredWithdrawals = withdrawalsData;
      if (filter === 'pending') {
        filteredWithdrawals = withdrawalsData.filter(w => w.status === 'pending');
      } else if (filter === 'released') {
        filteredWithdrawals = withdrawalsData.filter(w => w.status === 'completed');
      }

      setWalletWithdrawals(filteredWithdrawals);
    } catch (error) {
      console.error('Error loading wallet withdrawals:', error);
      // If orderBy fails due to missing index, load all and sort client-side
      try {
        const withdrawalsQuery = query(
          collection(db, 'walletTransactions'),
          where('type', '==', 'cash_out')
        );
        const snapshot = await getDocs(withdrawalsQuery);
        const withdrawalsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt?.seconds * 1000 || 0)
        })).sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));

        let filteredWithdrawals = withdrawalsData;
        if (filter === 'pending') {
          filteredWithdrawals = withdrawalsData.filter(w => w.status === 'pending');
        } else if (filter === 'released') {
          filteredWithdrawals = withdrawalsData.filter(w => w.status === 'completed');
        }

        setWalletWithdrawals(filteredWithdrawals);
      } catch (fallbackError) {
        console.error('Error loading wallet withdrawals (fallback):', fallbackError);
        toast.error('Failed to load wallet withdrawals');
      }
    }
  };

  const handleProcessWithdrawal = async (withdrawalId) => {
    const withdrawal = walletWithdrawals.find(w => w.id === withdrawalId);
    if (!withdrawal) return;

    if (!window.confirm(`Process withdrawal of ₱${withdrawal.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} to ${withdrawal.paypalEmail}?`)) {
      return;
    }

    try {
      setProcessingWithdrawal(withdrawalId);
      
      // Process PayPal Payout (simulated for sandbox)
      const payoutResult = await processPayPalPayout(
        withdrawal.amount,
        withdrawal.paypalEmail,
        withdrawalId
      );

      if (!payoutResult.success) {
        throw new Error(payoutResult.error || 'Failed to process PayPal payout');
      }

      // Update transaction status to completed
      const withdrawalRef = doc(db, 'walletTransactions', withdrawalId);
      await updateDoc(withdrawalRef, {
        status: 'completed',
        payoutId: payoutResult.payoutId,
        processedAt: serverTimestamp(),
        processedBy: currentUser.uid,
        updatedAt: serverTimestamp()
      });

      toast.success(`Withdrawal processed successfully! Payout ID: ${payoutResult.payoutId}`);
      await loadWalletWithdrawals();
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      toast.error(error.message || 'Failed to process withdrawal. Please try again.');
    } finally {
      setProcessingWithdrawal(null);
    }
  };

  const handleReleasePayout = async (payoutId) => {
    if (!window.confirm('Are you sure you want to release this payout to the host?')) {
      return;
    }

    try {
      setProcessingPayout(payoutId);
      
      const payoutRef = doc(db, 'payouts', payoutId);
      const payoutDoc = await getDoc(payoutRef);
      
      if (!payoutDoc.exists()) {
        throw new Error('Payout not found');
      }

      const payoutData = payoutDoc.data();
      
      // Update payout status to RELEASED
      await updateDoc(payoutRef, {
        payoutStatus: 'RELEASED',
        releasedAt: serverTimestamp(),
        releasedBy: currentUser.uid,
        updatedAt: serverTimestamp()
      });

      // Update related booking if exists
      if (payoutData.bookingId) {
        const bookingRef = doc(db, 'bookings', payoutData.bookingId);
        await updateDoc(bookingRef, {
          payoutStatus: 'released',
          payoutReleasedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      // Credit host wallet (if using wallet system)
      if (payoutData.hostId) {
        try {
          const { getDoc: getDocWallet, setDoc, doc: docWallet, serverTimestamp: serverTimestampWallet } = await import('firebase/firestore');
          const walletRef = docWallet(db, 'wallets', payoutData.hostId);
          const walletSnap = await getDocWallet(walletRef);
          
          const currentBalance = walletSnap.exists() ? (walletSnap.data().balance || 0) : 0;
          const newBalance = currentBalance + payoutData.amount;
          
          await setDoc(walletRef, {
            userId: payoutData.hostId,
            balance: newBalance,
            currency: 'PHP',
            updatedAt: serverTimestampWallet()
          }, { merge: true });

          // Create transaction record for host
          await addDoc(collection(db, 'walletTransactions'), {
            userId: payoutData.hostId,
            type: 'payment_received',
            amount: payoutData.amount,
            balanceAfter: newBalance,
            status: 'completed',
            description: `Payout released for booking ${payoutData.bookingId || 'N/A'}`,
            bookingId: payoutData.bookingId || null,
            payoutId: payoutId,
            createdAt: serverTimestamp()
          });
        } catch (walletError) {
          console.error('Error crediting host wallet:', walletError);
          // Don't fail the payout release if wallet update fails
        }
      }

      toast.success('Payout released successfully!');
      await loadPayouts();
    } catch (error) {
      console.error('Error releasing payout:', error);
      toast.error('Failed to release payout. Please try again.');
    } finally {
      setProcessingPayout(null);
    }
  };

  const handleExportPDF = () => {
    // PDF export is handled by PDFDownloadLink component
    // This function is kept for potential future enhancements
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const dateObj = date?.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'PENDING': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'PENDING' },
      'ON_HOLD': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'ON_HOLD' },
      'RELEASED': { bg: 'bg-green-100', text: 'text-green-800', label: 'RELEASED' },
      'REFUNDED': { bg: 'bg-red-100', text: 'text-red-800', label: 'REFUNDED' }
    };

    const statusStyle = statusMap[status] || statusMap['PENDING'];
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
        {statusStyle.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl">💰</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Payout Control Center</h1>
                <p className="text-sm text-gray-600 mt-1">Manage host payouts and refunds</p>
              </div>
            </div>
            <PDFDownloadLink
              document={<PayoutPDFDocument payouts={payouts} filter={filter} generatedDate={new Date()} />}
              fileName={`payout-report-${filter}-${new Date().toISOString().split('T')[0]}.pdf`}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg font-semibold hover:bg-gray-900 transition-colors flex items-center gap-2"
            >
              {({ blob, url, loading, error }) =>
                loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Generating PDF...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export PDF Report
                  </>
                )
              }
            </PDFDownloadLink>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setActiveTab('bookings')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                activeTab === 'bookings'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Booking Payouts
            </button>
            <button
              onClick={() => setActiveTab('withdrawals')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                activeTab === 'withdrawals'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Wallet Withdrawals
              {walletWithdrawals.filter(w => w.status === 'pending').length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {walletWithdrawals.filter(w => w.status === 'pending').length}
                </span>
              )}
            </button>
          </div>
          
          {/* Filters */}
          <div className="flex gap-3">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filter === 'all'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filter === 'pending'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending / On Hold
            </button>
            <button
              onClick={() => setFilter('released')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filter === 'released'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Released
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'bookings' ? (
          /* Booking Payouts Table */
          loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading payouts...</p>
          </div>
        ) : payouts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-gray-600 text-lg">No payouts found</p>
            <p className="text-gray-500 text-sm mt-2">
              {filter === 'all' 
                ? 'No payout records yet' 
                : filter === 'pending' 
                  ? 'No pending payouts' 
                  : 'No released payouts'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">#</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Host Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Guest Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Listing ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Payout Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payouts.map((payout, index) => (
                    <tr key={payout.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payout.type || 'Place'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payout.hostName || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payout.guestName || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                        {payout.listingId ? payout.listingId.substring(0, 12) + '...' : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        ₱{payout.amount?.toLocaleString('en-PH', { minimumFractionDigits: 2 }) || '0.00'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(payout.dueDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(payout.payoutStatus)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {payout.payoutStatus === 'PENDING' || payout.payoutStatus === 'ON_HOLD' ? (
                          <button
                            onClick={() => handleReleasePayout(payout.id)}
                            disabled={processingPayout === payout.id}
                            className="px-4 py-2 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {processingPayout === payout.id ? (
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Processing...</span>
                              </div>
                            ) : (
                              'Release Payout'
                            )}
                          </button>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
        ) : (
          /* Wallet Withdrawals Table */
          loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading withdrawals...</p>
            </div>
          ) : walletWithdrawals.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <div className="text-6xl mb-4">💸</div>
              <p className="text-gray-600 text-lg">No wallet withdrawals found</p>
              <p className="text-gray-500 text-sm mt-2">
                {filter === 'all' 
                  ? 'No withdrawal requests yet' 
                  : filter === 'pending' 
                    ? 'No pending withdrawals' 
                    : 'No processed withdrawals'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">#</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">User ID</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">PayPal Email</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Requested</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {walletWithdrawals.map((withdrawal, index) => (
                      <tr key={withdrawal.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                          {withdrawal.userId?.substring(0, 12) + '...' || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {withdrawal.paypalEmail || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          ₱{withdrawal.amount?.toLocaleString('en-PH', { minimumFractionDigits: 2 }) || '0.00'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(withdrawal.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(withdrawal.status === 'completed' ? 'RELEASED' : 'PENDING')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {withdrawal.status === 'pending' ? (
                            <button
                              onClick={() => handleProcessWithdrawal(withdrawal.id)}
                              disabled={processingWithdrawal === withdrawal.id}
                              className="px-4 py-2 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {processingWithdrawal === withdrawal.id ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  <span>Processing...</span>
                                </div>
                              ) : (
                                'Process via PayPal'
                              )}
                            </button>
                          ) : (
                            <div className="text-sm text-gray-600">
                              {withdrawal.payoutId && (
                                <div>
                                  <p className="text-xs text-gray-500">Payout ID:</p>
                                  <p className="font-mono text-xs">{withdrawal.payoutId}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default AdminPayouts;

