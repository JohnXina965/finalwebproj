import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useHost } from '../../contexts/HostContext';
import { useWallet } from '../../contexts/WalletContext';
import { renewListing, isListingExpired, getDaysUntilExpiration } from '../../services/ListingExpirationService';
import toast from 'react-hot-toast';
import HostReviewGuest from '../../components/HostReviewGuest';
import HostFeedback from '../../components/HostFeedback';
import CancellationModal from '../../components/CancellationModal';
import BookingStatusTimeline from '../../components/BookingStatusTimeline';
import { sendBookingApprovalEmail, sendBookingRejectionEmail } from '../../services/EmailService';
import { collection, query, where, getDocs, orderBy, onSnapshot, doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../Firebase';
import { calculateServiceFee } from '../../services/ServiceFeeService';
import { convertToPHP } from '../../services/PaypalServices';
import { getHostWishes, updateWishStatus } from '../../services/WishService';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getHostListingPerformance, getPerformanceSummary } from '../../services/ListingPerformanceService';
import { exportBookingsToCSV } from '../../services/BookingExportService';
import { PDFDownloadLink } from '@react-pdf/renderer';
import BookingsPDFDocument from '../../components/BookingsPDFDocument';
import { 
  getSubscriptionPlan, 
  canCreateListing, 
  getLimitReachedActions,
  getUpgradeOptions,
  getBulkSlotPricing,
  SUBSCRIPTION_PLANS,
  ADDITIONAL_LISTING_PRICES,
  BULK_SLOT_PRICING
} from '../../services/SubscriptionService';

const HostDashboard = () => {
  const { currentUser } = useAuth();
  const { hostData, updateHostData } = useHost();
  const { receivePayment, balance } = useWallet();
  
  const [activeSection, setActiveSection] = useState('dashboard');
  const [stats, setStats] = useState({
    totalListings: 0,
    activeBookings: 0,
    unreadMessages: 0,
    totalEarnings: 0,
    pendingReviews: 0,
    pendingWishes: 0,
    occupancyRate: 0
  });
  
  const [listings, setListings] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [messages, setMessages] = useState([]);
  const [wishes, setWishes] = useState([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [hostSubscription, setHostSubscription] = useState({
    planId: 'starter',
    status: 'active',
    additionalSlots: 0
  });

  // Dashboard sections
  const sections = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'listings', label: 'Listings', icon: '🏠' },
    { id: 'performance', label: 'Performance', icon: '📈' },
    { id: 'bookings', label: 'Bookings', icon: '📋' },
    { id: 'messages', label: 'Messages', icon: '💬' },
    { id: 'reviews', label: 'Reviews', icon: '⭐' },
    { id: 'wishes', label: 'Wishes', icon: '💭' },
    { id: 'calendar', label: 'Calendar', icon: '📅' },
    { id: 'subscription', label: 'Subscription', icon: '💳' },
    { id: 'payments', label: 'Payments', icon: '💰' },
    { id: 'coupons', label: 'Coupons', icon: '🎫' },
    { id: 'points', label: 'Points & Rewards', icon: '🎁' }
  ];

  // Fetch real data from Firebase
  useEffect(() => {
    if (!currentUser) return;

    const fetchHostData = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([
          fetchListings(),
          fetchDrafts(),
          fetchBookings(),
          fetchMessages(),
          fetchWishes(),
          fetchHostSubscription()
        ]);
      } catch (error) {
        console.error('Error fetching host data:', error);
        setError('Failed to load dashboard data. Please refresh the page.');
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchHostData();

    // Set up real-time listeners
    const unsubscribeListings = setupListingsListener();
    const unsubscribeDrafts = setupDraftsListener();
    const unsubscribeBookings = setupBookingsListener();

    return () => {
      unsubscribeListings?.();
      unsubscribeDrafts?.();
      unsubscribeBookings?.();
    };
  }, [currentUser]);

  // Update stats whenever listings, bookings, messages, or wishes change
  useEffect(() => {
    updateStats();
  }, [listings, bookings, messages, wishes]);

  // Fetch published listings
  const fetchListings = async () => {
    if (!currentUser) return;

    try {
      // Remove orderBy to avoid index requirement - sort client-side instead
      const q = query(
        collection(db, 'listings'),
        where('hostId', '==', currentUser.uid),
        where('status', '==', 'published')
      );
      
      const querySnapshot = await getDocs(q);
      const listingsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Convert Firestore timestamps to readable dates
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000) : new Date()),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt?.seconds ? new Date(data.updatedAt.seconds * 1000) : new Date())
        };
      });
      
      // Sort client-side by createdAt (newest first)
      listingsData.sort((a, b) => {
        const aTime = a.createdAt?.getTime() || 0;
        const bTime = b.createdAt?.getTime() || 0;
        return bTime - aTime;
      });
      
      setListings(listingsData);
      console.log('✅ Fetched listings:', listingsData.length);
      updateStats(); // Update stats after fetching
    } catch (error) {
      console.error('❌ Error fetching listings:', error);
      // Fallback: try without status filter if index issue
      try {
        const fallbackQ = query(
          collection(db, 'listings'),
          where('hostId', '==', currentUser.uid)
        );
        const fallbackSnapshot = await getDocs(fallbackQ);
        const fallbackData = fallbackSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000) : new Date()),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt?.seconds ? new Date(data.updatedAt.seconds * 1000) : new Date())
          };
        }).filter(item => item.status === 'published'); // Filter client-side
        fallbackData.sort((a, b) => {
          const aTime = a.createdAt?.getTime() || 0;
          const bTime = b.createdAt?.getTime() || 0;
          return bTime - aTime;
        });
        setListings(fallbackData);
        console.log('✅ Fetched listings (fallback):', fallbackData.length);
        updateStats();
      } catch (fallbackError) {
        console.error('❌ Fallback query also failed:', fallbackError);
        setListings([]);
      }
    }
  };

  // Fetch draft listings
  const fetchDrafts = async () => {
    if (!currentUser) return;

    try {
      // Remove orderBy to avoid index requirement
      const q = query(
        collection(db, 'drafts'),
        where('hostId', '==', currentUser.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const draftsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          lastSaved: data.lastSaved?.toDate ? data.lastSaved.toDate() : (data.lastSaved?.seconds ? new Date(data.lastSaved.seconds * 1000) : new Date())
        };
      });
      
      // Sort client-side by lastSaved (newest first)
      draftsData.sort((a, b) => {
        const aTime = a.lastSaved?.getTime() || 0;
        const bTime = b.lastSaved?.getTime() || 0;
        return bTime - aTime;
      });
      
      setDrafts(draftsData);
      console.log('✅ Fetched drafts:', draftsData.length);
    } catch (error) {
      console.error('❌ Error fetching drafts:', error);
      setDrafts([]);
    }
  };

  // Fetch bookings (you'll need to create this collection)
  const fetchBookings = async () => {
    if (!currentUser) return;

    try {
      // Remove orderBy to avoid index requirement
      const q = query(
        collection(db, 'bookings'),
        where('hostId', '==', currentUser.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const bookingsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          checkIn: data.checkIn?.toDate ? data.checkIn.toDate() : (data.checkIn?.seconds ? new Date(data.checkIn.seconds * 1000) : null),
          checkOut: data.checkOut?.toDate ? data.checkOut.toDate() : (data.checkOut?.seconds ? new Date(data.checkOut.seconds * 1000) : null)
        };
      });
      
      // Sort client-side by checkIn (newest first)
      bookingsData.sort((a, b) => {
        const aTime = a.checkIn?.getTime() || 0;
        const bTime = b.checkIn?.getTime() || 0;
        return bTime - aTime;
      });
      
      setBookings(bookingsData);
      console.log('✅ Fetched bookings:', bookingsData.length);
      updateStats(); // Update stats after fetching
    } catch (error) {
      console.error('❌ Error fetching bookings:', error);
      setBookings([]);
    }
  };

  // Fetch messages (you'll need to create this collection)
  const fetchMessages = async () => {
    if (!currentUser) return;

    try {
      // Remove orderBy to avoid index requirement
      const q = query(
        collection(db, 'messages'),
        where('hostId', '==', currentUser.uid),
        where('read', '==', false)
      );
      
      const querySnapshot = await getDocs(q);
      const messagesData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : (data.timestamp?.seconds ? new Date(data.timestamp.seconds * 1000) : new Date())
        };
      });
      
      // Sort client-side by timestamp (newest first)
      messagesData.sort((a, b) => {
        const aTime = a.timestamp?.getTime() || 0;
        const bTime = b.timestamp?.getTime() || 0;
        return bTime - aTime;
      });
      
      setMessages(messagesData);
      console.log('✅ Fetched messages:', messagesData.length);
    } catch (error) {
      console.error('❌ Error fetching messages:', error);
      setMessages([]);
    }
  };

  // Fetch wishes from guests
  const fetchWishes = async () => {
    if (!currentUser) return;

    try {
      const wishesData = await getHostWishes(currentUser.uid);
      setWishes(wishesData);
      console.log('✅ Fetched wishes:', wishesData.length);
    } catch (error) {
      console.error('Error fetching wishes:', error);
      setWishes([]);
    }
  };

  // Fetch host subscription data
  const fetchHostSubscription = async () => {
    if (!currentUser) return;

    try {
      const hostDocRef = doc(db, 'hosts', currentUser.uid);
      const hostDoc = await getDoc(hostDocRef);
      
      if (hostDoc.exists()) {
        const hostData = hostDoc.data();
        setHostSubscription({
          planId: hostData.subscriptionPlan?.id || hostData.subscriptionPlan || 'starter',
          status: hostData.subscriptionStatus || 'active',
          additionalSlots: hostData.additionalListingSlots || 0
        });
      } else {
        // Default to starter plan if no subscription found
        setHostSubscription({
          planId: 'starter',
          status: 'active',
          additionalSlots: 0
        });
      }
    } catch (error) {
      console.error('Error fetching host subscription:', error);
      // Default to starter plan on error
      setHostSubscription({
        planId: 'starter',
        status: 'active',
        additionalSlots: 0
      });
    }
  };

  // Real-time listeners
  const setupListingsListener = () => {
    if (!currentUser) return;

    // Remove orderBy to avoid index requirement
    const q = query(
      collection(db, 'listings'),
      where('hostId', '==', currentUser.uid),
      where('status', '==', 'published')
    );

    return onSnapshot(q, (snapshot) => {
      const listingsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000) : new Date()),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt?.seconds ? new Date(data.updatedAt.seconds * 1000) : new Date())
        };
      });
      
      // Sort client-side by createdAt (newest first)
      listingsData.sort((a, b) => {
        const aTime = a.createdAt?.getTime() || 0;
        const bTime = b.createdAt?.getTime() || 0;
        return bTime - aTime;
      });
      
      setListings(listingsData);
      updateStats();
      setError(null);
    }, (error) => {
      console.error('❌ Listings listener error:', error);
      setError('Failed to sync listings. Please refresh.');
      // Fallback listener without status filter
      const fallbackQ = query(
        collection(db, 'listings'),
        where('hostId', '==', currentUser.uid)
      );
      
      return onSnapshot(fallbackQ, (snapshot) => {
        const listingsData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000) : new Date()),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt?.seconds ? new Date(data.updatedAt.seconds * 1000) : new Date())
          };
        }).filter(item => item.status === 'published'); // Filter client-side
        
        listingsData.sort((a, b) => {
          const aTime = a.createdAt?.getTime() || 0;
          const bTime = b.createdAt?.getTime() || 0;
          return bTime - aTime;
        });
        
        setListings(listingsData);
        updateStats();
      });
    });
  };

  const setupDraftsListener = () => {
    if (!currentUser) return;

    // Remove orderBy to avoid index requirement
    const q = query(
      collection(db, 'drafts'),
      where('hostId', '==', currentUser.uid)
    );

    return onSnapshot(q, (snapshot) => {
      const draftsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          lastSaved: data.lastSaved?.toDate ? data.lastSaved.toDate() : (data.lastSaved?.seconds ? new Date(data.lastSaved.seconds * 1000) : new Date())
        };
      });
      
      // Sort client-side by lastSaved (newest first)
      draftsData.sort((a, b) => {
        const aTime = a.lastSaved?.getTime() || 0;
        const bTime = b.lastSaved?.getTime() || 0;
        return bTime - aTime;
      });
      
      setDrafts(draftsData);
      updateStats();
    }, (error) => {
      console.error('❌ Drafts listener error:', error);
    });
  };

  const setupBookingsListener = () => {
    if (!currentUser) return;

    // Remove orderBy to avoid index requirement
    const q = query(
      collection(db, 'bookings'),
      where('hostId', '==', currentUser.uid)
    );

    return onSnapshot(q, (snapshot) => {
      const bookingsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          checkIn: data.checkIn?.toDate ? data.checkIn.toDate() : (data.checkIn?.seconds ? new Date(data.checkIn.seconds * 1000) : null),
          checkOut: data.checkOut?.toDate ? data.checkOut.toDate() : (data.checkOut?.seconds ? new Date(data.checkOut.seconds * 1000) : null)
        };
      });
      
      // Sort client-side by checkIn (newest first)
      bookingsData.sort((a, b) => {
        const aTime = a.checkIn?.getTime() || 0;
        const bTime = b.checkIn?.getTime() || 0;
        return bTime - aTime;
      });
      
      setBookings(bookingsData);
      updateStats();
    }, (error) => {
      console.error('❌ Bookings listener error:', error);
    });
  };

  // Update stats based on real data
  const updateStats = () => {
    const totalListings = listings.length || 0;
    const activeBookings = bookings.filter(booking => 
      booking.status === 'confirmed' || booking.status === 'active'
    ).length;
    const unreadMessages = messages.length || 0;
    const pendingWishes = wishes.filter(w => w.status === 'pending').length;
    
    const totalEarnings = bookings
      .filter(booking => booking.status === 'completed')
      .reduce((sum, booking) => sum + (parseFloat(booking.totalAmount) || 0), 0);

    setStats({
      totalListings,
      activeBookings,
      unreadMessages,
      totalEarnings,
      pendingReviews: bookings.filter(b => b.needsReview).length,
      pendingWishes,
      occupancyRate: calculateOccupancyRate(bookings)
    });
  };

  const calculateOccupancyRate = (bookings) => {
    // Simple occupancy calculation - you can enhance this
    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(b => b.status === 'completed').length;
    return totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0;
  };

  const handleSectionChange = (sectionId) => {
    if (sectionId === activeSection) return;
    
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveSection(sectionId);
      setIsTransitioning(false);
    }, 300);
  };

  const renderSectionContent = () => {
    if (loading && activeSection !== 'dashboard') {
      return <LoadingSpinner />;
    }

    return (
      <div className={`transition-all duration-300 ease-in-out ${
        isTransitioning ? 'opacity-0 transform translate-y-4' : 'opacity-100 transform translate-y-0'
      }`}>
        {(() => {
          switch (activeSection) {
            case 'dashboard':
              return <DashboardOverview stats={stats} listings={listings} bookings={bookings} />;
            case 'listings':
              return <ListingsSection 
                listings={listings} 
                drafts={drafts} 
                setListings={setListings} 
                setDrafts={setDrafts} 
                bookings={bookings}
                hostSubscription={hostSubscription}
                balance={balance}
                onSubscriptionUpdate={fetchHostSubscription}
              />;
            case 'performance':
              return <PerformanceSection listings={listings} bookings={bookings} />;
            case 'bookings':
              return <BookingsSection bookings={bookings} listings={listings} />;
            case 'messages':
              return <MessagesSection messages={messages} />;
            case 'reviews':
              return <ReviewsSection listings={listings} bookings={bookings} />;
            case 'wishes':
              return <WishesSection wishes={wishes} listings={listings} onUpdateWish={fetchWishes} />;
            case 'calendar':
              return <CalendarSection bookings={bookings} listings={listings} />;
            case 'subscription':
              return <SubscriptionSection 
                hostSubscription={hostSubscription}
                balance={balance}
                listings={listings}
                onSubscriptionUpdate={fetchHostSubscription}
              />;
            case 'payments':
              return <PaymentsSection bookings={bookings} listings={listings} />;
            case 'coupons':
              return <CouponsSection />;
            case 'points':
              return <PointsSection stats={stats} bookings={bookings} listings={listings} />;
            default:
              return <DashboardOverview stats={stats} listings={listings} bookings={bookings} />;
          }
        })()}
      </div>
    );
  };

  if (loading && activeSection === 'dashboard') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="p-6">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  if (error && activeSection === 'dashboard') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-md text-center" data-aos="fade-up">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Error Loading Dashboard</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              setError(null);
              fetchHostData();
            }}
            className="bg-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
      {/* Sidebar Navigation */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r-2 border-gray-200 shadow-xl lg:shadow-none transition-all duration-300 ease-in-out transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="flex flex-col h-full pt-16 lg:pt-0">
          {/* Sidebar Header */}
          <div className="p-6 border-b-2 border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                Host Dashboard
              </h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex items-center space-x-2 bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-2 rounded-lg border border-green-200">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
              <span className="text-sm font-semibold text-gray-700">Online</span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            {sections.map((section, index) => (
              <button
                key={section.id}
                onClick={() => {
                  handleSectionChange(section.id);
                  setSidebarOpen(false); // Close sidebar on mobile after selection
                }}
                className={`group w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ease-out relative overflow-hidden ${
                  activeSection === section.id
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/30 transform scale-[1.02]'
                    : 'text-gray-600 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:text-gray-900 hover:scale-[1.01] hover:shadow-md'
                }`}
                style={{
                  animation: `fadeInRight 0.4s ease-out ${index * 50}ms both`
                }}
              >
                {/* Active indicator */}
                {activeSection === section.id && (
                  <div className="absolute inset-0 bg-gradient-to-r from-teal-400/20 to-emerald-400/20 animate-pulse"></div>
                )}
                
                <span className={`text-xl transition-all duration-300 relative z-10 ${
                  activeSection === section.id ? 'scale-110' : 'group-hover:scale-110 group-hover:rotate-12'
                }`}>{section.icon}</span>
                <span className={`font-bold relative z-10 transition-all duration-300 flex-1 text-left ${
                  activeSection === section.id ? 'text-white' : ''
                }`}>{section.label}</span>
                
                {/* Show counts for relevant sections */}
                {section.id === 'listings' && listings.length > 0 && (
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full relative z-10 transition-all duration-300 ${
                    activeSection === section.id 
                      ? 'bg-white/20 text-white backdrop-blur-sm' 
                      : 'bg-teal-100 text-teal-700 group-hover:bg-teal-200'
                  }`}>
                    {listings.length}
                  </span>
                )}
                {section.id === 'messages' && stats.unreadMessages > 0 && (
                  <div className="relative z-10">
                    {/* Count badge only - no green dot */}
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full relative transition-all duration-300 ${
                      activeSection === section.id 
                        ? 'bg-white/20 text-white backdrop-blur-sm' 
                        : 'bg-red-500 text-white group-hover:bg-red-600 shadow-md'
                    }`}>
                      {stats.unreadMessages}
                    </span>
                  </div>
                )}
                {section.id === 'bookings' && bookings.length > 0 && (
                  <div className="relative z-10">
                    {/* Show count of active bookings - no green dot */}
                    {stats.activeBookings > 0 && (
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full transition-all duration-300 ${
                        activeSection === section.id 
                          ? 'bg-white/20 text-white backdrop-blur-sm' 
                          : 'bg-green-500 text-white group-hover:bg-green-600 shadow-md'
                      }`}>
                        {stats.activeBookings}
                      </span>
                    )}
                  </div>
                )}
              </button>
            ))}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t-2 border-gray-100">
            <div className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-lg p-4 border border-teal-200">
              <p className="text-xs text-gray-600 font-medium mb-1">Total Listings</p>
              <p className="text-2xl font-bold text-teal-600">{listings.length}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-0 pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden mb-6 p-3 bg-white rounded-xl shadow-md border-2 border-gray-200 hover:shadow-lg transition-all"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Welcome Header */}
          <div className="mb-8 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <h1 className="text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent animate-gradient transition-all duration-500 ease-out">
                  Welcome back, {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Host'}!
                </h1>
                <p className="text-gray-600 text-base lg:text-lg transition-all duration-500 ease-out delay-100">
                  Manage your <span className="font-semibold text-teal-600">{listings.length}</span> listings and grow your hosting business
                </p>
              </div>
              <div className="hidden lg:flex items-center space-x-2 bg-white px-5 py-2.5 rounded-full shadow-md border-2 border-green-200 transition-all duration-300 hover:shadow-lg hover:scale-105 hover:border-green-300">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                <span className="text-sm font-semibold text-gray-700">Online</span>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => setShowFeedbackModal(true)}
                className="px-4 py-2 bg-orange-50 text-orange-700 border-2 border-orange-200 rounded-lg font-semibold hover:bg-orange-100 transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Report Issue
              </button>
            </div>
          </div>

        {/* Stats Cards - Only show on Dashboard section */}
        <div className={`transition-all duration-700 ease-in-out ${
          activeSection === 'dashboard' 
            ? 'opacity-100 max-h-[600px] overflow-visible mb-8 transform translate-y-0' 
            : 'opacity-0 max-h-0 overflow-hidden mb-0 transform -translate-y-4'
        }`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard
              title="Total Listings"
              value={stats.totalListings}
              change={`${drafts.length} drafts`}
              icon="🏠"
              color="blue"
              trend={listings.length > 0 ? "up" : "neutral"}
              delay={0}
            />
            <StatCard
              title="Active Bookings"
              value={stats.activeBookings}
              change="Current guests"
              icon="📋"
              color="green"
              trend={stats.activeBookings > 0 ? "up" : "neutral"}
              delay={100}
            />
            <StatCard
              title="Unread Messages"
              value={stats.unreadMessages}
              change="Waiting for reply"
              icon="💬"
              color="yellow"
              trend={stats.unreadMessages > 0 ? "up" : "neutral"}
              delay={200}
            />
            <StatCard
              title="Total Earnings"
              value={`₱${stats.totalEarnings.toLocaleString('en-PH')}`}
              change="Lifetime revenue"
              icon="💰"
              color="purple"
              trend={stats.totalEarnings > 0 ? "up" : "neutral"}
              delay={300}
            />
            <StatCard
              title="Pending Reviews"
              value={stats.pendingReviews}
              change="Need attention"
              icon="⭐"
              color="orange"
              trend="neutral"
              delay={400}
            />
            <StatCard
              title="Occupancy Rate"
              value={`${stats.occupancyRate}%`}
              change="This month"
              icon="📈"
              color="teal"
              trend={stats.occupancyRate > 50 ? "up" : "neutral"}
              delay={500}
            />
          </div>
        </div>

          {/* Section Content */}
          <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 backdrop-blur-sm overflow-hidden transition-all duration-500 hover:shadow-2xl transform hover:-translate-y-1">
            <div className={`transition-all duration-500 ease-in-out ${
              isTransitioning ? 'opacity-50 scale-98' : 'opacity-100 scale-100'
            }`}>
              {renderSectionContent()}
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <HostFeedback
          onClose={() => setShowFeedbackModal(false)}
        />
      )}
    </div>
  );
};

// Performance Section - Listing Performance Metrics
const PerformanceSection = ({ listings, bookings }) => {
  const performanceData = useMemo(() => {
    return getHostListingPerformance(listings, bookings);
  }, [listings, bookings]);

  const summary = useMemo(() => {
    return getPerformanceSummary(performanceData);
  }, [performanceData]);

  const [sortBy, setSortBy] = useState('revenue'); // 'revenue', 'views', 'conversion', 'bookings'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'published', 'inactive'

  const sortedData = useMemo(() => {
    let filtered = performanceData;
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(p => p.status === filterStatus);
    }
    
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'views':
          return b.views - a.views;
        case 'conversion':
          return b.conversionRate - a.conversionRate;
        case 'bookings':
          return b.confirmedBookings - a.confirmedBookings;
        case 'revenue':
        default:
          return b.revenue - a.revenue;
      }
    });
  }, [performanceData, sortBy, filterStatus]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Listing Performance Metrics</h2>
        <p className="text-gray-600">Track views, conversions, and revenue for each of your listings</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Views</p>
            <span className="text-2xl">👁️</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{summary.totalViews.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Bookings</p>
            <span className="text-2xl">📋</span>
          </div>
          <p className="text-3xl font-bold text-[#4CAF50]">{summary.totalBookings}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Revenue</p>
            <span className="text-2xl">💰</span>
          </div>
          <p className="text-3xl font-bold text-[#4CAF50]">₱{summary.totalRevenue.toLocaleString('en-PH')}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Avg Conversion</p>
            <span className="text-2xl">📊</span>
          </div>
          <p className="text-3xl font-bold text-[#66BB6A]">{summary.avgConversionRate}%</p>
        </div>
      </div>

      {/* Filters and Sort */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Filter:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent"
          >
            <option value="all">All Listings</option>
            <option value="published">Published</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent"
          >
            <option value="revenue">Revenue</option>
            <option value="views">Views</option>
            <option value="conversion">Conversion Rate</option>
            <option value="bookings">Bookings</option>
          </select>
        </div>
      </div>

      {/* Performance Table */}
      {sortedData.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 border border-gray-200 text-center">
          <div className="text-5xl mb-4">📊</div>
          <p className="text-gray-600 text-lg font-medium">No listing performance data available</p>
          <p className="text-gray-500 text-sm mt-2">Create listings and start receiving bookings to see performance metrics</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Listing</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Views</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Bookings</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Conversion</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Revenue</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Rev/View</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Rating</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedData.map((listing, index) => (
                  <tr key={listing.listingId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {index === 0 && summary.bestPerformer?.listingId === listing.listingId && (
                          <span className="mr-2 text-yellow-500 text-lg" title="Best Performer">🏆</span>
                        )}
                        <div>
                          <p className="font-semibold text-gray-900">{listing.title}</p>
                          <p className="text-xs text-gray-500 capitalize">{listing.status}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-gray-900 font-medium">{listing.views.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-gray-900 font-medium">{listing.confirmedBookings}</span>
                      <span className="text-xs text-gray-500 block">of {listing.totalBookings}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center">
                        <span className={`font-semibold ${
                          listing.conversionRate >= 5 ? 'text-[#4CAF50]' :
                          listing.conversionRate >= 2 ? 'text-[#66BB6A]' :
                          listing.conversionRate > 0 ? 'text-yellow-500' :
                          'text-gray-400'
                        }`}>
                          {listing.conversionRate.toFixed(2)}%
                        </span>
                      </div>
                      {listing.conversionRate > 0 && (
                        <div className="w-16 h-2 bg-gray-200 rounded-full mx-auto mt-1">
                          <div 
                            className="h-2 bg-[#4CAF50] rounded-full"
                            style={{ width: `${Math.min(100, listing.conversionRate * 10)}%` }}
                          ></div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-bold text-[#4CAF50]">₱{listing.revenue.toLocaleString('en-PH')}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-gray-700 font-medium">₱{listing.revenuePerView.toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {listing.rating > 0 ? (
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-yellow-500">⭐</span>
                          <span className="font-medium text-gray-900">{listing.rating.toFixed(1)}</span>
                          <span className="text-xs text-gray-500">({listing.reviewCount})</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">No ratings</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Best Performer Highlight */}
      {summary.bestPerformer && sortedData.length > 1 && (
        <div className="mt-8 bg-gradient-to-r from-[#C8E6C9] to-[#A5D6A7] rounded-xl p-6 border border-[#4CAF50]">
          <div className="flex items-start gap-4">
            <div className="text-4xl">🏆</div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Best Performer</h3>
              <p className="text-gray-700 font-semibold mb-1">{summary.bestPerformer.title}</p>
              <div className="flex flex-wrap gap-4 text-sm text-gray-700">
                <span>💰 Revenue: <strong>₱{summary.bestPerformer.revenue.toLocaleString('en-PH')}</strong></span>
                <span>👁️ Views: <strong>{summary.bestPerformer.views.toLocaleString()}</strong></span>
                <span>📋 Bookings: <strong>{summary.bestPerformer.confirmedBookings}</strong></span>
                <span>📊 Conversion: <strong>{summary.bestPerformer.conversionRate.toFixed(2)}%</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced Listings Section with Real Data
const ListingsSection = ({ listings, drafts, setListings, setDrafts, bookings, hostSubscription, balance, onSubscriptionUpdate }) => {
  const { currentUser } = useAuth();
  const { deduct } = useWallet();
  const navigate = useNavigate();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showAddSlotsModal, setShowAddSlotsModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [localSubscription, setLocalSubscription] = useState(hostSubscription);
  const [showDrafts, setShowDrafts] = useState(false); // Toggle between drafts and published

  // Update local subscription when prop changes
  useEffect(() => {
    setLocalSubscription(hostSubscription);
  }, [hostSubscription]);

  // Calculate listing availability
  const listingAvailability = canCreateListing(
    localSubscription.planId,
    listings.length,
    localSubscription.additionalSlots
  );

  const subscriptionPlan = getSubscriptionPlan(localSubscription.planId);
  const limitReachedActions = getLimitReachedActions(localSubscription.planId, listings.length);

  // Handle create listing click
  const handleCreateListing = () => {
    if (listingAvailability.allowed) {
      navigate('/host/create-listing');
    } else {
      setShowUpgradeModal(true);
    }
  };

  // Handle upgrade subscription
  const handleUpgrade = async (planId) => {
    setProcessing(true);
    try {
      const upgradePlan = getSubscriptionPlan(planId);
      const priceInPHP = convertToPHP(upgradePlan.price);
      
      if (balance < priceInPHP) {
        toast.error(`Insufficient balance. You need ₱${priceInPHP.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`);
        setShowUpgradeModal(false);
        return;
      }

      // Deduct from wallet
      await deduct(priceInPHP, `Subscription Upgrade: ${upgradePlan.name} Plan`);

      // Update host subscription in Firestore
      const hostDocRef = doc(db, 'hosts', currentUser.uid);
      await updateDoc(hostDocRef, {
        subscriptionPlan: planId,
        subscriptionStatus: 'active',
        updatedAt: serverTimestamp()
      });

      // Update local state
      setLocalSubscription(prev => ({
        ...prev,
        planId: planId
      }));

      // Refresh subscription data from parent
      if (onSubscriptionUpdate) {
        await onSubscriptionUpdate();
      }

      toast.success(`Successfully upgraded to ${upgradePlan.name} plan!`);
      setShowUpgradeModal(false);
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      toast.error('Failed to upgrade subscription. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Handle purchase additional slots
  const handlePurchaseSlots = async (slotType, quantity = 1) => {
    setProcessing(true);
    try {
      // Use bulk pricing for existing hosts
      const bulkPricing = getBulkSlotPricing(quantity, 'oneTime', true);
      const priceInPHP = convertToPHP(bulkPricing.price);
      
      if (balance < priceInPHP) {
        toast.error(`Insufficient balance. You need ₱${priceInPHP.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`);
        setShowAddSlotsModal(false);
        return;
      }

      // Deduct from wallet
      await deduct(priceInPHP, `Additional Listing Slots: ${quantity} slot(s) - One-Time`);

      // Update host subscription in Firestore
      const hostDocRef = doc(db, 'hosts', currentUser.uid);
      const currentSlots = localSubscription.additionalSlots || 0;
      await updateDoc(hostDocRef, {
        additionalListingSlots: currentSlots + quantity,
        slotType: 'oneTime',
        updatedAt: serverTimestamp()
      });

      // Update local state
      setLocalSubscription(prev => ({
        ...prev,
        additionalSlots: currentSlots + quantity
      }));

      // Refresh subscription data from parent
      if (onSubscriptionUpdate) {
        await onSubscriptionUpdate();
      }

      toast.success(`Successfully purchased ${quantity} additional listing slot(s)! ${bulkPricing.savings > 0 ? `You saved ₱${convertToPHP(bulkPricing.savings).toLocaleString('en-PH', { minimumFractionDigits: 2 })}!` : ''}`);
      setShowAddSlotsModal(false);
    } catch (error) {
      console.error('Error purchasing slots:', error);
      toast.error('Failed to purchase slots. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-8">
      {/* Subscription & Listing Limit Info */}
      <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border-2 border-teal-200 rounded-xl p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {subscriptionPlan.name} Plan
            </h3>
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-gray-600">Listings Used: </span>
                <span className="font-bold text-gray-900">{listings.length}</span>
                <span className="text-gray-600"> / </span>
                <span className={`font-bold ${listingAvailability.remaining === 0 ? 'text-red-600' : 'text-teal-600'}`}>
                  {subscriptionPlan.listingLimit === -1 ? '∞' : (subscriptionPlan.listingLimit + localSubscription.additionalSlots)}
                </span>
              </div>
              {localSubscription.additionalSlots > 0 && (
                <div className="text-xs text-gray-500">
                  (+{localSubscription.additionalSlots} additional slot{localSubscription.additionalSlots !== 1 ? 's' : ''})
                </div>
              )}
              {listingAvailability.remaining > 0 && (
                <div className="text-teal-700 font-semibold">
                  {listingAvailability.remaining} slot{listingAvailability.remaining !== 1 ? 's' : ''} available
                </div>
              )}
              {listingAvailability.remaining === 0 && subscriptionPlan.listingLimit !== -1 && (
                <div className="text-red-700 font-semibold flex items-center gap-2">
                  <span>⚠️ Limit Reached</span>
                </div>
              )}
            </div>
          </div>
          {listingAvailability.remaining === 0 && subscriptionPlan.listingLimit !== -1 && (
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors"
            >
              Upgrade or Add Slots
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Your Listings</h2>
          <p className="text-gray-600 mt-2">
            {showDrafts 
              ? `${drafts.length} draft${drafts.length !== 1 ? 's' : ''}`
              : `${listings.length} published listing${listings.length !== 1 ? 's' : ''}`
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          {(drafts.length > 0 || listings.length > 0) && (
            <button
              onClick={() => setShowDrafts(!showDrafts)}
              className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 font-semibold flex items-center space-x-2"
            >
              {showDrafts ? (
                <>
                  <span>📋</span>
                  <span>View Listings ({listings.length})</span>
                </>
              ) : (
                <>
                  <span>📝</span>
                  <span>View Drafts ({drafts.length})</span>
                </>
              )}
            </button>
          )}
          <button
            onClick={handleCreateListing}
            disabled={!listingAvailability.allowed && subscriptionPlan.listingLimit !== -1}
            className={`px-8 py-3 rounded-xl hover:shadow-lg transition-all duration-500 font-semibold flex items-center space-x-2 transform hover:scale-105 ${
              listingAvailability.allowed || subscriptionPlan.listingLimit === -1
                ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:shadow-teal-500/25'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <span>+</span>
            <span>Create New Listing</span>
          </button>
        </div>
      </div>

      {/* Conditional Rendering: Drafts or Published Listings */}
      {showDrafts ? (
        /* Drafts Section */
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="w-2 h-2 bg-yellow-500 rounded-full mr-3 animate-pulse"></span>
            Drafts ({drafts.length})
          </h3>
          {drafts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {drafts.map((draft) => (
                <ListingCard 
                  key={draft.id} 
                  listing={draft} 
                  isDraft={true}
                  onDelete={() => {
                    setDrafts(prev => prev.filter(d => d.id !== draft.id));
                  }}
                />
              ))}
            </div>
          ) : (
            <EmptyState 
              icon="📝"
              title="No drafts yet"
              description="Create a new listing to get started"
              actionText="Create Listing"
              actionLink="/host/create-listing"
            />
          )}
        </div>
      ) : (
        /* Published Listings */
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
            Published Listings ({listings.length})
          </h3>
          {listings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing) => (
                <ListingCard 
                  key={listing.id} 
                  listing={listing} 
                  isDraft={false}
                  onDelete={() => {
                    setListings(prev => prev.filter(l => l.id !== listing.id));
                  }}
                  onToggleStatus={(id, status) => {
                    setListings(prev => prev.map(l => 
                      l.id === id ? { ...l, isActive: status, status: status ? 'published' : 'inactive' } : l
                    ));
                  }}
                />
              ))}
            </div>
          ) : (
            <EmptyState 
              icon="🏠"
              title="No listings yet"
              description={listingAvailability.allowed || subscriptionPlan.listingLimit === -1 
                ? "Create your first listing to start hosting guests and earning money"
                : "You've reached your listing limit. Upgrade your subscription or purchase additional slots to create more listings."
              }
              actionText={listingAvailability.allowed || subscriptionPlan.listingLimit === -1 ? "Create Listing" : null}
              actionLink={listingAvailability.allowed || subscriptionPlan.listingLimit === -1 ? "/host/create-listing" : null}
            />
          )}
        </div>
      )}

      {/* Upgrade/Add Slots Modal */}
      {showUpgradeModal && (
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          currentPlanId={localSubscription.planId}
          currentListingCount={listings.length}
          balance={balance}
          onUpgrade={handleUpgrade}
          onPurchaseSlots={() => {
            setShowUpgradeModal(false);
            setShowAddSlotsModal(true);
          }}
          processing={processing}
        />
      )}

      {/* Add Slots Modal */}
      {showAddSlotsModal && (
        <AddSlotsModal
          isOpen={showAddSlotsModal}
          onClose={() => setShowAddSlotsModal(false)}
          balance={balance}
          onPurchase={handlePurchaseSlots}
          processing={processing}
        />
      )}
    </div>
  );
};

// Upgrade Modal Component
const UpgradeModal = ({ isOpen, onClose, currentPlanId, currentListingCount, balance, onUpgrade, onPurchaseSlots, processing }) => {
  if (!isOpen) return null;

  const upgradeOptions = getUpgradeOptions(currentPlanId);
  const currentPlan = getSubscriptionPlan(currentPlanId);

  return (
    <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-lg flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-gray-900">Upgrade Subscription or Add Listing Slots</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-gray-600 mt-2">
            You've reached your listing limit ({currentListingCount} / {currentPlan.listingLimit === -1 ? 'Unlimited' : currentPlan.listingLimit} listings). Choose an option below to add more listings.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Upgrade Options */}
          {upgradeOptions.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Upgrade Subscription Plan</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upgradeOptions.map(plan => {
                  const priceInPHP = convertToPHP(plan.price);
                  return (
                    <div
                      key={plan.id}
                      className="border-2 border-teal-200 rounded-lg p-4 hover:border-teal-500 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h5 className="font-bold text-gray-900 text-lg">{plan.name}</h5>
                          <p className="text-sm text-gray-600">
                            {plan.listingLimit === -1 ? 'Unlimited' : plan.listingLimit} listings
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-teal-600">₱{priceInPHP.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                      <ul className="text-xs text-gray-600 space-y-1 mb-3">
                        {plan.features.slice(0, 3).map((feature, idx) => (
                          <li key={idx}>• {feature}</li>
                        ))}
                      </ul>
                      <button
                        onClick={() => onUpgrade(plan.id)}
                        disabled={processing || balance < priceInPHP}
                        className={`w-full py-2 px-4 rounded-lg font-semibold transition-colors ${
                          balance < priceInPHP
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-teal-600 hover:bg-teal-700 text-white'
                        }`}
                      >
                        {processing ? 'Processing...' : balance < priceInPHP ? 'Insufficient Balance' : 'Upgrade Now'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Purchase Additional Slots */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Purchase Additional Listing Slots</h4>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 mb-3">
                Add more listings without upgrading your plan. Perfect if you only need a few extra slots.
              </p>
              <button
                onClick={onPurchaseSlots}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                View Slot Options
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add Slots Modal Component
const AddSlotsModal = ({ isOpen, onClose, balance, onPurchase, processing }) => {
  const [quantity, setQuantity] = useState(1);

  if (!isOpen) return null;

  // Use bulk pricing for existing hosts (only oneTime now)
  const bulkPricing = getBulkSlotPricing(quantity, 'oneTime', true); // true = existing host
  const priceInPHP = convertToPHP(bulkPricing.price);
  const slotInfo = ADDITIONAL_LISTING_PRICES.oneTime;

  return (
    <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-lg flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">Purchase Additional Listing Slots</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

            <div className="p-6 space-y-4">
              {/* Payment Type Info */}
              <div className="bg-teal-50 border-2 border-teal-200 rounded-lg p-4">
                <p className="font-semibold text-gray-900 mb-1">{ADDITIONAL_LISTING_PRICES.oneTime.name}</p>
                <p className="text-xs text-gray-600">{ADDITIONAL_LISTING_PRICES.oneTime.description}</p>
              </div>

              {/* Quantity Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                -
              </button>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-center"
              />
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Price Summary with Bulk Discount */}
          <div className="bg-gray-50 rounded-lg p-4">
            {bulkPricing.isBulk && (
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Regular Price:</span>
                <span className="text-sm text-gray-500 line-through">₱{convertToPHP(bulkPricing.regularPrice).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Price per slot:</span>
              <span className="font-semibold text-gray-900">₱{convertToPHP(bulkPricing.perSlot).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Quantity:</span>
              <span className="font-semibold text-gray-900">{quantity}</span>
            </div>
            {bulkPricing.savings > 0 && (
              <div className="flex justify-between items-center mb-2">
                <span className="text-green-600 font-semibold">You Save:</span>
                <span className="text-green-600 font-bold">₱{convertToPHP(bulkPricing.savings).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-gray-300">
              <span className="text-lg font-bold text-gray-900">Total:</span>
              <span className="text-lg font-bold text-teal-600">₱{priceInPHP.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

              {/* Purchase Button */}
              <button
                onClick={() => onPurchase('oneTime', quantity)}
                disabled={processing || balance < priceInPHP}
            className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
              balance < priceInPHP
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-teal-600 hover:bg-teal-700 text-white'
            }`}
          >
            {processing ? 'Processing...' : balance < priceInPHP ? 'Insufficient Balance' : `Purchase ${quantity} Slot${quantity !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};

// Listing Card Component with Real Data
const ListingCard = ({ listing, isDraft, onDelete, onToggleStatus, onEdit }) => {
  const { currentUser } = useAuth();
  const { balance, deduct } = useWallet();
  const [deleting, setDeleting] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);

  const getListingTitle = () => {
    if (listing.homeDetails?.title) return listing.homeDetails.title;
    if (listing.experienceDetails?.title) return listing.experienceDetails.title;
    if (listing.serviceDetails?.title) return listing.serviceDetails.title;
    return listing.title || 'Untitled Listing';
  };

  const getListingDescription = () => {
    if (listing.homeDetails?.description) return listing.homeDetails.description;
    if (listing.experienceDetails?.description) return listing.experienceDetails.description;
    if (listing.serviceDetails?.description) return listing.serviceDetails.description;
    return listing.description || 'No description available';
  };

  const getLocation = () => {
    if (listing.location?.city && listing.location?.country) {
      return `${listing.location.city}, ${listing.location.country}`;
    }
    return 'Location not set';
  };

  const getPrice = () => {
    const price = listing.pricing?.basePrice || listing.pricing?.basePrice || '0';
    return `₱${parseFloat(price).toLocaleString('en-PH')}`;
  };

  const getPrimaryImage = () => {
    if (listing.photos && listing.photos.length > 0) {
      return listing.photos.find(photo => photo.isPrimary)?.url || listing.photos[0]?.url;
    }
    return null;
  };

  const handleDelete = async () => {
    const confirmMessage = isDraft 
      ? 'Are you sure you want to permanently delete this draft? This action cannot be undone.'
      : 'Are you sure you want to delete this listing? This action cannot be undone.';
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setDeleting(true);
      
      if (isDraft) {
        // Permanently delete draft from 'drafts' collection
        await deleteDoc(doc(db, 'drafts', listing.id));
        toast.success('Draft deleted successfully');
      } else {
        // Mark published listing as inactive
        await updateDoc(doc(db, 'listings', listing.id), {
          status: 'inactive',
          isActive: false,
          updatedAt: serverTimestamp()
        });
        toast.success('Listing deleted successfully');
      }
      
      if (onDelete) onDelete(listing.id);
    } catch (error) {
      console.error('Error deleting listing:', error);
      toast.error(`Failed to delete ${isDraft ? 'draft' : 'listing'}. Please try again.`);
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleStatus = async () => {
    try {
      const newStatus = listing.isActive ? false : true;
      await updateDoc(doc(db, 'listings', listing.id), {
        isActive: newStatus,
        status: newStatus ? 'published' : 'inactive',
        updatedAt: serverTimestamp()
      });
      if (onToggleStatus) onToggleStatus(listing.id, newStatus);
    } catch (error) {
      console.error('Error updating listing status:', error);
      toast.error('Failed to update listing status. Please try again.');
    }
  };

  const handleRenewListing = async (planId) => {
    try {
      setRenewing(true);
      
      // Get subscription plans
      const subscriptionPlans = {
        starter: {
          id: 'starter',
          name: 'Starter',
          price: 399,
          listingLimit: 3,
          postingDuration: 1,
          postingDurationUnit: 'years'
        },
        pro: {
          id: 'pro',
          name: 'Pro',
          price: 799,
          listingLimit: 10,
          postingDuration: 1,
          postingDurationUnit: 'years'
        },
        elite: {
          id: 'elite',
          name: 'Elite',
          price: 1299,
          listingLimit: 15,
          postingDuration: 1,
          postingDurationUnit: 'years'
        }
      };

      const selectedPlan = subscriptionPlans[planId];
      if (!selectedPlan) {
        throw new Error('Invalid plan selected');
      }

      // Price is already in PHP
      const amountInPHP = selectedPlan.price;

      // Check wallet balance
      if (balance < amountInPHP) {
        toast.error(`Insufficient wallet balance. You need ₱${amountInPHP.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`);
        setShowRenewModal(false);
        return;
      }

      // Deduct from wallet
      await deduct(
        amountInPHP,
        `Listing Renewal: ${selectedPlan.name} Plan - ${getListingTitle()}`,
        listing.id
      );

      // Renew listing
      const newExpirationDate = await renewListing(listing.id, selectedPlan);
      
      toast.success(`✅ Listing renewed! Expires on ${newExpirationDate.toLocaleDateString()}`);
      setShowRenewModal(false);
      
      // Refresh listing data
      window.location.reload();
    } catch (error) {
      console.error('Error renewing listing:', error);
      toast.error(`Failed to renew listing: ${error.message}`);
    } finally {
      setRenewing(false);
    }
  };

  return (
    <>
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 group">
      <div className="aspect-w-16 aspect-h-9 bg-gray-200 relative">
        {getPrimaryImage() ? (
          <img 
            src={getPrimaryImage()} 
            alt={getListingTitle()}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <span className="text-2xl">🏠</span>
          </div>
        )}
        {isDraft && (
          <div className="absolute top-3 left-3 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
            Draft
          </div>
        )}
        {!isDraft && !listing.isActive && (
          <div className="absolute top-3 left-3 bg-gray-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
            Inactive
          </div>
        )}
        <div className="absolute top-3 right-3 bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-xs">
          {listing.propertyType || 'Unknown'}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 truncate">{getListingTitle()}</h3>
        <p className="text-gray-600 text-sm mt-1 truncate">{getLocation()}</p>
        <p className="text-gray-500 text-sm mt-2 line-clamp-2">{getListingDescription()}</p>
        <div className="flex items-center justify-between mt-3">
          <span className="text-lg font-bold text-gray-900">
            {getPrice()}<span className="text-sm font-normal text-gray-600">/night</span>
          </span>
          <div className="flex items-center space-x-2">
            {!isDraft && (
              <>
                <Link
                  to={`/host/create-listing?edit=${listing.id}`}
                  className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
                >
                  Edit
                </Link>
                <Link
                  to={`/listing/${listing.id}`}
                  className="text-teal-600 hover:text-teal-700 font-semibold text-sm"
                  target="_blank"
                >
                  View
                </Link>
                <button
                  onClick={handleToggleStatus}
                  className={`text-xs px-2 py-1 rounded ${
                    listing.isActive 
                      ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {listing.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </>
            )}
            {isDraft && (
              <>
                <Link
                  to={`/host/create-listing?draft=${listing.id}`}
                  className="text-teal-600 hover:text-teal-700 font-semibold text-sm"
                >
                  Continue
                </Link>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-xs text-red-600 hover:text-red-700 font-medium disabled:opacity-50 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </>
            )}
          </div>
        </div>
        {!isDraft && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span>Views: {listing.views || 0}</span>
                <span>Bookings: {listing.bookings || 0}</span>
              </div>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
            {/* Expiration Status */}
            {(() => {
              const daysUntilExpiration = getDaysUntilExpiration(listing);
              const isExpired = isListingExpired(listing);
              
              if (isExpired) {
                return (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-2 mt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-red-600 text-xs font-semibold">⚠️ Expired</span>
                        <span className="text-red-600 text-xs">Listing is no longer active</span>
                      </div>
                      <button
                        onClick={() => setShowRenewModal(true)}
                        className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors"
                      >
                        Renew Now
                      </button>
                    </div>
                  </div>
                );
              } else if (daysUntilExpiration !== null && daysUntilExpiration <= 30) {
                return (
                  <div className={`border rounded-lg p-2 mt-2 ${
                    daysUntilExpiration <= 7 
                      ? 'bg-yellow-50 border-yellow-200' 
                      : 'bg-blue-50 border-blue-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold ${
                          daysUntilExpiration <= 7 ? 'text-yellow-700' : 'text-blue-700'
                        }`}>
                          {daysUntilExpiration <= 7 ? '⚠️' : '⏰'} Expires in {daysUntilExpiration} {daysUntilExpiration === 1 ? 'day' : 'days'}
                        </span>
                      </div>
                      <button
                        onClick={() => setShowRenewModal(true)}
                        className={`text-xs px-3 py-1 rounded transition-colors ${
                          daysUntilExpiration <= 7
                            ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        Extend
                      </button>
                    </div>
                  </div>
                );
              } else if (daysUntilExpiration !== null) {
                return (
                  <div className="text-xs text-gray-500 mt-2">
                    Expires: {listing.expiresAt?.toDate ? listing.expiresAt.toDate().toLocaleDateString() : 'N/A'}
                  </div>
                );
              }
              return null;
            })()}
          </div>
        )}
      </div>
      
      {/* Renewal Modal */}
      {showRenewModal && (
        <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-lg flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Renew Listing</h3>
            <p className="text-gray-600 mb-4">
              Select a subscription plan to extend your listing's expiration date.
            </p>
            
            <div className="space-y-3 mb-6">
              {[
                { id: 'starter', name: 'Starter', duration: '1 year', price: 399 },
                { id: 'pro', name: 'Pro', duration: '1 year', price: 799 },
                { id: 'elite', name: 'Elite', duration: '1 year', price: 1299 }
              ].map(plan => {
                const priceInPHP = plan.price; // Already in PHP
                return (
                  <button
                    key={plan.id}
                    onClick={() => handleRenewListing(plan.id)}
                    disabled={renewing || balance < priceInPHP}
                    className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                      balance < priceInPHP
                        ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                        : 'border-teal-200 hover:border-teal-500 hover:bg-teal-50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-gray-900">{plan.name}</p>
                        <p className="text-sm text-gray-600">{plan.duration}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-teal-600">₱{priceInPHP.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                        {balance < priceInPHP && (
                          <p className="text-xs text-red-600">Insufficient balance</p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowRenewModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <Link
                to="/wallet"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center"
              >
                Add Funds
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

// Enhanced Dashboard Overview with Real Data
const DashboardOverview = ({ stats, listings, bookings }) => {
  const [bookingFilter, setBookingFilter] = useState('today'); // 'today', 'upcoming', 'all'

  // Helper function to convert Firestore timestamp to Date
  const toDate = (date) => {
    if (!date) return null;
    if (date instanceof Date) return date;
    if (date?.toDate) return date.toDate(); // Firestore timestamp
    if (date?.seconds) return new Date(date.seconds * 1000); // Firestore timestamp alternative
    return new Date(date);
  };

  // Helper function to check if date is today
  const isToday = (date) => {
    if (!date) return false;
    const checkDate = toDate(date);
    if (!checkDate) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    checkDate.setHours(0, 0, 0, 0);
    
    return (
      checkDate.getDate() === today.getDate() &&
      checkDate.getMonth() === today.getMonth() &&
      checkDate.getFullYear() === today.getFullYear()
    );
  };

  // Helper function to check if date is upcoming (within next 30 days)
  const isUpcoming = (date) => {
    if (!date) return false;
    const checkDate = toDate(date);
    if (!checkDate) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    checkDate.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.ceil((checkDate - today) / (1000 * 60 * 60 * 24));
    return daysDiff > 0 && daysDiff <= 30;
  };

  // Check if booking is currently active (check-in <= today <= check-out)
  const isActiveBooking = (checkIn, checkOut) => {
    if (!checkIn) return false;
    const checkInDate = toDate(checkIn);
    if (!checkInDate) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    checkInDate.setHours(0, 0, 0, 0);
    
    // If check-out is null (for experiences/services), consider it active if check-in is today or past
    if (!checkOut) {
      return checkInDate <= today;
    }
    
    const checkOutDate = toDate(checkOut);
    if (!checkOutDate) return checkInDate <= today;
    
    checkOutDate.setHours(23, 59, 59, 999); // Include entire check-out day
    
    return checkInDate <= today && today <= checkOutDate;
  };

  // Filter bookings based on selected filter
  const getFilteredBookings = () => {
    if (bookingFilter === 'today') {
      return bookings.filter(booking => {
        const checkIn = toDate(booking.checkIn);
        const checkOut = toDate(booking.checkOut);
        
        // Include bookings that:
        // 1. Check-in is today
        // 2. Check-out is today
        // 3. Currently active (check-in <= today <= check-out)
        return isToday(checkIn) || isToday(checkOut) || isActiveBooking(checkIn, checkOut);
      }).filter(booking => {
        // Only show confirmed or active bookings for today
        return booking.status === 'confirmed' || booking.status === 'active' || booking.status === 'pending';
      });
    } else if (bookingFilter === 'upcoming') {
      return bookings.filter(booking => {
        const checkIn = toDate(booking.checkIn);
        if (!checkIn) return false;
        
        // Include upcoming bookings within next 30 days
        return isUpcoming(checkIn);
      }).filter(booking => {
        // Only show confirmed or pending bookings for upcoming
        return booking.status === 'confirmed' || booking.status === 'pending';
      }).sort((a, b) => {
        // Sort by check-in date (earliest first)
        const dateA = toDate(a.checkIn);
        const dateB = toDate(b.checkIn);
        if (!dateA || !dateB) return 0;
        return dateA - dateB;
      }).slice(0, 10); // Show next 10 upcoming
    }
    return bookings;
  };

  const filteredBookings = getFilteredBookings();
  
  // Calculate counts matching the filter logic
  const todayBookings = bookings.filter(b => {
    const checkIn = toDate(b.checkIn);
    const checkOut = toDate(b.checkOut);
    const isTodayBooking = isToday(checkIn) || isToday(checkOut) || isActiveBooking(checkIn, checkOut);
    const isValidStatus = b.status === 'confirmed' || b.status === 'active' || b.status === 'pending';
    return isTodayBooking && isValidStatus;
  });
  
  const upcomingBookings = bookings.filter(b => {
    const checkIn = toDate(b.checkIn);
    const isValidStatus = b.status === 'confirmed' || b.status === 'pending';
    return checkIn && isUpcoming(checkIn) && isValidStatus;
  });

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = toDate(date);
    if (!d) return 'N/A';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (date) => {
    if (!date) return '';
    const d = toDate(date);
    if (!d) return '';
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Calculate analytics data
  const analyticsData = useMemo(() => {
    const now = new Date();
    const months = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Generate last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: monthNames[date.getMonth()],
        year: date.getFullYear(),
        monthIndex: date.getMonth(),
        yearMonth: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      });
    }

    // Calculate revenue and bookings per month
    const revenueData = months.map(m => {
      const monthBookings = bookings.filter(booking => {
        const bookingDate = toDate(booking.createdAt || booking.checkIn);
        if (!bookingDate) return false;
        const bookingMonth = `${bookingDate.getFullYear()}-${String(bookingDate.getMonth() + 1).padStart(2, '0')}`;
        return bookingMonth === m.yearMonth && 
               (booking.status === 'completed' || booking.status === 'confirmed') &&
               booking.totalAmount;
      });

      const revenue = monthBookings.reduce((sum, b) => {
        const amount = parseFloat(b.totalAmount || 0);
        // Subtract service fee to get host earnings
        const serviceFee = parseFloat(b.serviceFee || calculateServiceFee(amount));
        return sum + (amount - serviceFee);
      }, 0);

      return {
        ...m,
        revenue: Math.round(revenue),
        bookings: monthBookings.length
      };
    });

    // Calculate occupancy rate per month
    const occupancyData = months.map(m => {
      const monthBookings = bookings.filter(booking => {
        const checkIn = toDate(booking.checkIn);
        if (!checkIn) return false;
        const bookingMonth = `${checkIn.getFullYear()}-${String(checkIn.getMonth() + 1).padStart(2, '0')}`;
        return bookingMonth === m.yearMonth && booking.status === 'completed';
      });

      // Estimate occupancy: (completed bookings / total available days) * 100
      // Simplified: assume 30 days per month
      const availableDays = 30;
      const bookedDays = monthBookings.reduce((sum, b) => {
        const checkIn = toDate(b.checkIn);
        const checkOut = toDate(b.checkOut);
        if (!checkIn) return sum;
        if (!checkOut) return sum + 1; // Single day booking
        const days = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
        return sum + Math.max(1, days);
      }, 0);

      const occupancyRate = Math.min(100, Math.round((bookedDays / availableDays) * 100));

      return {
        ...m,
        occupancy: occupancyRate
      };
    });

    // Booking status distribution
    const statusCounts = {
      confirmed: bookings.filter(b => b.status === 'confirmed').length,
      pending: bookings.filter(b => b.status === 'pending').length,
      completed: bookings.filter(b => b.status === 'completed').length,
      cancelled: bookings.filter(b => b.status === 'cancelled').length
    };

    const statusData = [
      { name: 'Confirmed', value: statusCounts.confirmed, color: '#4CAF50' },
      { name: 'Pending', value: statusCounts.pending, color: '#66BB6A' },
      { name: 'Completed', value: statusCounts.completed, color: '#81C784' },
      { name: 'Cancelled', value: statusCounts.cancelled, color: '#A5D6A7' }
    ].filter(item => item.value > 0);

    return { revenueData, occupancyData, statusData };
  }, [bookings]);

  const { revenueData, occupancyData, statusData } = analyticsData;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Business Overview</h2>
        <div className="flex items-center gap-2">
          {/* Filter Buttons */}
          <button
            onClick={() => setBookingFilter('today')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              bookingFilter === 'today'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Today ({todayBookings.length})
          </button>
          <button
            onClick={() => setBookingFilter('upcoming')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              bookingFilter === 'upcoming'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Upcoming ({upcomingBookings.length})
          </button>
          <button
            onClick={() => setBookingFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              bookingFilter === 'all'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({bookings.length})
          </button>
        </div>
      </div>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue (Last 6 Months)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#4CAF50" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis 
                dataKey="month" 
                stroke="#666"
                fontSize={12}
                tick={{ fill: '#666' }}
              />
              <YAxis 
                stroke="#666"
                fontSize={12}
                tick={{ fill: '#666' }}
                tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px'
                }}
                formatter={(value) => [`₱${value.toLocaleString('en-PH')}`, 'Revenue']}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#4CAF50" 
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Booking Trends Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Trends</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis 
                dataKey="month" 
                stroke="#666"
                fontSize={12}
                tick={{ fill: '#666' }}
              />
              <YAxis 
                stroke="#666"
                fontSize={12}
                tick={{ fill: '#666' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="bookings" 
                stroke="#66BB6A" 
                strokeWidth={2}
                dot={{ fill: '#66BB6A', r: 4 }}
                name="Bookings"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Occupancy Rate Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Occupancy Rate</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={occupancyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis 
                dataKey="month" 
                stroke="#666"
                fontSize={12}
                tick={{ fill: '#666' }}
              />
              <YAxis 
                stroke="#666"
                fontSize={12}
                tick={{ fill: '#666' }}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px'
                }}
                formatter={(value) => [`${value}%`, 'Occupancy']}
              />
              <Bar 
                dataKey="occupancy" 
                fill="#4CAF50"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Booking Status Distribution */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Status</h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-500">
              <p>No booking data available</p>
            </div>
          )}
        </div>
      </div>
    
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
      {/* Quick Actions */}
      {/* <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border border-gray-200/60">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <span className="w-2 h-2 bg-teal-500 rounded-full mr-3 animate-pulse"></span>
          Quick Actions
        </h3>
        <div className="space-y-4">
          <Link
            to="/host/create-listing"
            className="flex items-center justify-between w-full p-4 bg-white rounded-xl border border-gray-200/60 hover:border-teal-300 hover:shadow-md transition-all duration-300 group"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center group-hover:bg-teal-100 transition-all duration-300">
                <span className="text-xl">➕</span>
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900">Create Listing</p>
                <p className="text-sm text-gray-500">Add new property</p>
              </div>
            </div>
            <span className="text-gray-400 group-hover:text-teal-600 transition-all duration-300">→</span>
          </Link>
          
          <Link
            to="/host/calendar"
            className="flex items-center justify-between w-full p-4 bg-white rounded-xl border border-gray-200/60 hover:border-teal-300 hover:shadow-md transition-all duration-300 group"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-all duration-300">
                <span className="text-xl">📅</span>
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900">Update Calendar</p>
                <p className="text-sm text-gray-500">Manage availability</p>
              </div>
            </div>
            <span className="text-gray-400 group-hover:text-teal-600 transition-all duration-300">→</span>
          </Link>
          
          <Link
            to="/wallet"
            className="flex items-center justify-between w-full p-4 bg-white rounded-xl border border-gray-200/60 hover:border-teal-300 hover:shadow-md transition-all duration-300 group"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center group-hover:bg-green-100 transition-all duration-300">
                <span className="text-xl">💳</span>
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900">Wallet</p>
                <p className="text-sm text-gray-500">View balance</p>
              </div>
            </div>
            <span className="text-gray-400 group-hover:text-teal-600 transition-all duration-300">→</span>
          </Link>
        </div>
      </div> */}

      {/* Bookings Section - Today/Upcoming */}
      <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border border-gray-200/60">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <span className="w-2 h-2 bg-purple-500 rounded-full mr-3 animate-pulse"></span>
          {bookingFilter === 'today' ? "Today's Bookings" : bookingFilter === 'upcoming' ? 'Upcoming Bookings' : 'All Bookings'}
        </h3>
        
        {filteredBookings.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-lg mb-2">No {bookingFilter === 'today' ? "today's" : bookingFilter === 'upcoming' ? 'upcoming' : ''} bookings</p>
            <p className="text-sm">Your bookings will appear here</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {filteredBookings.map((booking) => {
              const checkIn = toDate(booking.checkIn);
              const checkOut = toDate(booking.checkOut);
              const isTodayBooking = isToday(checkIn) || isToday(checkOut) || isActiveBooking(checkIn, checkOut);
              
              return (
                <div
                  key={booking.id}
                  className={`bg-white rounded-xl p-4 border-2 transition-all hover:shadow-md ${
                    isTodayBooking ? 'border-teal-300 bg-teal-50/50' : 'border-gray-200/60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900">
                          {booking.guestName || booking.guestEmail || 'Guest'} - {booking.listingTitle || 'Listing'}
                        </h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                          booking.status === 'active' ? 'bg-blue-100 text-blue-700' :
                          booking.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {booking.status || 'pending'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <p className="font-medium text-gray-500">Check-in</p>
                          <p>{formatDate(checkIn)}</p>
                          {isTodayBooking && <p className="text-xs text-teal-600 font-medium">Today</p>}
                        </div>
                        <div>
                          <p className="font-medium text-gray-500">Check-out</p>
                          <p>{formatDate(checkOut)}</p>
                        </div>
                      </div>
                      {booking.totalAmount && (
                        <p className="mt-2 text-sm">
                          <span className="text-gray-500">Amount: </span>
                          <span className="font-semibold text-gray-900">₱{booking.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Stats Summary */}
      <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border border-gray-200/60 lg:col-span-2">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <span className="w-2 h-2 bg-teal-500 rounded-full mr-3"></span>
          Quick Stats
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200/60">
            <p className="text-sm text-gray-500 mb-1">Today's Bookings</p>
            <p className="text-2xl font-bold text-gray-900">{todayBookings.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200/60">
            <p className="text-sm text-gray-500 mb-1">Upcoming (7 days)</p>
            <p className="text-2xl font-bold text-gray-900">{upcomingBookings.filter(b => {
              const checkIn = toDate(b.checkIn);
              if (!checkIn) return false;
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              checkIn.setHours(0, 0, 0, 0);
              const daysDiff = Math.ceil((checkIn - today) / (1000 * 60 * 60 * 24));
              return daysDiff > 0 && daysDiff <= 7;
            }).length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200/60">
            <p className="text-sm text-gray-500 mb-1">Active Listings</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalListings}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200/60">
            <p className="text-sm text-gray-500 mb-1">Total Earnings</p>
            <p className="text-2xl font-bold text-gray-900">₱{stats.totalEarnings.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};

// Empty State Component
const EmptyState = ({ icon, title, description, actionText, actionLink }) => (
  <div className="text-center py-16">
    <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mx-auto mb-6">
      <span className="text-4xl">{icon}</span>
    </div>
    <h3 className="text-xl font-semibold text-gray-900 mb-3">{title}</h3>
    <p className="text-gray-600 max-w-md mx-auto mb-6">{description}</p>
    {actionText && actionLink && (
      <Link
        to={actionLink}
        className="px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl hover:shadow-lg transition-all duration-300 font-semibold inline-block"
      >
        {actionText}
      </Link>
    )}
  </div>
);

// Loading Spinner Component
const LoadingSpinner = ({ fullPage = false }) => (
  <div className={`flex items-center justify-center ${fullPage ? 'h-screen' : 'h-64'}`}>
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
      <p className="text-gray-600 text-sm">Loading...</p>
    </div>
  </div>
);

// Dashboard Loading Skeleton
const DashboardSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="h-6 bg-gray-200 rounded w-24 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-40"></div>
        </div>
      ))}
    </div>
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-gray-100 rounded"></div>
        ))}
      </div>
    </div>
  </div>
);

// Keep your existing StatCard component (same as before)
const StatCard = ({ title, value, change, icon, color, trend, delay = 0 }) => {
  const colorClasses = {
    blue: {
      gradient: 'from-blue-500 to-cyan-500',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      shadow: 'shadow-blue-500/20'
    },
    green: {
      gradient: 'from-emerald-500 to-green-500',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      shadow: 'shadow-emerald-500/20'
    },
    yellow: {
      gradient: 'from-amber-500 to-yellow-500',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      shadow: 'shadow-amber-500/20'
    },
    purple: {
      gradient: 'from-purple-500 to-indigo-500',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-700',
      shadow: 'shadow-purple-500/20'
    },
    orange: {
      gradient: 'from-orange-500 to-amber-500',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-700',
      shadow: 'shadow-orange-500/20'
    },
    teal: {
      gradient: 'from-teal-500 to-emerald-500',
      bg: 'bg-teal-50',
      border: 'border-teal-200',
      text: 'text-teal-700',
      shadow: 'shadow-teal-500/20'
    }
  };

  const trendIcons = {
    up: '↗️',
    down: '↘️',
    neutral: '→'
  };

  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <div 
      className={`group relative bg-white rounded-2xl shadow-sm border-2 ${colors.border} p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 ease-out backdrop-blur-sm overflow-hidden`}
      data-aos="fade-up"
      data-aos-delay={delay}
      style={{
        boxShadow: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)`
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 25px 50px -12px ${colors.shadow === 'shadow-blue-500/20' ? 'rgba(59, 130, 246, 0.2)' : colors.shadow === 'shadow-emerald-500/20' ? 'rgba(16, 185, 129, 0.2)' : colors.shadow === 'shadow-amber-500/20' ? 'rgba(245, 158, 11, 0.2)' : colors.shadow === 'shadow-purple-500/20' ? 'rgba(168, 85, 247, 0.2)' : colors.shadow === 'shadow-orange-500/20' ? 'rgba(249, 115, 22, 0.2)' : 'rgba(20, 184, 166, 0.2)'}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
      }}
    >
      {/* Animated background gradient on hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>
      
      {/* Shimmer effect */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out">
        <div className="h-full w-full bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
      </div>
      
      <div className="relative flex items-center justify-between z-10">
        <div className="flex-1">
          <p className={`text-xs font-bold ${colors.text} uppercase tracking-wider transition-colors duration-300 mb-1`}>
            {title}
          </p>
          <p className="text-4xl font-extrabold text-gray-900 mt-2 transition-all duration-300 group-hover:scale-105 inline-block">
            {value}
          </p>
          <div className="flex items-center space-x-2 mt-3">
            <span className={`text-xs font-semibold transition-all duration-300 inline-flex items-center gap-1 ${
              trend === 'up' ? 'text-green-600' : 
              trend === 'down' ? 'text-red-600' : 'text-gray-500'
            }`}>
              <span className="text-sm">{trendIcons[trend]}</span>
              <span>{change}</span>
            </span>
          </div>
        </div>
        <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-xl group-hover:shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 relative overflow-hidden`}>
          {/* Icon glow effect */}
          <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-50 blur-xl group-hover:opacity-75 transition-opacity duration-500`}></div>
          <span className="text-3xl text-white relative z-10 transition-transform duration-300 group-hover:scale-110">{icon}</span>
        </div>
      </div>
      
      {/* Corner accent */}
      <div className={`absolute top-0 right-0 w-24 h-24 ${colors.bg} rounded-bl-full opacity-20 group-hover:opacity-30 transition-opacity duration-500`}></div>
    </div>
  );
};

// Enhanced Bookings Management
const BookingsSection = ({ bookings, listings }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState({});
  const [selectedBookingForReview, setSelectedBookingForReview] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelRefundDetails, setCancelRefundDetails] = useState(null);
  const [cancelBookingId, setCancelBookingId] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'confirmed', 'completed', 'cancelled'
  const [sortBy, setSortBy] = useState('date'); // 'date', 'amount', 'guest'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterListing, setFilterListing] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterAmountMin, setFilterAmountMin] = useState('');
  const [filterAmountMax, setFilterAmountMax] = useState('');
  

  const handleBookingAction = async (bookingId, action) => {
    if (action === 'accept' && !window.confirm('Accept this booking?')) return;
    if (action === 'reject' && !window.confirm('Reject this booking? The guest will be notified.')) return;

    try {
      setProcessing({ ...processing, [bookingId]: true });
      const bookingRef = doc(db, 'bookings', bookingId);
      const bookingDoc = await getDoc(bookingRef);
      
      if (!bookingDoc.exists()) {
        throw new Error('Booking not found');
      }
      
      const bookingData = bookingDoc.data();
      let updates = {
        updatedAt: serverTimestamp()
      };

      if (action === 'accept') {
        updates.status = 'confirmed';
        updates.confirmedAt = serverTimestamp();
        
        // Send approval email
        try {
          await sendBookingApprovalEmail(
            bookingData.guestEmail,
            bookingData.guestName,
            {
              listingTitle: bookingData.listingTitle || 'Your Booking',
              checkIn: bookingData.checkIn?.toDate ? bookingData.checkIn.toDate().toLocaleDateString('en-US') : 'N/A',
              checkOut: bookingData.checkOut?.toDate ? bookingData.checkOut.toDate().toLocaleDateString('en-US') : 'N/A',
              totalAmount: bookingData.totalAmount,
              bookingId: bookingId,
              hostName: currentUser.displayName || 'Host'
            }
          );
          console.log('✅ Approval email sent');
        } catch (emailError) {
          console.error('Failed to send approval email:', emailError);
          // Don't fail the booking update if email fails
        }
        
      } else if (action === 'reject') {
        updates.status = 'rejected';
        updates.rejectedAt = serverTimestamp();
        
        // Send rejection email
        try {
          await sendBookingRejectionEmail(
            bookingData.guestEmail,
            bookingData.guestName,
            {
              listingTitle: bookingData.listingTitle || 'Your Booking',
              checkIn: bookingData.checkIn?.toDate ? bookingData.checkIn.toDate().toLocaleDateString('en-US') : 'N/A',
              checkOut: bookingData.checkOut?.toDate ? bookingData.checkOut.toDate().toLocaleDateString('en-US') : 'N/A',
              totalAmount: bookingData.totalAmount,
              bookingId: bookingId,
              hostName: currentUser.displayName || 'Host',
              rejectionReason: 'Host unavailable for these dates'
            }
          );
          console.log('✅ Rejection email sent');
        } catch (emailError) {
          console.error('Failed to send rejection email:', emailError);
          // Don't fail the booking update if email fails
        }
        
      } else if (action === 'cancel') {
        // Host cancellation - show modal instead of confirm
        const { calculateRefund } = await import('../../services/RefundService');
        const refund = calculateRefund(bookingData);
        setCancelRefundDetails(refund);
        setCancelBookingId(bookingId);
        setShowCancelModal(true);
        setProcessing({ ...processing, [bookingId]: false });
        return;
      }

      await updateDoc(bookingRef, updates);
      toast.success(`Booking ${action}ed successfully`);
    } catch (error) {
      console.error(`Error ${action}ing booking:`, error);
      toast.error(`Failed to ${action} booking. Please try again.`);
    } finally {
      setProcessing({ ...processing, [bookingId]: false });
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
      confirmed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Confirmed' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Cancelled' },
      completed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Completed' }
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  // Filter, search and sort bookings
  const filteredBookings = useMemo(() => {
    let filtered = bookings;
    
    // Filter by status
    if (filter !== 'all') {
      filtered = filtered.filter(b => b.status === filter);
    }
    
    // Filter by listing
    if (filterListing !== 'all') {
      filtered = filtered.filter(b => b.listingId === filterListing);
    }
    
    // Filter by date range
    if (filterDateFrom) {
      const fromDate = new Date(filterDateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(b => {
        const checkIn = b.checkIn instanceof Date ? b.checkIn : new Date(b.checkIn);
        return checkIn >= fromDate;
      });
    }
    
    if (filterDateTo) {
      const toDate = new Date(filterDateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(b => {
        const checkIn = b.checkIn instanceof Date ? b.checkIn : new Date(b.checkIn);
        return checkIn <= toDate;
      });
    }
    
    // Filter by amount range
    if (filterAmountMin) {
      const minAmount = parseFloat(filterAmountMin);
      filtered = filtered.filter(b => parseFloat(b.totalAmount || 0) >= minAmount);
    }
    
    if (filterAmountMax) {
      const maxAmount = parseFloat(filterAmountMax);
      filtered = filtered.filter(b => parseFloat(b.totalAmount || 0) <= maxAmount);
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(b => {
        const guestName = (b.guestName || '').toLowerCase();
        const guestEmail = (b.guestEmail || '').toLowerCase();
        const listingTitle = (b.listingTitle || '').toLowerCase();
        const bookingId = (b.id || '').toLowerCase();
        return guestName.includes(query) || 
               guestEmail.includes(query) || 
               listingTitle.includes(query) ||
               bookingId.includes(query);
      });
    }
    
    // Sort bookings
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = a.checkIn instanceof Date ? a.checkIn : new Date(a.checkIn);
        const dateB = b.checkIn instanceof Date ? b.checkIn : new Date(b.checkIn);
        return dateB - dateA; // Newest first
      } else if (sortBy === 'amount') {
        return (b.totalAmount || 0) - (a.totalAmount || 0); // Highest first
      } else if (sortBy === 'guest') {
        const nameA = (a.guestName || a.guestEmail || '').toLowerCase();
        const nameB = (b.guestName || b.guestEmail || '').toLowerCase();
        return nameA.localeCompare(nameB);
      }
      return 0;
    });
    
    return filtered;
  }, [bookings, filter, sortBy, searchQuery, filterListing, filterDateFrom, filterDateTo, filterAmountMin, filterAmountMax]);


  // Export functions
  const handleExportCSV = () => {
    exportBookingsToCSV(filteredBookings, `bookings_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Bookings exported to CSV');
  };

  const clearAdvancedFilters = () => {
    setFilterListing('all');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterAmountMin('');
    setFilterAmountMax('');
  };

  const hasAdvancedFilters = filterListing !== 'all' || filterDateFrom || filterDateTo || filterAmountMin || filterAmountMax;

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4" data-aos="fade-down">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Bookings Management</h2>
            <p className="text-gray-600">Manage your current and upcoming bookings</p>
          </div>
          
          {/* Export Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>
            <PDFDownloadLink
              document={<BookingsPDFDocument bookings={filteredBookings} filters={{ filter, filterListing, filterDateFrom, filterDateTo }} />}
              fileName={`bookings_${new Date().toISOString().split('T')[0]}.pdf`}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              {({ blob, url, loading, error }) => 
                loading ? 'Loading PDF...' : 'Export PDF'
              }
            </PDFDownloadLink>
          </div>
        </div>

        {/* Search, Filters and Sort */}
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200 mb-4">
          <div className="flex flex-wrap gap-3 mb-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search bookings..."
                className="pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4CAF50] w-full"
              />
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#4CAF50]"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#4CAF50]"
            >
              <option value="date">Sort by Date</option>
              <option value="amount">Sort by Amount</option>
              <option value="guest">Sort by Guest</option>
            </select>

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                showAdvancedFilters || hasAdvancedFilters
                  ? 'bg-[#4CAF50] text-white hover:bg-[#2E7D32]'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Advanced Filters
              {hasAdvancedFilters && (
                <span className="bg-white text-[#4CAF50] rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                  {[filterListing !== 'all', filterDateFrom, filterDateTo, filterAmountMin, filterAmountMax].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>

          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <div className="border-t border-gray-200 pt-4 mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Listing</label>
                <select
                  value={filterListing}
                  onChange={(e) => setFilterListing(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent"
                >
                  <option value="all">All Listings</option>
                  {listings.map(listing => {
                    const title = listing.homeDetails?.title || 
                                  listing.experienceDetails?.title || 
                                  listing.serviceDetails?.title || 
                                  'Untitled Listing';
                    return (
                      <option key={listing.id} value={listing.id}>{title}</option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  min={filterDateFrom}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent"
                />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount Min (₱)</label>
                  <input
                    type="number"
                    value={filterAmountMin}
                    onChange={(e) => setFilterAmountMin(e.target.value)}
                    placeholder="Min"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount Max (₱)</label>
                  <input
                    type="number"
                    value={filterAmountMax}
                    onChange={(e) => setFilterAmountMax(e.target.value)}
                    placeholder="Max"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent"
                  />
                </div>
              </div>

              {hasAdvancedFilters && (
                <div className="md:col-span-4 flex justify-end">
                  <button
                    onClick={clearAdvancedFilters}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Results count */}
          <div className="mt-3 text-sm text-gray-600">
            Showing {filteredBookings.length} of {bookings.length} bookings
          </div>
        </div>
      </div>
      
      {filteredBookings.length > 0 ? (
        <div className="space-y-4">
          {filteredBookings.map((booking, index) => {
            const checkIn = booking.checkIn instanceof Date ? booking.checkIn : new Date(booking.checkIn);
            const checkOut = booking.checkOut instanceof Date ? booking.checkOut : new Date(booking.checkOut);
            const isProcessing = processing[booking.id];

            return (
              <div 
                key={booking.id} 
                className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-md transition-all"
                data-aos="fade-up"
                data-aos-delay={index * 50}
              >
                <div 
                  className="cursor-pointer"
                  onClick={() => {
                    setSelectedBooking(booking);
                    setShowBookingModal(true);
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">
                      {booking.guestName || booking.guestEmail || 'Guest'}
                    </h3>
                    {getStatusBadge(booking.status)}
                    {booking.status === 'pending' && booking.createdAt && (() => {
                      try {
                        const { getAutoConfirmEligibility } = require('../../services/BookingAutoConfirmService');
                        const eligibility = getAutoConfirmEligibility(booking);
                        if (eligibility.remainingHours > 0 && eligibility.remainingHours <= 24) {
                          return (
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                              Auto-confirms in {eligibility.remainingHours}h
                            </span>
                          );
                        }
                      } catch (e) {}
                      return null;
                    })()}
                    {booking.autoConfirmed && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        Auto-confirmed
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{booking.listingTitle || 'Listing'}</p>
                  <p className="text-xs text-gray-500">Booking ID: {booking.id.slice(0, 8)}...</p>
                  
                  {/* Check-in Reminder Indicator */}
                  {booking.status === 'confirmed' && booking.checkIn && (() => {
                    const checkInDate = booking.checkIn instanceof Date ? booking.checkIn : new Date(booking.checkIn);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const checkInDateOnly = new Date(checkInDate);
                    checkInDateOnly.setHours(0, 0, 0, 0);
                    const daysUntil = Math.ceil((checkInDateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    if (daysUntil >= 0 && daysUntil <= 7) {
                      return (
                        <div className="mt-2 mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            daysUntil === 0 ? 'bg-orange-100 text-orange-700' : 
                            daysUntil === 1 ? 'bg-yellow-100 text-yellow-700' : 
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {daysUntil === 0 ? '🔔 Check-in today!' : 
                             daysUntil === 1 ? '🔔 Check-in tomorrow' : 
                             `📅 Check-in in ${daysUntil} days`}
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                    <div>
                      <p className="text-gray-500">Check-in</p>
                      <p className="font-medium text-gray-900">{formatDate(checkIn)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Check-out</p>
                      <p className="font-medium text-gray-900">{formatDate(checkOut)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Guests</p>
                      <p className="font-medium text-gray-900">{booking.guestCount || 1}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Amount</p>
                      <p className="font-medium text-gray-900">
                        ₱{booking.totalAmount?.toLocaleString('en-PH', { minimumFractionDigits: 2 }) || '0.00'}
                      </p>
                    </div>
                  </div>
                </div>
                {booking.status === 'pending' && (
                  <div className="flex space-x-3 mt-4 pt-4 border-t border-gray-200" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleBookingAction(booking.id, 'accept')}
                      disabled={isProcessing}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? 'Processing...' : 'Accept Booking'}
                    </button>
                    <button
                      onClick={() => handleBookingAction(booking.id, 'reject')}
                      disabled={isProcessing}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? 'Processing...' : 'Reject Booking'}
                    </button>
                  </div>
                )}
                
                {booking.status === 'confirmed' && (
                  <div className="flex space-x-3 mt-4 pt-4 border-t border-gray-200" onClick={(e) => e.stopPropagation()}>
                    <Link
                      to={`/host/messages?guest=${booking.guestId}`}
                      className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors text-center"
                    >
                      Message Guest
                    </Link>
                    <Link
                      to={`/listing/${booking.listingId}`}
                      target="_blank"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-center"
                    >
                      View Listing
                    </Link>
                    <button
                      onClick={() => handleBookingAction(booking.id, 'cancel')}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {booking.status === 'completed' && (
                  <div className="flex space-x-3 mt-4 pt-4 border-t border-gray-200" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setSelectedBookingForReview(booking);
                        setShowReviewModal(true);
                      }}
                      className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      Review Guest
                    </button>
                    <Link
                      to={`/host/messages?guest=${booking.guestId}`}
                      className="px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors text-center"
                    >
                      Message
                    </Link>
                    <Link
                      to={`/listing/${booking.listingId}`}
                      target="_blank"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-center"
                    >
                      View Listing
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState 
          icon="📋"
          title="No bookings yet"
          description="When guests book your listings, they'll appear here"
        />
      )}

      {/* Booking Details Modal */}
      {showBookingModal && selectedBooking && (
        <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-lg z-50 flex items-center justify-center p-4" onClick={() => setShowBookingModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-900">Booking Details</h3>
              <button
                onClick={() => setShowBookingModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Guest Info */}
              <div>
                <h4 className="text-sm font-semibold text-gray-500 mb-2">Guest Information</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="font-semibold text-gray-900">{selectedBooking.guestName || 'Guest'}</p>
                  <p className="text-sm text-gray-600">{selectedBooking.guestEmail}</p>
                </div>
              </div>
              
              {/* Listing Info */}
              <div>
                <h4 className="text-sm font-semibold text-gray-500 mb-2">Listing</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="font-semibold text-gray-900">{selectedBooking.listingTitle || 'Listing'}</p>
                  <p className="text-sm text-gray-600">{selectedBooking.location || 'Location not specified'}</p>
                  <Link
                    to={`/listing/${selectedBooking.listingId}`}
                    target="_blank"
                    className="text-sm text-teal-600 hover:text-teal-700 mt-2 inline-block"
                  >
                    View Listing →
                  </Link>
                </div>
              </div>
              
              {/* Booking Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 mb-2">Check-in</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="font-semibold text-gray-900">
                      {formatDate(selectedBooking.checkIn)}
                    </p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 mb-2">Check-out</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="font-semibold text-gray-900">
                      {formatDate(selectedBooking.checkOut)}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Booking Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 mb-2">Guests</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="font-semibold text-gray-900">{selectedBooking.guestCount || selectedBooking.guests || 1}</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 mb-2">Status</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {getStatusBadge(selectedBooking.status)}
                  </div>
                </div>
              </div>
              
              {/* Payment Info */}
              <div>
                <h4 className="text-sm font-semibold text-gray-500 mb-2">Payment Information</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Base Price:</span>
                    <span className="font-semibold text-gray-900">
                      ₱{selectedBooking.basePrice?.toLocaleString('en-PH', { minimumFractionDigits: 2 }) || '0.00'}
                    </span>
                  </div>
                  {selectedBooking.serviceFee && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Service Fee:</span>
                      <span className="font-semibold text-gray-900">
                        ₱{selectedBooking.serviceFee.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <span className="text-lg font-semibold text-gray-900">Total Amount:</span>
                    <span className="text-lg font-bold text-teal-600">
                      ₱{selectedBooking.totalAmount?.toLocaleString('en-PH', { minimumFractionDigits: 2 }) || '0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-sm text-gray-600">Payment Method:</span>
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {selectedBooking.paymentMethod || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Payment Status:</span>
                    <span className={`text-sm font-medium ${
                      selectedBooking.paymentStatus === 'paid' ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {selectedBooking.paymentStatus === 'paid' ? '✓ Paid' : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Booking Timeline */}
              <div>
                <h4 className="text-sm font-semibold text-gray-500 mb-4">Booking Timeline</h4>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <BookingStatusTimeline booking={selectedBooking} />
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                {selectedBooking.status === 'pending' && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowBookingModal(false);
                        handleBookingAction(selectedBooking.id, 'accept');
                      }}
                      disabled={processing[selectedBooking.id]}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      Accept Booking
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowBookingModal(false);
                        handleBookingAction(selectedBooking.id, 'reject');
                      }}
                      disabled={processing[selectedBooking.id]}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      Reject Booking
                    </button>
                  </>
                )}
                <Link
                  to={`/host/messages?guest=${selectedBooking.guestId}`}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors text-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  Message Guest
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Guest Modal */}
      {showReviewModal && selectedBookingForReview && (
        <HostReviewGuest
          booking={selectedBookingForReview}
          onReviewSubmitted={() => {
            setShowReviewModal(false);
            setSelectedBookingForReview(null);
            toast.success('Review submitted successfully!');
          }}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedBookingForReview(null);
          }}
        />
      )}

      {/* Cancellation Modal */}
      {showCancelModal && cancelRefundDetails && cancelBookingId && (
        <CancellationModal
          isOpen={showCancelModal}
          onClose={() => {
            setShowCancelModal(false);
            setCancelRefundDetails(null);
            setCancelBookingId(null);
          }}
          onConfirm={async () => {
            try {
              setProcessing({ ...processing, [cancelBookingId]: true });
              const bookingRef = doc(db, 'bookings', cancelBookingId);
              const bookingDoc = await getDoc(bookingRef);
              
              if (!bookingDoc.exists()) {
                throw new Error('Booking not found');
              }
              
              // Process refund using BookingService
              const { updateBookingStatus } = await import('../../services/BookingService');
              await updateBookingStatus(cancelBookingId, 'cancelled', {
                cancelledBy: 'host',
                refundAmount: cancelRefundDetails.finalRefundAmount,
                adminDeduction: cancelRefundDetails.adminDeduction,
                cancellationFee: cancelRefundDetails.cancellationFee,
                refundCalculated: true
              });
              
              toast.success(`Booking cancelled. Refund of ₱${cancelRefundDetails.finalRefundAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} processed.`);
              
              setShowCancelModal(false);
              setCancelRefundDetails(null);
              setCancelBookingId(null);
              setProcessing({ ...processing, [cancelBookingId]: false });
            } catch (error) {
              console.error('Error cancelling booking:', error);
              toast.error('Failed to cancel booking. Please try again.');
              setProcessing({ ...processing, [cancelBookingId]: false });
            }
          }}
          refundDetails={cancelRefundDetails}
          bookingTitle={selectedBooking?.listingTitle || 'Booking'}
          isProcessing={processing[cancelBookingId] || false}
          userType="host"
        />
      )}
    </div>
  );
};

const MessagesSection = ({ messages }) => {
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [conversationMessages, setConversationMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    loadConversations();
  }, [currentUser]);

  useEffect(() => {
    if (!selectedConversation) return;
    
    const unsubscribe = loadMessages(selectedConversation.id);
    markAsRead(selectedConversation.id);
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [selectedConversation]);

  const loadConversations = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      // Remove orderBy to avoid index requirement - sort client-side instead
      const q = query(
        collection(db, 'messages'),
        where('hostId', '==', currentUser.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const messagesData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : (data.timestamp?.seconds ? new Date(data.timestamp.seconds * 1000) : new Date())
        };
      });

      // Sort client-side by timestamp (newest first)
      messagesData.sort((a, b) => {
        const aTime = a.timestamp?.getTime() || 0;
        const bTime = b.timestamp?.getTime() || 0;
        return bTime - aTime;
      });

      // Group messages by guestId to form conversations
      const conversationMap = new Map();
      messagesData.forEach(msg => {
        const guestId = msg.guestId;
        if (!conversationMap.has(guestId)) {
          conversationMap.set(guestId, {
            id: `conv_${guestId}`,
            guestId: guestId,
            guestName: msg.guestName || msg.guestEmail || 'Guest',
            guestEmail: msg.guestEmail || '', // Ensure it's never undefined
            guestPhoto: msg.guestPhoto,
            listingId: msg.listingId || '',
            listingTitle: msg.listingTitle || '',
            lastMessage: msg.content,
            lastMessageTime: msg.timestamp,
            unreadCount: msg.read === false ? 1 : 0,
            messages: [msg]
          });
        } else {
          const conv = conversationMap.get(guestId);
          conv.messages.push(msg);
          // Update guestEmail if it's missing but available in this message
          if (!conv.guestEmail && msg.guestEmail) {
            conv.guestEmail = msg.guestEmail;
          }
          // Update other fields if missing
          if (!conv.guestName && msg.guestName) {
            conv.guestName = msg.guestName;
          }
          if (!conv.guestPhoto && msg.guestPhoto) {
            conv.guestPhoto = msg.guestPhoto;
          }
          if (!conv.listingId && msg.listingId) {
            conv.listingId = msg.listingId;
          }
          if (!conv.listingTitle && msg.listingTitle) {
            conv.listingTitle = msg.listingTitle;
          }
          // Update last message if this one is newer
          const msgTime = msg.timestamp?.getTime ? msg.timestamp.getTime() : (msg.timestamp instanceof Date ? msg.timestamp.getTime() : 0);
          const convTime = conv.lastMessageTime?.getTime ? conv.lastMessageTime.getTime() : (conv.lastMessageTime instanceof Date ? conv.lastMessageTime.getTime() : 0);
          if (msgTime > convTime || !conv.lastMessageTime) {
            conv.lastMessage = msg.content;
            conv.lastMessageTime = msg.timestamp;
          }
          if (msg.read === false) {
            conv.unreadCount += 1;
          }
        }
      });
      
      // Fetch missing guest emails from user documents
      const conversationsList = Array.from(conversationMap.values());
      await Promise.all(conversationsList.map(async (conv) => {
        if (!conv.guestEmail && conv.guestId) {
          try {
            const guestDoc = await getDoc(doc(db, 'users', conv.guestId));
            if (guestDoc.exists()) {
              const guestData = guestDoc.data();
              conv.guestEmail = guestData.email || '';
              if (!conv.guestName && guestData.displayName) {
                conv.guestName = guestData.displayName;
              }
              if (!conv.guestPhoto && guestData.photoURL) {
                conv.guestPhoto = guestData.photoURL;
              }
            }
          } catch (error) {
            console.warn('Could not fetch guest data for conversation:', error);
            // Keep empty string as fallback
            conv.guestEmail = conv.guestEmail || '';
          }
        }
      }));

      // Sort conversations by last message time (create a new array to avoid mutation)
      const sortedConversations = [...conversationsList].sort((a, b) => {
        const timeA = a.lastMessageTime?.getTime() || 0;
        const timeB = b.lastMessageTime?.getTime() || 0;
        return timeB - timeA;
      });
      
      setConversations(sortedConversations);
    } catch (error) {
      console.error('❌ Error loading conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = (conversationId) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return;

    // Set up real-time listener for messages - remove orderBy to avoid index requirement
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('hostId', '==', currentUser.uid),
      where('guestId', '==', conversation.guestId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : (data.timestamp?.seconds ? new Date(data.timestamp.seconds * 1000) : new Date()),
          readAt: data.readAt?.toDate ? data.readAt.toDate() : (data.readAt?.seconds ? new Date(data.readAt.seconds * 1000) : null)
        };
      });
      
      // Sort client-side by timestamp (oldest first for display)
      msgs.sort((a, b) => {
        const aTime = a.timestamp?.getTime() || 0;
        const bTime = b.timestamp?.getTime() || 0;
        return aTime - bTime;
      });
      
      setConversationMessages(msgs);
      markAsRead(conversationId);
    }, (error) => {
      console.error('❌ Error loading messages:', error);
    });

    return () => unsubscribe();
  };

  const markAsRead = async (conversationId) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return;

    try {
      // Mark all messages in conversation as read
      const q = query(
        collection(db, 'messages'),
        where('hostId', '==', currentUser.uid),
        where('guestId', '==', conversation.guestId),
        where('read', '==', false)
      );
      
      const snapshot = await getDocs(q);
      const updatePromises = snapshot.docs.map(doc => 
        updateDoc(doc.ref, { read: true, readAt: serverTimestamp() })
      );
      
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sending) return;

    const conversation = conversations.find(c => c.id === selectedConversation.id);
    if (!conversation) return;

    try {
      setSending(true);
      
      // Fetch guest email if it's not available in the conversation
      let guestEmail = conversation.guestEmail;
      if (!guestEmail && conversation.guestId) {
        try {
          const guestDoc = await getDoc(doc(db, 'users', conversation.guestId));
          if (guestDoc.exists()) {
            guestEmail = guestDoc.data().email || '';
          }
        } catch (error) {
          console.warn('Could not fetch guest email:', error);
          guestEmail = ''; // Use empty string as fallback
        }
      }

      await addDoc(collection(db, 'messages'), {
        hostId: currentUser.uid,
        hostName: currentUser.displayName || currentUser.email,
        hostPhoto: currentUser.photoURL,
        guestId: conversation.guestId,
        guestName: conversation.guestName || 'Guest',
        guestEmail: guestEmail || '', // Ensure it's never undefined
        guestPhoto: conversation.guestPhoto,
        listingId: conversation.listingId || '',
        listingTitle: conversation.listingTitle || '',
        content: newMessage.trim(),
        senderId: currentUser.uid,
        senderType: 'host',
        type: 'text',
        read: false,
        timestamp: serverTimestamp()
      });

      // Update or create conversation document
      await updateOrCreateConversation(conversation, newMessage.trim(), 'text');
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const updateOrCreateConversation = async (conversation, lastMessage, type) => {
    try {
      const convId = `guest_${conversation.guestId}_host_${currentUser.uid}`;
      const conversationRef = doc(db, 'conversations', convId);
      const conversationSnap = await getDoc(conversationRef);

      if (conversationSnap.exists()) {
        await updateDoc(conversationRef, {
          lastMessage: lastMessage,
          lastMessageTime: serverTimestamp(),
          lastMessageType: type
        });
      } else {
        // Fetch guest email if not available
        let guestEmail = conversation.guestEmail || '';
        if (!guestEmail && conversation.guestId) {
          try {
            const guestDoc = await getDoc(doc(db, 'users', conversation.guestId));
            if (guestDoc.exists()) {
              guestEmail = guestDoc.data().email || '';
            }
          } catch (error) {
            console.warn('Could not fetch guest email for conversation:', error);
          }
        }

        await setDoc(conversationRef, {
          id: convId,
          guestId: conversation.guestId,
          guestName: conversation.guestName || 'Guest',
          guestEmail: guestEmail || '', // Ensure it's never undefined
          guestPhoto: conversation.guestPhoto,
          hostId: currentUser.uid,
          hostName: currentUser.displayName || currentUser.email,
          listingId: conversation.listingId || '',
          listingTitle: conversation.listingTitle || '',
          lastMessage: lastMessage,
          lastMessageTime: serverTimestamp(),
          lastMessageType: type,
          createdAt: serverTimestamp(),
          unreadCount: 0
        });
      }
    } catch (error) {
      console.error('Error updating conversation:', error);
    }
  };

  const formatTime = (date) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const diff = now - d;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8 h-[calc(250vh-200px)] flex flex-col">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Guest Messages</h2>
      
      <div className="flex-1 flex border border-gray-200 rounded-xl overflow-hidden bg-white">
        {/* Conversations List */}
        <div className="w-1/3 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Conversations</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No conversations yet</p>
                <p className="text-sm mt-2">Messages from guests will appear here</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {conversations.map(conv => (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedConversation?.id === conv.id ? 'bg-teal-50 border-l-4 border-teal-600' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                          {conv.guestPhoto ? (
                            <img src={conv.guestPhoto} alt={conv.guestName} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            conv.guestName.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{conv.guestName}</p>
                          {conv.listingTitle && (
                            <p className="text-xs text-gray-500 truncate">{conv.listingTitle}</p>
                          )}
                          <p className="text-sm text-gray-600 truncate mt-1">{conv.lastMessage}</p>
                          {conv.lastMessageTime && (
                            <p className="text-xs text-gray-400 mt-1">{formatTime(conv.lastMessageTime)}</p>
                          )}
                        </div>
                      </div>
                      {conv.unreadCount > 0 && (
                        <div className="bg-teal-600 text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center ml-2 flex-shrink-0">
                          {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center text-white font-semibold">
                    {selectedConversation.guestPhoto ? (
                      <img src={selectedConversation.guestPhoto} alt={selectedConversation.guestName} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      selectedConversation.guestName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{selectedConversation.guestName}</p>
                    {selectedConversation.listingTitle && (
                      <p className="text-xs text-gray-500">{selectedConversation.listingTitle}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {conversationMessages.map(msg => {
                  const isHost = msg.senderId === currentUser.uid;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isHost ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        isHost 
                          ? 'bg-teal-600 text-white' 
                          : 'bg-white text-gray-900 border border-gray-200'
                      }`}>
                        {!isHost && (
                          <p className="text-xs font-semibold mb-1 opacity-75">{msg.guestName}</p>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <div className={`flex items-center justify-end gap-1 mt-1 ${
                          isHost ? 'text-teal-100' : 'text-gray-400'
                        }`}>
                          {msg.timestamp && (
                            <p className="text-xs">
                              {formatTime(msg.timestamp)}
                            </p>
                          )}
                          {/* Seen indicator for host messages */}
                          {isHost && msg.read && (
                            <div className="flex items-center gap-1 ml-1" title={msg.readAt ? `Seen ${formatTime(msg.readAt)}` : 'Seen'}>
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              {msg.readAt && (
                                <span className="text-xs opacity-75">Seen</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Message Input */}
              <form onSubmit={sendMessage} className="p-4 border-t border-gray-200 bg-white">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="px-6 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p className="text-xl mb-2">💬</p>
                <p>Select a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CalendarSection = ({ bookings, listings }) => {
  const { currentUser } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedListing, setSelectedListing] = useState('all');
  const [blockedDates, setBlockedDates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [hoveredDate, setHoveredDate] = useState(null);
  const [selectedBookingDate, setSelectedBookingDate] = useState(null);
  const [rangeBlockMode, setRangeBlockMode] = useState(false);
  const [rangeStartDate, setRangeStartDate] = useState(null);
  const [rangeEndDate, setRangeEndDate] = useState(null);
  const [tempRangeDates, setTempRangeDates] = useState([]);

  useEffect(() => {
    if (currentUser && selectedListing !== 'all') {
      loadBlockedDates();
    } else {
      setBlockedDates([]);
    }
    // Reset range block mode when listing changes
    setRangeBlockMode(false);
    setRangeStartDate(null);
    setRangeEndDate(null);
    setTempRangeDates([]);
  }, [currentUser, selectedListing]);

  const loadBlockedDates = async () => {
    if (!currentUser || selectedListing === 'all') return;
    
    try {
      setLoading(true);
      const blockedRef = doc(db, 'listingAvailability', `${selectedListing}_${currentUser.uid}`);
      const blockedSnap = await getDoc(blockedRef);
      
      if (blockedSnap.exists()) {
        const data = blockedSnap.data();
        setBlockedDates(data.blockedDates || []);
      } else {
        setBlockedDates([]);
      }
    } catch (error) {
      console.error('Error loading blocked dates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBlockDate = async (date) => {
    if (!currentUser || selectedListing === 'all') {
      toast.error('Please select a specific listing first');
      return;
    }

    const dateStr = date.toISOString().split('T')[0];
    const isBlocked = blockedDates.includes(dateStr);

    try {
      setLoading(true);
      const blockedRef = doc(db, 'listingAvailability', `${selectedListing}_${currentUser.uid}`);
      
      let newBlockedDates;
      if (isBlocked) {
        newBlockedDates = blockedDates.filter(d => d !== dateStr);
      } else {
        newBlockedDates = [...blockedDates, dateStr];
      }

      await setDoc(blockedRef, {
        listingId: selectedListing,
        hostId: currentUser.uid,
        blockedDates: newBlockedDates,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setBlockedDates(newBlockedDates);
      setShowBlockModal(false);
      setSelectedDate(null);
    } catch (error) {
      console.error('Error blocking date:', error);
      toast.error('Failed to update availability');
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = (date) => {
    // If in range block mode, handle range selection
    if (rangeBlockMode) {
      const dateStr = date.toISOString().split('T')[0];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Don't allow blocking past dates
      if (date < today) {
        toast.error('Cannot block past dates');
        return;
      }
      
      if (!rangeStartDate) {
        // Start selecting range
        setRangeStartDate(date);
        setTempRangeDates([dateStr]);
      } else if (rangeStartDate && !rangeEndDate) {
        // Complete range selection
        const start = rangeStartDate < date ? rangeStartDate : date;
        const end = rangeStartDate < date ? date : rangeStartDate;
        setRangeStartDate(start);
        setRangeEndDate(end);
        
        // Generate all dates in range
        const datesInRange = [];
        const current = new Date(start);
        current.setHours(0, 0, 0, 0);
        const endDate = new Date(end);
        endDate.setHours(0, 0, 0, 0);
        
        while (current <= endDate) {
          datesInRange.push(current.toISOString().split('T')[0]);
          current.setDate(current.getDate() + 1);
        }
        setTempRangeDates(datesInRange);
      } else {
        // Reset and start new range
        setRangeStartDate(date);
        setRangeEndDate(null);
        setTempRangeDates([date.toISOString().split('T')[0]]);
      }
    } else {
      // Show booking details modal for any date (with or without bookings)
      setSelectedBookingDate(date);
    }
  };

  const handleFinishRangeBlock = async () => {
    if (!currentUser || selectedListing === 'all') {
      toast.error('Please select a specific listing first');
      return;
    }

    if (!rangeStartDate || !rangeEndDate || tempRangeDates.length === 0) {
      toast.error('Please select a date range first');
      return;
    }

    try {
      setLoading(true);
      const blockedRef = doc(db, 'listingAvailability', `${selectedListing}_${currentUser.uid}`);
      
      // Add all dates in range to blocked dates (avoid duplicates)
      const newBlockedDates = [...new Set([...blockedDates, ...tempRangeDates])];

      await setDoc(blockedRef, {
        listingId: selectedListing,
        hostId: currentUser.uid,
        blockedDates: newBlockedDates,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setBlockedDates(newBlockedDates);
      toast.success(`Blocked ${tempRangeDates.length} date(s) successfully`);
      
      // Reset range block mode
      setRangeBlockMode(false);
      setRangeStartDate(null);
      setRangeEndDate(null);
      setTempRangeDates([]);
    } catch (error) {
      console.error('Error blocking date range:', error);
      toast.error('Failed to block date range');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRangeBlock = () => {
    setRangeBlockMode(false);
    setRangeStartDate(null);
    setRangeEndDate(null);
    setTempRangeDates([]);
  };

  const handleBlockWeekends = async () => {
    if (!currentUser || selectedListing === 'all') {
      toast.error('Please select a specific listing first');
      return;
    }

    try {
      setLoading(true);
      
      // Get all weekends in the current month and next 3 months
      const weekendDates = [];
      const startDate = new Date(currentMonth);
      startDate.setDate(1);
      const endDate = new Date(currentMonth);
      endDate.setMonth(endDate.getMonth() + 3);
      endDate.setDate(0); // Last day of the month

      const current = new Date(startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      while (current <= endDate) {
        current.setHours(0, 0, 0, 0);
        // Saturday = 6, Sunday = 0
        const dayOfWeek = current.getDay();
        if ((dayOfWeek === 0 || dayOfWeek === 6) && current >= today) {
          weekendDates.push(current.toISOString().split('T')[0]);
        }
        current.setDate(current.getDate() + 1);
      }

      if (weekendDates.length === 0) {
        toast.info('No weekends found in the selected period');
        return;
      }

      const blockedRef = doc(db, 'listingAvailability', `${selectedListing}_${currentUser.uid}`);
      
      // Add all weekend dates to blocked dates (avoid duplicates)
      const newBlockedDates = [...new Set([...blockedDates, ...weekendDates])];

      await setDoc(blockedRef, {
        listingId: selectedListing,
        hostId: currentUser.uid,
        blockedDates: newBlockedDates,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setBlockedDates(newBlockedDates);
      toast.success(`Blocked ${weekendDates.length} weekend date(s) successfully`);
    } catch (error) {
      console.error('Error blocking weekends:', error);
      toast.error('Failed to block weekends');
    } finally {
      setLoading(false);
    }
  };

  // Get bookings for selected listing
  const filteredBookings = selectedListing === 'all' 
    ? bookings 
    : bookings.filter(b => b.listingId === selectedListing);

  // Calendar logic
  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - startDate.getDay()); // Start from Sunday

  const days = [];
  const currentDate = new Date(startDate);
  
  for (let i = 0; i < 42; i++) { // 6 weeks
    days.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const isToday = (date) => {
    const today = new Date();
    const checkDate = new Date(date);
    return (
      checkDate.getDate() === today.getDate() &&
      checkDate.getMonth() === today.getMonth() &&
      checkDate.getFullYear() === today.getFullYear()
    );
  };

  const getDateStatus = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    // Check if blocked
    if (blockedDates.includes(dateStr)) {
      return 'blocked';
    }

    // Check if has booking
    const booking = filteredBookings.find(b => {
      const checkIn = b.checkIn instanceof Date ? b.checkIn : new Date(b.checkIn);
      const checkOut = b.checkOut instanceof Date ? b.checkOut : new Date(b.checkOut);
      checkIn.setHours(0, 0, 0, 0);
      checkOut.setHours(0, 0, 0, 0);
      return checkDate >= checkIn && checkDate <= checkOut;
    });

    if (booking) {
      const checkIn = booking.checkIn instanceof Date ? booking.checkIn : new Date(booking.checkIn);
      checkIn.setHours(0, 0, 0, 0);
      const checkOut = booking.checkOut instanceof Date ? booking.checkOut : new Date(booking.checkOut);
      checkOut.setHours(0, 0, 0, 0);
      
      if (checkDate.getTime() === checkIn.getTime()) {
        return 'checkin';
      }
      if (checkDate.getTime() === checkOut.getTime()) {
        return 'checkout';
      }
      return 'booked';
    }

    if (checkDate < today) {
      return 'past';
    }

    return 'available';
  };

  const getBookingForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    return filteredBookings.find(b => {
      const checkIn = b.checkIn instanceof Date ? b.checkIn : new Date(b.checkIn);
      const checkOut = b.checkOut instanceof Date ? b.checkOut : new Date(b.checkOut);
      checkIn.setHours(0, 0, 0, 0);
      checkOut.setHours(0, 0, 0, 0);
      return checkDate >= checkIn && checkDate <= checkOut;
    });
  };

  const getBookingsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return filteredBookings.filter(b => {
      const checkIn = b.checkIn instanceof Date ? b.checkIn : new Date(b.checkIn);
      const checkOut = b.checkOut instanceof Date ? b.checkOut : new Date(b.checkOut);
      checkIn.setHours(0, 0, 0, 0);
      checkOut.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);
      return date >= checkIn && date <= checkOut;
    });
  };

  const navigateMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Availability Calendar</h2>
        <p className="text-gray-600 mb-4">Manage your listing availability and view bookings</p>
        
        {/* Listing Filter */}
        {listings.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Listing</label>
            <select
              value={selectedListing}
              onChange={(e) => setSelectedListing(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="all">All Listings</option>
              {listings.map(listing => (
                <option key={listing.id} value={listing.id}>
                  {listing.title || `Listing ${listing.id.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Calendar Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateMonth(-1)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ← Previous
          </button>
          <h3 className="text-xl font-semibold text-gray-900">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
          <button
            onClick={() => navigateMonth(1)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Next →
          </button>
        </div>

        {/* Action Buttons */}
        {selectedListing !== 'all' && (
          <div className="flex gap-3 mb-4">
            {!rangeBlockMode ? (
              <>
                <button
                  onClick={() => {
                    setRangeBlockMode(true);
                    setRangeStartDate(null);
                    setRangeEndDate(null);
                    setTempRangeDates([]);
                  }}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Range Block
                </button>
                <button
                  onClick={handleBlockWeekends}
                  disabled={loading}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Block Weekends
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleFinishRangeBlock}
                  disabled={loading || !rangeStartDate || !rangeEndDate}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Finish & Block
                </button>
                <button
                  onClick={handleCancelRangeBlock}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                {rangeStartDate && (
                  <span className="px-4 py-2 text-sm text-gray-600 flex items-center">
                    {rangeStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {rangeEndDate ? ` - ${rangeEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ' - Select end date'}
                  </span>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {dayNames.map(day => (
            <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((date, idx) => {
            const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
            const dateObj = new Date(date);
            const dateStr = dateObj.toISOString().split('T')[0];
            const status = getDateStatus(dateObj);
            const dateBookings = getBookingsForDate(dateObj);
            const isBlocked = blockedDates.includes(dateStr);
            const isTodayDate = isToday(dateObj);
            const bookingForDate = getBookingForDate(dateObj);
            const isHovered = hoveredDate && hoveredDate.toISOString().split('T')[0] === dateStr;
            const isInTempRange = rangeBlockMode && tempRangeDates.includes(dateStr);
            const isRangeStart = rangeStartDate && rangeStartDate.toISOString().split('T')[0] === dateStr;
            const isRangeEnd = rangeEndDate && rangeEndDate.toISOString().split('T')[0] === dateStr;

            return (
              <div
                key={idx}
                onClick={() => {
                  if (isCurrentMonth && !rangeBlockMode) {
                    handleDateClick(dateObj);
                  } else if (isCurrentMonth && rangeBlockMode) {
                    handleDateClick(dateObj);
                  }
                }}
                onMouseEnter={() => setHoveredDate(dateObj)}
                onMouseLeave={() => setHoveredDate(null)}
                className={`
                  min-h-[100px] p-2 rounded-lg border-2 transition-all relative group
                  ${!isCurrentMonth ? 'opacity-30' : ''}
                  ${isInTempRange && rangeBlockMode ? 'bg-orange-100 border-orange-400 border-2' : ''}
                  ${isRangeStart || isRangeEnd ? 'bg-orange-500 border-orange-600 border-3 ring-2 ring-orange-300' : ''}
                  ${status === 'blocked' || (isBlocked && !isInTempRange) ? 'bg-red-50 border-red-300 hover:bg-red-100' : ''}
                  ${status === 'booked' && !isInTempRange ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-400 hover:from-blue-100 hover:to-blue-200' : ''}
                  ${status === 'checkin' ? 'bg-gradient-to-br from-green-100 to-green-200 border-green-500 border-3 shadow-lg' : ''}
                  ${status === 'checkout' ? 'bg-gradient-to-br from-yellow-100 to-yellow-200 border-yellow-500 border-3 shadow-lg' : ''}
                  ${status === 'available' && isCurrentMonth && !isInTempRange ? 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-teal-300' : ''}
                  ${status === 'past' ? 'bg-gray-100 border-gray-200 opacity-50' : ''}
                  ${isCurrentMonth && selectedListing !== 'all' && status !== 'past' && (rangeBlockMode || dateBookings.length === 0) ? 'cursor-pointer hover:shadow-lg hover:scale-105' : dateBookings.length > 0 ? 'cursor-pointer' : 'cursor-default'}
                  ${isTodayDate ? 'ring-2 ring-teal-500 ring-offset-2' : ''}
                  ${isHovered ? 'z-10 transform scale-105' : ''}
                `}
              >
                {/* Date Number */}
                <div className={`text-sm font-semibold mb-1 flex items-center justify-between ${
                  isTodayDate ? 'text-teal-700' : status === 'past' ? 'text-gray-400' : 'text-gray-700'
                }`}>
                  <span>{date.getDate()}</span>
                  {isTodayDate && (
                    <span className="text-[10px] bg-teal-600 text-white px-1.5 py-0.5 rounded-full font-bold">TODAY</span>
                  )}
                </div>

                {/* Status Indicators */}
                {status === 'checkin' && (
                  <div className="absolute top-1 right-1">
                    <div className="w-3 h-3 bg-green-600 rounded-full border-2 border-white shadow-sm"></div>
                  </div>
                )}
                {status === 'checkout' && (
                  <div className="absolute top-1 right-1">
                    <div className="w-3 h-3 bg-yellow-600 rounded-full border-2 border-white shadow-sm"></div>
                  </div>
                )}

                {/* Booking Information */}
                {dateBookings.length > 0 && (
                  <div className="space-y-1 mt-1">
                    {dateBookings.slice(0, 2).map(booking => {
                      const bookingStatus = booking.status || 'pending';
                      return (
                        <div
                          key={booking.id}
                          className={`text-xs px-2 py-1 rounded-md truncate font-medium transition-all ${
                            bookingStatus === 'confirmed' 
                              ? 'bg-green-600 text-white shadow-sm' 
                              : bookingStatus === 'completed'
                              ? 'bg-gray-600 text-white shadow-sm'
                              : bookingStatus === 'cancelled'
                              ? 'bg-red-600 text-white shadow-sm'
                              : 'bg-blue-600 text-white shadow-sm'
                          }`}
                          title={`${booking.guestName || 'Guest'} - ${booking.listingTitle || 'Booking'} - ${bookingStatus}`}
                        >
                          {booking.guestName || 'Guest'}
                        </div>
                      );
                    })}
                    {dateBookings.length > 2 && (
                      <div className="text-xs text-gray-600 font-semibold bg-gray-200 px-1.5 py-0.5 rounded">
                        +{dateBookings.length - 2} more
                      </div>
                    )}
                  </div>
                )}

                {/* Blocked Indicator */}
                {isBlocked && dateBookings.length === 0 && !isInTempRange && (
                  <div className="mt-1 flex items-center gap-1">
                    <span className="text-xs text-red-600 font-semibold">🚫</span>
                    <span className="text-[10px] text-red-600 font-medium">Blocked</span>
                  </div>
                )}

                {/* Range Selection Indicator */}
                {rangeBlockMode && isInTempRange && (
                  <div className="mt-1 flex items-center gap-1">
                    <span className="text-xs text-orange-600 font-semibold">
                      {isRangeStart ? '▶' : isRangeEnd ? '◀' : '●'}
                    </span>
                    <span className="text-[10px] text-orange-600 font-medium">
                      {isRangeStart ? 'Start' : isRangeEnd ? 'End' : 'Selected'}
                    </span>
                  </div>
                )}

                {/* Available Indicator */}
                {status === 'available' && isCurrentMonth && dateBookings.length === 0 && !isBlocked && !isInTempRange && (
                  <div className="mt-auto pt-1">
                    <div className="text-[10px] text-gray-400 font-medium">Available</div>
                  </div>
                )}

                {/* Hover Tooltip */}
                {isHovered && bookingForDate && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-20 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                    <div className="font-semibold mb-1">{bookingForDate.guestName || 'Guest'}</div>
                    <div className="text-gray-300">
                      {bookingForDate.checkIn instanceof Date ? bookingForDate.checkIn.toLocaleDateString() : new Date(bookingForDate.checkIn).toLocaleDateString()} - 
                      {bookingForDate.checkOut instanceof Date ? bookingForDate.checkOut.toLocaleDateString() : new Date(bookingForDate.checkOut).toLocaleDateString()}
                    </div>
                    <div className="text-gray-300">
                      {bookingForDate.guests || 1} {bookingForDate.guests === 1 ? 'guest' : 'guests'}
                    </div>
                    <div className="text-teal-400 font-semibold mt-1">
                      ₱{parseFloat(bookingForDate.totalAmount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full border-4 border-transparent border-t-gray-900"></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 bg-gray-50 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Calendar Legend</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gray-50 border-2 border-gray-200 rounded"></div>
            <span className="text-gray-700">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-400 rounded"></div>
            <span className="text-gray-700">Booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gradient-to-br from-green-100 to-green-200 border-2 border-green-500 rounded relative">
              <div className="absolute top-0 right-0 w-2 h-2 bg-green-600 rounded-full border border-white"></div>
            </div>
            <span className="text-gray-700">Check-in</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gradient-to-br from-yellow-100 to-yellow-200 border-2 border-yellow-500 rounded relative">
              <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-600 rounded-full border border-white"></div>
            </div>
            <span className="text-gray-700">Check-out</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-red-50 border-2 border-red-300 rounded"></div>
            <span className="text-gray-700">Blocked</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <div className="w-4 h-4 ring-2 ring-teal-500 rounded"></div>
            <span>Today's date is highlighted with a ring</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600 mt-2">
            <span>💡</span>
            <span>Click on dates with bookings to see details • Click available dates to block/unblock</span>
          </div>
        </div>
      </div>

      {/* Booking Details Modal - Enhanced Design */}
      {selectedBookingDate && (
        <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-lg flex items-center justify-center z-50 p-4" onClick={() => setSelectedBookingDate(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Orange Header */}
            <div className="bg-[#FF6B35] text-white p-6 rounded-t-2xl relative">
              <button
                onClick={() => setSelectedBookingDate(null)}
                className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h3 className="text-2xl font-bold mb-1">
                {selectedBookingDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </h3>
              <p className="text-white/90 text-sm">Manage bookings and availability</p>
            </div>

            {/* White Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Bookings Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-bold text-gray-900">Bookings</h4>
                  <span className="text-sm text-gray-600 font-semibold">
                    {getBookingsForDate(selectedBookingDate).length} booking{getBookingsForDate(selectedBookingDate).length !== 1 ? 's' : ''}
                  </span>
                </div>
                
                {getBookingsForDate(selectedBookingDate).length === 0 ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                    <p className="text-gray-600 font-medium">No bookings for this date.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getBookingsForDate(selectedBookingDate).map(booking => {
                      const checkIn = booking.checkIn instanceof Date ? booking.checkIn : new Date(booking.checkIn);
                      const checkOut = booking.checkOut instanceof Date ? booking.checkOut : new Date(booking.checkOut);
                      const bookingStatus = booking.status || 'pending';
                      
                      return (
                        <div
                          key={booking.id}
                          className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h5 className="font-bold text-gray-900 text-lg mb-1">{booking.guestName || 'Guest'}</h5>
                              <p className="text-sm text-gray-600 mb-2">{booking.listingTitle || 'Unknown Listing'}</p>
                              <div className="flex items-center gap-4 text-sm">
                                <div>
                                  <span className="text-gray-500">Check-in: </span>
                                  <span className="font-semibold text-gray-900">{checkIn.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Check-out: </span>
                                  <span className="font-semibold text-gray-900">{checkOut.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Guests: </span>
                                  <span className="font-semibold text-gray-900">{booking.guests || 1}</span>
                                </div>
                              </div>
                              <div className="mt-2">
                                <span className="text-gray-500 text-sm">Total: </span>
                                <span className="font-bold text-teal-600 text-lg">₱{parseFloat(booking.totalAmount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                bookingStatus === 'confirmed' ? 'bg-green-100 text-green-700' :
                                bookingStatus === 'completed' ? 'bg-gray-100 text-gray-700' :
                                bookingStatus === 'cancelled' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {bookingStatus.toUpperCase()}
                              </span>
                            </div>
                          </div>
                          {booking.guestId && booking.listingId && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <Link
                                to={`/host/messages?guest=${booking.guestId}&listing=${booking.listingId}`}
                                className="text-sm text-teal-600 hover:text-teal-700 font-semibold inline-flex items-center gap-1"
                              >
                                Message Guest
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </Link>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Date Actions Section */}
              {selectedListing !== 'all' && (
                <div>
                  <h4 className="text-lg font-bold text-gray-900 mb-4">Date Actions</h4>
                  <button
                    onClick={async () => {
                      await handleBlockDate(selectedBookingDate);
                      setSelectedBookingDate(null);
                    }}
                    disabled={loading}
                    className={`w-full py-4 px-6 rounded-lg font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      blockedDates.includes(selectedBookingDate.toISOString().split('T')[0])
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-gray-800 hover:bg-gray-900 text-white'
                    }`}
                  >
                    {loading ? 'Processing...' : blockedDates.includes(selectedBookingDate.toISOString().split('T')[0]) ? 'Unblock Date' : 'Block Date'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Block/Unblock Modal */}
      {showBlockModal && selectedDate && (
        <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-lg flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {blockedDates.includes(selectedDate.toISOString().split('T')[0]) ? 'Unblock Date' : 'Block Date'}
            </h3>
            <p className="text-gray-600 mb-4">
              {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => handleBlockDate(selectedDate)}
                disabled={loading}
                className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                  blockedDates.includes(selectedDate.toISOString().split('T')[0])
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                } disabled:opacity-50`}
              >
                {loading ? 'Processing...' : blockedDates.includes(selectedDate.toISOString().split('T')[0]) ? 'Unblock Date' : 'Block Date'}
              </button>
              <button
                onClick={() => {
                  setShowBlockModal(false);
                  setSelectedDate(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Subscription Section Component
const SubscriptionSection = ({ hostSubscription, balance, listings, onSubscriptionUpdate }) => {
  const { currentUser } = useAuth();
  const { deduct } = useWallet();
  const [showAddSlotsModal, setShowAddSlotsModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const subscriptionPlan = getSubscriptionPlan(hostSubscription.planId);
  const listingAvailability = canCreateListing(
    hostSubscription.planId,
    listings.length,
    hostSubscription.additionalSlots
  );

  // Calculate bulk pricing (existing hosts get bulk discounts)
  const bulkPricing = getBulkSlotPricing(quantity, 'oneTime', true); // true = existing host
  const priceInPHP = convertToPHP(bulkPricing.price);

  const handlePurchaseSlots = async () => {
    setProcessing(true);
    try {
      if (balance < priceInPHP) {
        toast.error(`Insufficient balance. You need ₱${priceInPHP.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`);
        return;
      }

      // Deduct from wallet
      await deduct(priceInPHP, `Additional Listing Slots: ${quantity} slot(s) - One-Time`);

      // Update host subscription in Firestore
      const hostDocRef = doc(db, 'hosts', currentUser.uid);
      const currentSlots = hostSubscription.additionalSlots || 0;
      await updateDoc(hostDocRef, {
        additionalListingSlots: currentSlots + quantity,
        slotType: 'oneTime',
        updatedAt: serverTimestamp()
      });

      // Refresh subscription data
      if (onSubscriptionUpdate) {
        await onSubscriptionUpdate();
      }

      toast.success(`Successfully purchased ${quantity} additional listing slot(s)! ${bulkPricing.savings > 0 ? `You saved ₱${convertToPHP(bulkPricing.savings).toLocaleString('en-PH', { minimumFractionDigits: 2 })}!` : ''}`);
      setShowAddSlotsModal(false);
      setQuantity(1);
    } catch (error) {
      console.error('Error purchasing slots:', error);
      toast.error('Failed to purchase slots. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Subscription & Listing Slots</h2>
        <p className="text-gray-600">Manage your subscription plan and purchase additional listing slots</p>
      </div>

      {/* Current Subscription Info */}
      <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border-2 border-teal-200 rounded-xl p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {subscriptionPlan.name} Plan
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-4">
                <span className="text-gray-600">Listings Used: </span>
                <span className="font-bold text-gray-900">{listings.length}</span>
                <span className="text-gray-600"> / </span>
                <span className={`font-bold ${listingAvailability.remaining === 0 ? 'text-red-600' : 'text-teal-600'}`}>
                  {subscriptionPlan.listingLimit + hostSubscription.additionalSlots}
                </span>
              </div>
              {hostSubscription.additionalSlots > 0 && (
                <div className="text-xs text-gray-500">
                  (+{hostSubscription.additionalSlots} additional slot{hostSubscription.additionalSlots !== 1 ? 's' : ''})
                </div>
              )}
              {listingAvailability.remaining > 0 && (
                <div className="text-teal-700 font-semibold">
                  {listingAvailability.remaining} slot{listingAvailability.remaining !== 1 ? 's' : ''} available
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 mb-1">Monthly Price</p>
            <p className="text-2xl font-bold text-teal-600">₱{convertToPHP(subscriptionPlan.price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      {/* Purchase Additional Slots Section */}
      <div className="bg-white border-2 border-gray-200 rounded-xl p-6 mb-8">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Purchase Additional Listing Slots</h3>
        <p className="text-gray-600 mb-6">
          Need more listings? Purchase additional slots with bulk discounts! Existing hosts get special pricing.
        </p>

        {/* Bulk Pricing Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 3, 5, 10].map((qty) => {
            const tierPricing = getBulkSlotPricing(qty, 'oneTime', true);
            const tierPricePHP = convertToPHP(tierPricing.price);
            const regularPricePHP = convertToPHP(tierPricing.regularPrice);
            const savings = tierPricing.savings > 0;

            return (
              <div
                key={qty}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  quantity === qty && slotType === 'oneTime'
                    ? 'border-teal-500 bg-teal-50 shadow-lg'
                    : 'border-gray-200 hover:border-teal-300'
                }`}
                onClick={() => {
                  setQuantity(qty);
                  setSlotType('oneTime');
                }}
              >
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 mb-1">{qty}</div>
                  <div className="text-xs text-gray-500 mb-2">slot{qty !== 1 ? 's' : ''}</div>
                  <div className="text-lg font-bold text-teal-600 mb-1">
                    ₱{tierPricePHP.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </div>
                  {savings && (
                    <div className="text-xs text-gray-500 line-through mb-1">
                      ₱{regularPricePHP.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </div>
                  )}
                  {savings && (
                    <div className="text-xs font-semibold text-green-600">
                      Save ₱{convertToPHP(tierPricing.savings).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Purchase Button */}
        <button
          onClick={() => setShowAddSlotsModal(true)}
          className="w-full py-3 px-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-300"
        >
          Purchase Listing Slots
        </button>
      </div>

      {/* Current Plan Features */}
      <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Plan Features</h3>
        <ul className="space-y-2">
          {subscriptionPlan.features.map((feature, idx) => (
            <li key={idx} className="flex items-center gap-2 text-gray-700">
              <span className="text-teal-600">✓</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Add Slots Modal */}
      {showAddSlotsModal && (
        <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-lg flex items-center justify-center z-50 p-4" onClick={() => setShowAddSlotsModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Purchase Additional Listing Slots</h3>
                <button
                  onClick={() => setShowAddSlotsModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Payment Type Info */}
              <div className="bg-teal-50 border-2 border-teal-200 rounded-lg p-4">
                <p className="font-semibold text-gray-900 mb-1">{ADDITIONAL_LISTING_PRICES.oneTime.name}</p>
                <p className="text-xs text-gray-600">{ADDITIONAL_LISTING_PRICES.oneTime.description}</p>
              </div>

              {/* Quantity Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => {
                      const val = Math.max(1, parseInt(e.target.value) || 1);
                      setQuantity(val);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-center"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Price Summary with Bulk Discount */}
              <div className="bg-gray-50 rounded-lg p-4">
                {bulkPricing.isBulk && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Regular Price:</span>
                    <span className="text-sm text-gray-500 line-through">₱{convertToPHP(bulkPricing.regularPrice).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Price per slot:</span>
                  <span className="font-semibold text-gray-900">₱{convertToPHP(bulkPricing.perSlot).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Quantity:</span>
                  <span className="font-semibold text-gray-900">{quantity}</span>
                </div>
                {bulkPricing.savings > 0 && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-green-600 font-semibold">You Save:</span>
                    <span className="text-green-600 font-bold">₱{convertToPHP(bulkPricing.savings).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                  <span className="text-lg font-bold text-gray-900">Total:</span>
                  <span className="text-lg font-bold text-teal-600">₱{priceInPHP.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Purchase Button */}
              <button
                onClick={handlePurchaseSlots}
                disabled={processing || balance < priceInPHP}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                  balance < priceInPHP
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-teal-600 hover:bg-teal-700 text-white'
                }`}
              >
                {processing ? 'Processing...' : balance < priceInPHP ? 'Insufficient Balance' : `Purchase ${quantity} Slot${quantity !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CouponsSection = () => {
  const { currentUser } = useAuth();
  const [coupons, setCoupons] = useState([]);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [saving, setSaving] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: '',
    discountType: 'percentage',
    discountValue: 10,
    minAmount: 0,
    maxDiscount: null,
    validFrom: '',
    validUntil: '',
    usageLimit: null,
    applicableTo: 'all'
  });

  // Coupon templates
  const couponTemplates = [
    {
      name: 'Welcome Discount',
      code: 'WELCOME10',
      discountType: 'percentage',
      discountValue: 10,
      minAmount: 0,
      maxDiscount: null,
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      usageLimit: 100,
      applicableTo: 'all',
      description: 'Perfect for attracting new guests with a 10% welcome discount'
    },
    {
      name: 'Early Bird Special',
      code: 'EARLYBIRD15',
      discountType: 'percentage',
      discountValue: 15,
      minAmount: 1000,
      maxDiscount: 500,
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      usageLimit: 50,
      applicableTo: 'all',
      description: 'Reward early bookings with 15% off (min ₱1,000, max ₱500 discount)'
    },
    {
      name: 'Weekend Getaway',
      code: 'WEEKEND20',
      discountType: 'percentage',
      discountValue: 20,
      minAmount: 2000,
      maxDiscount: 1000,
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      usageLimit: null,
      applicableTo: 'home',
      description: 'Special weekend discount for home bookings (20% off, min ₱2,000)'
    },
    {
      name: 'Fixed Amount Off',
      code: 'SAVE500',
      discountType: 'fixed',
      discountValue: 500,
      minAmount: 3000,
      maxDiscount: null,
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      usageLimit: 200,
      applicableTo: 'all',
      description: 'Flat ₱500 discount for bookings over ₱3,000'
    },
    {
      name: 'Experience Special',
      code: 'EXPERIENCE25',
      discountType: 'percentage',
      discountValue: 25,
      minAmount: 1500,
      maxDiscount: 750,
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      usageLimit: 75,
      applicableTo: 'experience',
      description: 'Exclusive 25% discount for experience bookings'
    },
    {
      name: 'Service Package',
      code: 'SERVICE30',
      discountType: 'percentage',
      discountValue: 30,
      minAmount: 2000,
      maxDiscount: 1500,
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      usageLimit: 100,
      applicableTo: 'service',
      description: 'Big savings on service bookings - 30% off!'
    }
  ];

  useEffect(() => {
    if (currentUser) {
      loadCoupons();
    }
  }, [currentUser]);

  const loadCoupons = async () => {
    if (!currentUser) return;
    try {
      const q = query(
        collection(db, 'coupons'),
        where('hostId', '==', currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      const couponsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : 
          (doc.data().createdAt?.seconds ? new Date(doc.data().createdAt.seconds * 1000) : new Date())
      })).sort((a, b) => {
        return (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);
      });
      setCoupons(couponsList);
    } catch (error) {
      console.error('Error loading coupons:', error);
      toast.error('Failed to load coupons');
    }
  };

  const handleCouponSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    setSaving(true);
    try {
      const couponData = {
        ...couponForm,
        hostId: currentUser.uid,
        hostName: currentUser.displayName || currentUser.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        usageCount: 0,
        isActive: true
      };

      if (editingCoupon) {
        const couponRef = doc(db, 'coupons', editingCoupon.id);
        await updateDoc(couponRef, {
          ...couponData,
          updatedAt: serverTimestamp()
        });
        toast.success('Coupon updated successfully!');
      } else {
        await addDoc(collection(db, 'coupons'), couponData);
        toast.success('Coupon created successfully!');
      }

      setCouponForm({
        code: '',
        discountType: 'percentage',
        discountValue: 10,
        minAmount: 0,
        maxDiscount: null,
        validFrom: '',
        validUntil: '',
        usageLimit: null,
        applicableTo: 'all'
      });
      setShowCouponForm(false);
      setEditingCoupon(null);
      loadCoupons();
    } catch (error) {
      console.error('Error saving coupon:', error);
      toast.error('Failed to save coupon. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCoupon = async (couponId) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) return;

    try {
      await deleteDoc(doc(db, 'coupons', couponId));
      toast.success('Coupon deleted successfully!');
      loadCoupons();
    } catch (error) {
      console.error('Error deleting coupon:', error);
      toast.error('Failed to delete coupon. Please try again.');
    }
  };

  const handleEditCoupon = (coupon) => {
    setEditingCoupon(coupon);
    
    const formatDate = (dateValue) => {
      if (!dateValue) return '';
      if (dateValue.toDate) {
        return dateValue.toDate().toISOString().split('T')[0];
      }
      if (dateValue.seconds) {
        return new Date(dateValue.seconds * 1000).toISOString().split('T')[0];
      }
      if (typeof dateValue === 'string' && dateValue.includes('T')) {
        return dateValue.split('T')[0];
      }
      return dateValue;
    };
    
    setCouponForm({
      code: coupon.code,
      discountType: coupon.discountType || 'percentage',
      discountValue: coupon.discountValue || 10,
      minAmount: coupon.minAmount || 0,
      maxDiscount: coupon.maxDiscount || null,
      validFrom: formatDate(coupon.validFrom),
      validUntil: formatDate(coupon.validUntil),
      usageLimit: coupon.usageLimit || null,
      applicableTo: coupon.applicableTo || 'all'
    });
    setShowCouponForm(true);
  };

  const handleUseTemplate = (template) => {
    setCouponForm({
      code: template.code,
      discountType: template.discountType,
      discountValue: template.discountValue,
      minAmount: template.minAmount,
      maxDiscount: template.maxDiscount,
      validFrom: template.validFrom,
      validUntil: template.validUntil,
      usageLimit: template.usageLimit,
      applicableTo: template.applicableTo
    });
    setShowTemplateModal(false);
    setShowCouponForm(true);
    setEditingCoupon(null);
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    if (dateValue.toDate) {
      return dateValue.toDate().toLocaleDateString();
    }
    if (dateValue.seconds) {
      return new Date(dateValue.seconds * 1000).toLocaleDateString();
    }
    if (typeof dateValue === 'string') {
      return new Date(dateValue).toLocaleDateString();
    }
    return 'N/A';
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Coupon Management</h2>
          <p className="text-gray-600">Create and manage discount coupons to attract more guests</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowTemplateModal(true)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            View Templates
          </button>
          <button
            onClick={() => {
              setShowCouponForm(true);
              setEditingCoupon(null);
              setCouponForm({
                code: '',
                discountType: 'percentage',
                discountValue: 10,
                minAmount: 0,
                maxDiscount: null,
                validFrom: '',
                validUntil: '',
                usageLimit: null,
                applicableTo: 'all'
              });
            }}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Coupon
          </button>
        </div>
      </div>

      {/* Coupon Form */}
      {showCouponForm && (
        <form onSubmit={handleCouponSubmit} className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
            </h3>
            <button
              type="button"
              onClick={() => {
                setShowCouponForm(false);
                setEditingCoupon(null);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Coupon Code *</label>
              <input
                type="text"
                value={couponForm.code}
                onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="SAVE10"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Discount Type *</label>
              <select
                value={couponForm.discountType}
                onChange={(e) => setCouponForm({ ...couponForm, discountType: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                required
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₱)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Discount Value *</label>
              <input
                type="number"
                min="0"
                step={couponForm.discountType === 'percentage' ? '1' : '0.01'}
                value={couponForm.discountValue}
                onChange={(e) => setCouponForm({ ...couponForm, discountValue: parseFloat(e.target.value) })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Amount (₱)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={couponForm.minAmount}
                onChange={(e) => setCouponForm({ ...couponForm, minAmount: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Discount (₱)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={couponForm.maxDiscount || ''}
                onChange={(e) => setCouponForm({ ...couponForm, maxDiscount: e.target.value ? parseFloat(e.target.value) : null })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="No limit"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Valid From *</label>
              <input
                type="date"
                value={couponForm.validFrom}
                onChange={(e) => setCouponForm({ ...couponForm, validFrom: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Valid Until *</label>
              <input
                type="date"
                value={couponForm.validUntil}
                onChange={(e) => setCouponForm({ ...couponForm, validUntil: e.target.value })}
                min={couponForm.validFrom}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Usage Limit</label>
              <input
                type="number"
                min="1"
                value={couponForm.usageLimit || ''}
                onChange={(e) => setCouponForm({ ...couponForm, usageLimit: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Unlimited"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Applicable To</label>
              <select
                value={couponForm.applicableTo}
                onChange={(e) => setCouponForm({ ...couponForm, applicableTo: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="all">All Listings</option>
                <option value="home">Homes Only</option>
                <option value="experience">Experiences Only</option>
                <option value="service">Services Only</option>
              </select>
            </div>
          </div>

          <div className="flex space-x-4 mt-6">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : editingCoupon ? 'Update Coupon' : 'Create Coupon'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCouponForm(false);
                setEditingCoupon(null);
              }}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Coupons List */}
      {coupons.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
          <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🎫</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">No coupons yet</h3>
          <p className="text-gray-600 max-w-md mx-auto mb-6">Create coupons to attract more guests to your listings</p>
          <button
            onClick={() => setShowTemplateModal(true)}
            className="px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors inline-block mr-3"
          >
            View Templates
          </button>
          <button
            onClick={() => {
              setShowCouponForm(true);
              setEditingCoupon(null);
              setCouponForm({
                code: '',
                discountType: 'percentage',
                discountValue: 10,
                minAmount: 0,
                maxDiscount: null,
                validFrom: '',
                validUntil: '',
                usageLimit: null,
                applicableTo: 'all'
              });
            }}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors inline-block"
          >
            Create Custom
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {coupons.map((coupon) => (
            <div key={coupon.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="text-xl font-bold text-gray-900">{coupon.code}</h4>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      coupon.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {coupon.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-gray-600">Discount</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {coupon.discountType === 'percentage' 
                          ? `${coupon.discountValue}%` 
                          : `₱${coupon.discountValue.toLocaleString('en-PH')}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Valid Period</p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(coupon.validFrom)} - {formatDate(coupon.validUntil)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Usage</p>
                      <p className="text-sm font-medium text-gray-900">
                        {coupon.usageCount || 0} / {coupon.usageLimit || '∞'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Applicable To</p>
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {coupon.applicableTo === 'all' ? 'All Listings' : coupon.applicableTo}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => handleEditCoupon(coupon)}
                    className="px-4 py-2 text-sm text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteCoupon(coupon.id)}
                    className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-lg flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900">Coupon Templates</h3>
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">Choose a template to get started quickly</p>
            </div>
            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-4">
                {couponTemplates.map((template, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-5 hover:border-teal-500 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => handleUseTemplate(template)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">{template.name}</h4>
                        <p className="text-sm font-mono text-teal-600 mb-2">{template.code}</p>
                      </div>
                      <span className="text-2xl">🎫</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                    <div className="space-y-1 text-xs text-gray-500">
                      <div className="flex justify-between">
                        <span>Discount:</span>
                        <span className="font-semibold text-gray-700">
                          {template.discountType === 'percentage' 
                            ? `${template.discountValue}%` 
                            : `₱${template.discountValue.toLocaleString()}`}
                        </span>
                      </div>
                      {template.minAmount > 0 && (
                        <div className="flex justify-between">
                          <span>Min Amount:</span>
                          <span className="font-semibold text-gray-700">₱{template.minAmount.toLocaleString()}</span>
                        </div>
                      )}
                      {template.maxDiscount && (
                        <div className="flex justify-between">
                          <span>Max Discount:</span>
                          <span className="font-semibold text-gray-700">₱{template.maxDiscount.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Valid For:</span>
                        <span className="font-semibold text-gray-700">
                          {Math.ceil((new Date(template.validUntil) - new Date(template.validFrom)) / (1000 * 60 * 60 * 24))} days
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Usage Limit:</span>
                        <span className="font-semibold text-gray-700">{template.usageLimit || 'Unlimited'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Applicable To:</span>
                        <span className="font-semibold text-gray-700 capitalize">
                          {template.applicableTo === 'all' ? 'All Listings' : template.applicableTo}
                        </span>
                      </div>
                    </div>
                    <button className="w-full mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors">
                      Use This Template
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PromotionsSection = ({ listings }) => (
  <div className="p-8">
    <h2 className="text-2xl font-bold text-gray-900 mb-2">Promotions & Marketing</h2>
    <p className="text-gray-600 mb-8">Boost your listings with promotions</p>
    {listings.length > 0 ? (
      <div className="space-y-4">
        <p className="text-gray-600">Promote your {listings.length} listings to get more visibility.</p>
      </div>
    ) : (
      <EmptyState 
        icon="⭐"
        title="No listings to promote"
        description="Create your first listing to start using promotions"
        actionText="Create Listing"
        actionLink="/host/create-listing"
      />
    )}
  </div>
);

// Payments Management Section
const PaymentsSection = ({ bookings, listings }) => {
  const { currentUser } = useAuth();
  const { receivePayment, balance } = useWallet();
  const [processing, setProcessing] = useState({});
  const [filter, setFilter] = useState('all'); // all, pending, completed, paid
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('wallet'); // wallet, bank, paypal
  const [loadingPayouts, setLoadingPayouts] = useState(true);
  
  // Calculate earnings from bookings
  const calculateEarnings = () => {
    const completedBookings = bookings.filter(b => 
      b.status === 'completed' || b.status === 'confirmed'
    );
    
    const totalEarnings = completedBookings.reduce((sum, booking) => {
      // Use stored serviceFee if available, otherwise calculate using current percentage
      const serviceFee = booking.serviceFee || calculateServiceFee(booking.totalAmount || 0);
      const hostPayout = booking.totalAmount - serviceFee;
      return sum + (hostPayout || 0);
    }, 0);
    
    const pendingEarnings = bookings.filter(b => 
      b.status === 'confirmed' && (!b.hostPayoutStatus || b.hostPayoutStatus === 'pending')
    ).reduce((sum, booking) => {
      // Use stored serviceFee if available, otherwise calculate using current percentage
      const serviceFee = booking.serviceFee || calculateServiceFee(booking.totalAmount || 0);
      const hostPayout = booking.totalAmount - serviceFee;
      return sum + (hostPayout || 0);
    }, 0);
    
    const paidEarnings = bookings.filter(b => 
      b.hostPayoutStatus === 'paid'
    ).reduce((sum, booking) => {
      return sum + (booking.hostPayoutAmount || 0);
    }, 0);
    
    return { totalEarnings, pendingEarnings, paidEarnings };
  };
  
  const earnings = calculateEarnings();
  
  // Load payout requests
  useEffect(() => {
    if (!currentUser) return;
    
    const q = query(
      collection(db, 'payoutRequests'),
      where('hostId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt?.seconds * 1000)
      }));
      setPayoutRequests(requests);
      setLoadingPayouts(false);
    }, (error) => {
      console.error('Error loading payout requests:', error);
      setLoadingPayouts(false);
    });
    
    return () => unsubscribe();
  }, [currentUser]);
  
  const handleRequestPayout = async () => {
    const amount = parseFloat(payoutAmount);
    
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    if (amount > balance) {
      toast.error('Requested amount exceeds wallet balance');
      return;
    }
    
    if (amount < 100) {
      toast.error('Minimum payout amount is ₱100');
      return;
    }
    
    try {
      await addDoc(collection(db, 'payoutRequests'), {
        hostId: currentUser.uid,
        hostName: currentUser.displayName || currentUser.email,
        amount: amount,
        payoutMethod: payoutMethod,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      toast.success(`✅ Payout request of ₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} submitted successfully!`);
      setShowPayoutModal(false);
      setPayoutAmount('');
      setPayoutMethod('wallet');
    } catch (error) {
      console.error('Error requesting payout:', error);
      toast.error('Failed to submit payout request. Please try again.');
    }
  };
  
  const handleProcessPayment = async (bookingId) => {
    if (!window.confirm('Process payment for this completed booking?')) return;
    
    try {
      setProcessing({ ...processing, [bookingId]: true });
      const bookingRef = doc(db, 'bookings', bookingId);
      const bookingDoc = await getDoc(bookingRef);
      const bookingData = bookingDoc.data();
      
      if (!bookingData) {
        throw new Error('Booking not found');
      }
      
      // Calculate host payout (total - service fee)
      const serviceFee = bookingData.serviceFee || calculateServiceFee(bookingData.totalAmount || 0);
      const hostPayout = bookingData.totalAmount - serviceFee;
      
      // Process payment to host wallet
      await receivePayment(
        hostPayout,
        bookingId,
        `Payment for booking: ${bookingData.listingTitle || 'Listing'}`
      );
      
      // Update booking with payout status
      await updateDoc(bookingRef, {
        hostPayoutAmount: hostPayout,
        hostPayoutStatus: 'paid',
        payoutProcessedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      toast.success(`✅ Payment of ₱${hostPayout.toLocaleString('en-PH', { minimumFractionDigits: 2 })} processed successfully!`);
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error(`Failed to process payment: ${error.message}`);
    } finally {
      setProcessing({ ...processing, [bookingId]: false });
    }
  };
  
  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date instanceof Date ? date : (date?.toDate ? date.toDate() : new Date(date));
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  const getPaymentStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-200', label: 'Pending' },
      paid: { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200', label: 'Paid' },
      processing: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', label: 'Processing' }
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${badge.bg} ${badge.text} ${badge.border}`}>
        {badge.label}
      </span>
    );
  };
  
  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true;
    if (filter === 'pending') {
      return booking.status === 'confirmed' && (!booking.hostPayoutStatus || booking.hostPayoutStatus === 'pending');
    }
    if (filter === 'completed') {
      return booking.status === 'completed';
    }
    if (filter === 'paid') {
      return booking.hostPayoutStatus === 'paid';
    }
    return true;
  });
  
  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payments & Earnings</h2>
        <p className="text-gray-600">Manage your payments and track your earnings</p>
      </div>
      
      {/* Request Payout Button */}
      <div className="mb-6 flex justify-end">
        <button
          onClick={() => setShowPayoutModal(true)}
          disabled={balance <= 0}
          className="px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-teal-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md hover:shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Request Payout
        </button>
      </div>
      
      {/* Earnings Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-700">Total Earnings</span>
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-green-900">
            ₱{earnings.totalEarnings.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-green-600 mt-1">From all completed bookings</p>
        </div>
        
        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-yellow-700">Pending Payments</span>
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-yellow-900">
            ₱{earnings.pendingEarnings.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-yellow-600 mt-1">Awaiting processing</p>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700">Wallet Balance</span>
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-blue-900">
            ₱{balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </p>
          <Link to="/wallet" className="text-xs text-blue-600 mt-1 hover:underline inline-block">
            View wallet →
          </Link>
        </div>
      </div>
      
      {/* Filter Tabs */}
      <div className="bg-white rounded-xl shadow-sm p-2 mb-6 flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'All Payments' },
          { key: 'pending', label: 'Pending' },
          { key: 'completed', label: 'Completed' },
          { key: 'paid', label: 'Paid Out' }
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
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Payments List */}
      {filteredBookings.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="text-6xl mb-4">💰</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No payments yet</h3>
          <p className="text-gray-600">Your payments will appear here once bookings are completed</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map(booking => {
            const serviceFee = booking.serviceFee || calculateServiceFee(booking.totalAmount || 0);
            const hostPayout = booking.hostPayoutAmount || (booking.totalAmount - serviceFee);
            const isProcessing = processing[booking.id];
            // Allow processing for completed bookings or confirmed bookings (after check-in)
            const canProcess = (booking.status === 'completed' || booking.status === 'confirmed') && 
                              (!booking.hostPayoutStatus || booking.hostPayoutStatus === 'pending');
            
            return (
              <div key={booking.id} className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {booking.listingTitle || 'Listing'}
                      </h3>
                      {getPaymentStatusBadge(booking.hostPayoutStatus || 'pending')}
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        booking.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                        booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      Guest: {booking.guestName || booking.guestEmail || 'Guest'}
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Check-in</p>
                        <p className="font-medium text-gray-900">{formatDate(booking.checkIn)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Check-out</p>
                        <p className="font-medium text-gray-900">{formatDate(booking.checkOut)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Total Amount</p>
                        <p className="font-medium text-gray-900">
                          ₱{parseFloat(booking.totalAmount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Your Payout</p>
                        <p className="font-bold text-teal-600 text-lg">
                          ₱{hostPayout.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                    {booking.serviceFee && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500">
                          Service Fee: ₱{serviceFee.toLocaleString('en-PH', { minimumFractionDigits: 2 })} • 
                          Payment Method: {booking.paymentMethod || 'wallet'}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Action Button */}
                  <div className="ml-4">
                    {canProcess && (
                      <button
                        onClick={() => handleProcessPayment(booking.id)}
                        disabled={isProcessing}
                        className="px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-teal-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md hover:shadow-lg whitespace-nowrap"
                      >
                        {isProcessing ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Process Payment</span>
                          </>
                        )}
                      </button>
                    )}
                    {booking.hostPayoutStatus === 'paid' && booking.payoutProcessedAt && (
                      <div className="text-right">
                        <p className="text-xs text-green-600 font-medium">Paid on</p>
                        <p className="text-xs text-gray-600">
                          {formatDate(booking.payoutProcessedAt)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Payout History Section */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">Payout History</h3>
            <p className="text-sm text-gray-600">View your payout requests and their status</p>
          </div>
        </div>
        
        {loadingPayouts ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading payout history...</p>
          </div>
        ) : payoutRequests.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">💸</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No payout requests yet</h3>
            <p className="text-gray-600">Your payout requests will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {payoutRequests.map(request => (
              <div key={request.id} className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-semibold text-gray-900">
                        ₱{request.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </h4>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        request.status === 'approved' ? 'bg-green-100 text-green-700 border border-green-200' :
                        request.status === 'rejected' ? 'bg-red-100 text-red-700 border border-red-200' :
                        'bg-yellow-100 text-yellow-700 border border-yellow-200'
                      }`}>
                        {request.status === 'approved' ? '✅ Approved' :
                         request.status === 'rejected' ? '❌ Rejected' :
                         '⏳ Pending'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mt-4">
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Payout Method</p>
                        <p className="font-medium text-gray-900 capitalize">{request.payoutMethod}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Requested Date</p>
                        <p className="font-medium text-gray-900">{formatDate(request.createdAt)}</p>
                      </div>
                      {request.processedAt && (
                        <div>
                          <p className="text-gray-500 text-xs mb-1">Processed Date</p>
                          <p className="font-medium text-gray-900">{formatDate(request.processedAt)}</p>
                        </div>
                      )}
                    </div>
                    {request.rejectionReason && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-red-600">
                          <strong>Reason:</strong> {request.rejectionReason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Payout Request Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-lg flex items-center justify-center z-50" onClick={() => setShowPayoutModal(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Request Payout</h3>
              <button
                onClick={() => setShowPayoutModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Available Balance:</strong> ₱{balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-blue-600 mt-1">Minimum payout amount is ₱100</p>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (₱)
              </label>
              <input
                type="number"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                placeholder="Enter amount"
                min="100"
                max={balance}
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payout Method
              </label>
              <select
                value={payoutMethod}
                onChange={(e) => setPayoutMethod(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="wallet">Wallet Transfer</option>
                <option value="bank">Bank Transfer</option>
                <option value="paypal">PayPal</option>
              </select>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowPayoutModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestPayout}
                disabled={!payoutAmount || parseFloat(payoutAmount) <= 0 || parseFloat(payoutAmount) > balance || parseFloat(payoutAmount) < 100}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-teal-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ReviewsSection = ({ listings, bookings }) => {
  const { currentUser } = useAuth();
  const [listingReviews, setListingReviews] = useState([]);
  const [guestReviews, setGuestReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('received'); // 'received' or 'given'
  const [selectedReview, setSelectedReview] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [showResponseModal, setShowResponseModal] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadReviews();
    }
  }, [currentUser, listings]);

  const loadReviews = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);

      // Load reviews received for listings
      const listingIds = listings.map(l => l.id);
      if (listingIds.length > 0) {
        // Note: Firestore 'in' query limit is 10, so we may need to batch
        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('listingId', 'in', listingIds.slice(0, 10))
        );
        
        const reviewsSnapshot = await getDocs(reviewsQuery);
        const reviewsData = reviewsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000) : new Date())
          };
        });
        
        reviewsData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setListingReviews(reviewsData);
      }

      // Load reviews given to guests
      const guestReviewsQuery = query(
        collection(db, 'guestReviews'),
        where('hostId', '==', currentUser.uid)
      );
      
      const guestReviewsSnapshot = await getDocs(guestReviewsQuery);
      const guestReviewsData = guestReviewsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000) : new Date())
        };
      });
      
      guestReviewsData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setGuestReviews(guestReviewsData);

    } catch (error) {
      console.error('Error loading reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const totalReceived = listingReviews.length;
    const totalGiven = guestReviews.length;
    const avgRating = listingReviews.length > 0
      ? (listingReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / listingReviews.length).toFixed(1)
      : 0;

    // Rating breakdown
    const breakdown = {
      5: listingReviews.filter(r => r.rating === 5).length,
      4: listingReviews.filter(r => r.rating === 4).length,
      3: listingReviews.filter(r => r.rating === 3).length,
      2: listingReviews.filter(r => r.rating === 2).length,
      1: listingReviews.filter(r => r.rating === 1).length
    };

    return { totalReceived, totalGiven, avgRating, breakdown };
  };

  const handleRespondToReview = async () => {
    if (!responseText.trim()) {
      toast.error('Please enter a response');
      return;
    }

    try {
      const reviewRef = doc(db, 'reviews', selectedReview.id);
      await updateDoc(reviewRef, {
        hostResponse: responseText.trim(),
        hostRespondedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      toast.success('Response posted successfully');
      setShowResponseModal(false);
      setSelectedReview(null);
      setResponseText('');
      loadReviews();
    } catch (error) {
      console.error('Error responding to review:', error);
      toast.error('Failed to post response');
    }
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Reviews Management</h2>
      <p className="text-gray-600 mb-8">Manage reviews for your listings and guests</p>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl p-6 border-2 border-teal-200">
          <p className="text-sm text-gray-600 mb-1">Reviews Received</p>
          <p className="text-3xl font-bold text-teal-600">{stats.totalReceived}</p>
          {stats.avgRating > 0 && (
            <p className="text-sm text-gray-600 mt-1">Avg: {stats.avgRating}/5</p>
          )}
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
          <p className="text-sm text-gray-600 mb-1">Reviews Given</p>
          <p className="text-3xl font-bold text-blue-600">{stats.totalGiven}</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-6 border-2 border-yellow-200">
          <p className="text-sm text-gray-600 mb-1">Average Rating</p>
          <p className="text-3xl font-bold text-yellow-600">
            {stats.avgRating > 0 ? `${stats.avgRating}/5` : 'N/A'}
          </p>
        </div>
      </div>

      {/* Rating Breakdown */}
      {stats.totalReceived > 0 && (
        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Rating Breakdown</h3>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map(rating => {
              const count = stats.breakdown[rating];
              const percentage = stats.totalReceived > 0 ? (count / stats.totalReceived) * 100 : 0;
              return (
                <div key={rating} className="flex items-center gap-4">
                  <div className="flex items-center gap-2 w-20">
                    <span className="text-sm font-semibold text-gray-700">{rating}</span>
                    <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-700 w-16 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('received')}
              className={`flex-1 px-6 py-4 text-center font-semibold transition-colors ${
                activeTab === 'received'
                  ? 'border-b-2 border-teal-500 text-teal-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Reviews Received ({stats.totalReceived})
            </button>
            <button
              onClick={() => setActiveTab('given')}
              className={`flex-1 px-6 py-4 text-center font-semibold transition-colors ${
                activeTab === 'given'
                  ? 'border-b-2 border-teal-500 text-teal-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Reviews Given ({stats.totalGiven})
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'received' && (
            <div className="space-y-4">
              {listingReviews.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">⭐</div>
                  <p className="text-gray-600 text-lg">No reviews received yet</p>
                  <p className="text-gray-500 text-sm mt-2">Reviews from guests will appear here</p>
                </div>
              ) : (
                listingReviews.map((review) => (
                  <div key={review.id} className="border-2 border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-bold text-lg text-gray-900">{review.guestName || 'Guest'}</h4>
                          <span className="text-gray-300">·</span>
                          <span className="text-sm text-gray-600">
                            {review.createdAt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </span>
                          <Link
                            to={`/listing/${review.listingId}`}
                            className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                          >
                            View Listing
                          </Link>
                        </div>
                        <div className="flex items-center gap-1 mb-2">
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
                          <span className="text-sm text-gray-600 ml-2">{review.rating || 0}/5</span>
                        </div>
                        <p className="text-gray-700 mb-3">{review.comment || review.content || 'No comment provided.'}</p>
                        
                        {/* Host Response */}
                        {review.hostResponse ? (
                          <div className="bg-teal-50 border-l-4 border-teal-500 p-4 rounded-lg mt-4">
                            <p className="text-sm font-semibold text-teal-900 mb-1">Your Response:</p>
                            <p className="text-gray-700">{review.hostResponse}</p>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedReview(review);
                              setResponseText('');
                              setShowResponseModal(true);
                            }}
                            className="mt-2 px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors text-sm"
                          >
                            Respond to Review
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'given' && (
            <div className="space-y-4">
              {guestReviews.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">👤</div>
                  <p className="text-gray-600 text-lg">No reviews given yet</p>
                  <p className="text-gray-500 text-sm mt-2">Review guests after completed bookings</p>
                </div>
              ) : (
                guestReviews.map((review) => (
                  <div key={review.id} className="border-2 border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-bold text-lg text-gray-900">{review.guestName || 'Guest'}</h4>
                          <span className="text-gray-300">·</span>
                          <span className="text-sm text-gray-600">
                            {review.createdAt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mb-2">
                          {[...Array(5)].map((_, i) => (
                            <svg
                              key={i}
                              className={`w-5 h-5 ${i < (review.ratings?.overall || 0) ? 'text-yellow-500 fill-current' : 'text-gray-300'}`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                            </svg>
                          ))}
                          <span className="text-sm text-gray-600 ml-2">{review.ratings?.overall || 0}/5</span>
                        </div>
                        {review.ratings && (
                          <div className="flex flex-wrap gap-4 text-xs text-gray-600 mb-2">
                            {review.ratings.communication > 0 && (
                              <span>Communication: {review.ratings.communication}/5</span>
                            )}
                            {review.ratings.cleanliness > 0 && (
                              <span>Cleanliness: {review.ratings.cleanliness}/5</span>
                            )}
                            {review.ratings.respectfulness > 0 && (
                              <span>Respectfulness: {review.ratings.respectfulness}/5</span>
                            )}
                          </div>
                        )}
                        <p className="text-gray-700">{review.comment || 'No comment provided.'}</p>
                        {review.listingTitle && (
                          <p className="text-xs text-gray-500 mt-2">Booking: {review.listingTitle}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Response Modal */}
      {showResponseModal && selectedReview && (
        <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-lg flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-900">Respond to Review</h3>
              <button
                onClick={() => {
                  setShowResponseModal(false);
                  setSelectedReview(null);
                  setResponseText('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Review by {selectedReview.guestName || 'Guest'}</p>
                <p className="text-gray-700">{selectedReview.comment || selectedReview.content}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your Response</label>
                <textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Write a response to this review..."
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-teal-500 focus:outline-none resize-none"
                />
              </div>
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowResponseModal(false);
                    setSelectedReview(null);
                    setResponseText('');
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRespondToReview}
                  disabled={!responseText.trim()}
                  className="flex-1 px-4 py-3 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  Post Response
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PointsSection = ({ stats, bookings, listings }) => {
  const { currentUser } = useAuth();
  const { receivePayment, balance } = useWallet();
  const [redeemedPoints, setRedeemedPoints] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pointsLoading, setPointsLoading] = useState(true);

  // Calculate points based on activity
  const calculatePoints = () => {
    let totalPoints = 0;
    
    // Points from bookings (10 points per completed booking)
    const completedBookings = bookings.filter(b => b.status === 'completed').length;
    totalPoints += completedBookings * 10;
    
    // Points from listings (50 points per active listing)
    totalPoints += listings.length * 50;
    
    // Points from reviews (5 points per review)
    const reviews = bookings.filter(b => b.hasReview).length;
    totalPoints += reviews * 5;
    
    return totalPoints;
  };

  const totalPoints = calculatePoints();
  const completedBookings = bookings.filter(b => b.status === 'completed').length;
  
  // Load redeemed points from Firestore
  useEffect(() => {
    const loadRedeemedPoints = async () => {
      if (!currentUser) return;
      
      try {
        setPointsLoading(true);
        const hostPointsRef = doc(db, 'hostPoints', currentUser.uid);
        const hostPointsSnap = await getDoc(hostPointsRef);
        
        if (hostPointsSnap.exists()) {
          setRedeemedPoints(hostPointsSnap.data().redeemedPoints || 0);
        } else {
          // Initialize points document
          await setDoc(hostPointsRef, {
            userId: currentUser.uid,
            totalPoints: 0,
            redeemedPoints: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      } catch (error) {
        console.error('Error loading redeemed points:', error);
      } finally {
        setPointsLoading(false);
      }
    };

    loadRedeemedPoints();
  }, [currentUser]);

  // Available points for redemption (total - redeemed)
  const availablePoints = totalPoints - redeemedPoints;
  
  // Points to Peso conversion rate: 100 points = ₱10 (1 point = ₱0.10)
  const POINTS_TO_PESO_RATE = 0.10;
  
  const calculateCashValue = (points) => {
    return Math.floor(points * POINTS_TO_PESO_RATE);
  };
  
  // Handle wallet reward redemption
  const handleRedeemWallet = async (pointsToRedeem, cashValue) => {
    if (!currentUser) {
      toast.error('Please log in to redeem rewards');
      return;
    }

    if (availablePoints < pointsToRedeem) {
      toast.error(`Insufficient points! You need ${pointsToRedeem} points but only have ${availablePoints} available.`);
      return;
    }

    if (!window.confirm(`Redeem ${pointsToRedeem} points for ₱${cashValue.toLocaleString()}?`)) {
      return;
    }

    try {
      setLoading(true);

      // Update redeemed points in Firestore
      const hostPointsRef = doc(db, 'hostPoints', currentUser.uid);
      const hostPointsSnap = await getDoc(hostPointsRef);
      
      const currentRedeemed = hostPointsSnap.exists() 
        ? (hostPointsSnap.data().redeemedPoints || 0) 
        : 0;
      
      const newRedeemed = currentRedeemed + pointsToRedeem;

      await setDoc(hostPointsRef, {
        userId: currentUser.uid,
        totalPoints: totalPoints,
        redeemedPoints: newRedeemed,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Add cash to wallet
      await receivePayment(
        cashValue,
        null,
        `Points redemption: ${pointsToRedeem} points converted to ₱${cashValue.toLocaleString()}`
      );

      // Update local state
      setRedeemedPoints(newRedeemed);

      toast.success(`✅ Successfully redeemed ${pointsToRedeem} points! ₱${cashValue.toLocaleString()} has been added to your wallet.`);
    } catch (error) {
      console.error('Error redeeming points:', error);
      toast.error(`Failed to redeem points: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Get current tier/rank based on points
  const getCurrentTier = (points) => {
    if (points >= 50000) return { name: 'Radiant', icon: '💎', color: 'from-purple-500 to-pink-500', points: 50000 };
    if (points >= 30000) return { name: 'Immortal', icon: '👑', color: 'from-red-500 to-orange-500', points: 30000 };
    if (points >= 20000) return { name: 'Diamond', icon: '💠', color: 'from-cyan-500 to-blue-500', points: 20000 };
    if (points >= 10000) return { name: 'Platinum', icon: '🔷', color: 'from-gray-400 to-gray-600', points: 10000 };
    if (points >= 5000) return { name: 'Gold', icon: '🥇', color: 'from-yellow-400 to-yellow-600', points: 5000 };
    if (points >= 2000) return { name: 'Silver', icon: '🥈', color: 'from-gray-300 to-gray-400', points: 2000 };
    if (points >= 500) return { name: 'Bronze', icon: '🥉', color: 'from-orange-600 to-orange-800', points: 500 };
    return { name: 'Iron', icon: '⚙️', color: 'from-gray-500 to-gray-700', points: 0 };
  };

  const currentTier = getCurrentTier(totalPoints);
  const nextTier = totalPoints < 50000 ? [
    { name: 'Bronze', points: 500, icon: '🥉' },
    { name: 'Silver', points: 2000, icon: '🥈' },
    { name: 'Gold', points: 5000, icon: '🥇' },
    { name: 'Platinum', points: 10000, icon: '🔷' },
    { name: 'Diamond', points: 20000, icon: '💠' },
    { name: 'Immortal', points: 30000, icon: '👑' },
    { name: 'Radiant', points: 50000, icon: '💎' }
  ].find(tier => totalPoints < tier.points) : null;

  // Badge rewards (unlocked once) - Updated with new ranking system
  const badgeRewards = [
    {
      id: 'iron',
      name: 'Iron Rank',
      pointsRequired: 0,
      description: 'Starting rank - Welcome to EcoExpress!',
      icon: '⚙️',
      unlocked: totalPoints >= 0,
      type: 'badge',
      tier: 'Iron'
    },
    {
      id: 'bronze',
      name: 'Bronze Rank',
      pointsRequired: 500,
      description: 'Achieve 500 points',
      icon: '🥉',
      unlocked: totalPoints >= 500,
      type: 'badge',
      tier: 'Bronze'
    },
    {
      id: 'silver',
      name: 'Silver Rank',
      pointsRequired: 2000,
      description: 'Achieve 2,000 points',
      icon: '🥈',
      unlocked: totalPoints >= 2000,
      type: 'badge',
      tier: 'Silver'
    },
    {
      id: 'gold',
      name: 'Gold Rank',
      pointsRequired: 5000,
      description: 'Achieve 5,000 points',
      icon: '🥇',
      unlocked: totalPoints >= 5000,
      type: 'badge',
      tier: 'Gold'
    },
    {
      id: 'platinum',
      name: 'Platinum Rank',
      pointsRequired: 10000,
      description: 'Achieve 10,000 points',
      icon: '🔷',
      unlocked: totalPoints >= 10000,
      type: 'badge',
      tier: 'Platinum'
    },
    {
      id: 'diamond',
      name: 'Diamond Rank',
      pointsRequired: 20000,
      description: 'Achieve 20,000 points',
      icon: '💠',
      unlocked: totalPoints >= 20000,
      type: 'badge',
      tier: 'Diamond'
    },
    {
      id: 'immortal',
      name: 'Immortal Rank',
      pointsRequired: 30000,
      description: 'Achieve 30,000 points',
      icon: '👑',
      unlocked: totalPoints >= 30000,
      type: 'badge',
      tier: 'Immortal'
    },
    {
      id: 'radiant',
      name: 'Radiant Rank',
      pointsRequired: 50000,
      description: 'Achieve 50,000 points - The highest rank!',
      icon: '💎',
      unlocked: totalPoints >= 50000,
      type: 'badge',
      tier: 'Radiant'
    },
    {
      id: 'featured',
      name: 'Featured Listing',
      pointsRequired: 1000,
      description: 'Get your listing featured (one-time)',
      icon: '⭐',
      unlocked: totalPoints >= 1000,
      type: 'badge'
    },
    {
      id: 'discount-5',
      name: '5% Fee Discount',
      pointsRequired: 2000,
      description: 'Reduce platform fees by 5%',
      icon: '💰',
      unlocked: totalPoints >= 2000,
      type: 'badge'
    },
    {
      id: 'discount-10',
      name: '10% Fee Discount',
      pointsRequired: 5000,
      description: 'Reduce platform fees by 10%',
      icon: '💰',
      unlocked: totalPoints >= 5000,
      type: 'badge'
    },
    {
      id: 'priority-support',
      name: 'Priority Support',
      pointsRequired: 10000,
      description: 'Get priority customer support',
      icon: '🎧',
      unlocked: totalPoints >= 10000,
      type: 'badge'
    },
    {
      id: 'verified-badge',
      name: 'Verified Host Badge',
      pointsRequired: 20000,
      description: 'Get a verified host badge on your profile',
      icon: '✓',
      unlocked: totalPoints >= 20000,
      type: 'badge'
    }
  ];

  // Wallet rewards (redeemable multiple times)
  const walletRewards = [
    {
      id: 'wallet-10',
      name: 'Cash Reward',
      pointsRequired: 100,
      cashValue: 10,
      description: 'Redeem for ₱10',
      icon: '💵',
      type: 'wallet',
      canRedeem: availablePoints >= 100
    },
    {
      id: 'wallet-25',
      name: 'Cash Reward',
      pointsRequired: 250,
      cashValue: 25,
      description: 'Redeem for ₱25',
      icon: '💵',
      type: 'wallet',
      canRedeem: availablePoints >= 250
    },
    {
      id: 'wallet-50',
      name: 'Cash Reward',
      pointsRequired: 500,
      cashValue: 50,
      description: 'Redeem for ₱50',
      icon: '💵',
      type: 'wallet',
      canRedeem: availablePoints >= 500
    },
    {
      id: 'wallet-100',
      name: 'Cash Reward',
      pointsRequired: 1000,
      cashValue: 100,
      description: 'Redeem for ₱100',
      icon: '💵',
      type: 'wallet',
      canRedeem: availablePoints >= 1000
    },
    {
      id: 'wallet-200',
      name: 'Cash Reward',
      pointsRequired: 2000,
      cashValue: 200,
      description: 'Redeem for ₱200',
      icon: '💵',
      type: 'wallet',
      canRedeem: availablePoints >= 2000
    },
    {
      id: 'wallet-500',
      name: 'Cash Reward',
      pointsRequired: 5000,
      cashValue: 500,
      description: 'Redeem for ₱500',
      icon: '💵',
      type: 'wallet',
      canRedeem: availablePoints >= 5000
    },
    {
      id: 'wallet-1000',
      name: 'Cash Reward',
      pointsRequired: 10000,
      cashValue: 1000,
      description: 'Redeem for ₱1,000',
      icon: '💵',
      type: 'wallet',
      canRedeem: availablePoints >= 10000
    },
    {
      id: 'wallet-2000',
      name: 'Cash Reward',
      pointsRequired: 20000,
      cashValue: 2000,
      description: 'Redeem for ₱2,000',
      icon: '💵',
      type: 'wallet',
      canRedeem: availablePoints >= 20000
    },
    {
      id: 'wallet-5000',
      name: 'Cash Reward',
      pointsRequired: 50000,
      cashValue: 5000,
      description: 'Redeem for ₱5,000',
      icon: '💵',
      type: 'wallet',
      canRedeem: availablePoints >= 50000
    }
  ];

  const rewards = [...badgeRewards, ...walletRewards];

  // Find next badge reward to unlock
  const nextBadgeReward = badgeRewards.find(r => !r.unlocked);
  const progressToNext = nextBadgeReward ? (totalPoints / nextBadgeReward.pointsRequired) * 100 : 100;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Points & Rewards</h2>
        <p className="text-gray-600">Earn points by hosting and unlock amazing rewards</p>
      </div>

      {/* Points Display Card */}
      <div className={`bg-gradient-to-br ${currentTier.color} rounded-2xl shadow-xl p-8 mb-8 text-white`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">{currentTier.icon}</span>
              <div>
                <p className="text-white/80 text-sm mb-1">Current Rank</p>
                <h3 className="text-3xl font-bold">{currentTier.name}</h3>
              </div>
            </div>
            <p className="text-white/90 text-sm mb-2 mt-3">Your Total Points</p>
            <h3 className="text-5xl font-bold">{totalPoints.toLocaleString()}</h3>
            {pointsLoading ? (
              <p className="text-white/80 text-xs mt-2">Loading...</p>
            ) : (
              <div className="mt-2 space-y-1">
                <p className="text-white/90 text-sm">
                  Available: <span className="font-semibold">{availablePoints.toLocaleString()}</span> points
                </p>
                <p className="text-white/80 text-xs">
                  Cash Value: ₱{calculateCashValue(availablePoints).toLocaleString()}
                </p>
                {redeemedPoints > 0 && (
                  <p className="text-white/80 text-xs">
                    Redeemed: {redeemedPoints.toLocaleString()} points
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="text-6xl opacity-30">{currentTier.icon}</div>
        </div>
        
        {nextTier && (
          <div className="mt-6 bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{nextTier.icon}</span>
              <p className="text-sm text-white/90">
                Next Rank: <span className="font-semibold">{nextTier.name}</span>
              </p>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2 mb-1">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(progressToNext, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-white/90">
              {totalPoints.toLocaleString()} / {nextTier.points.toLocaleString()} points
              <span className="ml-2">({nextTier.points - totalPoints} more needed)</span>
            </p>
          </div>
        )}
      </div>

      {/* How to Earn Points */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">How to Earn Points</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">📋</span>
              <span className="font-semibold text-gray-900">Complete Booking</span>
            </div>
            <p className="text-sm text-gray-600">10 points per completed booking</p>
            <p className="text-xs text-teal-600 mt-1">
              {completedBookings} bookings = {completedBookings * 10} points
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🏠</span>
              <span className="font-semibold text-gray-900">Active Listing</span>
            </div>
            <p className="text-sm text-gray-600">50 points per active listing</p>
            <p className="text-xs text-teal-600 mt-1">
              {listings.length} listings = {listings.length * 50} points
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">⭐</span>
              <span className="font-semibold text-gray-900">Receive Review</span>
            </div>
            <p className="text-sm text-gray-600">5 points per review received</p>
          </div>
        </div>
      </div>

      {/* Ranking System */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🏆 Ranking System</h3>
        <p className="text-sm text-gray-600 mb-4">Progress through ranks by earning points</p>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
          {[
            { name: 'Iron', icon: '⚙️', points: 0, color: 'from-gray-500 to-gray-700' },
            { name: 'Bronze', icon: '🥉', points: 500, color: 'from-orange-600 to-orange-800' },
            { name: 'Silver', icon: '🥈', points: 2000, color: 'from-gray-300 to-gray-400' },
            { name: 'Gold', icon: '🥇', points: 5000, color: 'from-yellow-400 to-yellow-600' },
            { name: 'Platinum', icon: '🔷', points: 10000, color: 'from-gray-400 to-gray-600' },
            { name: 'Diamond', icon: '💠', points: 20000, color: 'from-cyan-500 to-blue-500' },
            { name: 'Immortal', icon: '👑', points: 30000, color: 'from-red-500 to-orange-500' },
            { name: 'Radiant', icon: '💎', points: 50000, color: 'from-purple-500 to-pink-500' }
          ].map((tier) => {
            const isUnlocked = totalPoints >= tier.points;
            const isCurrent = currentTier.name === tier.name;
            return (
              <div
                key={tier.name}
                className={`rounded-lg p-4 border-2 transition-all text-center ${
                  isCurrent
                    ? `border-teal-500 bg-gradient-to-br ${tier.color} text-white shadow-lg scale-105`
                    : isUnlocked
                    ? `border-teal-300 bg-teal-50`
                    : 'border-gray-200 bg-gray-50 opacity-60'
                }`}
              >
                <div className="text-3xl mb-2">{tier.icon}</div>
                <div className="text-xs font-semibold mb-1">{tier.name}</div>
                <div className={`text-xs ${isCurrent ? 'text-white/90' : 'text-gray-600'}`}>
                  {tier.points.toLocaleString()}
                </div>
                {isCurrent && (
                  <div className="mt-2 text-xs font-bold bg-white/20 px-2 py-1 rounded-full">
                    Current
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Special Rewards */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🎁 Special Rewards</h3>
        <p className="text-sm text-gray-600 mb-4">Unlock special benefits as you reach milestones</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {badgeRewards.filter(r => !r.tier).map((reward) => (
            <div
              key={reward.id}
              className={`rounded-lg p-5 border-2 transition-all ${
                reward.unlocked
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-gray-200 bg-gray-50 opacity-75'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-4xl">{reward.icon}</span>
                {reward.unlocked && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                    ✓ Unlocked
                  </span>
                )}
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">{reward.name}</h4>
              <p className="text-sm text-gray-600 mb-3">{reward.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  {reward.pointsRequired.toLocaleString()} points
                </span>
                {!reward.unlocked && (
                  <span className="text-xs text-gray-500">
                    {reward.pointsRequired - totalPoints} more needed
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Wallet Rewards */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">💰 Wallet Rewards</h3>
        <p className="text-sm text-gray-600 mb-4">
          Redeem points for cash! Conversion rate: 100 points = ₱10 (1 point = ₱0.10)
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {walletRewards.map((reward) => (
            <div
              key={reward.id}
              className={`rounded-lg p-5 border-2 transition-all ${
                reward.canRedeem && !loading
                  ? 'border-emerald-500 bg-emerald-50 hover:shadow-md'
                  : 'border-gray-200 bg-gray-50 opacity-75'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-4xl">{reward.icon}</span>
                {reward.canRedeem && (
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">
                    Available
                  </span>
                )}
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">{reward.name}</h4>
              <p className="text-sm text-gray-600 mb-2">{reward.description}</p>
              <div className="mb-3">
                <span className="text-lg font-bold text-emerald-600">
                  ₱{reward.cashValue.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-500">
                  {reward.pointsRequired} points
                </span>
                {!reward.canRedeem && (
                  <span className="text-xs text-gray-500">
                    Need {reward.pointsRequired - availablePoints} more
                  </span>
                )}
              </div>
              <button
                onClick={() => handleRedeemWallet(reward.pointsRequired, reward.cashValue)}
                disabled={!reward.canRedeem || loading}
                className={`w-full py-2 px-4 rounded-lg font-medium text-sm transition-all ${
                  reward.canRedeem && !loading
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-105'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Redeeming...
                  </span>
                ) : (
                  'Redeem Now'
                )}
              </button>
            </div>
          ))}
        </div>
        
        {availablePoints < 100 && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              💡 You need at least 100 points to redeem cash rewards. Keep hosting to earn more points!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const WishesSection = ({ wishes, listings, onUpdateWish }) => {
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'read', 'acknowledged'
  const [filterType, setFilterType] = useState('all'); // 'all', 'home', 'experience', 'service'
  const [processing, setProcessing] = useState(null);

  const filteredWishes = useMemo(() => {
    let filtered = [...wishes];

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(wish => wish.status === filterStatus);
    }

    // Filter by listing type
    if (filterType !== 'all') {
      filtered = filtered.filter(wish => wish.listingType === filterType);
    }

    return filtered;
  }, [wishes, filterStatus, filterType]);

  const handleUpdateStatus = async (wishId, newStatus) => {
    try {
      setProcessing(wishId);
      await updateWishStatus(wishId, newStatus);
      toast.success(`Wish marked as ${newStatus}`);
      if (onUpdateWish) {
        onUpdateWish();
      }
    } catch (error) {
      console.error('Error updating wish status:', error);
      toast.error('Failed to update wish status');
    } finally {
      setProcessing(null);
    }
  };

  const getListingTitle = (listingId) => {
    if (!listingId) return null;
    const listing = listings.find(l => l.id === listingId);
    if (!listing) return null;
    return listing.homeDetails?.title || 
           listing.experienceDetails?.title || 
           listing.serviceDetails?.title || 
           'Listing';
  };

  const stats = useMemo(() => {
    return {
      total: wishes.length,
      pending: wishes.filter(w => w.status === 'pending').length,
      read: wishes.filter(w => w.status === 'read').length,
      acknowledged: wishes.filter(w => w.status === 'acknowledged').length
    };
  }, [wishes]);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Wishes & Suggestions</h2>
        <p className="text-gray-600">View and manage wishes/suggestions from your guests</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Total Wishes</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Pending</p>
          <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Read</p>
          <p className="text-2xl font-bold text-blue-600">{stats.read}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Acknowledged</p>
          <p className="text-2xl font-bold text-green-600">{stats.acknowledged}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="read">Read</option>
            <option value="acknowledged">Acknowledged</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Type</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="home">Homes</option>
            <option value="experience">Experiences</option>
            <option value="service">Services</option>
          </select>
        </div>
      </div>

      {/* Wishes List */}
      {filteredWishes.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="text-6xl mb-4">💭</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {wishes.length === 0 ? 'No wishes yet' : 'No wishes match your filters'}
          </h3>
          <p className="text-gray-600">
            {wishes.length === 0 
              ? 'Guests can share their wishes and suggestions with you here'
              : 'Try adjusting your filters to see more wishes'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredWishes.map((wish) => {
            const listingTitle = getListingTitle(wish.listingId);
            
            return (
              <div
                key={wish.id}
                className={`bg-white rounded-xl shadow-sm p-6 border-2 transition-all hover:shadow-md ${
                  wish.status === 'pending' 
                    ? 'border-orange-200 bg-orange-50' 
                    : wish.status === 'read'
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-green-200 bg-green-50'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-bold text-lg text-gray-900">
                        {wish.guestName || 'Guest'}
                      </h4>
                      <span className="text-gray-300">·</span>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        wish.status === 'pending'
                          ? 'bg-orange-100 text-orange-800'
                          : wish.status === 'read'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {wish.status.charAt(0).toUpperCase() + wish.status.slice(1)}
                      </span>
                      <span className="text-gray-300">·</span>
                      <span className="text-sm text-gray-600 capitalize">
                        {wish.listingType}
                      </span>
                    </div>
                    
                    {listingTitle && (
                      <div className="mb-2">
                        <Link
                          to={`/listing/${wish.listingId}`}
                          className="text-sm text-teal-600 hover:underline font-medium"
                        >
                          📍 {listingTitle}
                        </Link>
                      </div>
                    )}
                    
                    <p className="text-gray-700 whitespace-pre-wrap mb-3">{wish.message}</p>
                    
                    <p className="text-xs text-gray-500">
                      {wish.createdAt.toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
                  {wish.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(wish.id, 'read')}
                        disabled={processing === wish.id}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {processing === wish.id ? 'Processing...' : 'Mark as Read'}
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(wish.id, 'acknowledged')}
                        disabled={processing === wish.id}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {processing === wish.id ? 'Processing...' : 'Acknowledge'}
                      </button>
                    </>
                  )}
                  {wish.status === 'read' && (
                    <button
                      onClick={() => handleUpdateStatus(wish.id, 'acknowledged')}
                      disabled={processing === wish.id}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {processing === wish.id ? 'Processing...' : 'Acknowledge'}
                    </button>
                  )}
                  {listingTitle && (
                    <Link
                      to={`/listing/${wish.listingId}`}
                      className="px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors text-sm"
                    >
                      View Listing
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HostDashboard;