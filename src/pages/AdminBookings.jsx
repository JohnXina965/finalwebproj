import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../Firebase';
import { collection, getDocs, query, doc, getDoc } from 'firebase/firestore';

function AdminBookings() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [listingDetails, setListingDetails] = useState({});

  useEffect(() => {
    if (!currentUser) {
      navigate('/admin/login');
      return;
    }

    checkAdminAccess();
    loadBookings();
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

  const loadBookings = async () => {
    try {
      setLoading(true);

      // Get all bookings
      const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
      const bookingsData = [];

      for (const bookingDoc of bookingsSnapshot.docs) {
        const booking = bookingDoc.data();
        const bookingId = bookingDoc.id;

        // Get listing details for images
        let listingImage = null;
        let propertyType = booking.listingType || 'accommodation';
        
        try {
          const listingRef = doc(db, 'listings', booking.listingId);
          const listingSnap = await getDoc(listingRef);
          
          if (listingSnap.exists()) {
            const listingData = listingSnap.data();
            propertyType = listingData.propertyType || propertyType;
            
            // Get first image from photos
            const getPhotoUrl = (photos) => {
              if (!photos || photos.length === 0) return null;
              const firstPhoto = photos[0];
              return typeof firstPhoto === 'string' ? firstPhoto : (firstPhoto.url || firstPhoto);
            };

            listingImage = getPhotoUrl(listingData.photos) ||
                          getPhotoUrl(listingData.homeDetails?.photos) ||
                          getPhotoUrl(listingData.experienceDetails?.photos) ||
                          getPhotoUrl(listingData.serviceDetails?.photos);
            
            // Store listing details for modal
            setListingDetails(prev => ({
              ...prev,
              [bookingId]: {
                image: listingImage,
                propertyType: propertyType,
                ...listingData
              }
            }));
          }
        } catch (error) {
          console.error('Error loading listing:', error);
        }

        // Format dates
        const checkIn = booking.checkIn?.toDate ? 
          booking.checkIn.toDate() : 
          (booking.checkIn?.seconds ? new Date(booking.checkIn.seconds * 1000) : new Date());
        
        const checkOut = booking.checkOut?.toDate ? 
          booking.checkOut.toDate() : 
          (booking.checkOut?.seconds ? new Date(booking.checkOut.seconds * 1000) : null);

        bookingsData.push({
          id: bookingId,
          listingId: booking.listingId,
          listingTitle: booking.listingTitle || 'Unknown Listing',
          location: booking.location || 'Location not specified',
          guestName: booking.guestName || 'Guest',
          guestEmail: booking.guestEmail || '',
          hostId: booking.hostId,
          hostName: booking.hostName || 'Host',
          checkIn: checkIn,
          checkOut: checkOut,
          guests: booking.guests || 1,
          status: booking.status || 'pending',
          paymentStatus: booking.paymentStatus || 'pending',
          totalAmount: booking.totalAmount || 0,
          basePrice: booking.basePrice || 0,
          serviceFee: booking.serviceFee || 0,
          paymentMethod: booking.paymentMethod || 'wallet',
          image: listingImage,
          propertyType: propertyType,
          createdAt: booking.createdAt?.toDate ? 
            booking.createdAt.toDate() : 
            (booking.createdAt?.seconds ? new Date(booking.createdAt.seconds * 1000) : new Date())
        });
      }

      // Sort by creation date (most recent first)
      bookingsData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      setBookings(bookingsData);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookingClick = async (booking) => {
    // Get host details
    let hostData = null;
    try {
      const hostRef = doc(db, 'users', booking.hostId);
      const hostSnap = await getDoc(hostRef);
      if (hostSnap.exists()) {
        hostData = hostSnap.data();
      }
    } catch (error) {
      console.error('Error loading host:', error);
    }

    setSelectedBooking({
      ...booking,
      hostData: hostData
    });
  };

  const handleCloseModal = () => {
    setSelectedBooking(null);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'pending': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'pending' },
      'confirmed': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'confirmed' },
      'cancelled': { bg: 'bg-red-100', text: 'text-red-800', label: 'cancelled' },
      'completed': { bg: 'bg-green-100', text: 'text-green-800', label: 'completed' }
    };
    
    const config = statusConfig[status?.toLowerCase()] || statusConfig.pending;
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getPropertyTypeLabel = (type) => {
    const typeMap = {
      'home': 'Place',
      'accommodation': 'Place',
      'experience': 'Experience',
      'service': 'Service'
    };
    return typeMap[type?.toLowerCase()] || 'Place';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading bookings...</p>
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
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Booking Management</h1>
        </div>

        {/* Bookings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookings.length > 0 ? (
            bookings.map((booking) => (
              <div
                key={booking.id}
                onClick={() => handleBookingClick(booking)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              >
                {/* Property Image */}
                <div className="w-full h-48 bg-gray-200 overflow-hidden">
                  {booking.image ? (
                    <img
                      src={booking.image}
                      alt={booking.listingTitle}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
                      <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Booking Info */}
                <div className="p-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">
                    {booking.listingTitle}
                  </h3>
                  
                  {/* Location */}
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{booking.location}</span>
                  </div>

                  {/* Booked By */}
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>{booking.guestName}</span>
                  </div>

                  {/* Dates */}
                  <div className="text-sm text-gray-600 mb-3">
                    {formatDate(booking.checkIn)} → {booking.checkOut ? formatDate(booking.checkOut) : 'N/A'}
                  </div>

                  {/* Status and Price */}
                  <div className="flex items-center justify-between mt-4">
                    {getStatusBadge(booking.status)}
                    <span className="text-lg font-semibold text-gray-900">
                      ₱{booking.totalAmount.toLocaleString('en-PH')}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-400">No bookings found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={handleCloseModal}>
          <div 
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Property Image */}
            <div className="w-full h-64 bg-gray-200 overflow-hidden">
              {selectedBooking.image ? (
                <img
                  src={selectedBooking.image}
                  alt={selectedBooking.listingTitle}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
                  <svg className="w-24 h-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
              )}
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Title and Type */}
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                {selectedBooking.listingTitle}
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                {getPropertyTypeLabel(selectedBooking.propertyType)}
              </p>

              {/* Host Information */}
              <div className="border-t border-gray-200 pt-6 mb-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {selectedBooking.hostData?.photoURL || selectedBooking.hostData?.profilePhoto ? (
                      <img
                        src={selectedBooking.hostData.photoURL || selectedBooking.hostData.profilePhoto}
                        alt={selectedBooking.hostName}
                        className="w-16 h-16 rounded-full object-cover border-2 border-orange-500"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center border-2 border-orange-500">
                        <span className="text-gray-600 font-medium text-lg">
                          {selectedBooking.hostName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{selectedBooking.hostName}</h3>
                    <p className="text-sm text-gray-600">
                      {selectedBooking.hostData?.email || 'Email not available'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Booking Details */}
              <div className="border-t border-gray-200 pt-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-lg font-bold text-gray-900">Booking Details</h3>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <div><span className="font-medium">Status:</span> {selectedBooking.status}</div>
                  <div><span className="font-medium">Check-in:</span> {formatDate(selectedBooking.checkIn)}</div>
                  {selectedBooking.checkOut && (
                    <div><span className="font-medium">Check-out:</span> {formatDate(selectedBooking.checkOut)}</div>
                  )}
                  <div><span className="font-medium">Guests:</span> {selectedBooking.guests}</div>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="border-t border-gray-200 pt-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-lg font-bold text-gray-900">Payment Summary</h3>
                </div>
                <div className="text-sm text-gray-600">
                  <div className="mb-2">
                    <span className="font-medium">Amount Paid:</span>
                    <span className="text-lg font-bold text-orange-600 ml-2">
                      ₱{selectedBooking.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  {selectedBooking.paymentMethod && (
                    <div className="text-xs text-gray-500">
                      Payment Method: {selectedBooking.paymentMethod === 'paypal' ? 'PayPal' : 'Wallet'}
                    </div>
                  )}
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleCloseModal}
                  className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
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

export default AdminBookings;

