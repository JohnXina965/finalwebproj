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

function HostMessages() {
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
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
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
        hostId: currentUser.uid,
        hostName: currentUser.displayName || currentUser.email,
        hostPhoto: currentUser.photoURL,
        guestId: conversation.guestId,
        guestName: conversation.guestName,
        guestEmail: conversation.guestEmail,
        guestPhoto: conversation.guestPhoto,
        listingId: conversation.listingId,
        listingTitle: conversation.listingTitle,
        content: newMessage.trim() || '',
        imageUrl: imageUrl || null,
        senderId: currentUser.uid,
        senderType: 'host',
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
    conv.guestEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
    <div className="fixed inset-0 top-16 bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="w-full h-full flex overflow-hidden">
        <div className="bg-white h-full w-full flex overflow-hidden">
          {/* Conversations Sidebar */}
          <div className="w-full md:w-80 lg:w-96 border-r border-gray-200 flex flex-col bg-gradient-to-b from-gray-50 to-white flex-shrink-0">
            <div className="p-4 border-b border-gray-200 bg-white" data-aos="fade-down">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold text-gray-900">Messages</h2>
                <span className="bg-teal-100 text-teal-700 text-xs px-2.5 py-1 rounded-full font-bold">
                  {conversations.length}
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by guest name, email, or listing..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all border border-transparent focus:border-teal-500"
                />
                <svg className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className={`w-full p-3 text-left hover:bg-gray-50 transition-all duration-200 border-b border-gray-100 ${
                      selectedConversation?.id === conv.id 
                        ? 'bg-gradient-to-r from-teal-50 to-emerald-50 border-l-4 border-l-teal-600 shadow-sm' 
                        : ''
                    }`}
                    data-aos="fade-right"
                    data-aos-delay={index * 50}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg ring-2 ring-white">
                        {conv.guestPhoto ? (
                          <img src={conv.guestPhoto} alt={conv.guestName} className="w-12 h-12 rounded-full object-cover" />
                        ) : (
                          <span className="text-white font-bold text-lg">
                            {conv.guestName?.charAt(0)?.toUpperCase() || 'G'}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h4 className="font-semibold text-gray-900 truncate text-sm">{conv.guestName}</h4>
                          {conv.unreadCount > 0 && (
                            <span className="bg-teal-600 text-white text-xs px-1.5 py-0.5 rounded-full font-bold min-w-[20px] text-center">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                        {conv.listingTitle && (
                          <p className="text-xs text-teal-600 mb-0.5 truncate font-medium">{conv.listingTitle}</p>
                        )}
                        <p className="text-xs text-gray-600 truncate mb-0.5">{conv.lastMessage || 'No messages'}</p>
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
            <div className="flex-1 flex flex-col bg-white min-w-0">
              {/* Header */}
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-white to-gray-50 flex items-center justify-between shadow-sm flex-shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg ring-2 ring-white flex-shrink-0">
                    {selectedConversation.guestPhoto ? (
                      <img src={selectedConversation.guestPhoto} alt={selectedConversation.guestName} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <span className="text-white font-bold text-lg">
                        {selectedConversation.guestName?.charAt(0)?.toUpperCase() || 'G'}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-gray-900 text-base truncate">{selectedConversation.guestName}</h3>
                    {selectedConversation.listingTitle && (
                      <p className="text-xs text-gray-500 truncate">{selectedConversation.listingTitle}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {selectedConversation.listingId && (
                    <Link
                      to={`/listing/${selectedConversation.listingId}`}
                      className="px-3 py-1.5 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-all text-xs flex items-center gap-1.5 shadow-md hover:shadow-lg whitespace-nowrap"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Listing
                    </Link>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div 
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50 via-white to-gray-50 min-h-0"
                style={{ scrollBehavior: 'smooth' }}
              >
                {conversationMessages.map((msg, index) => {
                  const isHost = msg.senderId === currentUser.uid;
                  const prevMsg = conversationMessages[index - 1];
                  const showAvatar = !prevMsg || prevMsg.senderId !== msg.senderId || 
                    (msg.timestamp?.getTime() - prevMsg.timestamp?.getTime()) > 300000;

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isHost ? 'justify-end' : 'justify-start'} items-end gap-2 group mb-2`}
                    >
                      {!isHost && showAvatar && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-md ring-2 ring-white">
                          {selectedConversation.guestPhoto ? (
                            <img src={selectedConversation.guestPhoto} alt={selectedConversation.guestName} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <span className="text-white text-xs font-bold">
                              {selectedConversation.guestName?.charAt(0)?.toUpperCase() || 'G'}
                            </span>
                          )}
                        </div>
                      )}
                      {isHost && <div className="w-8"></div>}
                      <div className={`max-w-[85%] md:max-w-[75%] px-3 py-2 rounded-2xl transition-all duration-200 group-hover:shadow-md ${
                        isHost 
                          ? 'bg-[#FF6B35] text-white rounded-tr-sm' 
                          : 'bg-gray-100 text-gray-900 rounded-tl-sm'
                      }`}>
                        {!isHost && showAvatar && (
                          <p className="text-xs font-semibold mb-1 text-gray-600">{msg.guestName}</p>
                        )}
                        {msg.imageUrl && (
                          <div className="mb-2 rounded-lg overflow-hidden max-w-full">
                            <img 
                              src={msg.imageUrl} 
                              alt="Shared image" 
                              className="max-w-full h-auto max-h-96 rounded-lg cursor-pointer object-contain"
                              onClick={() => window.open(msg.imageUrl, '_blank')}
                            />
                          </div>
                        )}
                        {msg.content && (
                          <p className="text-sm whitespace-pre-wrap leading-relaxed break-words">{msg.content}</p>
                        )}
                        <div className={`flex items-center gap-1 mt-1.5 ${isHost ? 'text-white/80 justify-end' : 'text-gray-500 justify-start'}`}>
                          {msg.timestamp && (
                            <p className="text-xs">
                              {msg.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
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
                      {!isHost && <div className="w-8"></div>}
                      {isHost && showAvatar && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-md ring-2 ring-white">
                          {currentUser.photoURL ? (
                            <img src={currentUser.photoURL} alt="You" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <span className="text-white text-xs font-bold">
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
              <form onSubmit={sendMessage} className="p-3 border-t border-gray-200 bg-white flex-shrink-0">
                {imagePreview && (
                  <div className="mb-2 relative inline-block">
                    <img src={imagePreview} alt="Preview" className="max-w-xs max-h-48 h-auto rounded-lg border-2 border-gray-300 object-contain" />
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
                    className="p-2.5 text-gray-600 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                    disabled={uploadingImage}
                    title="Send image"
                  >
                    {uploadingImage ? (
                      <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35] transition-all bg-gray-50 focus:bg-white text-sm"
                  />
                  <button
                    type="submit"
                    disabled={(!newMessage.trim() && !selectedImage) || sending || uploadingImage}
                    className="p-2.5 bg-[#FF6B35] text-white rounded-full hover:bg-[#e55a2b] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    title="Send message"
                  >
                    {sending || uploadingImage ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
            <div className="flex-1 items-center justify-center hidden md:flex min-w-0">
              <div className="text-center text-gray-500">
                <div className="text-6xl mb-4">💬</div>
                <p className="text-xl font-bold mb-2">Select a conversation</p>
                <p className="text-sm">Choose a conversation from the list to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HostMessages;

