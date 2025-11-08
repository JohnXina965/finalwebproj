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

function HostMessages() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [conversationMessages, setConversationMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [offerDetails, setOfferDetails] = useState({
    price: '',
    discount: '',
    checkIn: '',
    checkOut: '',
    guests: '',
    message: ''
  });
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
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [conversationMessages]);

  useEffect(() => {
    const guestId = searchParams.get('guest');
    const listingId = searchParams.get('listing');
    
    if (guestId && conversations.length > 0) {
      const conv = conversations.find(c => c.guestId === guestId);
      if (conv) {
        setSelectedConversation(conv);
      } else if (listingId) {
        createConversationFromGuest(guestId, listingId);
      }
    }
  }, [searchParams, conversations]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const createConversationFromGuest = async (guestId, listingId) => {
    try {
      const listingDoc = await getDoc(doc(db, 'listings', listingId));
      if (!listingDoc.exists()) return;

      const listingData = listingDoc.data();
      const guestDoc = await getDoc(doc(db, 'users', guestId));
      const guestData = guestDoc.exists() ? guestDoc.data() : {};

      const newConv = {
        id: `conv_${guestId}`,
        guestId: guestId,
        guestName: guestData.displayName || guestData.email || 'Guest',
        guestEmail: guestData.email,
        guestPhoto: guestData.photoURL,
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
      setError(null);
      const conversationsRef = collection(db, 'conversations');
      const q = query(
        conversationsRef,
        where('hostId', '==', currentUser.uid)
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
        setError(null);
      }, (error) => {
        console.error('Error loading conversations:', error);
        setError('Failed to load conversations. Please refresh.');
        setLoading(false);
        toast.error('Failed to load conversations');
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error loading conversations:', error);
      setError('Failed to load conversations. Please refresh.');
      setLoading(false);
      toast.error('Failed to load conversations');
    }
  };

  const loadMessages = (conversationId) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return;

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
        where('hostId', '==', currentUser.uid),
        where('guestId', '==', conversation.guestId),
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
        hostId: currentUser.uid,
        hostName: currentUser.displayName || currentUser.email,
        hostPhoto: currentUser.photoURL,
        guestId: conversation.guestId,
        guestName: conversation.guestName,
        guestEmail: conversation.guestEmail,
        guestPhoto: conversation.guestPhoto,
        listingId: conversation.listingId,
        listingTitle: conversation.listingTitle,
        content: newMessage.trim(),
        senderId: currentUser.uid,
        senderType: 'host',
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

    try {
      setSending(true);
      await addDoc(collection(db, 'messages'), {
        hostId: currentUser.uid,
        hostName: currentUser.displayName || currentUser.email,
        guestId: conversation.guestId,
        guestName: conversation.guestName,
        listingId: conversation.listingId,
        listingTitle: conversation.listingTitle,
        type: 'offer',
        senderId: currentUser.uid,
        senderType: 'host',
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
      setShowOfferModal(false);
      setOfferDetails({ price: '', discount: '', checkIn: '', checkOut: '', guests: '', message: '' });
    } catch (error) {
      console.error('Error sending offer:', error);
      toast.error('Failed to send offer. Please try again.');
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
        await setDoc(conversationRef, {
          id: convId,
          guestId: conversation.guestId,
          guestName: conversation.guestName,
          guestEmail: conversation.guestEmail,
          guestPhoto: conversation.guestPhoto,
          hostId: currentUser.uid,
          hostName: currentUser.displayName || currentUser.email,
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
        hostId: currentUser.uid,
        hostName: currentUser.displayName || currentUser.email,
        guestId: messageData.guestId,
        guestName: messageData.guestName,
        listingId: messageData.listingId,
        listingTitle: messageData.listingTitle,
        content: response === 'accepted' ? 'I accept your offer! ✓' : 'I decline your offer.',
        senderId: currentUser.uid,
        senderType: 'host',
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

  const filteredConversations = conversations.filter(conv => 
    conv.guestName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.listingTitle?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-20 pb-8">
      <div className="max-w-7xl mx-auto px-4 h-[calc(100vh-120px)]">
        <div className="bg-white rounded-3xl shadow-2xl h-full flex overflow-hidden border border-gray-200">
          <div className="w-full md:w-96 border-r border-gray-200 flex flex-col bg-gradient-to-b from-gray-50 to-white">
            <div className="p-6 border-b border-gray-200 bg-white">
              <div className="h-8 bg-gray-200 rounded w-32 mb-4 animate-pulse"></div>
              <div className="h-12 bg-gray-200 rounded-xl animate-pulse"></div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="p-4 border border-gray-200 rounded-xl animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-14 h-14 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-32 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 flex flex-col bg-white">
            <div className="p-6 border-b border-gray-200">
              <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
            </div>
            <div className="flex-1 p-6 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error && conversations.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center pt-20">
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-md text-center" data-aos="fade-up">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Error Loading Messages</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={loadConversations}
            className="bg-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 pt-20 pb-8">
      <div className="max-w-7xl mx-auto px-4 h-[calc(100vh-120px)]">
        <div className="bg-white rounded-3xl shadow-2xl h-full flex overflow-hidden border border-gray-200">
          {/* Conversations Sidebar */}
          <div className="w-full md:w-96 border-r border-gray-200 flex flex-col bg-gradient-to-b from-gray-50 to-white">
            <div className="p-6 border-b border-gray-200 bg-white" data-aos="fade-down">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Messages</h2>
                <span className="bg-teal-100 text-teal-700 text-xs px-3 py-1 rounded-full font-bold">
                  {conversations.length}
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
                />
                <svg className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="text-6xl mb-4">💬</div>
                  <p className="font-semibold mb-1">No conversations yet</p>
                  <p className="text-sm">Messages from guests will appear here</p>
                </div>
              ) : (
                filteredConversations.map((conv, index) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-all duration-200 border-b border-gray-100 ${
                      selectedConversation?.id === conv.id 
                        ? 'bg-gradient-to-r from-teal-50 to-emerald-50 border-l-4 border-l-teal-600 shadow-sm' 
                        : ''
                    }`}
                    data-aos="fade-right"
                    data-aos-delay={index * 50}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg ring-2 ring-white">
                        {conv.guestPhoto ? (
                          <img src={conv.guestPhoto} alt={conv.guestName} className="w-14 h-14 rounded-full object-cover" />
                        ) : (
                          <span className="text-white font-bold text-xl">
                            {conv.guestName?.charAt(0)?.toUpperCase() || 'G'}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-bold text-gray-900 truncate">{conv.guestName}</h4>
                          {conv.unreadCount > 0 && (
                            <span className="bg-teal-600 text-white text-xs px-2 py-1 rounded-full font-bold min-w-[24px] text-center">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                        {conv.listingTitle && (
                          <p className="text-xs text-teal-600 mb-1 truncate font-medium">{conv.listingTitle}</p>
                        )}
                        <p className="text-sm text-gray-600 truncate mb-1">{conv.lastMessage || 'No messages'}</p>
                        {conv.lastMessageTime && (
                          <p className="text-xs text-gray-400">{formatTime(conv.lastMessageTime)}</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Messages Area */}
          {selectedConversation ? (
            <div className="flex-1 flex flex-col bg-white">
              {/* Header */}
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-white to-gray-50 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg ring-2 ring-white">
                    {selectedConversation.guestPhoto ? (
                      <img src={selectedConversation.guestPhoto} alt={selectedConversation.guestName} className="w-14 h-14 rounded-full object-cover" />
                    ) : (
                      <span className="text-white font-bold text-xl">
                        {selectedConversation.guestName?.charAt(0)?.toUpperCase() || 'G'}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{selectedConversation.guestName}</h3>
                    {selectedConversation.listingTitle && (
                      <p className="text-sm text-gray-500">{selectedConversation.listingTitle}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {selectedConversation.listingId && (
                    <Link
                      to={`/listing/${selectedConversation.listingId}`}
                      className="px-4 py-2 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-all text-sm flex items-center gap-2 shadow-md hover:shadow-lg"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Listing
                    </Link>
                  )}
                  <button
                    onClick={() => setShowOfferModal(true)}
                    className="px-4 py-2 border-2 border-teal-600 text-teal-600 rounded-xl font-semibold hover:bg-teal-50 transition-all text-sm flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Send Offer
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div 
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-50 via-white to-gray-50"
                style={{ scrollBehavior: 'smooth' }}
              >
                {conversationMessages.map((msg, index) => {
                  const isHost = msg.senderId === currentUser.uid;
                  const prevMsg = conversationMessages[index - 1];
                  const showAvatar = !prevMsg || prevMsg.senderId !== msg.senderId || 
                    (msg.timestamp?.getTime() - prevMsg.timestamp?.getTime()) > 300000;

                  if (msg.type === 'offer') {
                    return (
                      <div key={msg.id} className={`flex ${isHost ? 'justify-end' : 'justify-start'} mb-6`}>
                        <div className={`max-w-md ${isHost ? 'items-end' : 'items-start'} flex flex-col`}>
                          <div className={`rounded-3xl p-6 shadow-xl ${isHost 
                            ? 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white' 
                            : 'bg-white border-2 border-teal-200 text-gray-900'
                          }`}>
                            <div className="flex items-center gap-3 mb-4">
                              <div className={`p-3 rounded-2xl ${isHost ? 'bg-white/20' : 'bg-teal-100'}`}>
                                <svg className={`w-6 h-6 ${isHost ? 'text-white' : 'text-teal-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <div>
                                <p className="font-bold text-lg">Special Offer</p>
                                <p className={`text-xs ${isHost ? 'opacity-80' : 'text-gray-500'}`}>
                                  {isHost ? 'You sent' : 'from'} {isHost ? 'to' : ''} {isHost ? selectedConversation.guestName : msg.hostName}
                                </p>
                              </div>
                            </div>
                            
                            <div className="space-y-3 mb-4 bg-white/10 rounded-xl p-4">
                              <div className="flex justify-between items-center">
                                <span className={`text-sm ${isHost ? 'opacity-90' : 'text-gray-600'}`}>Price:</span>
                                <span className="font-bold text-xl">₱{parseFloat(msg.offerPrice || 0).toLocaleString()}</span>
                              </div>
                              {msg.offerDiscount && (
                                <div className="flex justify-between items-center">
                                  <span className={`text-sm ${isHost ? 'opacity-90' : 'text-gray-600'}`}>Discount:</span>
                                  <span className="font-bold text-green-500">{msg.offerDiscount}% off</span>
                                </div>
                              )}
                              {(msg.offerCheckIn || msg.offerCheckOut) && (
                                <div className="flex justify-between items-center">
                                  <span className={`text-sm ${isHost ? 'opacity-90' : 'text-gray-600'}`}>Dates:</span>
                                  <span className="font-semibold">
                                    {msg.offerCheckIn ? formatDate(msg.offerCheckIn) : 'Flexible'} - {msg.offerCheckOut ? formatDate(msg.offerCheckOut) : 'Flexible'}
                                  </span>
                                </div>
                              )}
                              {msg.offerGuests && (
                                <div className="flex justify-between items-center">
                                  <span className={`text-sm ${isHost ? 'opacity-90' : 'text-gray-600'}`}>Guests:</span>
                                  <span className="font-semibold">{msg.offerGuests}</span>
                                </div>
                              )}
                              {msg.offerMessage && (
                                <div className="pt-3 border-t border-white/20 mt-3">
                                  <p className={`text-sm ${isHost ? 'opacity-90' : 'text-gray-700'}`}>{msg.offerMessage}</p>
                                </div>
                              )}
                            </div>

                            {!isHost && msg.offerStatus === 'pending' && (
                              <div className="flex gap-3 mt-4 pt-4 border-t border-white/20">
                                <button
                                  onClick={() => handleOfferResponse(msg.id, 'accepted')}
                                  className="flex-1 bg-white text-teal-600 py-3 px-5 rounded-xl font-bold hover:bg-teal-50 transition-all shadow-md hover:shadow-lg transform hover:scale-105"
                                >
                                  ✓ Accept
                                </button>
                                <button
                                  onClick={() => handleOfferResponse(msg.id, 'declined')}
                                  className="flex-1 bg-white/20 text-white py-3 px-5 rounded-xl font-bold hover:bg-white/30 transition-all"
                                >
                                  Decline
                                </button>
                              </div>
                            )}
                            {msg.offerStatus === 'accepted' && (
                              <div className="mt-4 pt-4 border-t border-white/20">
                                <p className={`text-sm font-bold ${isHost ? 'text-green-200' : 'text-green-600'}`}>
                                  ✓ Offer Accepted
                                </p>
                              </div>
                            )}
                            {msg.offerStatus === 'declined' && (
                              <div className="mt-4 pt-4 border-t border-white/20">
                                <p className={`text-sm ${isHost ? 'opacity-75' : 'text-gray-500'}`}>Offer Declined</p>
                              </div>
                            )}
                          </div>
                          {msg.timestamp && (
                            <p className={`text-xs mt-2 px-2 ${isHost ? 'text-right text-gray-500' : 'text-left text-gray-400'}`}>
                              {formatTime(msg.timestamp)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isHost ? 'justify-end' : 'justify-start'} items-end gap-2 group`}
                    >
                      {!isHost && showAvatar && (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-md ring-2 ring-white">
                          {selectedConversation.guestPhoto ? (
                            <img src={selectedConversation.guestPhoto} alt={selectedConversation.guestName} className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <span className="text-white text-sm font-bold">
                              {selectedConversation.guestName?.charAt(0)?.toUpperCase() || 'G'}
                            </span>
                          )}
                        </div>
                      )}
                      {isHost && <div className="w-10"></div>}
                      <div className={`max-w-xs lg:max-w-md px-5 py-3 rounded-3xl shadow-md transition-all duration-200 group-hover:shadow-lg ${
                        isHost 
                          ? 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white rounded-tr-sm' 
                          : 'bg-white text-gray-900 border border-gray-200 rounded-tl-sm'
                      }`}>
                        {!isHost && showAvatar && (
                          <p className="text-xs font-bold mb-1.5 text-gray-600">{msg.guestName}</p>
                        )}
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        <div className={`flex items-center justify-end gap-1 mt-2 ${isHost ? 'text-teal-100' : 'text-gray-400'}`}>
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
                      {!isHost && <div className="w-10"></div>}
                      {isHost && showAvatar && (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-md ring-2 ring-white">
                          {currentUser.photoURL ? (
                            <img src={currentUser.photoURL} alt="You" className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <span className="text-white text-sm font-bold">
                              {currentUser.displayName?.charAt(0)?.toUpperCase() || currentUser.email?.charAt(0)?.toUpperCase() || 'H'}
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
              <form onSubmit={sendMessage} className="p-6 border-t border-gray-200 bg-white">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-5 py-3 border-2 border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all bg-gray-50 focus:bg-white"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-2xl font-bold hover:from-teal-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
                  >
                    {sending ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Sending...</span>
                      </div>
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
              <div className="text-center text-gray-500">
                <div className="text-8xl mb-6">💬</div>
                <p className="text-2xl font-bold mb-2">Select a conversation</p>
                <p className="text-sm">Choose a conversation from the list to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Send Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900">Send Special Offer</h3>
                <button
                  onClick={() => setShowOfferModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Offer Price (₱)</label>
                <input
                  type="number"
                  value={offerDetails.price}
                  onChange={(e) => setOfferDetails({...offerDetails, price: e.target.value})}
                  placeholder="Enter your offer price"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Check-in Date</label>
                  <input
                    type="date"
                    value={offerDetails.checkIn}
                    onChange={(e) => setOfferDetails({...offerDetails, checkIn: e.target.value})}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Check-out Date <span className="text-gray-400 font-normal text-xs">(Optional)</span></label>
                  <input
                    type="date"
                    value={offerDetails.checkOut}
                    onChange={(e) => setOfferDetails({...offerDetails, checkOut: e.target.value})}
                    min={offerDetails.checkIn || new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Number of Guests</label>
                  <input
                    type="number"
                    min="1"
                    value={offerDetails.guests}
                    onChange={(e) => setOfferDetails({...offerDetails, guests: e.target.value})}
                    placeholder="Guests"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Discount (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={offerDetails.discount}
                    onChange={(e) => setOfferDetails({...offerDetails, discount: e.target.value})}
                    placeholder="Optional"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Message (Optional)</label>
                <textarea
                  value={offerDetails.message}
                  onChange={(e) => setOfferDetails({...offerDetails, message: e.target.value})}
                  placeholder="Add a personal message with your offer..."
                  rows="4"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => {
                  setShowOfferModal(false);
                  setOfferDetails({ price: '', discount: '', checkIn: '', checkOut: '', guests: '', message: '' });
                }}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={sendOffer}
                disabled={!offerDetails.price || sending}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl font-bold hover:from-teal-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                {sending ? 'Sending...' : 'Send Offer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HostMessages;

