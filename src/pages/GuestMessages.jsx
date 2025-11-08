import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { db } from '../Firebase';
import { createBooking } from '../services/BookingService';

function GuestMessages() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [conversationMessages, setConversationMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showSendOfferModal, setShowSendOfferModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hostSearchResults, setHostSearchResults] = useState([]);
  const [searchingHosts, setSearchingHosts] = useState(false);
  const [showHostSearch, setShowHostSearch] = useState(false);
  const [completingBooking, setCompletingBooking] = useState(null);
  const [offerDetails, setOfferDetails] = useState({
    price: '',
    discount: '',
    checkIn: '',
    checkOut: '',
    guests: '',
    message: ''
  });
  const [listingData, setListingData] = useState(null);
  const [offerSummary, setOfferSummary] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    loadConversations();
  }, [currentUser]);

  useEffect(() => {
    if (!selectedConversation) return;
    
    const unsubscribe = loadMessages(selectedConversation.id);
    markAsRead(selectedConversation.id);
    loadListingDetails();
    
    // Close sidebar on mobile when conversation is selected
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [selectedConversation]);

  const loadListingDetails = async () => {
    if (!selectedConversation?.listingId) return;
    
    try {
      const listingDoc = await getDoc(doc(db, 'listings', selectedConversation.listingId));
      if (listingDoc.exists()) {
        setListingData(listingDoc.data());
      }
    } catch (error) {
      console.error('Error loading listing details:', error);
    }
  };

  const calculateOfferSummary = () => {
    if (!offerDetails.price || !listingData) return null;

    const offerPrice = parseFloat(offerDetails.price) || 0;
    const originalPrice = listingData.pricing?.basePrice || listingData.pricing?.pricePerNight || 0;
    const discount = offerDetails.discount ? parseFloat(offerDetails.discount) : 0;
    const nights = offerDetails.checkIn && offerDetails.checkOut 
      ? Math.ceil((new Date(offerDetails.checkOut) - new Date(offerDetails.checkIn)) / (1000 * 60 * 60 * 24))
      : 1;
    
    const savings = originalPrice * nights - offerPrice;
    const savingsPercent = originalPrice > 0 ? ((savings / (originalPrice * nights)) * 100).toFixed(1) : 0;

    return {
      offerPrice,
      originalPrice: originalPrice * nights,
      savings,
      savingsPercent,
      nights,
      discountPercent: discount
    };
  };

  useEffect(() => {
    const summary = calculateOfferSummary();
    setOfferSummary(summary);
  }, [offerDetails, listingData]);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showHostSearch && !event.target.closest('.search-container')) {
        setShowHostSearch(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHostSearch]);

  // Search for hosts when searchQuery changes
  useEffect(() => {
    const searchHosts = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setHostSearchResults([]);
        setShowHostSearch(false);
        return;
      }

      try {
        setSearchingHosts(true);
        setShowHostSearch(true);

        // Search through listings to find hosts
        const listingsQuery = query(
          collection(db, 'listings'),
          where('status', '==', 'published')
        );

        const listingsSnapshot = await getDocs(listingsQuery);
        const hostsMap = new Map();

        listingsSnapshot.docs.forEach(doc => {
          const listing = doc.data();
          const hostId = listing.hostId;
          const hostName = listing.hostName || listing.hostEmail || 'Host';
          
          // Check if host name matches search query
          if (hostName.toLowerCase().includes(searchQuery.toLowerCase()) && 
              hostId && 
              !hostsMap.has(hostId)) {
            
            // Check if conversation already exists
            const existingConv = conversations.find(c => c.hostId === hostId);
            
            hostsMap.set(hostId, {
              hostId: hostId,
              hostName: hostName,
              hostEmail: listing.hostEmail,
              hostPhoto: listing.hostPhotoURL,
              listingId: doc.id,
              listingTitle: listing.title || listing.experienceDetails?.title || listing.serviceDetails?.title || 'Listing',
              hasConversation: !!existingConv,
              conversationId: existingConv?.id
            });
          }
        });

        // Also search users collection for hosts
        const usersQuery = query(collection(db, 'users'));
        const usersSnapshot = await getDocs(usersQuery);
        
        usersSnapshot.docs.forEach(doc => {
          const userData = doc.data();
          const userId = doc.id;
          const displayName = userData.displayName || userData.email || '';
          
          // Check if user name matches search query and they're not already in results
          if (displayName.toLowerCase().includes(searchQuery.toLowerCase()) && 
              !hostsMap.has(userId)) {
            
            // Check if this user has any listings (indicating they're a host)
            const hasListings = listingsSnapshot.docs.some(listingDoc => 
              listingDoc.data().hostId === userId
            );

            if (hasListings) {
              const existingConv = conversations.find(c => c.hostId === userId);
              const hostListings = listingsSnapshot.docs
                .filter(listingDoc => listingDoc.data().hostId === userId)
                .map(listingDoc => ({
                  id: listingDoc.id,
                  title: listingDoc.data().title || listingDoc.data().experienceDetails?.title || listingDoc.data().serviceDetails?.title || 'Listing'
                }));

              hostsMap.set(userId, {
                hostId: userId,
                hostName: displayName,
                hostEmail: userData.email,
                hostPhoto: userData.photoURL,
                listingId: hostListings[0]?.id || '',
                listingTitle: hostListings[0]?.title || 'Listing',
                hasConversation: !!existingConv,
                conversationId: existingConv?.id,
                allListings: hostListings
              });
            }
          }
        });

        setHostSearchResults(Array.from(hostsMap.values()));
      } catch (error) {
        console.error('Error searching hosts:', error);
        setHostSearchResults([]);
      } finally {
        setSearchingHosts(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      searchHosts();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, conversations]);

  useEffect(() => {
    const hostId = searchParams.get('host');
    const listingId = searchParams.get('listing');
    
    if (hostId && conversations.length > 0) {
      const conv = conversations.find(c => c.hostId === hostId);
      if (conv) {
        setSelectedConversation(conv);
      } else if (listingId) {
        createConversationFromListing(hostId, listingId);
      }
    }
  }, [searchParams, conversations]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const createConversationFromListing = async (hostId, listingId) => {
    try {
      const listingDoc = await getDoc(doc(db, 'listings', listingId));
      if (!listingDoc.exists()) return;

      const listingData = listingDoc.data();
      const hostDoc = await getDoc(doc(db, 'users', hostId));
      const hostData = hostDoc.exists() ? hostDoc.data() : {};

      const newConv = {
        id: `conv_${hostId}`,
        hostId: hostId,
        hostName: hostData.displayName || hostData.email || 'Host',
        hostEmail: hostData.email,
        hostPhoto: hostData.photoURL,
        listingId: listingId,
        listingTitle: listingData.title || listingData.experienceDetails?.title || listingData.serviceDetails?.title || 'Listing',
        lastMessage: '',
        lastMessageTime: new Date(),
        unreadCount: 0
      };

      setConversations(prev => [newConv, ...prev]);
      setSelectedConversation(newConv);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const loadConversations = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      const conversationsRef = collection(db, 'conversations');
      const q = query(
        conversationsRef,
        where('guestId', '==', currentUser.uid)
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const conversationsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          lastMessageTime: doc.data().lastMessageTime?.toDate()
        })).sort((a, b) => {
          if (!a.lastMessageTime) return 1;
          if (!b.lastMessageTime) return -1;
          return b.lastMessageTime - a.lastMessageTime;
        });
        
        setConversations(conversationsList);
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error loading conversations:', error);
      setLoading(false);
    }
  };

  const loadMessages = (conversationId) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return;

    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('guestId', '==', currentUser.uid),
      where('hostId', '==', conversation.hostId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : (data.timestamp?.seconds ? new Date(data.timestamp.seconds * 1000) : null),
          readAt: data.readAt?.toDate ? data.readAt.toDate() : (data.readAt?.seconds ? new Date(data.readAt.seconds * 1000) : null)
        };
      }).sort((a, b) => {
        const timeA = a.timestamp?.getTime() || 0;
        const timeB = b.timestamp?.getTime() || 0;
        return timeA - timeB;
      });
      setConversationMessages(msgs);
      markAsRead(conversationId);
    });

    return () => unsubscribe();
  };

  const markAsRead = async (conversationId) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return;

    try {
      const q = query(
        collection(db, 'messages'),
        where('guestId', '==', currentUser.uid),
        where('hostId', '==', conversation.hostId),
        where('read', '==', false)
      );
      
      const snapshot = await getDocs(q);
      const updatePromises = snapshot.docs.map(doc => 
        updateDoc(doc.ref, { read: true, readAt: serverTimestamp() })
      );
      
      await Promise.all(updatePromises);
      
      setConversations(prev => prev.map(conv => 
        conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
      ));
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
      await addDoc(collection(db, 'messages'), {
        hostId: conversation.hostId,
        hostName: conversation.hostName,
        hostEmail: conversation.hostEmail,
        hostPhoto: conversation.hostPhoto,
        guestId: currentUser.uid,
        guestName: currentUser.displayName || currentUser.email,
        guestPhoto: currentUser.photoURL,
        listingId: conversation.listingId,
        listingTitle: conversation.listingTitle,
        content: newMessage.trim(),
        senderId: currentUser.uid,
        senderType: 'guest',
        type: 'text',
        read: false,
        timestamp: serverTimestamp()
      });

      await updateOrCreateConversation(conversation, newMessage.trim(), 'text');
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const sendOffer = async () => {
    if (!selectedConversation || !offerDetails.price) return;

    const conversation = conversations.find(c => c.id === selectedConversation.id);
    if (!conversation) return;

    // Validation
    if (!offerDetails.checkIn) {
      toast.error('Please select a check-in date');
      return;
    }

    if (offerDetails.checkOut && new Date(offerDetails.checkOut) <= new Date(offerDetails.checkIn)) {
      toast.error('Check-out date must be after check-in date');
      return;
    }

    const offerPrice = parseFloat(offerDetails.price);
    if (isNaN(offerPrice) || offerPrice <= 0) {
      toast.error('Please enter a valid offer price');
      return;
    }

    try {
      setSending(true);
      await addDoc(collection(db, 'messages'), {
        hostId: conversation.hostId,
        hostName: conversation.hostName,
        guestId: currentUser.uid,
        guestName: currentUser.displayName || currentUser.email,
        listingId: conversation.listingId,
        listingTitle: conversation.listingTitle,
        type: 'offer',
        senderId: currentUser.uid,
        senderType: 'guest',
        offerPrice: offerDetails.price,
        offerDiscount: offerDetails.discount || '',
        offerCheckIn: offerDetails.checkIn || '',
        offerCheckOut: offerDetails.checkOut || '',
        offerGuests: offerDetails.guests || '',
        offerMessage: offerDetails.message || '',
        offerStatus: 'pending',
        read: false,
        timestamp: serverTimestamp()
      });

      await updateOrCreateConversation(conversation, 'Sent an offer', 'offer');
      setShowSendOfferModal(false);
      setOfferDetails({ price: '', discount: '', checkIn: '', checkOut: '', guests: '', message: '' });
      setOfferSummary(null);
    } catch (error) {
      console.error('Error sending offer:', error);
      toast.error('Failed to send offer. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const updateOrCreateConversation = async (conversation, lastMessage, type) => {
    try {
      const convId = `guest_${currentUser.uid}_host_${conversation.hostId}`;
      const conversationRef = doc(db, 'conversations', convId);
      const conversationSnap = await getDoc(conversationRef);

      if (conversationSnap.exists()) {
        await updateDoc(conversationRef, {
          lastMessage: lastMessage,
          lastMessageTime: serverTimestamp(),
          lastMessageType: type
        });
      } else {
        await setDoc(conversationRef, {
          id: convId,
          guestId: currentUser.uid,
          hostId: conversation.hostId,
          hostName: conversation.hostName,
          hostEmail: conversation.hostEmail,
          hostPhoto: conversation.hostPhoto,
          listingId: conversation.listingId,
          listingTitle: conversation.listingTitle,
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

  const handleCompleteBooking = async (offerMessage) => {
    if (!offerMessage || !selectedConversation) return;

    try {
      setCompletingBooking(offerMessage.id);

      // Get listing details
      const listingDoc = await getDoc(doc(db, 'listings', offerMessage.listingId));
      if (!listingDoc.exists()) {
        toast.error('Listing not found');
        return;
      }

      const listing = listingDoc.data();
      const offerPrice = parseFloat(offerMessage.offerPrice) || 0;
      const { calculateServiceFee } = require('../services/ServiceFeeService');
      const serviceFee = calculateServiceFee(offerPrice);
      const totalAmount = offerPrice + serviceFee;

      // Redirect to listing page to complete PayPal payment
      toast.info('Redirecting to listing page to complete payment via PayPal...');
      navigate(`/listing/${offerMessage.listingId}?offer=true&price=${offerPrice}&checkIn=${offerMessage.offerCheckIn || ''}&checkOut=${offerMessage.offerCheckOut || ''}&guests=${offerMessage.offerGuests || 1}`);
      setCompletingBooking(null);
      
      // Note: The actual booking will be created on the listing detail page after PayPal payment
      // This function now just redirects to the listing page for payment
    } catch (error) {
      console.error('Error completing booking:', error);
      toast.error(`Failed to redirect: ${error.message}`);
      setCompletingBooking(null);
    }
  };

  const handleOfferResponse = async (messageId, response) => {
    try {
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, {
        offerStatus: response,
        offerResponseTime: serverTimestamp()
      });

      const messageDoc = await getDoc(messageRef);
      const messageData = messageDoc.data();
      
      await addDoc(collection(db, 'messages'), {
        hostId: messageData.hostId,
        hostName: messageData.hostName,
        guestId: currentUser.uid,
        guestName: currentUser.displayName || currentUser.email,
        listingId: messageData.listingId,
        listingTitle: messageData.listingTitle,
        content: response === 'accepted' ? 'I accept your offer! ✓' : 'I decline your offer.',
        senderId: currentUser.uid,
        senderType: 'guest',
        type: 'text',
        read: false,
        timestamp: serverTimestamp()
      });

      await updateOrCreateConversation(
        selectedConversation,
        response === 'accepted' ? 'Accepted your offer ✓' : 'Declined your offer',
        'text'
      );
    } catch (error) {
      console.error('Error responding to offer:', error);
      toast.error('Failed to respond. Please try again.');
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

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleStartConversation = async (host) => {
    // Check if conversation already exists
    const existingConv = conversations.find(c => c.hostId === host.hostId);
    
    if (existingConv) {
      // Select existing conversation
      setSelectedConversation(existingConv);
      setSearchQuery('');
      setShowHostSearch(false);
      return;
    }

    // Create new conversation
    const newConv = {
      id: `conv_${host.hostId}`,
      hostId: host.hostId,
      hostName: host.hostName,
      hostEmail: host.hostEmail,
      hostPhoto: host.hostPhoto,
      listingId: host.listingId,
      listingTitle: host.listingTitle,
      lastMessage: '',
      lastMessageTime: new Date(),
      unreadCount: 0
    };

    // Create conversation document in Firestore
    try {
      const convId = `guest_${currentUser.uid}_host_${host.hostId}`;
      const conversationRef = doc(db, 'conversations', convId);
      
      await setDoc(conversationRef, {
        id: convId,
        guestId: currentUser.uid,
        hostId: host.hostId,
        hostName: host.hostName,
        hostEmail: host.hostEmail,
        hostPhoto: host.hostPhoto,
        listingId: host.listingId,
        listingTitle: host.listingTitle,
        lastMessage: '',
        lastMessageTime: serverTimestamp(),
        lastMessageType: 'text',
        createdAt: serverTimestamp(),
        unreadCount: 0
      });

      setConversations(prev => [newConv, ...prev]);
      setSelectedConversation(newConv);
      setSearchQuery('');
      setShowHostSearch(false);
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to start conversation. Please try again.');
    }
  };

  const filteredConversations = conversations.filter(conv => 
    conv.hostName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.listingTitle?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center pt-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16 md:pt-20 pb-4 md:pb-8">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 h-[calc(100vh-80px)] md:h-[calc(100vh-120px)]">
        <div className="bg-white rounded-xl md:rounded-2xl shadow-lg h-full flex overflow-hidden border border-gray-200/50 relative">
          {/* Conversations Sidebar */}
          <div className={`absolute md:relative inset-0 md:inset-auto z-50 md:z-auto w-full md:w-96 border-r border-gray-200/50 flex flex-col bg-white transition-transform duration-300 ease-in-out ${
            sidebarOpen || !selectedConversation ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}>
            <div className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Conversations</h2>
                {conversations.length > 0 && (
                  <span className="bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full font-medium">
                    {conversations.length}
                  </span>
                )}
              </div>
              <div className="relative search-container">
                <input
                  type="text"
                  placeholder="Search hosts or conversations..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value.trim().length >= 2) {
                      setShowHostSearch(true);
                    } else {
                      setShowHostSearch(false);
                    }
                  }}
                  onFocus={() => {
                    if (searchQuery.trim().length >= 2) {
                      setShowHostSearch(true);
                    }
                  }}
                  className="w-full px-4 py-2.5 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all duration-200 placeholder:text-gray-400"
                />
                <svg className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                
                {/* Host Search Results Dropdown */}
                {showHostSearch && (searchQuery.trim().length >= 2) && (
                  <div className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-y-auto search-container animate-fadeIn">
                    {searchingHosts ? (
                      <div className="p-6 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-2"></div>
                        <p className="text-sm text-gray-600">Searching hosts...</p>
                      </div>
                    ) : hostSearchResults.length > 0 ? (
                      <div className="p-2">
                        <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Hosts ({hostSearchResults.length})
                        </div>
                        {hostSearchResults.map((host, idx) => (
                          <button
                            key={host.hostId}
                            onClick={() => handleStartConversation(host)}
                            className="w-full p-3 text-left hover:bg-gray-50 transition-all duration-150 border-b border-gray-100 last:border-0 rounded-lg"
                            style={{ animation: `fadeInUp 0.3s ease-out ${idx * 0.05}s both` }}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {host.hostPhoto ? (
                                  <img src={host.hostPhoto} alt={host.hostName} className="w-10 h-10 rounded-full object-cover" />
                                ) : (
                                  <span className="text-gray-600 font-semibold text-sm">
                                    {host.hostName?.charAt(0)?.toUpperCase() || 'H'}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                  <h4 className="font-medium text-gray-900 truncate text-sm">{host.hostName}</h4>
                                  {host.hasConversation && (
                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium ml-2">
                                      Chat
                                    </span>
                                  )}
                                </div>
                                {host.listingTitle && (
                                  <p className="text-xs text-gray-500 truncate">{host.listingTitle}</p>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-gray-500">
                        <div className="text-4xl mb-2">🔍</div>
                        <p className="text-sm font-semibold mb-1">No hosts found</p>
                        <p className="text-xs">Try searching with a different name</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="p-6 md:p-8 text-center text-gray-400">
                  <div className="text-4xl md:text-5xl mb-3">💬</div>
                  <p className="font-medium mb-1 text-gray-600 text-sm md:text-base">No conversations yet</p>
                  <p className="text-xs md:text-sm mb-3 text-gray-500">Start chatting with hosts!</p>
                  <p className="text-xs text-gray-400">Search for hosts by name above</p>
                </div>
              ) : (
                filteredConversations.map((conv, idx) => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setSelectedConversation(conv);
                      if (window.innerWidth < 768) {
                        setSidebarOpen(false);
                      }
                    }}
                    className={`w-full p-3 text-left hover:bg-gray-50 transition-all duration-150 border-b border-gray-100 last:border-0 ${
                      selectedConversation?.id === conv.id 
                        ? 'bg-gray-50' 
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {conv.hostPhoto ? (
                          <img src={conv.hostPhoto} alt={conv.hostName} className="w-12 h-12 rounded-full object-cover" />
                        ) : (
                          <span className="text-gray-600 font-semibold text-base">
                            {conv.hostName?.charAt(0)?.toUpperCase() || 'H'}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate text-sm">{conv.hostName}</h4>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{conv.lastMessage || 'No messages'}</p>
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium min-w-[20px] text-center">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Sidebar Overlay for Mobile */}
          {(sidebarOpen || !selectedConversation) && (
            <div
              className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300"
              onClick={() => setSidebarOpen(false)}
            ></div>
          )}

          {/* Messages Area */}
          {selectedConversation ? (
            <div className="flex-1 flex flex-col bg-white min-w-0">
              {/* Header */}
              <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {selectedConversation.hostPhoto ? (
                      <img src={selectedConversation.hostPhoto} alt={selectedConversation.hostName} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <span className="text-gray-600 font-semibold text-base">
                        {selectedConversation.hostName?.charAt(0)?.toUpperCase() || 'H'}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 text-base truncate">{selectedConversation.hostName}</h3>
                    <p className="text-xs text-gray-500">Active {formatTime(selectedConversation.lastMessageTime || new Date())}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {selectedConversation.listingId && (
                    <Link
                      to={`/listing/${selectedConversation.listingId}`}
                      className="px-3 py-1.5 bg-[#4CAF50] text-white rounded-lg font-medium hover:bg-[#2E7D32] transition-all text-xs flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span className="hidden sm:inline">View</span>
                    </Link>
                  )}
                  <button
                    onClick={() => setShowSendOfferModal(true)}
                    className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all text-xs flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="hidden sm:inline">Offer</span>
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div 
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-3 md:p-4 bg-white"
                style={{ scrollBehavior: 'smooth' }}
              >
                {conversationMessages.map((msg, index) => {
                  const isGuest = msg.senderId === currentUser.uid;
                  const prevMsg = conversationMessages[index - 1];
                  const showAvatar = !prevMsg || prevMsg.senderId !== msg.senderId || 
                    (msg.timestamp?.getTime() - prevMsg.timestamp?.getTime()) > 300000;

                  if (msg.type === 'offer') {
                    return (
                      <div key={msg.id} className={`flex ${isGuest ? 'justify-end' : 'justify-start'} mb-4 md:mb-6 animate-fadeIn`} style={{ animation: `fadeInUp 0.3s ease-out ${index * 0.02}s both` }}>
                        <div className={`max-w-[90%] sm:max-w-md ${isGuest ? 'items-end' : 'items-start'} flex flex-col`}>
                          <div className={`rounded-xl md:rounded-2xl p-4 md:p-5 shadow-md border ${isGuest 
                            ? 'bg-black text-white border-black' 
                            : 'bg-white border-gray-200 text-gray-900'
                          }`}>
                            <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                              <div className={`p-2 md:p-2.5 rounded-lg ${isGuest ? 'bg-white/20' : 'bg-gray-100'}`}>
                                <svg className={`w-4 h-4 md:w-5 md:h-5 ${isGuest ? 'text-white' : 'text-gray-700'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-sm md:text-base truncate">Special Offer</p>
                                <p className={`text-xs ${isGuest ? 'opacity-70' : 'text-gray-500'} truncate`}>
                                  {isGuest ? 'You sent' : 'from'} {isGuest ? 'to' : ''} {isGuest ? selectedConversation.hostName : msg.guestName}
                                </p>
                              </div>
                            </div>
                            
                            <div className={`space-y-2 md:space-y-2.5 mb-3 md:mb-4 rounded-lg p-3 md:p-4 ${isGuest ? 'bg-white/10' : 'bg-gray-50'}`}>
                              <div className="flex justify-between items-center">
                                <span className={`text-xs md:text-sm ${isGuest ? 'opacity-90' : 'text-gray-600'}`}>Price:</span>
                                <span className="font-bold text-lg md:text-xl">₱{parseFloat(msg.offerPrice || 0).toLocaleString()}</span>
                              </div>
                              {msg.offerDiscount && (
                                <div className="flex justify-between items-center">
                                  <span className={`text-xs md:text-sm ${isGuest ? 'opacity-90' : 'text-gray-600'}`}>Discount:</span>
                                  <span className="font-bold text-sm md:text-base text-green-500">{msg.offerDiscount}% off</span>
                                </div>
                              )}
                              {(msg.offerCheckIn || msg.offerCheckOut) && (
                                <div className="flex justify-between items-center flex-wrap gap-1">
                                  <span className={`text-xs md:text-sm ${isGuest ? 'opacity-90' : 'text-gray-600'}`}>Dates:</span>
                                  <span className="font-semibold text-xs md:text-sm text-right">
                                    {msg.offerCheckIn ? formatDate(msg.offerCheckIn) : 'Flexible'} - {msg.offerCheckOut ? formatDate(msg.offerCheckOut) : 'Flexible'}
                                  </span>
                                </div>
                              )}
                              {msg.offerGuests && (
                                <div className="flex justify-between items-center">
                                  <span className={`text-xs md:text-sm ${isGuest ? 'opacity-90' : 'text-gray-600'}`}>Guests:</span>
                                  <span className="font-semibold text-xs md:text-sm">{msg.offerGuests}</span>
                                </div>
                              )}
                              {msg.offerMessage && (
                                <div className="pt-2 md:pt-3 border-t border-white/20 mt-2 md:mt-3">
                                  <p className={`text-xs md:text-sm ${isGuest ? 'opacity-90' : 'text-gray-700'} break-words`}>{msg.offerMessage}</p>
                                </div>
                              )}
                            </div>

                            {/* Show Accept/Decline buttons for pending offers */}
                            {/* Host can accept guest's offer */}
                            {!isGuest && msg.offerStatus === 'pending' && msg.senderType === 'guest' && (
                              <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-4 border-t border-gray-200">
                                <button
                                  onClick={() => handleOfferResponse(msg.id, 'accepted')}
                                  className="flex-1 bg-black text-white py-2.5 px-4 rounded-lg font-medium hover:bg-gray-800 transition-all text-sm"
                                >
                                  ✓ Accept
                                </button>
                                <button
                                  onClick={() => handleOfferResponse(msg.id, 'declined')}
                                  className="flex-1 bg-white border border-gray-300 text-gray-700 py-2.5 px-4 rounded-lg font-medium hover:bg-gray-50 transition-all text-sm"
                                >
                                  Decline
                                </button>
                              </div>
                            )}
                            {/* Guest can accept host's offer */}
                            {isGuest && msg.offerStatus === 'pending' && msg.senderType === 'host' && (
                              <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-4 border-t border-gray-200">
                                <button
                                  onClick={() => handleOfferResponse(msg.id, 'accepted')}
                                  className="flex-1 bg-black text-white py-2.5 px-4 rounded-lg font-medium hover:bg-gray-800 transition-all text-sm"
                                >
                                  ✓ Accept Offer
                                </button>
                                <button
                                  onClick={() => handleOfferResponse(msg.id, 'declined')}
                                  className="flex-1 bg-white border border-gray-300 text-gray-700 py-2.5 px-4 rounded-lg font-medium hover:bg-gray-50 transition-all text-sm"
                                >
                                  Decline
                                </button>
                              </div>
                            )}
                            {msg.offerStatus === 'accepted' && (
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <p className={`text-xs md:text-sm font-medium mb-3 ${isGuest ? 'text-green-300' : 'text-green-600'}`}>
                                  ✓ Offer Accepted
                                </p>
                                {/* Show Complete Booking button to guest when they accept a host's offer OR when host accepts guest's offer */}
                                {isGuest && (
                                  <div className="space-y-3">
                                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                      <div className="flex justify-between items-center text-xs md:text-sm mb-2">
                                        <span className="text-gray-600">Offer Price:</span>
                                        <span className="font-semibold">₱{parseFloat(msg.offerPrice || 0).toLocaleString()}</span>
                                      </div>
                                      <div className="flex justify-between items-center text-xs md:text-sm mb-2">
                                        <span className="text-gray-600">Service Fee (10%):</span>
                                        <span className="font-semibold">₱{((parseFloat(msg.offerPrice || 0) * 0.1)).toLocaleString()}</span>
                                      </div>
                                      <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                                        <span className="font-semibold text-gray-900 text-xs md:text-sm">Total to Pay:</span>
                                        <span className="font-bold text-base md:text-lg text-gray-900">₱{(parseFloat(msg.offerPrice || 0) * 1.1).toLocaleString()}</span>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleCompleteBooking(msg)}
                                      disabled={completingBooking === msg.id}
                                      className="w-full bg-black text-white py-2.5 px-4 rounded-lg font-medium hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black flex items-center justify-center gap-2 text-sm"
                                    >
                                      {completingBooking === msg.id ? (
                                        <>
                                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                          Completing Booking...
                                        </>
                                      ) : (
                                        <>
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                          </svg>
                                          Complete Booking & Pay
                                        </>
                                      )}
                                    </button>
                                  </div>
                                )}
                                {!isGuest && (
                                  <p className="text-xs text-gray-500 mt-2">
                                    Waiting for guest to complete booking and payment...
                                  </p>
                                )}
                              </div>
                            )}
                            {msg.offerStatus === 'declined' && (
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <p className={`text-sm ${isGuest ? 'opacity-70' : 'text-gray-500'}`}>Offer Declined</p>
                              </div>
                            )}
                          </div>
                          {msg.timestamp && (
                            <p className={`text-xs mt-2 px-2 ${isGuest ? 'text-right text-gray-500' : 'text-left text-gray-400'}`}>
                              {formatTime(msg.timestamp)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // Check if message is a listing card (has listingId and type is not offer)
                  const isListingCard = msg.listingId && msg.type !== 'offer' && !msg.content;
                  
                  if (isListingCard) {
                    return (
                      <div
                        key={msg.id}
                        className="flex justify-start mb-4"
                      >
                        <div className="max-w-sm bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                          {listingData?.photos?.[0]?.url && (
                            <img 
                              src={listingData.photos[0].url} 
                              alt={selectedConversation.listingTitle}
                              className="w-full h-32 object-cover"
                            />
                          )}
                          <div className="p-3">
                            <p className="text-sm text-gray-700 mb-1">{selectedConversation.listingTitle || 'Listing'}</p>
                            <p className="text-xs text-gray-500">ID: {msg.listingId?.substring(0, 20) || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isGuest ? 'justify-end' : 'justify-start'} mb-4 group`}
                    >
                      <div className={`max-w-[70%] ${isGuest ? 'flex flex-col items-end' : 'flex flex-col items-start'}`}>
                        <div className={`px-4 py-2 rounded-2xl ${
                          isGuest 
                            ? 'bg-[#FF6B35] text-white' 
                            : 'bg-gray-100 text-gray-900'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap leading-relaxed break-words">{msg.content}</p>
                        </div>
                        <div className={`flex items-center gap-1 mt-1 ${isGuest ? 'flex-row-reverse' : ''}`}>
                          {msg.timestamp && (
                            <p className="text-xs text-gray-500">
                              {msg.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </p>
                          )}
                          {/* Seen indicator for guest messages */}
                          {isGuest && msg.read && (
                            <div className="flex items-center gap-1" title={msg.readAt ? `Seen ${formatTime(msg.readAt)}` : 'Seen'}>
                              <svg className="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              {msg.readAt && (
                                <span className="text-xs text-gray-500">Seen</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={sendMessage} className="p-4 border-t border-gray-200 bg-white sticky bottom-0">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4CAF50] focus:border-[#4CAF50] transition-all bg-white text-sm placeholder:text-gray-400"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="w-10 h-10 bg-[#4CAF50] text-white rounded-full font-medium hover:bg-[#2E7D32] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#4CAF50] flex items-center justify-center flex-shrink-0"
                  >
                    {sending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="flex-1 items-center justify-center hidden md:flex">
              <div className="text-center text-gray-400">
                <div className="text-6xl mb-4">💬</div>
                <p className="text-lg font-medium mb-1 text-gray-600">Select a conversation</p>
                <p className="text-sm text-gray-500">Choose a conversation from the list to start messaging</p>
              </div>
            </div>
          )}
          
          {/* Mobile Empty State */}
          {!selectedConversation && (
            <div className="flex-1 items-center justify-center flex md:hidden p-8">
              <div className="text-center text-gray-400">
                <div className="text-5xl mb-3">💬</div>
                <p className="text-base font-medium mb-1 text-gray-600">Select a conversation</p>
                <p className="text-xs text-gray-500">Tap a conversation to start messaging</p>
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="mt-4 px-4 py-2 bg-black text-white rounded-lg font-medium text-sm"
                >
                  Browse Conversations
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Send Offer Modal */}
      {showSendOfferModal && selectedConversation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 animate-fadeIn" onClick={() => {
          setShowSendOfferModal(false);
          setOfferDetails({ price: '', discount: '', checkIn: '', checkOut: '', guests: '', message: '' });
          setOfferSummary(null);
        }}>
          <div className="bg-white rounded-xl md:rounded-2xl shadow-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto animate-fadeInUp" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 md:p-5 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1 mr-2">
                  <h3 className="text-lg md:text-xl font-semibold text-gray-900 truncate">Make an Offer</h3>
                  {selectedConversation.listingTitle && (
                    <p className="text-xs md:text-sm text-gray-500 mt-1 truncate">{selectedConversation.listingTitle}</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowSendOfferModal(false);
                    setOfferDetails({ price: '', discount: '', checkIn: '', checkOut: '', guests: '', message: '' });
                    setOfferSummary(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100 flex-shrink-0"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-4 md:p-6 space-y-4 md:space-y-5">
              {/* Listing Info */}
              {listingData && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Original Price</span>
                    {listingData.pricing?.basePrice && (
                      <span className="text-lg font-semibold text-gray-900">
                        ₱{parseFloat(listingData.pricing.basePrice).toLocaleString()}
                        {listingData.propertyType === 'home' && '/night'}
                      </span>
                    )}
                  </div>
                  {offerDetails.checkIn && offerDetails.checkOut && listingData.pricing?.basePrice && (
                    <div className="text-xs text-gray-500">
                      {Math.ceil((new Date(offerDetails.checkOut) - new Date(offerDetails.checkIn)) / (1000 * 60 * 60 * 24))} nights × ₱{parseFloat(listingData.pricing.basePrice).toLocaleString()} = ₱{(parseFloat(listingData.pricing.basePrice) * Math.ceil((new Date(offerDetails.checkOut) - new Date(offerDetails.checkIn)) / (1000 * 60 * 60 * 24))).toLocaleString()}
                    </div>
                  )}
                  {selectedConversation.listingId && (
                    <Link
                      to={`/listing/${selectedConversation.listingId}`}
                      className="text-xs text-gray-600 hover:text-black mt-2 inline-flex items-center gap-1 underline"
                      target="_blank"
                    >
                      View full listing details
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </Link>
                  )}
                </div>
              )}

              {/* Offer Price */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Your Offer Price (₱) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">₱</span>
                  <input
                    type="number"
                    value={offerDetails.price}
                    onChange={(e) => setOfferDetails({...offerDetails, price: e.target.value})}
                    placeholder="Enter your offer price"
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all"
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
                {offerSummary && offerSummary.savings > 0 && (
                  <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                    <span>💰</span> You're saving ₱{offerSummary.savings.toLocaleString()} ({offerSummary.savingsPercent}%)
                  </p>
                )}
                {listingData && listingData.pricing?.basePrice && !offerDetails.price && (
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-500">Quick fill:</span>
                    <button
                      onClick={() => {
                        const nights = offerDetails.checkIn && offerDetails.checkOut 
                          ? Math.ceil((new Date(offerDetails.checkOut) - new Date(offerDetails.checkIn)) / (1000 * 60 * 60 * 24))
                          : 1;
                        const suggestedPrice = listingData.pricing.basePrice * nights;
                        setOfferDetails({...offerDetails, price: suggestedPrice.toString()});
                      }}
                      className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition-colors"
                    >
                      Full price
                    </button>
                    <button
                      onClick={() => {
                        const nights = offerDetails.checkIn && offerDetails.checkOut 
                          ? Math.ceil((new Date(offerDetails.checkOut) - new Date(offerDetails.checkIn)) / (1000 * 60 * 60 * 24))
                          : 1;
                        const suggestedPrice = Math.round(listingData.pricing.basePrice * nights * 0.9);
                        setOfferDetails({...offerDetails, price: suggestedPrice.toString()});
                      }}
                      className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition-colors"
                    >
                      10% off
                    </button>
                    <button
                      onClick={() => {
                        const nights = offerDetails.checkIn && offerDetails.checkOut 
                          ? Math.ceil((new Date(offerDetails.checkOut) - new Date(offerDetails.checkIn)) / (1000 * 60 * 60 * 24))
                          : 1;
                        const suggestedPrice = Math.round(listingData.pricing.basePrice * nights * 0.85);
                        setOfferDetails({...offerDetails, price: suggestedPrice.toString()});
                      }}
                      className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition-colors"
                    >
                      15% off
                    </button>
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Check-in Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={offerDetails.checkIn}
                    onChange={(e) => setOfferDetails({...offerDetails, checkIn: e.target.value})}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all text-sm"
                    required
                  />
                  {offerDetails.checkIn && (
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(offerDetails.checkIn).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Check-out Date <span className="text-gray-400 font-normal text-xs">(Optional)</span>
                  </label>
                  <input
                    type="date"
                    value={offerDetails.checkOut}
                    onChange={(e) => setOfferDetails({...offerDetails, checkOut: e.target.value})}
                    min={offerDetails.checkIn || new Date().toISOString().split('T')[0]}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all text-sm"
                  />
                  {offerDetails.checkOut && (
                    <div className="mt-1">
                      <p className="text-xs text-gray-500">
                        {new Date(offerDetails.checkOut).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </p>
                      {offerDetails.checkIn && (
                        <p className="text-xs text-gray-600 font-medium mt-0.5">
                          {Math.ceil((new Date(offerDetails.checkOut) - new Date(offerDetails.checkIn)) / (1000 * 60 * 60 * 24))} {Math.ceil((new Date(offerDetails.checkOut) - new Date(offerDetails.checkIn)) / (1000 * 60 * 60 * 24)) === 1 ? 'night' : 'nights'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Guests & Discount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Number of Guests</label>
                  <input
                    type="number"
                    min="1"
                    value={offerDetails.guests}
                    onChange={(e) => setOfferDetails({...offerDetails, guests: e.target.value})}
                    placeholder="Guests"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Discount (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={offerDetails.discount}
                    onChange={(e) => setOfferDetails({...offerDetails, discount: e.target.value})}
                    placeholder="Optional"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all"
                  />
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Message to Host</label>
                <textarea
                  value={offerDetails.message}
                  onChange={(e) => setOfferDetails({...offerDetails, message: e.target.value})}
                  placeholder="Add a personal message with your offer..."
                  rows="4"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all resize-none"
                />
              </div>

              {/* Offer Summary */}
              {offerSummary && offerDetails.price && (
                <div className="bg-black text-white rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Offer Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="opacity-80">Your Offer:</span>
                      <span className="font-semibold">₱{offerSummary.offerPrice.toLocaleString()}</span>
                    </div>
                    {offerSummary.originalPrice > 0 && (
                      <div className="flex justify-between">
                        <span className="opacity-80">Original Price:</span>
                        <span className="line-through opacity-60">₱{offerSummary.originalPrice.toLocaleString()}</span>
                      </div>
                    )}
                    {offerSummary.savings > 0 && (
                      <div className="flex justify-between pt-2 border-t border-white/20">
                        <span className="opacity-80">You Save:</span>
                        <span className="font-semibold text-green-300">₱{offerSummary.savings.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 md:p-5 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row gap-2 md:gap-3">
              <button
                onClick={() => {
                  setShowSendOfferModal(false);
                  setOfferDetails({ price: '', discount: '', checkIn: '', checkOut: '', guests: '', message: '' });
                  setOfferSummary(null);
                }}
                className="flex-1 px-4 md:px-5 py-2 md:py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-white transition-all text-sm"
              >
                Cancel
              </button>
              <button
                onClick={sendOffer}
                disabled={!offerDetails.price || !offerDetails.checkIn || sending}
                className="flex-1 px-4 md:px-5 py-2 md:py-2.5 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black text-sm"
              >
                {sending ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending...
                  </span>
                ) : (
                  'Send Offer'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GuestMessages;
