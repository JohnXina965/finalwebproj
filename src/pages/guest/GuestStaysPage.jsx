import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../Firebase';
import { useAuth } from '../../contexts/AuthContext';
import { getGuestRecommendations } from '../../services/RecommendationService';
import DateRangePicker from '../../components/DateRangePicker';
import { motion } from 'framer-motion';

function GuestHomePage() {
  const { currentUser } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  
  // Search filters
  const [searchFilters, setSearchFilters] = useState({
    location: '',
    checkIn: '',
    checkOut: '',
    guests: '',
    maxPrice: 100000
  });
  const [showPriceFilter, setShowPriceFilter] = useState(false);
  const [isClosingFilter, setIsClosingFilter] = useState(false);
  const [sortBy, setSortBy] = useState('featured'); // 'featured', 'price-low', 'price-high', 'rating', 'newest'
  const [favorites, setFavorites] = useState(() => {
    try {
      const raw = localStorage.getItem('ee_favorites_home');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  // Fetch real-time listings from Firestore
  useEffect(() => {
    const q = query(
      collection(db, 'listings'),
      where('propertyType', '==', 'home'),
      where('status', '==', 'published')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listingsData = snapshot.docs.map(doc => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt?.seconds * 1000 || 0);
        return {
          id: doc.id,
          title: data.homeDetails?.title || data.title || 'Untitled',
          type: data.homeDetails?.propertyType || 'Entire Place',
          price: `₱${parseFloat(data.pricing?.basePrice || 0).toLocaleString('en-PH')}`,
          rating: data.rating || 0,
          reviews: data.reviewCount || 0,
          image: (typeof data.photos?.[0] === 'string' ? data.photos[0] : data.photos?.[0]?.url) || '/placeholder-home.jpg',
          location: `${data.location?.city || ''}, ${data.location?.state || ''}`.trim() || 'Location not specified',
          features: data.homeDetails?.amenities || [],
          host: data.hostName || 'Host',
          maxGuests: data.homeDetails?.maxGuests || 2,
          bedrooms: data.homeDetails?.bedrooms || 1,
          bathrooms: data.homeDetails?.bathrooms || 1,
          createdAt
        };
      }).sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)); // Sort client-side
      
      console.log('✅ Loaded', listingsData.length, 'home listings');
      console.log('📋 Sample listing data:', listingsData[0] || 'No listings');
      setListings(listingsData);
      setLoading(false);
    }, (error) => {
      console.error('❌ Error fetching listings:', error);
      console.error('Error details:', error.code, error.message);
      if (error.code === 'failed-precondition') {
        console.error('⚠️ Firestore index required. Please create a composite index in Firebase Console.');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const featuredAccommodations = listings;

  // Fetch recommendations when user is logged in
  useEffect(() => {
    if (!currentUser) {
      setRecommendations([]);
      return;
    }

    const fetchRecommendations = async () => {
      setRecommendationsLoading(true);
      try {
        const recs = await getGuestRecommendations(currentUser.uid, 'home', 8);
        
        // Transform recommendations to match listing format
        const formattedRecs = recs.map(rec => ({
          id: rec.id,
          title: rec.homeDetails?.title || rec.title || 'Untitled',
          type: rec.homeDetails?.propertyType || 'Entire Place',
          price: `₱${parseFloat(rec.pricing?.basePrice || 0).toLocaleString('en-PH')}`,
          rating: rec.rating || 0,
          reviews: rec.reviewCount || 0,
          image: (typeof rec.photos?.[0] === 'string' ? rec.photos[0] : rec.photos?.[0]?.url) || '/placeholder-home.jpg',
          location: `${rec.location?.city || ''}, ${rec.location?.state || ''}`.trim() || 'Location not specified',
          features: rec.homeDetails?.amenities || [],
          host: rec.hostName || 'Host',
          maxGuests: rec.homeDetails?.maxGuests || 2,
          bedrooms: rec.homeDetails?.bedrooms || 1,
          bathrooms: rec.homeDetails?.bathrooms || 1,
          recommendationScore: rec.recommendationScore || 0
        }));
        
        setRecommendations(formattedRecs);
      } catch (error) {
        console.error('Error fetching recommendations:', error);
        setRecommendations([]);
      } finally {
        setRecommendationsLoading(false);
      }
    };

    fetchRecommendations();
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem('ee_favorites_home', JSON.stringify(favorites));
    } catch (e) {}
  }, [favorites]);

  const handleTogglePriceFilter = () => {
    if (showPriceFilter) {
      setIsClosingFilter(true);
      setTimeout(() => {
        setShowPriceFilter(false);
        setIsClosingFilter(false);
      }, 500);
    } else {
      setShowPriceFilter(true);
    }
  };

  const clearPriceFilter = () => {
    setSearchFilters(prev => ({
      ...prev,
      maxPrice: 100000
    }));
  };

  const filteredAccommodations = useMemo(() => {
    if (!featuredAccommodations || featuredAccommodations.length === 0) {
      return [];
    }
    
    let filtered = featuredAccommodations.filter(stay => {
      if (!stay) return false;
      
      // Location filter
      const matchesLocation = searchFilters.location
        ? ((stay.location || '').toLowerCase().includes(searchFilters.location.toLowerCase()) ||
           (stay.title || '').toLowerCase().includes(searchFilters.location.toLowerCase()))
        : true;
      
      // Guests filter
      const guestsNum = parseInt(searchFilters.guests, 10);
      const matchesGuests = searchFilters.guests ? (Number.isNaN(guestsNum) ? true : (stay.maxGuests || 0) >= guestsNum) : true;
      
      // Price range filter
      const matchesPrice = (() => {
        if (searchFilters.maxPrice < 100000) {
          const price = parseFloat(stay.price.replace(/[₱,]/g, '')) || 0;
          return price >= 1 && price <= searchFilters.maxPrice;
        }
        return true;
      })();
      
      return matchesLocation && matchesGuests && matchesPrice;
    });
    
    // Apply sorting
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => {
          const priceA = parseFloat(a.price.replace(/[₱,]/g, '')) || 0;
          const priceB = parseFloat(b.price.replace(/[₱,]/g, '')) || 0;
          return priceA - priceB;
        });
        break;
      case 'price-high':
        filtered.sort((a, b) => {
          const priceA = parseFloat(a.price.replace(/[₱,]/g, '')) || 0;
          const priceB = parseFloat(b.price.replace(/[₱,]/g, '')) || 0;
          return priceB - priceA;
        });
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'newest':
        filtered.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
        break;
      default: // 'featured' - keep original order
        break;
    }
    
    return filtered;
  }, [searchFilters, featuredAccommodations, sortBy]);

  const isFavorited = (id) => favorites.includes(id);
  const toggleFavorite = (id) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const shareStay = async (stay) => {
    const url = window.location.origin + '/listing/' + stay.id;
    try {
      if (navigator.share) {
        await navigator.share({ title: stay.title, text: stay.type + ' • ' + stay.location, url });
      } else {
        await navigator.clipboard.writeText(url);
        alert('Link copied to clipboard');
      }
    } catch (e) {}
  };

  const popularDestinations = [
    {
      id: 1,
      name: "Palawan",
      image: "🏝️",
      properties: "120+ stays",
      description: "Pristine islands and eco-resorts"
    },
    {
      id: 2,
      name: "Siargao",
      image: "🏄‍♂️",
      properties: "85+ stays",
      description: "Surf paradise with sustainable stays"
    },
    {
      id: 3,
      name: "Baguio",
      image: "⛰️",
      properties: "150+ stays",
      description: "Mountain retreats and cool climate"
    },
    {
      id: 4,
      name: "Cebu",
      image: "🏞️",
      properties: "200+ stays",
      description: "Beaches and mountain escapes"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section with background video */}
      <section className="relative text-white py-20 overflow-hidden">
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src="/videos/ecobg16sec.mp4"
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/30" />
        <div className="relative container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Find Eco-Friendly Stays
            </h1>
            <p className="text-xl md:text-2xl mb-8">
              Discover sustainable accommodations that care for the planet
            </p>
            
            {/* Search Bar */}
            <div className="bg-white rounded-2xl shadow-2xl">
              {/* Top Section - Search Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 p-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Location</label>
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 hover:border-teal-300 transition-all duration-300 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-200">
                    <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <input 
                      type="text" 
                      placeholder="Where?"
                      value={searchFilters.location}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, location: e.target.value }))}
                      className="flex-1 min-w-0 bg-transparent text-gray-800 placeholder-gray-500 focus:outline-none text-sm text-center"
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Dates</label>
                  <div className="bg-gray-50 rounded-xl border border-gray-200 hover:border-teal-300 transition-all duration-300 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-200">
                    <DateRangePicker
                      startDate={searchFilters.checkIn}
                      endDate={searchFilters.checkOut}
                      onChange={(start, end) => {
                        setSearchFilters(prev => ({ ...prev, checkIn: start, checkOut: end }));
                      }}
                      minDate={new Date().toISOString().split('T')[0]}
                      placeholder="Select dates"
                      className="bg-transparent px-4 py-3"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Guests</label>
                  <div className="flex items-center gap-2 px-3 py-3 bg-gray-50 rounded-xl border border-gray-200 hover:border-teal-300 transition-all duration-300 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-200">
                    <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <input 
                      type="number" 
                      min="1"
                      placeholder="Add guests"
                      value={searchFilters.guests}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, guests: e.target.value }))}
                      className="flex-1 min-w-0 bg-transparent text-gray-800 placeholder-gray-500 focus:outline-none text-sm text-center"
                    />
                    <button 
                      className="bg-teal-600 hover:bg-teal-700 text-white p-2 rounded-lg transition-all duration-300 flex items-center justify-center shadow-md hover:shadow-lg flex-shrink-0"
                      onClick={(e) => e.preventDefault()}
                      title="Search"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Middle Section - Filters, Sort, and Listings Count */}
              <div className={`border-t border-gray-200 px-4 py-3 flex items-center justify-between bg-white ${!showPriceFilter && !isClosingFilter ? 'rounded-b-2xl' : ''}`}>
                <button
                  onClick={handleTogglePriceFilter}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 delay-75 ${
                    showPriceFilter || searchFilters.maxPrice < 100000
                      ? 'bg-teal-100 text-teal-600 border border-teal-300' 
                      : 'bg-transparent text-gray-600 hover:bg-gray-100 border border-transparent'
                  }`}
                  title="Price filter"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <span className="font-medium">Filters</span>
                </button>
                <div className="flex items-center gap-2">
                  {searchFilters.maxPrice < 100000 && (
                    <button
                      onClick={clearPriceFilter}
                      className="bg-gray-400 text-white px-3 py-2 rounded-lg hover:bg-gray-500 transition-all duration-300 delay-100 text-sm"
                    >
                      Clear
                    </button>
                  )}
                  <span className="text-gray-600 text-sm transition-opacity duration-300 delay-100 whitespace-nowrap">
                    {filteredAccommodations.length} of {featuredAccommodations.length} listings
                  </span>
                </div>
              </div>
              
              {/* Bottom Section - Price Range Filter */}
              {(showPriceFilter || isClosingFilter) && (
                <div className={`border-t border-gray-200 px-4 py-4 transition-all duration-500 ease-out overflow-hidden bg-white rounded-b-2xl`} 
                  style={{ 
                    animation: isClosingFilter ? 'slideUp 0.5s ease-out forwards' : 'slideDown 0.5s ease-out forwards' 
                  }}>
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price Range</label>
                    <div className="text-sm text-gray-600">
                      ₱0 - ₱{searchFilters.maxPrice.toLocaleString('en-PH')}
                    </div>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100000"
                    step="1000"
                    value={searchFilters.maxPrice}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, maxPrice: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb transition-all duration-300"
                    style={{
                      background: `linear-gradient(to right, #14b8a6 0%, #14b8a6 ${(searchFilters.maxPrice / 100000) * 100}%, #e5e7eb ${(searchFilters.maxPrice / 100000) * 100}%, #e5e7eb 100%)`
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Accommodations - With Navigation Arrows */}
      <section className="py-16 bg-gray-50">
  <div className="container mx-auto px-4">
    <div className="flex justify-between items-center mb-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Featured Stays</h2>
        <p className="text-gray-600">Sustainable accommodations loved by travelers</p>
      </div>
      <Link to="/guest/experiences" className="text-teal-600 hover:text-teal-700 font-semibold whitespace-nowrap">
        Show all →
      </Link>
    </div>
    
    {loading ? (
      <div className="flex overflow-x-auto pb-6 gap-6 px-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden flex-shrink-0 animate-pulse border border-gray-100" style={{ minWidth: '300px', maxWidth: '300px' }}>
            <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300"></div>
            <div className="p-4 space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
              <div className="flex gap-2">
                <div className="h-6 bg-gray-200 rounded w-16"></div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="flex justify-between items-center pt-2">
                <div className="h-5 bg-gray-200 rounded w-20"></div>
                <div className="h-8 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    ) : filteredAccommodations.length === 0 ? (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🏡</div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">No listings found</h3>
        <p className="text-gray-600 mb-4">We couldn't find any listings matching your search.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button 
            onClick={() => { setSearchFilters({ location: '', checkIn: '', checkOut: '', guests: '', minPrice: 0, maxPrice: 100000 }); }}
            className="px-6 py-2 border-2 border-teal-600 text-teal-600 rounded-lg font-semibold hover:bg-teal-50 transition-colors"
          >
            Clear Filters
          </button>
          <Link 
            to="/guest/experiences"
            className="px-6 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors"
          >
            Browse Experiences
          </Link>
        </div>
      </div>
    ) : (
      <div className="relative group">
        {/* Navigation Arrows */}
        <button 
          className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-4 bg-white border border-gray-200 rounded-full p-2 shadow-lg hover:shadow-xl transition-all opacity-0 group-hover:opacity-100 z-10"
          onClick={() => document.getElementById('scrollContainer').scrollBy({ left: -300, behavior: 'smooth' })}
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <button 
          className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-4 bg-white border border-gray-200 rounded-full p-2 shadow-lg hover:shadow-xl transition-all opacity-0 group-hover:opacity-100 z-10"
          onClick={() => document.getElementById('scrollContainer').scrollBy({ left: 300, behavior: 'smooth' })}
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Scrollable Content */}
        <div 
          id="scrollContainer"
          className="flex overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-teal-300 scrollbar-track-gray-100"
        >
          <div className="flex space-x-6 px-2">
            {filteredAccommodations.map((stay, index) => (
            <div 
              key={stay.id} 
              className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group flex-shrink-0 border border-gray-100"
              style={{ 
                minWidth: '300px', 
                maxWidth: '300px'
              }}
            >
              <div className="relative h-48 overflow-hidden bg-gradient-to-br from-teal-400 to-green-500">
                {stay.image && (stay.image.startsWith('http') || stay.image.startsWith('data:') || stay.image.startsWith('/')) ? (
                  <img
                    src={stay.image}
                    alt={stay.title}
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const fallback = e.target.nextElementSibling;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div 
                  className={`w-full h-full flex items-center justify-center text-6xl ${stay.image && (stay.image.startsWith('http') || stay.image.startsWith('data:') || stay.image.startsWith('/')) ? 'hidden' : ''}`}
                  style={{ display: stay.image && (stay.image.startsWith('http') || stay.image.startsWith('data:') || stay.image.startsWith('/')) ? 'none' : 'flex' }}
                >
                  🏠
                </div>
                <button 
                  onClick={() => toggleFavorite(stay.id)} 
                  className={`absolute top-3 right-3 p-2.5 rounded-full shadow-lg transition-all duration-300 z-10 ${
                    isFavorited(stay.id) 
                      ? 'bg-red-500 text-white scale-110' 
                      : 'bg-white text-gray-600 hover:bg-gray-50 hover:scale-110'
                  }`}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill={isFavorited(stay.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={isFavorited(stay.id) ? 0 : 2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
              </div>
              <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-gray-900 text-lg group-hover:text-teal-600 transition-colors line-clamp-1">{stay.title}</h3>
                  <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-full flex-shrink-0 ml-2">
                    <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                    <span className="text-gray-900 font-semibold text-sm">{stay.rating || 'New'}</span>
                    <span className="text-gray-500 text-xs">({stay.reviews || 0})</span>
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-2 flex items-center gap-1">
                  <span className="text-teal-600 font-medium">{stay.type}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {stay.location}
                  </span>
                </p>
                <p className="text-gray-600 text-sm mb-3 flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {stay.host}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Up to {stay.maxGuests} guests
                  </span>
                </p>
                {stay.features && stay.features.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {stay.features.slice(0, 3).map((feature, index) => (
                      <span key={index} className="bg-teal-50 text-teal-700 text-xs px-2.5 py-1 rounded-full border border-teal-100 font-medium">
                        {feature}
                      </span>
                    ))}
                    {stay.features.length > 3 && (
                      <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full">
                        +{stay.features.length - 3} more
                      </span>
                    )}
                  </div>
                )}
                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                  <div>
                    <span className="font-bold text-xl text-gray-900">{stay.price}</span>
                    <span className="text-gray-600 text-sm"> / night</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => shareStay(stay)} 
                      title="Share" 
                      className="p-2.5 border-2 border-gray-200 rounded-lg text-gray-600 hover:border-teal-500 hover:text-teal-600 hover:bg-teal-50 transition-all duration-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342c0 .479.185.958.684 1.316.6.367 1.5.684 2.684.684.479 0 1.05.019 1.632.082 1.316.123 2.632.518 3.684.868v-2.211c-1.5-.684-3.158-.868-4.632-.632-1.158.184-2.316.553-3.316.947-.6.316-1.053.789-1.316 1.158zM8.684 13.342c-.6-.684-1.5-1.026-2.684-1.026-.479 0-1.05.019-1.632.082-1.316.123-2.632.518-3.684.868v-2.211c1.5-.684 3.158-.868 4.632-.632 1.158.184 2.316.553 3.316.947.6.316 1.053.789 1.316 1.158zM8.684 8.658c-.6-.684-1.5-1.026-2.684-1.026-.479 0-1.05.019-1.632.082-1.316.123-2.632.518-3.684.868v-2.211c1.5-.684 3.158-.868 4.632-.632 1.158.184 2.316.553 3.316.947.6.316 1.053.789 1.316 1.158z" />
                      </svg>
                    </button>
                    <Link 
                      to={`/listing/${stay.id}`} 
                      className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:from-teal-700 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 inline-block text-center"
                    >
                      Reserve
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
          </div>
        </div>
      </div>
    )}
  </div>
      </section>

      {/* Recommended for You Section - Only show if user is logged in */}
      {currentUser && (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <h2 className="text-2xl font-bold text-gray-900">Recommended for You</h2>
                </div>
                <p className="text-gray-600">Based on your booking history and preferences</p>
              </div>
            </div>
            
            {recommendationsLoading ? (
              <div className="flex overflow-x-auto pb-6 gap-6 px-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden flex-shrink-0 animate-pulse" style={{ minWidth: '300px', maxWidth: '300px' }}>
                    <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300"></div>
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                      <div className="flex gap-2">
                        <div className="h-6 bg-gray-200 rounded w-16"></div>
                        <div className="h-6 bg-gray-200 rounded w-16"></div>
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <div className="h-5 bg-gray-200 rounded w-20"></div>
                        <div className="h-8 bg-gray-200 rounded w-24"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recommendations.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <div className="text-5xl mb-4">🎯</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No recommendations yet</h3>
                <p className="text-gray-600 mb-4">Book some stays to get personalized recommendations!</p>
                <Link 
                  to="/guest/experiences"
                  className="inline-block px-6 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors"
                >
                  Browse Listings
                </Link>
              </div>
            ) : (
              <div className="relative group">
                <div 
                  id="recommendationsScrollContainer"
                  className="flex overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-teal-300 scrollbar-track-gray-100"
                >
                  <div className="flex space-x-6 px-2">
                    {recommendations.map((stay, index) => (
                      <div 
                        key={stay.id} 
                        className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group flex-shrink-0 transform hover:-translate-y-2 border-2 border-teal-200"
                        style={{ 
                          minWidth: '300px', 
                          maxWidth: '300px',
                          animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`
                        }}
                      >
                        <div className="relative h-48 overflow-hidden bg-gradient-to-br from-teal-400 to-green-500">
                          <div className="absolute top-3 left-3 bg-teal-600 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 z-10">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                            </svg>
                            Recommended
                          </div>
                          {stay.image && (stay.image.startsWith('http') || stay.image.startsWith('data:') || stay.image.startsWith('/')) ? (
                            <img
                              src={stay.image}
                              alt={stay.title}
                              className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                const fallback = e.target.nextElementSibling;
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div 
                            className={`w-full h-full flex items-center justify-center text-6xl ${stay.image && (stay.image.startsWith('http') || stay.image.startsWith('data:') || stay.image.startsWith('/')) ? 'hidden' : ''}`}
                            style={{ display: stay.image && (stay.image.startsWith('http') || stay.image.startsWith('data:') || stay.image.startsWith('/')) ? 'none' : 'flex' }}
                          >
                            🏠
                          </div>
                          <button 
                            onClick={() => toggleFavorite(stay.id)} 
                            className={`absolute top-3 right-3 p-2.5 rounded-full shadow-lg transition-all duration-300 z-10 ${
                              isFavorited(stay.id) 
                                ? 'bg-red-500 text-white scale-110' 
                                : 'bg-white text-gray-600 hover:bg-gray-50 hover:scale-110'
                            }`}
                          >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill={isFavorited(stay.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={isFavorited(stay.id) ? 0 : 2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                          </button>
                        </div>
                        <div className="p-5">
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="font-bold text-gray-900 text-lg group-hover:text-teal-600 transition-colors line-clamp-1">{stay.title}</h3>
                            <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-full flex-shrink-0 ml-2">
                              <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                              </svg>
                              <span className="text-gray-900 font-semibold text-sm">{stay.rating || 'New'}</span>
                              <span className="text-gray-500 text-xs">({stay.reviews || 0})</span>
                            </div>
                          </div>
                          <p className="text-gray-600 text-sm mb-2 flex items-center gap-1">
                            <span className="text-teal-600 font-medium">{stay.type}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {stay.location}
                            </span>
                          </p>
                          <p className="text-gray-600 text-sm mb-3 flex items-center gap-2">
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              {stay.host}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              Up to {stay.maxGuests} guests
                            </span>
                          </p>
                          {stay.features && stay.features.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-4">
                              {stay.features.slice(0, 3).map((feature, index) => (
                                <span key={index} className="bg-teal-50 text-teal-700 text-xs px-2.5 py-1 rounded-full border border-teal-100 font-medium">
                                  {feature}
                                </span>
                              ))}
                              {stay.features.length > 3 && (
                                <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full">
                                  +{stay.features.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                          <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                            <div>
                              <span className="font-bold text-xl text-gray-900">{stay.price}</span>
                              <span className="text-gray-600 text-sm"> / night</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => shareStay(stay)} 
                                title="Share" 
                                className="p-2.5 border-2 border-gray-200 rounded-lg text-gray-600 hover:border-teal-500 hover:text-teal-600 hover:bg-teal-50 transition-all duration-200"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342c0 .479.185.958.684 1.316.6.367 1.5.684 2.684.684.479 0 1.05.019 1.632.082 1.316.123 2.632.518 3.684.868v-2.211c-1.5-.684-3.158-.868-4.632-.632-1.158.184-2.316.553-3.316.947-.6.316-1.053.789-1.316 1.158zM8.684 13.342c-.6-.684-1.5-1.026-2.684-1.026-.479 0-1.05.019-1.632.082-1.316.123-2.632.518-3.684.868v-2.211c1.5-.684 3.158-.868 4.632-.632 1.158.184 2.316.553 3.316.947.6.316 1.053.789 1.316 1.158zM8.684 8.658c-.6-.684-1.5-1.026-2.684-1.026-.479 0-1.05.019-1.632.082-1.316.123-2.632.518-3.684.868v-2.211c1.5-.684 3.158-.868 4.632-.632 1.158.184 2.316.553 3.316.947.6.316 1.053.789 1.316 1.158z" />
                                </svg>
                              </button>
                              <Link 
                                to={`/listing/${stay.id}`} 
                                className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:from-teal-700 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 inline-block text-center"
                              >
                                Reserve
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Popular Destinations */}
      {/* <section className="py-16 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Popular Destinations</h2>
            <p className="text-gray-600">Discover eco-friendly stays in these amazing locations</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {popularDestinations.map((destination, index) => (
              <div 
                key={destination.id} 
                className="group cursor-pointer transform hover:-translate-y-2 transition-all duration-300"
                style={{ animation: `fadeInUp 0.6s ease-out ${index * 0.15}s both` }}
              >
                <div className="relative h-64 bg-gradient-to-br from-teal-400 via-emerald-500 to-green-600 rounded-2xl overflow-hidden mb-4 shadow-lg group-hover:shadow-2xl transition-all duration-300">
                  <div className="flex items-center justify-center h-full text-7xl transform group-hover:scale-110 transition-transform duration-300">
                    {destination.image}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 opacity-0 group-hover:opacity-100">
                    <p className="text-white text-sm font-medium">{destination.description}</p>
                  </div>
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-1 group-hover:text-teal-600 transition-colors">{destination.name}</h3>
                <p className="text-teal-600 text-sm font-semibold mb-1">{destination.properties}</p>
                <p className="text-gray-500 text-sm">{destination.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section> */}

      {/* Host Benefits Section */}
      {/* <section className="py-16 bg-teal-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Become an Eco-Host</h2>
            <p className="text-xl text-gray-600 mb-8">
              Share your sustainable space and join our community of eco-conscious hosts
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-teal-100 rounded-2xl flex items-center justify-center text-xl text-teal-600 mx-auto mb-4">
                  💰
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Earn Income</h3>
                <p className="text-gray-600">Generate revenue from your eco-friendly property</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-teal-100 rounded-2xl flex items-center justify-center text-xl text-teal-600 mx-auto mb-4">
                  🌍
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Make Impact</h3>
                <p className="text-gray-600">Promote sustainable tourism practices</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-teal-100 rounded-2xl flex items-center justify-center text-xl text-teal-600 mx-auto mb-4">
                  👥
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Join Community</h3>
                <p className="text-gray-600">Connect with like-minded travelers and hosts</p>
              </div>
            </div>
            <button className="bg-teal-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors">
              Start Hosting
            </button>
          </div>
        </div>
      </section> */}

      </div>
    
  );
}

export default GuestHomePage;
