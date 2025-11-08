import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../Firebase';
import bamboohouse from '../../assets/bamboohouse2.jpg';
import makatieco from '../../assets/hotelroom.jpg';
import treehouse from '../../assets/treehouse3.jpg';
import treehouse2 from '../../assets/beachhouse1.jpg';

function PublicHomePage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timeoutRef = useRef(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState(() => {
    try {
      const raw = localStorage.getItem('ee_public_favorites_home');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });
  
  // Search filters
  const [searchFilters, setSearchFilters] = useState({
    location: '',
    checkIn: '',
    checkOut: '',
    guests: '',
    maxPrice: 100000
  });
  const [showPriceFilter, setShowPriceFilter] = useState(false);

  // Redirect authenticated users to guest home page immediately
  useEffect(() => {
    if (currentUser) {
      // Use replace: true to prevent back button issues and immediate redirect
      navigate('/guest/homes', { replace: true });
    }
  }, [currentUser, navigate]);
  
  // Don't render content if authenticated user (prevent flash)
  // This check happens after all hooks are called
  if (currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  // Fetch real-time listings from Firestore
  useEffect(() => {
    const q = query(
      collection(db, 'listings'),
      where('propertyType', '==', 'home')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('📊 Raw home listings snapshot:', snapshot.size, 'documents');
      
      const allListings = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('📄 Listing document:', doc.id, {
          propertyType: data.propertyType,
          status: data.status,
          hasHomeDetails: !!data.homeDetails
        });
        
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt?.seconds * 1000 || 0);
        return {
          id: doc.id,
          title: data.homeDetails?.title || data.title || 'Untitled',
          type: data.homeDetails?.propertyType || 'Entire Place',
          price: `₱${parseFloat(data.pricing?.basePrice || 0).toLocaleString('en-PH')}`,
          rating: data.rating || 0,
          reviews: data.reviewCount || 0,
          image: (typeof data.photos?.[0] === 'string' ? data.photos[0] : data.photos?.[0]?.url) || null,
          location: `${data.location?.city || ''}, ${data.location?.state || ''}`.trim() || 'Location not specified',
          features: data.homeDetails?.amenities || [],
          host: data.hostName || 'Host',
          maxGuests: data.homeDetails?.maxGuests || 2,
          status: data.status || 'draft',
          createdAt
        };
      });
      
      // Filter for published listings (client-side filtering)
      const publishedListings = allListings.filter(l => l.status === 'published');
      
      console.log('✅ Total home listings:', allListings.length);
      console.log('✅ Published listings:', publishedListings.length);
      
      // Show published listings, or all if none published
      const listingsToShow = publishedListings.length > 0 ? publishedListings : allListings;
      
      const sortedListings = listingsToShow.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
      
      setListings(sortedListings);
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

  useEffect(() => {
    try {
      localStorage.setItem('ee_public_favorites_home', JSON.stringify(favorites));
    } catch (e) {}
  }, [favorites]);

  // Create hero slides from listings (fallback to static images if no listings)
  const heroSlides = useMemo(() => {
    if (listings.length > 0) {
      // Use top 4 listings with images, or mix with static images
      const listingSlides = listings
        .filter(listing => listing.image && (listing.image.startsWith('http') || listing.image.startsWith('data:') || listing.image.startsWith('/')))
        .slice(0, 4)
        .map(listing => ({
          src: listing.image,
          title: listing.title,
          description: `${listing.location} • ${listing.type}`,
          price: listing.price,
          rating: listing.rating,
          id: listing.id,
          isListing: true
        }));
      
      // If we have less than 4 listings, add static images as fallback
      const staticImages = [
        {
          src: bamboohouse,
          title: "Eco Bamboo House",
          description: "Sustainable living in harmony with nature",
          isListing: false
        },
        {
          src: makatieco,
          title: "Urban Eco Loft",
          description: "Modern sustainable living in the city",
          isListing: false
        },
        {
          src: treehouse,
          title: "Treehouse Retreat",
          description: "Elevated experiences in the forest canopy",
          isListing: false
        },
        {
          src: treehouse2,
          title: "Beach Eco Pod",
          description: "Minimalist coastal sustainable stays",
          isListing: false
        }
      ];
      
      return listingSlides.length >= 2 
        ? listingSlides 
        : [...listingSlides, ...staticImages.slice(0, 4 - listingSlides.length)];
    }
    
    // Fallback to static images if no listings
    return [
      {
        src: bamboohouse,
        title: "Eco Bamboo House",
        description: "Sustainable living in harmony with nature",
        isListing: false
      },
      {
        src: makatieco,
        title: "Urban Eco Loft",
        description: "Modern sustainable living in the city",
        isListing: false
      },
      {
        src: treehouse,
        title: "Treehouse Retreat",
        description: "Elevated experiences in the forest canopy",
        isListing: false
      },
      {
        src: treehouse2,
        title: "Beach Eco Pod",
        description: "Minimalist coastal sustainable stays",
        isListing: false
      }
    ];
  }, [listings]);

  // Auto-rotate images with smooth transitions
  useEffect(() => {
    if (heroSlides.length === 0) return;
    
    const rotateImages = () => {
      setIsTransitioning(true);
      
      // Wait for fade-out to complete before changing image
      timeoutRef.current = setTimeout(() => {
        setCurrentImageIndex((prevIndex) => 
          prevIndex === heroSlides.length - 1 ? 0 : prevIndex + 1
        );
        
        // Wait a bit before starting fade-in
        setTimeout(() => {
          setIsTransitioning(false);
        }, 50);
      }, 600); // Faster fade-out for smoother transition
    };

    const interval = setInterval(rotateImages, 6000); // Change every 6 seconds (longer display time)

    return () => {
      clearInterval(interval);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [heroSlides.length]);

  const isFavorited = (id) => favorites.includes(id);
  const toggleFavorite = (id) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Use real listings from Firestore
  const featuredAccommodations = useMemo(() => {
    let filtered = [...listings];
    
    // Apply filters
    if (searchFilters.location) {
      const locationLower = searchFilters.location.toLowerCase();
      filtered = filtered.filter(l => 
        l.location.toLowerCase().includes(locationLower) ||
        l.title.toLowerCase().includes(locationLower)
      );
    }
    if (searchFilters.guests) {
      const guestsNum = parseInt(searchFilters.guests) || 0;
      filtered = filtered.filter(l => (l.maxGuests || 0) >= guestsNum);
    }
    // Price range filter
    if (searchFilters.maxPrice < 100000) {
      filtered = filtered.filter(l => {
        const price = parseFloat(l.price.replace(/[₱,]/g, '')) || 0;
        return price >= 1 && price <= searchFilters.maxPrice;
      });
    }
    
    return filtered;
  }, [listings, searchFilters]);

  // Mock data for fallback (only if no listings exist)
  const mockAccommodations = [
    {
      id: 1,
      title: "Eco Bamboo House",
      type: "Entire Villa",
      price: "₱3,500",
      rating: 4.9,
      reviews: 128,
      image: bamboohouse,
      location: "El Nido, Palawan",
      features: ["Beachfront", "Solar Power", "Organic Garden"],
      host: "Maria Santos"
    },
    {
      id: 2,
      title: "Treehouse Retreat",
      type: "Entire Treehouse",
      price: "₱2,800",
      rating: 4.8,
      reviews: 94,
      image: treehouse,
      location: "Batangas",
      features: ["Forest View", "Eco-Friendly", "Yoga Deck"],
      host: "Juan Dela Cruz"
    },
    {
      id: 3,
      title: "Urban Eco Loft",
      type: "Entire Apartment",
      price: "₱1,900",
      rating: 4.7,
      reviews: 156,
      image: makatieco,
      location: "Makati, Manila",
      features: ["City Center", "Recycling", "Green Roof"],
      host: "Anna Reyes"
    },
    {
      id: 4,
      title: "Beach Eco Pod",
      type: "Tiny House",
      price: "₱2,200",
      rating: 4.6,
      reviews: 67,
      image: treehouse2,
      location: "La Union",
      features: ["Ocean View", "Compost Toilet", "Beach Access"],
      host: "Carlos Garcia"
    }
  ];

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

  const accommodationTypes = [
    {
      id: 1,
      name: "Eco Villas",
      icon: "🏡",
      description: "Private sustainable villas"
    },
    {
      id: 2,
      name: "Treehouses",
      icon: "🌳",
      description: "Unique elevated stays"
    },
    {
      id: 3,
      name: "Tiny Homes",
      icon: "📦",
      description: "Minimalist eco-living"
    },
    {
      id: 4,
      name: "Farm Stays",
      icon: "🚜",
      description: "Agricultural experiences"
    },
    {
      id: 5,
      name: "Beach Huts",
      icon: "🏖️",
      description: "Coastal eco-accommodations"
    },
    {
      id: 6,
      name: "Urban Eco",
      icon: "🏢",
      description: "City sustainable stays"
    }
  ];

  return (
    <div className="min-h-screen animate-multi-layer">
      {/* Hero Section with Enhanced Slideshow */}
      <section className="relative text-white py-20 min-h-[85vh] flex items-center justify-center overflow-hidden">
        
        {/* Enhanced Animated Image Background with Ken Burns Effect */}
        <div className="absolute inset-0">
          {heroSlides.map((slide, index) => (
            <div
              key={slide.id || index}
              className={`absolute inset-0 transition-all duration-[1200ms] ease-in-out ${
                index === currentImageIndex
                  ? isTransitioning
                    ? 'opacity-0 scale-110 blur-sm'
                    : 'opacity-100 scale-100 blur-0'
                  : 'opacity-0 scale-110 blur-sm'
              }`}
              style={{
                backgroundImage: `url(${slide.src})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                transition: 'opacity 1200ms cubic-bezier(0.4, 0, 0.2, 1), transform 1200ms cubic-bezier(0.4, 0, 0.2, 1), filter 1200ms ease-in-out',
                animation: index === currentImageIndex && !isTransitioning ? 'kenBurns 20s ease-in-out infinite' : 'none'
              }}
            >
              {/* Ken Burns effect overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/30"></div>
            </div>
          ))}
          
          {/* Enhanced gradient overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/25 pointer-events-none"></div>
          
          {/* Animated gradient overlay for depth */}
          <div 
            className="absolute inset-0 bg-gradient-to-r from-teal-600/15 via-emerald-500/8 to-green-600/15 pointer-events-none"
            style={{
              animation: 'pulse 8s ease-in-out infinite'
            }}
          ></div>
        </div>

        {/* Enhanced Image Navigation Dots */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 flex space-x-3">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setIsTransitioning(true);
                setTimeout(() => {
                  setCurrentImageIndex(index);
                  setTimeout(() => setIsTransitioning(false), 50);
                }, 600);
              }}
              className={`transition-all duration-300 rounded-full ${
                index === currentImageIndex
                  ? 'bg-white w-10 h-3 scale-110 shadow-lg'
                  : 'bg-white/50 hover:bg-white/80 w-3 h-3 hover:scale-125'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 relative z-10 text-center">
          <div className="max-w-4xl mx-auto">
            {/* Enhanced Image Title with Listing Info */}
            {heroSlides.length > 0 && (
              <div className={`mb-8 transition-all duration-700 transform ${!isTransitioning ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                <h2 className="text-3xl md:text-4xl font-bold mb-3 text-white drop-shadow-lg">
                  {heroSlides[currentImageIndex]?.title || 'Discover Eco-Friendly Stays'}
                </h2>
                <div className="flex flex-wrap items-center justify-center gap-4 text-white/90">
                  <p className="text-lg md:text-xl font-medium">
                    {heroSlides[currentImageIndex]?.description || 'Sustainable accommodations'}
                  </p>
                  {heroSlides[currentImageIndex]?.isListing && (
                  <>
                    {heroSlides[currentImageIndex]?.rating > 0 && (
                      <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                        <svg className="w-4 h-4 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                        </svg>
                        <span className="font-semibold">{heroSlides[currentImageIndex]?.rating}</span>
                      </div>
                    )}
                    {heroSlides[currentImageIndex]?.price && (
                      <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                        <span className="font-bold text-lg">{heroSlides[currentImageIndex]?.price}</span>
                      </div>
                    )}
                    {heroSlides[currentImageIndex]?.id && (
                      <Link 
                        to={`/listing/${heroSlides[currentImageIndex]?.id}`}
                        className="bg-white text-teal-600 px-5 py-2 rounded-full font-semibold hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-lg"
                      >
                        View Details →
                      </Link>
                    )}
                  </>
                  )}
                </div>
              </div>
            )}

            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              {currentUser ? `Welcome back to EcoExpress!` : `Discover Sustainable Living`}
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto">
              {currentUser 
                ? `Ready to book your next eco-friendly experience?` 
                : `Connect with eco-friendly experiences and services that make a difference for our planet.`
              }
            </p>
            
            {/* Search Bar */}
            <div className="max-w-4xl mx-auto transform transition-all duration-500">
              <div className="bg-white rounded-2xl shadow-2xl">
                {/* Top Section - Search Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2 p-4">
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <input 
                      type="text" 
                      placeholder="Where to?"
                      value={searchFilters.location}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, location: e.target.value }))}
                      className="flex-1 bg-transparent text-gray-800 placeholder-gray-500 focus:outline-none text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <input 
                      type="date" 
                      placeholder="Check-in"
                      value={searchFilters.checkIn}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, checkIn: e.target.value }))}
                      className="flex-1 bg-transparent text-gray-800 placeholder-gray-500 focus:outline-none text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <input 
                      type="date" 
                      placeholder="Check-out"
                      value={searchFilters.checkOut}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, checkOut: e.target.value }))}
                      className="flex-1 bg-transparent text-gray-800 placeholder-gray-500 focus:outline-none text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <input 
                      type="number" 
                      min="1"
                      placeholder="Guests"
                      value={searchFilters.guests}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, guests: e.target.value }))}
                      className="flex-1 bg-transparent text-gray-800 placeholder-gray-500 focus:outline-none text-sm"
                    />
                  </div>
                  <button 
                    className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 font-semibold shadow-lg hover:shadow-xl"
                    onClick={(e) => e.preventDefault()}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search
                  </button>
                </div>
                
                {/* Middle Section - Filters and Listings Count */}
                <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
                  <button
                    onClick={() => setShowPriceFilter(!showPriceFilter)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                      showPriceFilter || searchFilters.maxPrice < 100000 
                        ? 'bg-teal-100 text-teal-600' 
                        : 'bg-transparent text-gray-600 hover:bg-gray-100'
                    }`}
                    title="Price filter"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <span className="font-medium">Filters</span>
                  </button>
                  <span className="text-gray-600 text-sm">
                    {featuredAccommodations.length} of {listings.length} listings
                  </span>
                </div>
                
                {/* Bottom Section - Price Range Slider - Only show when filter icon is clicked */}
                {showPriceFilter && (
                  <div className="border-t border-gray-200 px-4 py-4">
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
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
                      style={{
                        background: `linear-gradient(to right, #14b8a6 0%, #14b8a6 ${(searchFilters.maxPrice / 100000) * 100}%, #e5e7eb ${(searchFilters.maxPrice / 100000) * 100}%, #e5e7eb 100%)`
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Accommodation Types Section
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            Types of Eco-Stays
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {accommodationTypes.map((type) => (
              <div 
                key={type.id} 
                className="text-center group cursor-pointer transition-all duration-500 transform hover:scale-105 hover:-translate-y-2"
              >
                <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3 group-hover:bg-teal-200 transition-all duration-300 group-hover:shadow-lg">
                  {type.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-teal-600 transition-colors duration-300">
                  {type.name}
                </h3>
                <p className="text-sm text-gray-600 group-hover:text-gray-700 transition-colors duration-300">
                  {type.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section> */}

      {/* Featured Accommodations */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Featured Eco-Stays</h2>
              <p className="text-gray-600">Sustainable accommodations loved by travelers</p>
            </div>
            <Link 
              to="/experiences" 
              className="text-teal-600 hover:text-teal-700 font-semibold whitespace-nowrap transition-all duration-300 transform hover:translate-x-1"
            >
              Show all →
            </Link>
          </div>
          
          <div className="relative group">
            <button 
              className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-4 bg-white border border-gray-200 rounded-full p-2 shadow-lg hover:shadow-xl transition-all duration-300 opacity-0 group-hover:opacity-100 z-10 hover:scale-110"
              onClick={() => document.getElementById('scrollContainer').scrollBy({ left: -300, behavior: 'smooth' })}
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <button 
              className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-4 bg-white border border-gray-200 rounded-full p-2 shadow-lg hover:shadow-xl transition-all duration-300 opacity-0 group-hover:opacity-100 z-10 hover:scale-110"
              onClick={() => document.getElementById('scrollContainer').scrollBy({ left: 300, behavior: 'smooth' })}
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <div 
              id="scrollContainer"
              className="flex overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-teal-300 scrollbar-track-gray-100"
            >
              {loading ? (
                <div className="flex gap-6 px-2 w-full">
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
              ) : featuredAccommodations.length === 0 ? (
                <div className="text-center py-16 w-full">
                  <div className="text-6xl mb-4">🏡</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">No listings available</h3>
                  <p className="text-gray-600 mb-4">There are no published home listings at the moment.</p>
                  <Link 
                    to="/experiences"
                    className="inline-block px-6 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors"
                  >
                    Browse Experiences
                  </Link>
                </div>
              ) : (
                <div className="flex space-x-6 px-2">
                  {featuredAccommodations.map((stay, index) => (
                  <div 
                    key={stay.id} 
                    className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden group flex-shrink-0 transform hover:-translate-y-2"
                    style={{ 
                      minWidth: '300px', 
                      maxWidth: '300px',
                      animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`
                    }}
                  >
                    <div className="relative h-48 overflow-hidden bg-gradient-to-br from-teal-400 to-green-500">
                      {stay.image && (stay.image.startsWith('http') || stay.image.startsWith('data:') || stay.image.startsWith('/')) ? (
                        <img
                          src={stay.image}
                          alt={stay.title}
                          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-6xl">
                          🏠
                        </div>
                      )}
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
                          Up to {stay.maxGuests || 2} guests
                        </span>
                      </p>
                      {stay.features && stay.features.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {stay.features.slice(0, 3).map((feature, idx) => (
                            <span key={idx} className="bg-teal-50 text-teal-700 text-xs px-2.5 py-1 rounded-full border border-teal-100 font-medium">
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
                        <Link 
                          to={`/listing/${stay.id}`} 
                          className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:from-teal-700 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 inline-block text-center"
                        >
                          Reserve
                        </Link>
                      </div>
                    </div>
                  </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Rest of the sections remain the same with added transitions */}
      {/* Popular Destinations */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Popular Destinations</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {popularDestinations.map((destination) => (
              <div 
                key={destination.id} 
                className="group cursor-pointer transition-all duration-500 transform hover:scale-105"
              >
                <div className="relative h-64 bg-gradient-to-br from-teal-400 to-green-500 rounded-2xl overflow-hidden mb-3 group-hover:shadow-xl transition-all duration-500">
                  <div className="flex items-center justify-center h-full text-6xl transform group-hover:scale-110 transition-transform duration-500">
                    {destination.image}
                  </div>
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300"></div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-teal-600 transition-colors duration-300">
                  {destination.name}
                </h3>
                <p className="text-gray-600 text-sm mb-1">{destination.properties}</p>
                <p className="text-gray-500 text-sm">{destination.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Host Benefits Section */}
      <section className="py-16 bg-teal-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Become an Eco-Host</h2>
            <p className="text-xl text-gray-600 mb-8">
              Share your sustainable space and join our community of eco-conscious hosts
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              {[
                { icon: "💰", title: "Earn Income", description: "Generate revenue from your eco-friendly property" },
                { icon: "🌍", title: "Make Impact", description: "Promote sustainable tourism practices" },
                { icon: "👥", title: "Join Community", description: "Connect with like-minded travelers and hosts" }
              ].map((benefit, index) => (
                <div 
                  key={index} 
                  className="text-center transition-all duration-500 transform hover:scale-105"
                >
                  <div className="w-12 h-12 bg-teal-100 rounded-2xl flex items-center justify-center text-xl text-teal-600 mx-auto mb-4 transition-all duration-300 hover:bg-teal-200 hover:shadow-lg">
                    {benefit.icon}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                  <p className="text-gray-600">{benefit.description}</p>
                </div>
              ))}
            </div>
            <button className="bg-teal-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-all duration-300 transform hover:scale-105 hover:shadow-lg">
              Start Hosting
            </button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-teal-600 to-emerald-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready for Your Eco-Getaway?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Book your sustainable stay today and travel responsibly
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/signup" 
              className="bg-white text-teal-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
            >
              Sign Up to Book
            </Link>
            <Link 
              to="/experiences" 
              className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-teal-600 transition-all duration-300 transform hover:scale-105"
            >
              Explore Stays
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default PublicHomePage;
