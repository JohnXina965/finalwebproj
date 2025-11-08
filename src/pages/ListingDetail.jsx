import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import toast from 'react-hot-toast';
import GuestFeedback from '../components/GuestFeedback';
import InlineDateRangePicker from '../components/InlineDateRangePicker';
import PayPalButton from '../components/PayPalButton';
import { calculateServiceFee } from '../services/ServiceFeeService';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../Firebase';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { createBooking } from '../services/BookingService';

// Fix for default marker icon in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const ListingDetail = () => {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const { balance, deduct } = useWallet();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview, reviews, location
  const [booking, setBooking] = useState({ loading: false, error: null });
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showConfirmBookingModal, setShowConfirmBookingModal] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [showWalletPaymentModal, setShowWalletPaymentModal] = useState(false);
  const [showPayPal, setShowPayPal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [blockedDates, setBlockedDates] = useState([]);
  const [existingBookings, setExistingBookings] = useState([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  // Load listing
  useEffect(() => {
    const fetchListing = async () => {
      try {
        const docRef = doc(db, 'listings', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setListing({
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate()
          });
          
          // Track view (only for published listings and not by the host)
          if (data.status === 'published' && currentUser?.uid !== data.hostId) {
            try {
              const { trackListingView } = await import('../services/ListingServices');
              await trackListingView(id);
            } catch (err) {
              console.error('Error tracking view:', err);
              // Don't show error to user - view tracking is not critical
            }
          }
        } else {
          setError('Listing not found');
        }
      } catch (err) {
        console.error('Error fetching listing:', err);
        setError('Failed to load listing');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchListing();
    }
  }, [id, currentUser]);

  // Load blocked dates and existing bookings for the listing
  useEffect(() => {
    const loadAvailability = async () => {
      if (!listing || !listing.hostId || !listing.id) return;
      
      setLoadingAvailability(true);
      try {
        // Load blocked dates
        const blockedRef = doc(db, 'listingAvailability', `${listing.id}_${listing.hostId}`);
        const blockedSnap = await getDoc(blockedRef);
        
        if (blockedSnap.exists()) {
          const blockedData = blockedSnap.data();
          setBlockedDates(blockedData.blockedDates || []);
        } else {
          setBlockedDates([]);
        }

        // Load existing bookings for this listing (only confirmed/active bookings)
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('listingId', '==', listing.id),
          where('status', 'in', ['confirmed', 'active', 'pending'])
        );
        
        const bookingsSnapshot = await getDocs(bookingsQuery);
        const bookings = bookingsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            checkIn: data.checkIn?.toDate ? data.checkIn.toDate() : (data.checkIn?.seconds ? new Date(data.checkIn.seconds * 1000) : null),
            checkOut: data.checkOut?.toDate ? data.checkOut.toDate() : (data.checkOut?.seconds ? new Date(data.checkOut.seconds * 1000) : null),
            status: data.status
          };
        }).filter(booking => booking.checkIn && booking.checkOut);
        
        setExistingBookings(bookings);
      } catch (error) {
        console.error('Error loading availability:', error);
        // Don't show error to user, just log it
        setBlockedDates([]);
        setExistingBookings([]);
      } finally {
        setLoadingAvailability(false);
      }
    };

    if (listing) {
      loadAvailability();
    }
  }, [listing]);

  // Load reviews
  useEffect(() => {
    if (!id) return;

    // Remove orderBy to avoid index requirement - sort client-side instead
    const q = query(
      collection(db, 'reviews'),
      where('listingId', '==', id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reviewsData = snapshot.docs.map(doc => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt?.seconds * 1000 || 0);
        return {
          id: doc.id,
          ...data,
          createdAt
        };
      });
      
      // Sort client-side by createdAt (newest first)
      const sortedReviews = reviewsData.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
      setReviews(sortedReviews);
    }, (error) => {
      console.error('Error fetching reviews:', error);
      if (error.code === 'failed-precondition') {
        console.error('⚠️ Firestore index required. Falling back to client-side sorting.');
      }
      setReviews([]);
    });

    return () => unsubscribe();
  }, [id]);

  // Check if favorited
  useEffect(() => {
    if (!currentUser || !listing) return;
    
    const key = listing.propertyType === 'home' ? 'ee_favorites_home' :
                listing.propertyType === 'experience' ? 'ee_favorites_experiences' :
                'ee_favorites_services';
    
    try {
      const favorites = JSON.parse(localStorage.getItem(key) || '[]');
      setIsFavorited(favorites.includes(id));
    } catch (e) {
      setIsFavorited(false);
    }
  }, [currentUser, listing, id]);

  const toggleFavorite = () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const key = listing?.propertyType === 'home' ? 'ee_favorites_home' :
                listing?.propertyType === 'experience' ? 'ee_favorites_experiences' :
                'ee_favorites_services';
    
    try {
      const favorites = JSON.parse(localStorage.getItem(key) || '[]');
      const newFavorites = favorites.includes(id)
        ? favorites.filter(f => f !== id)
        : [...favorites, id];
      localStorage.setItem(key, JSON.stringify(newFavorites));
      setIsFavorited(!isFavorited);
    } catch (e) {
      console.error('Error toggling favorite:', e);
    }
  };

  const shareListing = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: listing?.homeDetails?.title || listing?.experienceDetails?.title || listing?.serviceDetails?.title,
          text: `Check out this ${listing?.propertyType} on EcoExpress!`,
          url
        });
      } else {
        setShowShareMenu(true);
      }
    } catch (e) {
      // User cancelled share, show menu instead
      setShowShareMenu(true);
    }
  };

  const getShareUrl = () => window.location.href;
  const getShareTitle = () => listing?.homeDetails?.title || listing?.experienceDetails?.title || listing?.serviceDetails?.title || 'EcoExpress Listing';
  const getShareDescription = () => `Check out this amazing ${listing?.propertyType} on EcoExpress!`;
  const getShareImage = () => {
    if (listing?.photos && listing.photos.length > 0) {
      const photo = typeof listing.photos[0] === 'string' ? listing.photos[0] : listing.photos[0]?.url;
      return photo || '';
    }
    return '';
  };

  const shareToFacebook = () => {
    const url = encodeURIComponent(getShareUrl());
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
    setShowShareMenu(false);
  };

  const shareToTwitter = () => {
    const url = encodeURIComponent(getShareUrl());
    const text = encodeURIComponent(`${getShareTitle()} - ${getShareDescription()}`);
    const shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
    setShowShareMenu(false);
  };

  const shareToInstagram = () => {
    // Instagram doesn't support direct URL sharing via web
    // We'll copy the URL and show instructions
    navigator.clipboard.writeText(getShareUrl());
    toast.success('Link copied! Open Instagram and paste it in your story or post.');
    setShowShareMenu(false);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      toast.success('Link copied to clipboard!');
      setShowShareMenu(false);
    } catch (e) {
      toast.error('Failed to copy link');
    }
  };

  const shareToEmail = () => {
    const subject = encodeURIComponent(`Check out this ${listing?.propertyType} on EcoExpress!`);
    const body = encodeURIComponent(`${getShareDescription()}\n\n${getShareUrl()}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setShowShareMenu(false);
  };

  const shareToWhatsApp = () => {
    const text = encodeURIComponent(`${getShareTitle()} - ${getShareDescription()} ${getShareUrl()}`);
    const shareUrl = `https://wa.me/?text=${text}`;
    window.open(shareUrl, '_blank');
    setShowShareMenu(false);
  };

  const getPropertyDetails = () => {
    if (!listing) return null;
    switch(listing.propertyType) {
      case 'home': return listing.homeDetails;
      case 'experience': return listing.experienceDetails;
      case 'service': return listing.serviceDetails;
      default: return null;
    }
  };

  const calculateTotalPrice = () => {
    if (!listing?.pricing?.basePrice) return 0;
    const basePrice = parseFloat(listing.pricing.basePrice) || 0;
    
    if (listing.propertyType === 'home' && checkIn && checkOut) {
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
      return basePrice * nights;
    }
    
    // If checkout is not provided, charge for 1 night (or base price)
    if (listing.propertyType === 'home' && checkIn && !checkOut) {
      return basePrice;
    }
    
    return basePrice * guests;
  };

  const calculateServiceFeeAmount = () => {
    const totalPrice = calculateTotalPrice();
    return calculateServiceFee(totalPrice); // Uses current service fee percentage
  };

  const calculateGrandTotal = () => {
    const subtotal = calculateTotalPrice();
    const serviceFee = calculateServiceFeeAmount();
    const total = subtotal + serviceFee;
    return total - discountAmount;
  };

  const calculateNights = () => {
    if (listing?.propertyType === 'home' && checkIn && checkOut) {
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      return Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    }
    return 1;
  };

  const handleApplyPromo = () => {
    // Simple promo code logic - can be enhanced later
    if (promoCode.toLowerCase() === 'welcome10') {
      const subtotal = calculateTotalPrice();
      const discount = subtotal * 0.1; // 10% discount
      setDiscountAmount(discount);
      setAppliedPromo({ code: promoCode, discount: discount });
      toast.success('Promo code applied! 10% discount added.');
    } else if (promoCode.trim() !== '') {
      toast.error('Invalid promo code');
    }
  };

  const handleBooking = () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    // Validation
    if (!checkIn) {
      toast.error('Please select a check-in date');
      return;
    }

    // Check if check-in date is in the past
    const checkInDate = new Date(checkIn);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (checkInDate < today) {
      toast.error('Check-in date cannot be in the past');
      return;
    }

    // If checkout is provided, validate it
    if (checkOut) {
      const checkOutDate = new Date(checkOut);
      if (checkOutDate <= checkInDate) {
        toast.error('Check-out date must be after check-in date');
        return;
      }
    }

    // Check for blocked dates
    const checkInStr = checkInDate.toISOString().split('T')[0];
    if (blockedDates.includes(checkInStr)) {
      toast.error('Selected check-in date is not available (blocked by host)');
      return;
    }

    if (checkOut) {
      const checkOutDate = new Date(checkOut);
      const checkOutStr = checkOutDate.toISOString().split('T')[0];
      
      // Check if any date in the range is blocked
      const checkDate = new Date(checkInDate);
      while (checkDate <= checkOutDate) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (blockedDates.includes(dateStr)) {
          toast.error(`Selected dates include a blocked date (${dateStr}). Please select different dates.`);
          return;
        }
        checkDate.setDate(checkDate.getDate() + 1);
      }

      // Check for overlapping bookings
      for (const booking of existingBookings) {
        if (booking.checkIn && booking.checkOut) {
          const bookingCheckIn = new Date(booking.checkIn);
          const bookingCheckOut = new Date(booking.checkOut);
          bookingCheckIn.setHours(0, 0, 0, 0);
          bookingCheckOut.setHours(0, 0, 0, 0);
          
          // Check if dates overlap
          if (
            (checkInDate >= bookingCheckIn && checkInDate < bookingCheckOut) ||
            (checkOutDate > bookingCheckIn && checkOutDate <= bookingCheckOut) ||
            (checkInDate <= bookingCheckIn && checkOutDate >= bookingCheckOut)
          ) {
            toast.error('Selected dates overlap with an existing booking. Please select different dates.');
            return;
          }
        }
      }
    }

    // Show booking confirmation modal first
    setShowConfirmBookingModal(true);
  };

  const handleConfirmBooking = () => {
    // Close confirmation modal and show payment method selection
    setShowConfirmBookingModal(false);
    setShowPaymentMethodModal(true);
  };

  const handleSelectPaymentMethod = (method) => {
    setShowPaymentMethodModal(false);
    if (method === 'wallet') {
      setShowWalletPaymentModal(true);
    } else if (method === 'paypal') {
      setShowPayPal(true);
    }
  };

  const handleWalletPayment = async () => {
    const totalAmount = calculateGrandTotal();
    
    if (balance < totalAmount) {
      toast.error(`Insufficient wallet balance. You need ₱${totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} but have ₱${balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`);
      return;
    }

    try {
      setProcessingPayment(true);
      setBooking({ loading: true, error: null });

      const basePrice = calculateTotalPrice();
      const serviceFee = calculateServiceFeeAmount();

      // Deduct from wallet
      await deduct(totalAmount, `Booking for ${listing.homeDetails?.title || listing.experienceDetails?.title || listing.serviceDetails?.title}`, null);

      // Create booking
      const bookingId = await createBooking({
        listingId: id,
        guestId: currentUser.uid,
        hostId: listing.hostId,
        guestName: currentUser.displayName || currentUser.email,
        guestEmail: currentUser.email,
        hostName: listing.hostName,
        checkIn: new Date(checkIn),
        checkOut: listing.propertyType === 'home' ? new Date(checkOut) : null,
        guests,
        basePrice,
        serviceFee,
        totalAmount,
        paymentMethod: 'wallet',
        promoCode: appliedPromo?.code || null,
        discountAmount: discountAmount,
        listingInfo: {
          title: listing.homeDetails?.title || listing.experienceDetails?.title || listing.serviceDetails?.title,
          type: listing.propertyType,
          location: listing.location?.address || 'Location not specified'
        }
      });

      toast.success('✅ Booking successful! Your booking is pending host confirmation.');
      setShowWalletPaymentModal(false);
      setShowBookingForm(false);
      navigate('/trips');
    } catch (error) {
      console.error('Booking error:', error);
      setBooking({ loading: false, error: error.message });
      toast.error(`Failed to create booking: ${error.message}`);
    } finally {
      setProcessingPayment(false);
      setBooking({ loading: false, error: null });
    }
  };

  const handlePayPalSuccess = async (paymentData) => {
    try {
      setProcessingPayment(true);
      setBooking({ loading: true, error: null });

      const totalAmount = calculateGrandTotal();
      const basePrice = calculateTotalPrice();
      const serviceFee = calculateServiceFeeAmount();

      // Create booking with PayPal payment
      const bookingId = await createBooking({
        listingId: id,
        guestId: currentUser.uid,
        hostId: listing.hostId,
        guestName: currentUser.displayName || currentUser.email,
        guestEmail: currentUser.email,
        hostName: listing.hostName,
        checkIn: new Date(checkIn),
        checkOut: listing.propertyType === 'home' ? new Date(checkOut) : null,
        guests,
        basePrice,
        serviceFee,
        totalAmount,
        paymentMethod: 'paypal',
        promoCode: appliedPromo?.code || null,
        discountAmount: discountAmount,
        paymentDetails: {
          orderId: paymentData.orderID,
          payerId: paymentData.payerID,
          orderDetails: paymentData.orderDetails
        },
        listingInfo: {
          title: listing.homeDetails?.title || listing.experienceDetails?.title || listing.serviceDetails?.title,
          type: listing.propertyType,
          location: listing.location?.address || 'Location not specified'
        }
      });

      // Send payment to host wallet (base price only, service fee goes to platform)
      try {
        // Get host's wallet context - we need to use the host's wallet
        // Since we can't directly access host's wallet from guest context,
        // we'll use the receivePayment function which should be called from host's context
        // For now, we'll create a transaction record that the host's wallet can process
        // The actual wallet credit will be handled by the booking completion process
        
        toast.success('✅ Payment successful! Your booking is pending host confirmation.');
        setShowPayPal(false);
        setShowBookingForm(false);
        setShowPaymentMethodModal(false);
        navigate('/trips');
      } catch (walletError) {
        console.error('Error processing host payment:', walletError);
        // Booking is still created, just wallet update failed
        toast.success('✅ Booking created! Payment processing may take a moment.');
        setShowPayPal(false);
        setShowBookingForm(false);
        navigate('/trips');
      }
    } catch (error) {
      console.error('Booking error:', error);
      setBooking({ loading: false, error: error.message });
      toast.error(`Failed to create booking: ${error.message}`);
      setShowPayPal(false);
    } finally {
      setProcessingPayment(false);
      setBooking({ loading: false, error: null });
    }
  };

  const getAverageRating = () => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + (review.rating || 0), 0);
    return (sum / reviews.length).toFixed(2);
  };

  const getRatingBreakdown = () => {
    const breakdown = {
      cleanliness: 0,
      accuracy: 0,
      checkin: 0,
      communication: 0,
      location: 0,
      value: 0
    };
    
    reviews.forEach(review => {
      if (review.breakdown) {
        breakdown.cleanliness += review.breakdown.cleanliness || 0;
        breakdown.accuracy += review.breakdown.accuracy || 0;
        breakdown.checkin += review.breakdown.checkin || 0;
        breakdown.communication += review.breakdown.communication || 0;
        breakdown.location += review.breakdown.location || 0;
        breakdown.value += review.breakdown.value || 0;
      }
    });
    
    const count = reviews.length || 1;
    return {
      cleanliness: (breakdown.cleanliness / count).toFixed(1),
      accuracy: (breakdown.accuracy / count).toFixed(1),
      checkin: (breakdown.checkin / count).toFixed(1),
      communication: (breakdown.communication / count).toFixed(1),
      location: (breakdown.location / count).toFixed(1),
      value: (breakdown.value / count).toFixed(1)
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading listing...</p>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Listing Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'The listing you\'re looking for doesn\'t exist.'}</p>
          <Link to="/guest/homes" className="bg-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors">
            Browse Listings
          </Link>
        </div>
      </div>
    );
  }

  const propertyDetails = getPropertyDetails();
  const photos = listing.photos || [];
  const avgRating = getAverageRating();
  const ratingBreakdown = getRatingBreakdown();

  return (
    <div className="min-h-screen bg-white">
      {/* Enhanced Header with Share and Save */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link 
                to={currentUser ? '/guest/homes' : '/homes'} 
                className="text-gray-700 hover:text-gray-900 transition-colors flex items-center gap-2 group"
              >
                <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="font-medium">Back</span>
              </Link>
              <span className="text-gray-300">|</span>
              <span className="text-sm text-gray-600 truncate max-w-xs">
                {propertyDetails?.title || 'Listing Details'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Report Issue Button - Only show for authenticated guests */}
              {currentUser && listing.hostId !== currentUser.uid && (
                <button
                  onClick={() => setShowFeedbackModal(true)}
                  className="px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 flex items-center gap-2 hover:scale-105"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Report Issue
                </button>
              )}
              <div className="relative">
                <button
                  onClick={shareListing}
                  className="px-5 py-2.5 text-sm font-semibold bg-gradient-to-r from-teal-600 to-emerald-600 text-white hover:from-teal-700 hover:to-emerald-700 rounded-xl transition-all duration-200 flex items-center gap-2 hover:scale-105 shadow-md hover:shadow-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342c0 .479.185.958.684 1.316.6.367 1.5.684 2.684.684.479 0 1.05.019 1.632.082 1.316.123 2.632.518 3.684.868v-2.211c-1.5-.684-3.158-.868-4.632-.632-1.158.184-2.316.553-3.316.947-.6.316-1.053.789-1.316 1.158zM8.684 13.342c-.6-.684-1.5-1.026-2.684-1.026-.479 0-1.05.019-1.632.082-1.316.123-2.632.518-3.684.868v-2.211c1.5-.684 3.158-.868 4.632-.632 1.158.184 2.316.553 3.316.947.6.316 1.053.789 1.316 1.158zM8.684 8.658c-.6-.684-1.5-1.026-2.684-1.026-.479 0-1.05.019-1.632.082-1.316.123-2.632.518-3.684.868v-2.211c1.5-.684 3.158-.868 4.632-.632 1.158.184 2.316.553 3.316.947.6.316 1.053.789 1.316 1.158z" />
                  </svg>
                  Share
                </button>
                
                {/* Enhanced Share Menu Dropdown */}
                {showShareMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" 
                      onClick={() => setShowShareMenu(false)}
                    ></div>
                    <div className="absolute right-0 top-full mt-3 bg-white rounded-2xl shadow-2xl border-2 border-gray-100 p-6 z-50 min-w-[280px] animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-bold text-gray-900">Share this listing</h3>
                        <button
                          onClick={() => setShowShareMenu(false)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <button
                          onClick={shareToFacebook}
                          className="flex flex-col items-center gap-2.5 p-4 rounded-xl hover:bg-blue-50 transition-all hover:scale-110 border-2 border-gray-100 hover:border-blue-200 group"
                        >
                          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all">
                            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                          </div>
                          <span className="text-xs font-semibold text-gray-700">Facebook</span>
                        </button>
                        
                        <button
                          onClick={shareToTwitter}
                          className="flex flex-col items-center gap-2.5 p-4 rounded-xl hover:bg-sky-50 transition-all hover:scale-110 border-2 border-gray-100 hover:border-sky-200 group"
                        >
                          <div className="w-12 h-12 bg-sky-500 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all">
                            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                            </svg>
                          </div>
                          <span className="text-xs font-semibold text-gray-700">Twitter</span>
                        </button>
                        
                        <button
                          onClick={shareToInstagram}
                          className="flex flex-col items-center gap-2.5 p-4 rounded-xl hover:bg-pink-50 transition-all hover:scale-110 border-2 border-gray-100 hover:border-pink-200 group"
                        >
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all">
                            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                            </svg>
                          </div>
                          <span className="text-xs font-semibold text-gray-700">Instagram</span>
                        </button>
                        
                        <button
                          onClick={shareToWhatsApp}
                          className="flex flex-col items-center gap-2.5 p-4 rounded-xl hover:bg-green-50 transition-all hover:scale-110 border-2 border-gray-100 hover:border-green-200 group"
                        >
                          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all">
                            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                            </svg>
                          </div>
                          <span className="text-xs font-semibold text-gray-700">WhatsApp</span>
                        </button>
                        
                        <button
                          onClick={shareToEmail}
                          className="flex flex-col items-center gap-2.5 p-4 rounded-xl hover:bg-gray-50 transition-all hover:scale-110 border-2 border-gray-100 hover:border-gray-200 group"
                        >
                          <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <span className="text-xs font-semibold text-gray-700">Email</span>
                        </button>
                        
                        <button
                          onClick={copyLink}
                          className="flex flex-col items-center gap-2.5 p-4 rounded-xl hover:bg-teal-50 transition-all hover:scale-110 border-2 border-gray-100 hover:border-teal-200 group"
                        >
                          <div className="w-12 h-12 bg-teal-600 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <span className="text-xs font-semibold text-gray-700">Copy Link</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={toggleFavorite}
                className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-2 hover:scale-105 ${
                  isFavorited 
                    ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg 
                  className={`w-5 h-5 ${isFavorited ? 'text-red-500 fill-current' : 'text-gray-600'}`} 
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={isFavorited ? 0 : 2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span className="hidden sm:inline">Save</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Photo Gallery */}
        {photos.length > 0 && (
          <div className="mb-10">
            <div className="grid grid-cols-4 gap-2 h-[500px] md:h-[600px] rounded-2xl overflow-hidden shadow-lg">
              {/* Main large photo */}
              <div 
                className="col-span-2 row-span-2 relative cursor-pointer group overflow-hidden bg-gray-100"
                onClick={() => {
                  setSelectedPhotoIndex(0);
                  setShowPhotoModal(true);
                }}
              >
                <img
                  src={photos[0]?.url || photos[0]}
                  alt="Main listing photo"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                  <button className="text-white font-semibold bg-white/20 backdrop-blur-sm px-6 py-3 rounded-xl hover:bg-white/30 transition-colors border border-white/30">
                    Show all photos
                  </button>
                </div>
              </div>

              {/* Smaller photos */}
              {photos.slice(1, 5).map((photo, index) => (
                <div
                  key={index}
                  className={`relative cursor-pointer group overflow-hidden bg-gray-100 ${
                    index === 0 ? 'col-span-2' : ''
                  }`}
                  onClick={() => {
                    setSelectedPhotoIndex(index + 1);
                    setShowPhotoModal(true);
                  }}
                >
                  <img
                    src={photo?.url || photo}
                    alt={`Photo ${index + 2}`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  {index === 3 && photos.length > 5 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-lg backdrop-blur-sm">
                      <div className="text-center">
                        <div className="text-3xl mb-1">+{photos.length - 5}</div>
                        <div className="text-sm">more photos</div>
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Enhanced Title and Rating */}
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">
                {propertyDetails?.title || 'Untitled Listing'}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm md:text-base mb-6">
                <div className="flex items-center gap-1.5">
                  <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                  <span className="font-semibold text-gray-900">{avgRating}</span>
                </div>
                <span className="text-gray-300">·</span>
                <Link 
                  to="#reviews" 
                  className="text-gray-700 underline hover:text-teal-600 transition-colors font-medium"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('reviews');
                    setTimeout(() => {
                      document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                >
                  {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                </Link>
                <span className="text-gray-300">·</span>
                <span className="text-gray-700 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {listing.location?.city || 'Location'}, {listing.location?.country || 'Philippines'}
                </span>
              </div>
            </div>

            {/* Enhanced Host Info */}
            <div className="border border-gray-200 rounded-2xl p-6 mb-8 bg-gradient-to-br from-gray-50 to-white">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center overflow-hidden shadow-lg ring-2 ring-teal-100">
                    {listing.hostPhotoURL ? (
                      <img src={listing.hostPhotoURL} alt={listing.hostName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-2xl font-bold">
                        {listing.hostName?.charAt(0)?.toUpperCase() || 'H'}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 mb-1">Hosted by {listing.hostName || 'Host'}</h3>
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        2 years hosting
                      </span>
                    </p>
                  </div>
                </div>
                {currentUser && listing.hostId !== currentUser.uid && (
                  <Link
                    to={`/messages?host=${listing.hostId}&listing=${id}`}
                    className="px-6 py-3 border-2 border-gray-900 rounded-xl text-sm font-bold hover:bg-gray-900 hover:text-white transition-all duration-200 hover:scale-105"
                  >
                    Contact host
                  </Link>
                )}
              </div>
            </div>

            {/* Enhanced Tabs */}
            <div className="border-b-2 border-gray-200 mb-8">
              <div className="flex gap-8">
                {['overview', 'reviews', 'location'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-4 px-1 font-bold text-base capitalize border-b-3 transition-all duration-200 relative ${
                      activeTab === tab
                        ? 'text-gray-900 border-teal-600'
                        : 'text-gray-500 border-transparent hover:text-gray-700'
                    }`}
                    style={{
                      borderBottomWidth: activeTab === tab ? '3px' : '2px',
                      borderBottomColor: activeTab === tab ? '#0d9488' : 'transparent'
                    }}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    {activeTab === tab && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Enhanced Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-10">
                {/* Enhanced Highlights */}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Listing highlights</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {listing.homeDetails?.amenities?.slice(0, 6).map((amenity, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-gray-800 font-medium">{amenity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Enhanced Description */}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">About this place</h2>
                  <div className="text-gray-700 whitespace-pre-wrap leading-relaxed text-lg">
                    {propertyDetails?.description || 'No description available.'}
                  </div>
                </div>

                {/* Enhanced Where you'll sleep */}
                {listing.propertyType === 'home' && listing.homeDetails?.bedrooms && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Where you'll sleep</h2>
                    <div className="border-2 border-gray-200 rounded-2xl p-6 bg-gradient-to-br from-gray-50 to-white hover:shadow-lg transition-shadow">
                      <div className="text-5xl mb-3">🛏️</div>
                      <p className="font-bold text-lg text-gray-900 mb-2">Bedroom</p>
                      <p className="text-gray-700 text-base">
                        {listing.homeDetails.bedrooms} {listing.homeDetails.bedrooms === 1 ? 'bedroom' : 'bedrooms'}
                        {listing.homeDetails.bathrooms && ` · ${listing.homeDetails.bathrooms} ${listing.homeDetails.bathrooms === 1 ? 'bathroom' : 'bathrooms'}`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Enhanced Amenities */}
                {listing.homeDetails?.amenities && listing.homeDetails.amenities.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">What this place offers</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {listing.homeDetails.amenities.map((amenity, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                          <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <span className="text-gray-800 font-medium">{amenity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Location Map */}
                {listing.location && listing.location.latitude && listing.location.longitude && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Where you'll be</h2>
                    <p className="text-gray-700 mb-4 text-lg">
                      {listing.location.address || `${listing.location.city || ''}, ${listing.location.state || ''} ${listing.location.country || 'Philippines'}`.trim()}
                    </p>
                    <div className="h-[450px] rounded-2xl overflow-hidden border-2 border-gray-200 shadow-lg">
                      <MapContainer
                        center={[listing.location.latitude, listing.location.longitude]}
                        zoom={14}
                        style={{ height: '100%', width: '100%' }}
                        scrollWheelZoom={true}
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                        <Marker position={[listing.location.latitude, listing.location.longitude]}>
                          <Popup>
                            <div className="text-center">
                              <p className="font-semibold text-gray-900 mb-1">{propertyDetails?.title || 'Listing Location'}</p>
                              <p className="text-sm text-gray-600">
                                {listing.location.address || `${listing.location.city || ''}, ${listing.location.country || 'Philippines'}`.trim()}
                              </p>
                            </div>
                          </Popup>
                        </Marker>
                      </MapContainer>
                    </div>
                  </div>
                )}

                {/* House Rules */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Things to know</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">House rules</h3>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li>Check-in: After 3:00 PM</li>
                        <li>Checkout: 11:00 AM</li>
                        <li>Maximum {listing.homeDetails?.maxGuests || 4} guests</li>
                        <li>No smoking</li>
                        <li>No parties or events</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Safety & property</h3>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li>✓ Carbon monoxide alarm</li>
                        <li>✓ Smoke alarm</li>
                        <li>✓ First aid kit available</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Cancellation policy</h3>
                      <p className="text-sm text-gray-600">Free cancellation before check-in</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-8" id="reviews">
                {/* Enhanced Rating Summary */}
                <div className="border-2 border-gray-200 rounded-2xl p-8 bg-gradient-to-br from-gray-50 to-white mb-8">
                  <div className="flex items-center gap-6 mb-8">
                    <div className="text-6xl font-bold text-gray-900">{avgRating}</div>
                    <div>
                      <div className="flex items-center mb-2">
                        <svg className="w-6 h-6 text-yellow-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                        </svg>
                      </div>
                      <p className="text-base font-semibold text-gray-700">{reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}</p>
                    </div>
                  </div>
                  {reviews.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-600">Cleanliness</span>
                          <span className="font-semibold">{ratingBreakdown.cleanliness}</span>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-600">Accuracy</span>
                          <span className="font-semibold">{ratingBreakdown.accuracy}</span>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-600">Check-in</span>
                          <span className="font-semibold">{ratingBreakdown.checkin}</span>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-600">Communication</span>
                          <span className="font-semibold">{ratingBreakdown.communication}</span>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-600">Location</span>
                          <span className="font-semibold">{ratingBreakdown.location}</span>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-600">Value</span>
                          <span className="font-semibold">{ratingBreakdown.value}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Enhanced Reviews List */}
                <div className="space-y-6">
                  {reviews.length === 0 ? (
                    <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
                      <div className="text-5xl mb-4">⭐</div>
                      <p className="text-gray-600 text-lg font-medium">No reviews yet. Be the first to review this listing!</p>
                    </div>
                  ) : (
                    reviews.map(review => (
                      <div key={review.id} className="border-2 border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-shadow bg-white">
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                            <span className="text-white text-xl font-bold">
                              {review.guestName?.charAt(0)?.toUpperCase() || 'G'}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <h4 className="font-bold text-lg text-gray-900">{review.guestName || 'Guest'}</h4>
                              <span className="text-gray-300">·</span>
                              <span className="text-sm text-gray-600">
                                {review.createdAt?.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) || 'Recently'}
                              </span>
                            </div>
                            <div className="flex items-center mb-3">
                              {[...Array(5)].map((_, i) => (
                                <svg
                                  key={i}
                                  className={`w-5 h-5 ${i < (review.rating || 0) ? 'text-yellow-500 fill-current' : 'text-gray-300'}`}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                </svg>
                              ))}
                            </div>
                            <p className="text-gray-700 leading-relaxed text-base">{review.comment || review.content || 'No comment provided.'}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'location' && listing.location && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Where you'll be</h2>
                <p className="text-gray-700 mb-4">
                  {listing.location.address || `${listing.location.city}, ${listing.location.state || ''} ${listing.location.country || 'Philippines'}`.trim()}
                </p>
                {listing.location.latitude && listing.location.longitude ? (
                  <div className="h-[400px] rounded-xl overflow-hidden border border-gray-200">
                    <MapContainer
                      center={[listing.location.latitude, listing.location.longitude]}
                      zoom={13}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      />
                      <Marker position={[listing.location.latitude, listing.location.longitude]}>
                        <Popup>{propertyDetails?.title}</Popup>
                      </Marker>
                    </MapContainer>
                  </div>
                ) : (
                  <div className="h-[400px] bg-gray-100 rounded-xl flex items-center justify-center text-gray-500">
                    Map location not available
                  </div>
                )}
              </div>
            )}

            {/* Host Profile Section */}
            <div className="border-t border-gray-200 pt-8 mt-8">
              <div className="flex items-start gap-6">
                <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {listing.hostPhotoURL ? (
                    <img src={listing.hostPhotoURL} alt={listing.hostName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-teal-600 text-2xl font-semibold">
                      {listing.hostName?.charAt(0)?.toUpperCase() || 'H'}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Meet your host, {listing.hostName || 'Host'}</h3>
                  <p className="text-gray-600 mb-4">2 years hosting · {reviews.length} reviews</p>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-yellow-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                      <span className="font-semibold">{avgRating}</span>
                    </div>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-600">Response rate: 100%</span>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-600">Responds within an hour</span>
                  </div>
                  {currentUser && listing.hostId !== currentUser.uid && (
                    <Link
                      to={`/messages?host=${listing.hostId}&listing=${id}`}
                      className="inline-block mt-4 px-6 py-2 border border-gray-900 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                    >
                      Message host
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="border border-gray-200 rounded-2xl p-6 shadow-lg bg-white">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <span className="text-2xl font-semibold text-gray-900">
                      ₱{parseFloat(listing.pricing?.basePrice || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-gray-600">
                      {listing.propertyType === 'home' ? ' / night' : '/ person'}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <svg className="w-4 h-4 text-yellow-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                    <span className="font-semibold">{avgRating}</span>
                    <span className="text-gray-500 ml-1">({reviews.length})</span>
                  </div>
                </div>

                {listing.propertyType === 'home' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-2">SELECT DATES</label>
                      <div className="border border-gray-300 rounded-lg p-3">
                        <InlineDateRangePicker
                          startDate={checkIn}
                          endDate={checkOut}
                          onChange={(start, end) => {
                            setCheckIn(start);
                            setCheckOut(end);
                          }}
                          minDate={new Date().toISOString().split('T')[0]}
                          blockedDates={blockedDates}
                          existingBookings={existingBookings}
                        />
                      </div>
                    </div>
                    <div className="border border-gray-300 rounded-lg p-3">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">GUESTS</label>
                      <select
                        value={guests}
                        onChange={(e) => setGuests(Number(e.target.value))}
                        className="w-full text-sm font-semibold text-gray-900 focus:outline-none"
                      >
                        {[...Array(listing.homeDetails?.maxGuests || 10)].map((_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {i + 1} {i === 0 ? 'guest' : 'guests'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-2">SELECT DATE</label>
                      <div className="border border-gray-300 rounded-lg p-3">
                        <InlineDateRangePicker
                          startDate={checkIn}
                          endDate={''}
                          onChange={(start, end) => {
                            setCheckIn(start);
                            setCheckOut('');
                          }}
                          minDate={new Date().toISOString().split('T')[0]}
                          blockedDates={blockedDates}
                          existingBookings={existingBookings}
                          singleDateMode={true}
                        />
                      </div>
                      {blockedDates.length > 0 && (
                        <p className="text-xs text-gray-500 mt-2">
                          <span className="text-red-500">✕</span> Red dates are blocked by the host
                        </p>
                      )}
                    </div>
                    <div className="border border-gray-300 rounded-lg p-3">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">GUESTS</label>
                      <select
                        value={guests}
                        onChange={(e) => setGuests(Number(e.target.value))}
                        className="w-full text-sm font-semibold text-gray-900 focus:outline-none"
                      >
                        {[...Array(listing.experienceDetails?.maxGuests || listing.serviceDetails?.maxGuests || 10)].map((_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {i + 1} {i === 0 ? 'guest' : 'guests'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {!currentUser ? (
                  <Link
                    to="/login"
                    className="mt-6 w-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white py-4 rounded-lg font-semibold hover:from-teal-700 hover:to-emerald-700 transition-all text-center block"
                  >
                    Login to Reserve
                  </Link>
                ) : (
                  <button
                    onClick={handleBooking}
                    className="mt-6 w-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white py-4 rounded-lg font-semibold hover:from-teal-700 hover:to-emerald-700 transition-all"
                  >
                    Reserve
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Photo Modal */}
      {showPhotoModal && photos.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4" onClick={() => setShowPhotoModal(false)}>
          <div className="max-w-6xl w-full relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowPhotoModal(false)}
              className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70 z-10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={photos[selectedPhotoIndex]?.url || photos[selectedPhotoIndex]}
              alt={`Photo ${selectedPhotoIndex + 1}`}
              className="w-full h-auto max-h-[90vh] object-contain rounded-lg"
            />
            {photos.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                {photos.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedPhotoIndex(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === selectedPhotoIndex ? 'bg-white w-8' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <GuestFeedback
          listingId={id}
          onClose={() => setShowFeedbackModal(false)}
        />
      )}

      {/* Booking Confirmation Modal */}
      {showConfirmBookingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowConfirmBookingModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Confirm Your Booking</h2>
              <button
                onClick={() => setShowConfirmBookingModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Check-in:</span>
                <span className="font-semibold">{checkIn ? new Date(checkIn).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not selected'}</span>
              </div>
              {checkOut && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Check-out:</span>
                  <span className="font-semibold">{new Date(checkOut).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Guests:</span>
                <span className="font-semibold">{guests}</span>
              </div>
              {listing?.propertyType === 'home' && checkIn && checkOut && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Nights:</span>
                  <span className="font-semibold">{calculateNights()}</span>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-4 mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-gray-700">Subtotal:</span>
                <span className="font-semibold">₱{calculateTotalPrice().toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between mb-2 text-green-600">
                  <span>Discount ({appliedPromo?.code}):</span>
                  <span className="font-semibold">-₱{discountAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between mb-2">
                <span className="text-gray-700">Service fee:</span>
                <span className="font-semibold">₱{calculateServiceFeeAmount().toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-gray-200">
                <span className="text-lg font-bold">Total:</span>
                <span className="text-lg font-bold text-teal-600">₱{calculateGrandTotal().toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Promo Code Section */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">PROMO CODE</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Enter promo code"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
                <button
                  onClick={handleApplyPromo}
                  className="px-6 py-2 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors"
                >
                  Apply
                </button>
              </div>
              {appliedPromo && (
                <p className="text-sm text-green-600 mt-2">✓ Promo code "{appliedPromo.code}" applied</p>
              )}
              {!appliedPromo && discountAmount === 0 && (
                <p className="text-xs text-gray-500 mt-1">No promo discounts applied.</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmBookingModal(false)}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBooking}
                className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors"
              >
                Continue to Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Method Selection Modal */}
      {showPaymentMethodModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowPaymentMethodModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Choose Payment Method</h2>
              <button
                onClick={() => setShowPaymentMethodModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-gray-600 mb-6">You can pay using your E-Wallet or PayPal to confirm your booking.</p>

            <div className="space-y-3 mb-6">
              <button
                onClick={() => handleSelectPaymentMethod('wallet')}
                className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <span className="font-semibold text-gray-900">Pay using E-Wallet</span>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <button
                onClick={() => handleSelectPaymentMethod('paypal')}
                className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.384zm-.407-13.88c-.022-.143-.023-.288 0-.436.983-5.05 4.35-6.796 8.648-6.796h2.188c.525 0 .968-.382 1.05-.9l1.12-7.38c.01-.07.01-.14 0-.21-.022-.143-.023-.288 0-.436.984-5.05 4.35-6.797 8.648-6.797h2.19c.524 0 .968.382 1.05.9l1.12 7.38-1.12 7.38c-.082.518-.526.9-1.05.9h-2.19c-4.297 0-7.664-1.747-8.647-6.797-.023-.143-.047-.288-.077-.437z"/>
                    </svg>
                  </div>
                  <span className="font-semibold text-gray-900">Pay using PayPal</span>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center mb-4">Powered by PayPal</p>

            <button
              onClick={() => setShowPaymentMethodModal(false)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          </div>
        </div>
      )}

      {/* Wallet Payment Modal */}
      {showWalletPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowWalletPaymentModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Pay with Wallet</h2>
              <button
                onClick={() => setShowWalletPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-2">Your wallet balance:</p>
              <p className="text-2xl font-bold text-teal-600">₱{balance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-2">Total amount:</p>
              <p className="text-2xl font-bold text-gray-900">₱{calculateGrandTotal().toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
            </div>

            {balance < calculateGrandTotal() && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">
                  Insufficient balance. You need ₱{(calculateGrandTotal() - balance).toLocaleString('en-PH', { minimumFractionDigits: 2 })} more.
                </p>
              </div>
            )}

            <button
              onClick={handleWalletPayment}
              disabled={balance < calculateGrandTotal() || processingPayment}
              className="w-full px-6 py-4 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-3"
            >
              {processingPayment ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                `Pay ₱${calculateGrandTotal().toLocaleString('en-PH', { minimumFractionDigits: 2 })} with Wallet`
              )}
            </button>

            <button
              onClick={() => {
                setShowWalletPaymentModal(false);
                setShowPaymentMethodModal(true);
              }}
              className="w-full text-sm text-gray-600 hover:text-gray-800 underline transition-colors"
            >
              Go back
            </button>
          </div>
        </div>
      )}

      {/* PayPal Payment Modal */}
      {showPayPal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowPayPal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Pay with PayPal</h2>
              <button
                onClick={() => setShowPayPal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-2">Total amount:</p>
              <p className="text-2xl font-bold text-gray-900">₱{calculateGrandTotal().toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
            </div>

            <div className="mb-6">
              <PayPalButton
                amount={calculateGrandTotal()}
                description={`Booking for ${listing?.homeDetails?.title || listing?.experienceDetails?.title || listing?.serviceDetails?.title}`}
                onSuccess={handlePayPalSuccess}
                onError={(err) => {
                  console.error('PayPal error:', err);
                  toast.error('Payment failed. Please try again.');
                  setShowPayPal(false);
                }}
                onCancel={() => {
                  setShowPayPal(false);
                }}
                disabled={processingPayment || booking.loading}
              />
            </div>

            <p className="text-xs text-gray-500 text-center mb-4">Powered by PayPal</p>

            <button
              onClick={() => {
                setShowPayPal(false);
                setShowPaymentMethodModal(true);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListingDetail;
