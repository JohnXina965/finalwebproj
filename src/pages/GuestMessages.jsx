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
import { uploadToCloudinary } from '../utils/Cloudinary';
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [hostSearchResults, setHostSearchResults] = useState([]);
  const [searchingHosts, setSearchingHosts] = useState(false);
  const [showHostSearch, setShowHostSearch] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [listingData, setListingData] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hostTiers, setHostTiers] = useState({}); // Store host tier info by hostId
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);

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
    
    if (hostId && !loading) {
      // Wait for conversations to load, then auto-select
      if (conversations.length > 0) {
        const conv = conversations.find(c => c.hostId === hostId);
        if (conv) {
          setSelectedConversation(conv);
        } else if (listingId) {
          createConversationFromListing(hostId, listingId);
        }
      } else if (listingId) {
        // If no conversations yet but we have listingId, create conversation immediately
        createConversationFromListing(hostId, listingId);
      }
    }
  }, [searchParams, conversations, loading]);

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

  // Get host tier based on points
  const getCurrentTier = (points) => {
    if (points >= 50000) return { name: 'Radiant', icon: '💎', color: 'text-purple-600' };
    if (points >= 30000) return { name: 'Immortal', icon: '👑', color: 'text-red-600' };
    if (points >= 20000) return { name: 'Diamond', icon: '💠', color: 'text-cyan-600' };
    if (points >= 10000) return { name: 'Platinum', icon: '🔷', color: 'text-gray-600' };
    if (points >= 5000) return { name: 'Gold', icon: '🥇', color: 'text-yellow-600' };
    if (points >= 2000) return { name: 'Silver', icon: '🥈', color: 'text-gray-500' };
    if (points >= 500) return { name: 'Bronze', icon: '🥉', color: 'text-orange-600' };
    return { name: 'Iron', icon: '⚙️', color: 'text-gray-600' };
  };

  // Load host tier info for a specific host
  const loadHostTier = async (hostId) => {
    if (!hostId || hostTiers[hostId]) return; // Already loaded
    
    try {
      const hostPointsRef = doc(db, 'hostPoints', hostId);
      const hostPointsSnap = await getDoc(hostPointsRef);
      let totalPoints = 0;

      if (hostPointsSnap.exists()) {
        totalPoints = hostPointsSnap.data().totalPoints || 0;
      } else {
        // Calculate points from bookings and listings if hostPoints document doesn't exist
        try {
          const bookingsQuery = query(
            collection(db, 'bookings'),
            where('hostId', '==', hostId),
            where('status', '==', 'completed')
          );
          const bookingsSnapshot = await getDocs(bookingsQuery);
          const completedBookings = bookingsSnapshot.size;
          
          const listingsQuery = query(
            collection(db, 'listings'),
            where('hostId', '==', hostId)
          );
          const listingsSnapshot = await getDocs(listingsQuery);
          const activeListings = listingsSnapshot.size;

          totalPoints = completedBookings * 10 + activeListings * 50;
        } catch (err) {
          console.error('Error calculating points:', err);
        }
      }

      const tier = getCurrentTier(totalPoints);
      setHostTiers(prev => ({ ...prev, [hostId]: tier }));
    } catch (error) {
      console.error('Error loading host tier:', error);
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
      
      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const conversationsList = await Promise.all(
          snapshot.docs.map(async (doc) => {
            const data = doc.data();
            const conv = {
              id: doc.id,
              ...data,
              lastMessageTime: data.lastMessageTime?.toDate()
            };
            
            // Calculate unread count if not present
            if (conv.unreadCount === undefined || conv.unreadCount === null) {
              try {
                const unreadQuery = query(
                  collection(db, 'messages'),
                  where('guestId', '==', currentUser.uid),
                  where('hostId', '==', conv.hostId),
                  where('read', '==', false)
                );
                const unreadSnapshot = await getDocs(unreadQuery);
                conv.unreadCount = unreadSnapshot.size;
              } catch (error) {
                console.error('Error calculating unread count:', error);
                conv.unreadCount = 0;
              }
            }
            
            return conv;
          })
        );
        
        // Sort by last message time, with unread messages first
        conversationsList.sort((a, b) => {
          // Unread messages first
          if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
          if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
          
          // Then by last message time
          if (!a.lastMessageTime) return 1;
          if (!b.lastMessageTime) return -1;
          return b.lastMessageTime - a.lastMessageTime;
        });
        
        setConversations(conversationsList);
        
        // Load host tiers for all conversations
        conversationsList.forEach(conv => {
          if (conv.hostId) {
            loadHostTier(conv.hostId);
          }
        });
        
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

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedImage) || !selectedConversation || sending || uploadingImage) return;

    const conversation = conversations.find(c => c.id === selectedConversation.id);
    if (!conversation) return;

    try {
      setSending(true);
      let imageUrl = null;

      // Upload image if selected
      if (selectedImage) {
        setUploadingImage(true);
        try {
          const uploadResult = await uploadToCloudinary(selectedImage, (progress) => {
            // Optional: You can show upload progress if needed
            console.log(`Upload progress: ${progress}%`);
          });
          imageUrl = uploadResult.url;
          setUploadingImage(false);
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
          toast.error('Failed to upload image. Please try again.');
          setUploadingImage(false);
          setSending(false);
          return;
        }
      }

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
        content: newMessage.trim() || '',
        imageUrl: imageUrl || null,
        senderId: currentUser.uid,
        senderType: 'guest',
        type: imageUrl ? 'image' : 'text',
        read: false,
        timestamp: serverTimestamp()
      });

      await updateOrCreateConversation(conversation, imageUrl ? 'Sent an image' : newMessage.trim(), imageUrl ? 'image' : 'text');
      setNewMessage('');
      removeImage();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
      setUploadingImage(false);
    } finally {
      setSending(false);
    }
  };

  // Offer functionality removed - messaging only

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

  // Offer functionality removed - messaging only

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
                    className={`w-full p-3 text-left hover:bg-gray-50 transition-all duration-150 border-b border-gray-100 last:border-0 relative ${
                      selectedConversation?.id === conv.id 
                        ? 'bg-gray-50' 
                        : ''
                    } ${
                      conv.unreadCount > 0 
                        ? 'bg-blue-50 border-l-4 border-l-blue-500' 
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
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="font-semibold text-gray-900 truncate text-sm">{conv.hostName}</h4>
                          {hostTiers[conv.hostId] && (
                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 ${hostTiers[conv.hostId].color}`} title={`${hostTiers[conv.hostId].name} Rank`}>
                              <span className="text-[10px]">{hostTiers[conv.hostId].icon}</span>
                              <span className="text-[10px]">{hostTiers[conv.hostId].name}</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{conv.lastMessage || 'No messages'}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {conv.unreadCount > 0 && (
                          <>
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[22px] text-center flex items-center justify-center shadow-md">
                              {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                            </span>
                          </>
                        )}
                      </div>
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
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-semibold text-gray-900 text-base truncate">{selectedConversation.hostName}</h3>
                      {hostTiers[selectedConversation.hostId] && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 ${hostTiers[selectedConversation.hostId].color}`} title={`${hostTiers[selectedConversation.hostId].name} Rank`}>
                          <span>{hostTiers[selectedConversation.hostId].icon}</span>
                          <span>{hostTiers[selectedConversation.hostId].name}</span>
                        </span>
                      )}
                    </div>
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

                  // Skip offer messages - offer functionality removed
                  if (msg.type === 'offer') {
                    return null;
                  }

                  // Check if message is a listing card (has listingId and type is not offer)
                  const isListingCard = msg.listingId && msg.type !== 'offer' && !msg.content && !msg.imageUrl;
                  
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
                      className={`flex ${isGuest ? 'justify-end' : 'justify-start'} items-end gap-2 group mb-2`}
                    >
                      {!isGuest && showAvatar && (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                          {selectedConversation.hostPhoto ? (
                            <img src={selectedConversation.hostPhoto} alt={selectedConversation.hostName} className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <span className="text-gray-600 text-sm font-semibold">
                              {selectedConversation.hostName?.charAt(0)?.toUpperCase() || 'H'}
                            </span>
                          )}
                        </div>
                      )}
                      {isGuest && <div className="w-10"></div>}
                      <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl transition-all duration-200 group-hover:shadow-md ${
                        isGuest 
                          ? 'bg-[#FF6B35] text-white rounded-tr-sm' 
                          : 'bg-gray-100 text-gray-900 rounded-tl-sm'
                      }`}>
                        {!isGuest && showAvatar && (
                          <p className="text-xs font-semibold mb-1 text-gray-600">{msg.hostName}</p>
                        )}
                        {msg.imageUrl && (
                          <div className="mb-2 rounded-lg overflow-hidden">
                            <img 
                              src={msg.imageUrl} 
                              alt="Shared image" 
                              className="max-w-full h-auto rounded-lg cursor-pointer"
                              onClick={() => window.open(msg.imageUrl, '_blank')}
                            />
                          </div>
                        )}
                        {msg.content && (
                          <p className="text-sm whitespace-pre-wrap leading-relaxed break-words">{msg.content}</p>
                        )}
                        <div className={`flex items-center gap-1 mt-1.5 ${isGuest ? 'text-white/80 justify-end' : 'text-gray-500 justify-start'}`}>
                          {msg.timestamp && (
                            <p className="text-xs">
                              {msg.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </p>
                          )}
                          {/* Seen indicator for guest messages */}
                          {isGuest && msg.read && (
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
                      {!isGuest && <div className="w-10"></div>}
                      {isGuest && showAvatar && (
                        <div className="w-10 h-10 rounded-full bg-[#FF6B35] flex items-center justify-center flex-shrink-0">
                          {currentUser.photoURL ? (
                            <img src={currentUser.photoURL} alt="You" className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <span className="text-white text-sm font-bold">
                              {currentUser.displayName?.charAt(0)?.toUpperCase() || currentUser.email?.charAt(0)?.toUpperCase() || 'G'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={sendMessage} className="p-4 border-t border-gray-200 bg-white sticky bottom-0">
                {imagePreview && (
                  <div className="mb-3 relative inline-block">
                    <img src={imagePreview} alt="Preview" className="max-w-xs h-auto rounded-lg border-2 border-gray-300" />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
                <div className="flex gap-2 items-end">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 text-gray-600 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                    disabled={uploadingImage}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35] transition-all bg-gray-50 focus:bg-white text-sm placeholder:text-gray-400"
                  />
                  <button
                    type="submit"
                    disabled={(!newMessage.trim() && !selectedImage) || sending || uploadingImage}
                    className="p-3 bg-[#FF6B35] text-white rounded-full hover:bg-[#e55a2b] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    {sending || uploadingImage ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

    </div>
  );
}

export default GuestMessages;
