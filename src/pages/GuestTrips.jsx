import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { sendCancellationRefundEmail } from '../services/EmailService';
import { calculateRefund } from '../services/RefundService';
import CancellationModal from '../components/CancellationModal';
import BookingStatusTimeline from '../components/BookingStatusTimeline';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { db } from '../Firebase';

function GuestTrips() {
  const { currentUser } = useAuth();
  const { addToWallet } = useWallet();
  const [trips, setTrips] = useState([]);
  const [listings, setListings] = useState({}); // Cache listing data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'upcoming', 'past', 'cancelled'
  const [processing, setProcessing] = useState(null);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [refundDetails, setRefundDetails] = useState(null);
  const [tripToCancel, setTripToCancel] = useState(null);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [selectedTripForTimeline, setSelectedTripForTimeline] = useState(null);

  useEffect(() => {
    if (!currentUser) return;

    // Fetch bookings without orderBy to avoid index issues
    const q = query(
      collection(db, 'bookings'),
      where('guestId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const tripsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          checkIn: data.checkIn?.toDate ? data.checkIn.toDate() : (data.checkIn?.seconds ? new Date(data.checkIn.seconds * 1000) : null),
          checkOut: data.checkOut?.toDate ? data.checkOut.toDate() : (data.checkOut?.seconds ? new Date(data.checkOut.seconds * 1000) : null),
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000) : null)
        };
      });

      // Sort client-side by check-in date (descending)
      tripsData.sort((a, b) => {
        if (!a.checkIn || !b.checkIn) return 0;
        return b.checkIn.getTime() - a.checkIn.getTime();
      });

      setTrips(tripsData);
      
      // Fetch listing details for each trip
      const listingIds = [...new Set(tripsData.map(t => t.listingId).filter(Boolean))];
      const listingsData = {};
      
      for (const listingId of listingIds) {
        try {
          const listingDoc = await getDoc(doc(db, 'listings', listingId));
          if (listingDoc.exists()) {
            const listingData = listingDoc.data();
            listingsData[listingId] = {
              id: listingDoc.id,
              ...listingData,
              image: (typeof listingData.photos?.[0] === 'string' 
                ? listingData.photos[0] 
                : listingData.photos?.[0]?.url) || null,
              title: listingData.homeDetails?.title || listingData.experienceDetails?.title || listingData.serviceDetails?.title || 'Unknown Listing',
              rating: listingData.rating || 0,
              reviewCount: listingData.reviewCount || 0
            };
          }
        } catch (error) {
          console.error(`Error fetching listing ${listingId}:`, error);
        }
      }
      
      setListings(listingsData);
      setLoading(false);
      setError(null);
    }, (error) => {
      console.error('Error fetching trips:', error);
      setError('Failed to load trips. Please refresh the page.');
      setLoading(false);
      toast.error('Failed to load trips. Please try again.');
    });

    return () => unsubscribe();
  }, [currentUser]);

  const filteredTrips = useMemo(() => {
    return trips.filter(trip => {
      if (filter === 'all') return true;
      if (filter === 'upcoming') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return trip.checkIn && trip.checkIn >= today && trip.status !== 'cancelled' && trip.status !== 'completed';
      }
      if (filter === 'past') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return trip.checkOut && trip.checkOut < today && trip.status !== 'cancelled';
      }
      if (filter === 'cancelled') return trip.status === 'cancelled';
      return true;
    });
  }, [trips, filter]);

  const handleCancelTrip = useCallback((tripId) => {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;

    // Calculate refund and show modal
    const refund = calculateRefund(trip);
    setRefundDetails(refund);
    setTripToCancel(trip);
    setShowCancelModal(true);
  }, [trips]);

  const confirmCancelTrip = useCallback(async () => {
    if (!tripToCancel) return;

    try {
      setProcessing(tripToCancel.id);
      
      // Update booking status
      await updateDoc(doc(db, 'bookings', tripToCancel.id), {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
        cancelledBy: 'guest',
        updatedAt: serverTimestamp(),
        refundAmount: refundDetails.finalRefundAmount,
        adminDeduction: refundDetails.adminDeduction,
        cancellationFee: refundDetails.cancellationFee,
        refundCalculated: true
      });

      // Add refund to guest wallet
      if (refundDetails.finalRefundAmount > 0) {
        try {
          await addToWallet(refundDetails.finalRefundAmount, `Refund for cancelled booking: ${tripToCancel.listingTitle || 'Booking'}`);
          toast.success(`Refund of ₱${refundDetails.finalRefundAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} added to your wallet`);
        } catch (walletError) {
          console.error('Error adding refund to wallet:', walletError);
          toast.error('Booking cancelled but failed to add refund to wallet. Please contact support.');
        }
      }

      // Send cancellation refund email
      try {
        console.log('📧 Preparing to send cancellation email...');
        console.log('📧 Guest email:', currentUser.email);
        console.log('📧 Guest name:', currentUser.displayName || 'Guest');
        console.log('📧 Refund details:', {
          originalAmount: refundDetails.originalAmount,
          refundAmount: refundDetails.finalRefundAmount,
          adminDeduction: refundDetails.adminDeduction,
          cancellationFee: refundDetails.cancellationFee
        });

        await sendCancellationRefundEmail(
          currentUser.email,
          currentUser.displayName || currentUser.email?.split('@')[0] || 'Guest',
          {
            bookingId: tripToCancel.id,
            listingTitle: tripToCancel.listingTitle || 'Your Booking',
            checkIn: tripToCancel.checkIn ? formatDate(tripToCancel.checkIn) : 'N/A',
            checkOut: tripToCancel.checkOut ? formatDate(tripToCancel.checkOut) : 'N/A',
            originalAmount: refundDetails.originalAmount,
            refundAmount: refundDetails.finalRefundAmount,
            adminDeduction: refundDetails.adminDeduction,
            cancellationFee: refundDetails.cancellationFee,
            policyDescription: refundDetails.policyDescription
          }
        );
        console.log('✅ Cancellation refund email sent successfully');
      } catch (emailError) {
        console.error('❌ Failed to send cancellation email:', emailError);
        console.error('❌ Error details:', emailError);
        // Show error to user but don't fail the cancellation
        toast.error(`Trip cancelled successfully, but email failed: ${emailError.message || 'Please check your email settings'}`);
      }

      setShowCancelModal(false);
      setSelectedTrip(null);
      setRefundDetails(null);
      toast.success('Trip cancelled successfully. Check your email for refund details.');
    } catch (error) {
      console.error('Error cancelling trip:', error);
      toast.error('Failed to cancel trip. Please try again.');
      setError('Failed to cancel trip. Please try again.');
    } finally {
      setProcessing(null);
      setTripToCancel(null);
    }
  }, [tripToCancel, refundDetails, currentUser, addToWallet]);

  const getDaysUntilTrip = (checkIn) => {
    if (!checkIn) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkInDate = new Date(checkIn);
    checkInDate.setHours(0, 0, 0, 0);
    const diff = checkInDate.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'confirmed': return '✅';
      case 'pending': return '⏳';
      case 'cancelled': return '❌';
      case 'completed': return '✓';
      default: return '📅';
    }
  };

  const canReview = (trip) => {
    if (!trip.checkOut) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkoutDate = new Date(trip.checkOut);
    checkoutDate.setHours(0, 0, 0, 0);
    return checkoutDate < today && trip.status === 'completed' && !trip.reviewed;
  };

  const getStatusBadge = (status) => {
    const badges = {
      'pending': 'bg-yellow-50 text-yellow-800 border-yellow-200',
      'confirmed': 'bg-green-50 text-green-800 border-green-200',
      'cancelled': 'bg-red-50 text-red-800 border-red-200',
      'completed': 'bg-blue-50 text-blue-800 border-blue-200'
    };
    return badges[status] || 'bg-gray-50 text-gray-800 border-gray-200';
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    
    // Handle Firestore Timestamp
    if (date && typeof date.toDate === 'function') {
      date = date.toDate();
    }
    // Handle string dates
    if (typeof date === 'string') {
      date = new Date(date);
    }
    // Handle Date objects
    if (date instanceof Date && !isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    }
    return 'N/A';
  };

  const getDaysDifference = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;
    const diff = checkOut.getTime() - checkIn.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const generateReceipt = (trip) => {
    const listing = listings[trip.listingId] || {};
    const nights = getDaysDifference(trip.checkIn, trip.checkOut);
    const receiptDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const receiptHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt - ${trip.listingTitle || 'Booking'}</title>
  <style>
    body {
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      color: #333;
      background: #fff;
    }
    .header {
      border-bottom: 3px solid #14b8a6;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #14b8a6;
      margin: 0;
      font-size: 32px;
    }
    .header p {
      color: #666;
      margin: 5px 0;
    }
    .section {
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 15px;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 8px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }
    .info-item {
      margin-bottom: 12px;
    }
    .info-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .info-value {
      font-size: 16px;
      color: #1f2937;
      font-weight: 600;
    }
    .amount-box {
      background: #f0fdfa;
      border: 2px solid #14b8a6;
      border-radius: 8px;
      padding: 20px;
      margin-top: 20px;
    }
    .amount-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .amount-row:last-child {
      border-bottom: none;
      font-size: 20px;
      font-weight: 700;
      color: #14b8a6;
      margin-top: 10px;
      padding-top: 15px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>EcoEscape</h1>
    <p>Booking Receipt</p>
    <p>Receipt Date: ${receiptDate}</p>
  </div>

  <div class="section">
    <div class="section-title">Booking Information</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Booking ID</div>
        <div class="info-value">${trip.id}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Status</div>
        <div class="info-value">${trip.status?.toUpperCase() || 'PENDING'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Check-in Date</div>
        <div class="info-value">${formatDate(trip.checkIn)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Check-out Date</div>
        <div class="info-value">${formatDate(trip.checkOut)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Duration</div>
        <div class="info-value">${nights} ${nights === 1 ? 'night' : 'nights'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Guests</div>
        <div class="info-value">${trip.guests || 1} ${trip.guests === 1 ? 'guest' : 'guests'}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Listing Details</div>
    <div class="info-item">
      <div class="info-label">Listing Name</div>
      <div class="info-value">${listing.title || trip.listingTitle || 'Unknown Listing'}</div>
    </div>
    ${trip.location ? `
    <div class="info-item">
      <div class="info-label">Location</div>
      <div class="info-value">${trip.location}</div>
    </div>
    ` : ''}
    ${trip.hostName ? `
    <div class="info-item">
      <div class="info-label">Host</div>
      <div class="info-value">${trip.hostName}</div>
    </div>
    ` : ''}
  </div>

  <div class="section">
    <div class="section-title">Payment Summary</div>
    <div class="amount-box">
      <div class="amount-row">
        <span>Subtotal</span>
        <span>₱${parseFloat(trip.totalAmount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
      </div>
      ${trip.serviceFee ? `
      <div class="amount-row">
        <span>Service Fee</span>
        <span>₱${parseFloat(trip.serviceFee).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
      </div>
      ` : ''}
      ${trip.refundDetails ? `
      <div class="amount-row" style="color: #dc2626;">
        <span>Refund Amount</span>
        <span>-₱${parseFloat(trip.refundDetails.finalRefundAmount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
      </div>
      ` : ''}
      <div class="amount-row">
        <span>Total Amount</span>
        <span>₱${parseFloat(trip.totalAmount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
      </div>
    </div>
    ${trip.paymentMethod ? `
    <p style="margin-top: 15px; color: #6b7280; font-size: 14px;">
      Payment Method: <strong>${trip.paymentMethod === 'wallet' ? 'Wallet' : trip.paymentMethod.toUpperCase()}</strong>
    </p>
    ` : ''}
  </div>

  ${trip.refundDetails ? `
  <div class="section">
    <div class="section-title">Refund Details</div>
    <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px;">
      <p style="margin: 5px 0; color: #78350f;"><strong>Policy:</strong> ${trip.refundDetails.policyDescription || 'Standard cancellation policy'}</p>
      <p style="margin: 5px 0; color: #78350f;"><strong>Original Amount:</strong> ₱${parseFloat(trip.refundDetails.originalAmount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
      <p style="margin: 5px 0; color: #78350f;"><strong>Refund Amount:</strong> ₱${parseFloat(trip.refundDetails.finalRefundAmount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
    </div>
  </div>
  ` : ''}

  <div class="footer">
    <p>Thank you for choosing EcoEscape!</p>
    <p>For questions or support, please contact us through the platform.</p>
    <p style="margin-top: 10px;">© ${new Date().getFullYear()} EcoEscape. All rights reserved.</p>
  </div>
</body>
</html>
    `;
    
    // Create blob and download
    const blob = new Blob([receiptHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `receipt-${trip.id}-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Receipt downloaded successfully!');
  };

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 animate-pulse">
          <div className="flex flex-col md:flex-row">
            <div className="md:w-64 w-full h-48 bg-gray-200"></div>
            <div className="flex-1 p-6">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="grid grid-cols-4 gap-4 mb-4">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-16 bg-gray-100 rounded"></div>
                ))}
              </div>
              <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 pb-12">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <div className="h-8 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-2 mb-6 flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-gray-200 rounded-lg w-24 animate-pulse"></div>
            ))}
          </div>
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 pb-12 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-md text-center" data-aos="fade-up">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Error Loading Trips</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12">
      <div className="container mx-auto px-4">
        <div className="mb-8" data-aos="fade-down">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Trips</h1>
          <p className="text-gray-600">Manage and view your bookings</p>
        </div>

        {/* Filter Tabs */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 mb-6 flex flex-wrap gap-2"
        >
          {[
            { key: 'all', label: 'All Trips', count: trips.length },
            { key: 'upcoming', label: 'Upcoming', count: trips.filter(t => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return t.checkIn && t.checkIn >= today && t.status !== 'cancelled';
            }).length },
            { key: 'past', label: 'Past', count: trips.filter(t => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return t.checkOut && t.checkOut < today;
            }).length },
            { key: 'cancelled', label: 'Cancelled', count: trips.filter(t => t.status === 'cancelled').length }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                filter === tab.key
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </motion.div>

        {/* Trips List */}
        {filteredTrips.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center" data-aos="fade-up" data-aos-delay="200">
            <div className="text-6xl mb-4">✈️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {filter === 'all' ? 'No trips yet' : `No ${filter} trips`}
            </h3>
            <p className="text-gray-600 mb-6">
              {filter === 'all' 
                ? "Start exploring and book your first eco-friendly stay or experience!"
                : `You don't have any ${filter} trips.`}
            </p>
            <Link
              to="/guest/homes"
              className="inline-block bg-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors"
            >
              Explore Listings
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTrips.map((trip, index) => {
              const nights = getDaysDifference(trip.checkIn, trip.checkOut);
              const listing = listings[trip.listingId] || {};
              const daysUntil = getDaysUntilTrip(trip.checkIn);
              const isToday = daysUntil === 0;
              const isUpcoming = daysUntil && daysUntil > 0 && daysUntil <= 7;
              
              return (
                <motion.div
                  key={trip.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ y: -4, scale: 1.01 }}
                  className="bg-white rounded-xl shadow-sm hover:shadow-lg border border-gray-100 transition-all duration-300 overflow-hidden group"
                >
                  <div className="flex flex-col md:flex-row">
                    {/* Listing Image */}
                    <div className="md:w-64 w-full h-48 md:h-auto relative overflow-hidden bg-gradient-to-br from-teal-400 to-emerald-500">
                      {listing.image ? (
                        <img
                          src={listing.image}
                          alt={listing.title || trip.listingTitle}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-6xl">
                          {trip.listingType === 'home' ? '🏠' : trip.listingType === 'experience' ? '🎯' : '🔧'}
                        </div>
                      )}
                      {/* Status Badge Overlay */}
                      <div className="absolute top-4 left-4">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 ${getStatusBadge(trip.status)}`}>
                          {getStatusIcon(trip.status)} {trip.status?.toUpperCase() || 'PENDING'}
                        </span>
                      </div>
                      {/* Days Until Badge & Reminder Indicator */}
                      {trip.status === 'confirmed' && trip.checkIn && (
                        <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                          {isUpcoming && (
                            <span className={`px-3 py-1.5 text-white rounded-full text-xs font-bold shadow-lg ${
                              isToday ? 'bg-orange-500 animate-pulse' : 'bg-teal-600'
                            }`}>
                              {isToday ? '🔔 CHECK-IN TODAY!' : `${daysUntil} ${daysUntil === 1 ? 'DAY' : 'DAYS'} TO GO`}
                            </span>
                          )}
                          {(daysUntil === 1 || isToday) && trip.checkInReminder1DaySent && (
                            <span className="px-2 py-1 bg-green-500 text-white rounded-full text-xs font-medium shadow-lg flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Reminder Sent
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        {/* Left Side - Listing Info */}
                        <div className="flex-1">
                          <div className="mb-4">
                            <Link
                              to={`/listing/${trip.listingId}`}
                              className="text-2xl font-bold text-gray-900 hover:text-teal-600 transition-colors inline-block mb-2"
                            >
                              {listing.title || trip.listingTitle || 'Unknown Listing'}
                            </Link>
                            <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {trip.location || 'Location not specified'}
                              </span>
                              {listing.rating > 0 && (
                                <span className="flex items-center gap-1">
                                  <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                  </svg>
                                  {listing.rating.toFixed(1)} ({listing.reviewCount || 0})
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Dates and Guests Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 bg-gray-50 rounded-lg p-4">
                            <div>
                              <p className="text-xs text-gray-500 mb-1 font-medium">CHECK-IN</p>
                              <p className="font-bold text-gray-900 text-lg">{formatDate(trip.checkIn)}</p>
                              {trip.checkIn && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {trip.checkIn.toLocaleDateString('en-US', { weekday: 'short' })}
                                </p>
                              )}
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1 font-medium">CHECK-OUT</p>
                              <p className="font-bold text-gray-900 text-lg">{formatDate(trip.checkOut)}</p>
                              {trip.checkOut && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {trip.checkOut.toLocaleDateString('en-US', { weekday: 'short' })}
                                </p>
                              )}
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1 font-medium">GUESTS</p>
                              <p className="font-bold text-gray-900 text-lg flex items-center gap-1">
                                <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                {trip.guests || 1} {trip.guests === 1 ? 'guest' : 'guests'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1 font-medium">DURATION</p>
                              <p className="font-bold text-gray-900 text-lg">
                                {nights} {nights === 1 ? 'night' : 'nights'}
                              </p>
                            </div>
                          </div>

                          {/* Host Info */}
                          {trip.hostName && (
                            <div className="flex items-center gap-2 mb-4 text-sm">
                              <span className="text-gray-600">Hosted by</span>
                              <span className="font-semibold text-gray-900">{trip.hostName}</span>
                            </div>
                          )}

                          {/* Payment Info */}
                          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Total Amount</p>
                              <p className="text-2xl font-bold text-gray-900">
                                {trip.totalAmount ? `₱${parseFloat(trip.totalAmount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : 'Price not available'}
                              </p>
                              {trip.paymentMethod && (
                                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                  </svg>
                                  Paid via {trip.paymentMethod === 'wallet' ? 'Wallet' : trip.paymentMethod.toUpperCase()}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right Side - Actions */}
                        <div className="flex flex-col gap-2 md:min-w-[200px]">
                          {trip.status === 'confirmed' && trip.checkIn && trip.checkIn > new Date() && (
                            <button
                              onClick={() => handleCancelTrip(trip.id)}
                              disabled={processing === trip.id}
                              className="px-4 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:scale-105"
                            >
                              {processing === trip.id ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  <span>Cancelling...</span>
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  <span>Cancel Trip</span>
                                </>
                              )}
                            </button>
                          )}
                          <Link
                            to={`/listing/${trip.listingId}`}
                            className="px-4 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-teal-700 hover:to-emerald-700 transition-all text-center flex items-center justify-center gap-2 hover:scale-105 shadow-md"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Listing
                          </Link>
                          {trip.hostId && (
                            <Link
                              to={`/messages?host=${trip.hostId}&listing=${trip.listingId}`}
                              className="px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all text-center flex items-center justify-center gap-2 hover:scale-105"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              Message Host
                            </Link>
                          )}
                          {canReview(trip) && (
                            <Link
                              to={`/listing/${trip.listingId}?review=true`}
                              className="px-4 py-2.5 bg-yellow-100 text-yellow-800 border-2 border-yellow-300 rounded-lg font-semibold hover:bg-yellow-200 transition-all text-center flex items-center justify-center gap-2 hover:scale-105"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                              Leave Review
                            </Link>
                          )}
                          <button
                            onClick={() => {
                              setSelectedTripForTimeline(trip);
                              setShowTimelineModal(true);
                            }}
                            className="px-4 py-2.5 bg-blue-100 text-blue-700 border-2 border-blue-300 rounded-lg font-semibold hover:bg-blue-200 transition-all flex items-center justify-center gap-2 hover:scale-105"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            View Timeline
                          </button>
                          {(trip.status === 'confirmed' || trip.status === 'completed' || trip.status === 'cancelled') && (
                            <button
                              onClick={() => generateReceipt(trip)}
                              className="px-4 py-2.5 bg-gray-100 text-gray-700 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-200 transition-all flex items-center justify-center gap-2 hover:scale-105"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Download Receipt
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Cancellation Modal */}
        {showCancelModal && refundDetails && tripToCancel && (
          <CancellationModal
            isOpen={showCancelModal}
            onClose={() => {
              setShowCancelModal(false);
              setRefundDetails(null);
              setTripToCancel(null);
            }}
            onConfirm={confirmCancelTrip}
            refundDetails={refundDetails}
            bookingTitle={tripToCancel.listingTitle || 'Booking'}
            isProcessing={processing === tripToCancel.id}
            userType="guest"
          />
        )}

        {/* Booking Timeline Modal */}
        {showTimelineModal && selectedTripForTimeline && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Booking Timeline</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedTripForTimeline.listingTitle || 'Booking'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowTimelineModal(false);
                    setSelectedTripForTimeline(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Timeline Content */}
              <div className="p-6">
                <BookingStatusTimeline booking={selectedTripForTimeline} />
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowTimelineModal(false);
                      setSelectedTripForTimeline(null);
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Close
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

export default GuestTrips;

