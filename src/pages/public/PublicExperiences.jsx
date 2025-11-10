import { useEffect, useState, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../Firebase';

function PublicExperiences() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef(null);

  // Redirect authenticated users to guest experiences page
  useEffect(() => {
    if (currentUser) {
      navigate('/guest/experiences', { replace: true });
    }
  }, [currentUser, navigate]);

  const [allExperiences, setAllExperiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPriceFilter, setShowPriceFilter] = useState(false);
  const [isClosingFilter, setIsClosingFilter] = useState(false);
  const [sortBy, setSortBy] = useState('featured');
  
  // Search filters
  const [searchFilters, setSearchFilters] = useState({
    category: '',
    location: '',
    date: '',
    participants: '',
    maxPrice: 100000
  });
  const [favorites, setFavorites] = useState(() => {
    try {
      const raw = localStorage.getItem('ee_favorites_experiences');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  // Fetch real-time experiences from Firestore
  useEffect(() => {
    // Remove status filter from query to avoid index requirement - filter client-side
    const q = query(
      collection(db, 'listings'),
      where('propertyType', '==', 'experience')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('📊 Raw experiences snapshot:', snapshot.size, 'documents');
      
      const allExperiences = snapshot.docs.map(doc => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt?.seconds * 1000 || 0);
        return {
          id: doc.id,
          title: data.experienceDetails?.title || data.title || 'Untitled Experience',
          category: data.experienceDetails?.category || 'Adventure',
          price: `₱${parseFloat(data.pricing?.basePrice || 0).toLocaleString('en-PH')}`,
          rating: data.rating || 0,
          reviews: data.reviewCount || 0,
          image: (typeof data.photos?.[0] === 'string' ? data.photos[0] : data.photos?.[0]?.url) || null,
          location: `${data.location?.city || ''}, ${data.location?.state || ''}`.trim() || 'Location not specified',
          duration: data.experienceDetails?.duration ? `${data.experienceDetails.duration} hours` : 'Flexible',
          description: data.experienceDetails?.description || data.description || 'Experience description not available.',
          host: data.hostName || 'Host',
          groupSize: data.experienceDetails?.groupSize || 10,
          features: data.experienceDetails?.features || data.experienceDetails?.highlights || [],
          status: data.status || 'draft',
          createdAt
        };
      });
      
      // Filter for published experiences (client-side filtering)
      const publishedExperiences = allExperiences.filter(e => e.status === 'published');
      
      console.log('✅ Total experiences:', allExperiences.length);
      console.log('✅ Published experiences:', publishedExperiences.length);
      
      // Show published experiences, or all if none published
      const experiencesToShow = publishedExperiences.length > 0 ? publishedExperiences : allExperiences;
      
      // Sort client-side by createdAt (newest first)
      const sortedExperiences = experiencesToShow.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
      
      console.log('✅ Loaded', sortedExperiences.length, 'experience listings (public)');
      setAllExperiences(sortedExperiences);
      setLoading(false);
    }, (error) => {
      console.error('❌ Error fetching experiences:', error);
      console.error('Error details:', error.code, error.message);
      if (error.code === 'failed-precondition') {
        console.error('⚠️ Firestore index required. Please create a composite index in Firebase Console.');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Mock experiences for reference (fallback removed)
  const mockExperiences = [
    {
      id: 1,
      title: "Eco Farm Tour & Harvesting",
      category: "Agriculture",
      price: "₱1,500",
      rating: 4.8,
      reviews: 124,
      image: "🌱",
      location: "Laguna",
      duration: "4 hours",
      description: "Experience organic farming and harvest fresh produce from our sustainable farm.",
      features: ["Hands-on Farming", "Organic Produce", "Farm-to-Table", "Educational"],
      host: "Green Farms Co."
    },
    {
      id: 2,
      title: "Beach Cleanup & Marine Conservation",
      category: "Conservation",
      price: "₱800",
      rating: 4.9,
      reviews: 89,
      image: "🏖️",
      location: "Batangas",
      duration: "3 hours",
      description: "Join our coastal cleanup and learn about marine ecosystem preservation.",
      features: ["Beach Cleanup", "Marine Education", "Community Service", "Eco-Certified"],
      host: "Ocean Guardians PH"
    },
    {
      id: 3,
      title: "Organic Cooking Masterclass",
      category: "Culinary",
      price: "₱2,000",
      rating: 4.7,
      reviews: 67,
      image: "👨‍🍳",
      location: "Manila",
      duration: "2.5 hours",
      description: "Learn to cook delicious meals using organic ingredients from local farms.",
      features: ["Chef-Led", "Organic Ingredients", "Hands-on Cooking", "Recipe Book"],
      host: "Chef Maria Santos"
    },
    {
      id: 4,
      title: "Forest Trek & Wildlife Spotting",
      category: "Adventure",
      price: "₱1,200",
      rating: 4.6,
      reviews: 156,
      image: "🌲",
      location: "Rizal",
      duration: "5 hours",
      description: "Guided trek through protected forests with wildlife education.",
      features: ["Expert Guide", "Wildlife Spotting", "Photography", "Conservation Focus"],
      host: "Nature Trek Adventures"
    },
    {
      id: 5,
      title: "Sustainable Living Workshop",
      category: "Education",
      price: "₱1,800",
      rating: 4.9,
      reviews: 45,
      image: "📚",
      location: "Quezon City",
      duration: "3 hours",
      description: "Hands-on workshop on zero-waste living and sustainable practices.",
      features: ["Zero-Waste", "DIY Projects", "Expert Tips", "Take-home Kit"],
      host: "Eco Living Institute"
    },
    {
      id: 6,
      title: "River Kayaking & Cleanup",
      category: "Adventure",
      price: "₱1,500",
      rating: 4.7,
      reviews: 78,
      image: "🛶",
      location: "Pampanga",
      duration: "4 hours",
      description: "Combine adventure with environmental conservation on our river kayaking tour.",
      features: ["Kayaking", "River Cleanup", "Safety Gear", "Eco-Education"],
      host: "River Eco Tours"
    }
  ];

  useEffect(() => {
    try {
      localStorage.setItem('ee_favorites_experiences', JSON.stringify(favorites));
    } catch (e) {}
  }, [favorites]);

  const handleToggleFilter = () => {
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

  const handleSearchChange = (field, value) => {
    setSearchFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearFilters = () => {
    setSearchFilters({
      category: '',
      location: '',
      date: '',
      participants: '',
      maxPrice: 100000
    });
  };

  // Filter and sort experiences based on search criteria
  const experiences = useMemo(() => {
    let filtered = [...allExperiences];
    
    // Apply filters
    if (searchFilters.category) {
      filtered = filtered.filter(e => e.category === searchFilters.category);
    }
    if (searchFilters.location) {
      const locationLower = searchFilters.location.toLowerCase();
      filtered = filtered.filter(e => 
        e.location.toLowerCase().includes(locationLower)
      );
    }
    if (searchFilters.participants) {
      const participants = parseInt(searchFilters.participants) || 0;
      filtered = filtered.filter(e => e.groupSize >= participants);
    }
    // Price range filter
    if (searchFilters.maxPrice < 100000) {
      filtered = filtered.filter(e => {
        const price = parseFloat(e.price.replace(/[₱,]/g, '')) || 0;
        return price >= 1 && price <= searchFilters.maxPrice;
      });
    }
    
    // Apply sorting
    switch (sortBy) {
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
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
      default:
        // Featured/default: sort by createdAt (newest first)
        filtered.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
    }
    
    return filtered;
  }, [allExperiences, searchFilters, sortBy]);

  // Video error handler
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const handleError = () => {
        console.error('Experience video failed to load');
        setVideoError(true);
      };
      video.addEventListener('error', handleError);
      return () => video.removeEventListener('error', handleError);
    }
  }, []);

  const isFavorited = (id) => favorites.includes(id);
  const toggleFavorite = (id) => setFavorites(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const shareItem = async (item) => {
    const url = window.location.origin + '/experience/' + item.id;
    try {
      if (navigator.share) {
        await navigator.share({ title: item.title, text: item.category + ' • ' + item.location, url });
      } else {
        await navigator.clipboard.writeText(url);
        alert('Link copied to clipboard');
      }
    } catch (e) {}
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-amber-50/20 pt-0">
      {/* Hero Search Section */}
      <section className="relative text-white py-22 overflow-hidden">
        {/* Background Video */}
        <video
          ref={videoRef}
          className="absolute top-0 left-0 w-full h-full object-cover z-0"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
        >
          <source src="/videos/experience.mp4" type="video/mp4" />
        </video>
        
        {/* Fallback gradient overlay - only shows if video fails */}
        {videoError && (
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-green-700 z-0"></div>
        )}
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Eco Experiences</h1>
            <p className="text-xl text-teal-100 max-w-2xl mx-auto">
            Discover immersive activities that connect you with nature and sustainable living practices.
          </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-4xl mx-auto transform transition-all duration-500">
            <div className="bg-white rounded-2xl shadow-2xl backdrop-blur-sm bg-white/95">
              {/* Top Section - Search Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 p-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Experience Type</label>
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 hover:border-teal-300 transition-all duration-300 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-200 relative">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <select 
                      value={searchFilters.category}
                      onChange={(e) => handleSearchChange('category', e.target.value)}
                      className="flex-1 bg-transparent text-gray-800 focus:outline-none text-sm appearance-none cursor-pointer py-1 pr-8 text-center"
                    >
                      <option value="">All Experiences</option>
                      <option value="Agriculture">Agriculture</option>
                      <option value="Conservation">Conservation</option>
                      <option value="Culinary">Culinary</option>
                      <option value="Adventure">Adventure</option>
                      <option value="Education">Education</option>
                    </select>
                    <svg className="w-4 h-4 text-gray-400 pointer-events-none absolute right-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Location</label>
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 hover:border-teal-300 transition-all duration-300 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-200">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <input 
                      type="text" 
                      placeholder="Where?"
                      value={searchFilters.location}
                      onChange={(e) => handleSearchChange('location', e.target.value)}
                      className="flex-1 bg-transparent text-gray-800 placeholder-gray-500 focus:outline-none text-sm text-center"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Date</label>
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 hover:border-teal-300 transition-all duration-300 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-200">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <input 
                      type="date" 
                      value={searchFilters.date}
                      onChange={(e) => handleSearchChange('date', e.target.value)}
                      className="flex-1 bg-transparent text-gray-800 placeholder-gray-500 focus:outline-none text-sm cursor-pointer text-center"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Participants</label>
                  <div className="flex items-center gap-2 px-3 py-3 bg-gray-50 rounded-xl border border-gray-200 hover:border-teal-300 transition-all duration-300 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-200">
                    <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <input 
                      type="number"
                      min="1"
                      placeholder="Add guests"
                      value={searchFilters.participants}
                      onChange={(e) => handleSearchChange('participants', e.target.value)}
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

              {/* Middle Section - Filters and Listings Count */}
              <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
                  <button
                  onClick={handleToggleFilter}
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
                  {(searchFilters.category || searchFilters.location || searchFilters.date || searchFilters.participants || searchFilters.maxPrice < 100000) && (
                    <button 
                      onClick={clearFilters}
                      className="bg-gray-400 text-white px-3 py-2 rounded-lg hover:bg-gray-500 transition-all duration-300 delay-100 text-sm"
                    >
                      Clear
                  </button>
                  )}
                  <span className="text-gray-600 text-sm transition-opacity duration-300 delay-100">
                    {experiences.length} of {allExperiences.length} experiences
                  </span>
                </div>
              </div>

              {/* Bottom Section - Price Range Slider */}
              {(showPriceFilter || isClosingFilter) && (
                <div className={`border-t border-gray-200 px-4 py-4 transition-all duration-500 ease-out overflow-hidden`} 
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
                    onChange={(e) => handleSearchChange('maxPrice', parseInt(e.target.value))}
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

      <div className="container mx-auto px-4 py-8 bg-gradient-to-br from-stone-50 via-white to-amber-50/20">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">All Eco Experiences</h2>
            <p className="text-gray-600">Showing {experiences.length} experiences</p>
          </div>
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-300 bg-white"
          >
                <option value="featured">Sort by: Featured</option>
                <option value="rating">Sort by: Highest Rating</option>
                <option value="price-low">Sort by: Price: Low to High</option>
                <option value="price-high">Sort by: Price: High to Low</option>
              </select>
            </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse border border-gray-100">
                <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300"></div>
                <div className="p-6 space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="flex gap-2">
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                    <div className="h-5 bg-gray-200 rounded w-20"></div>
                    <div className="h-8 bg-gray-200 rounded w-24"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : experiences.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🌿</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No experiences available</h3>
            <p className="text-gray-600 mb-4">There are no published experience listings at the moment.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link 
                to="/services"
                className="px-6 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors"
              >
                Browse Services
              </Link>
              <Link 
                to="/homes"
                className="px-6 py-2 border-2 border-teal-600 text-teal-600 rounded-lg font-semibold hover:bg-teal-50 transition-colors"
              >
                Browse Homes
              </Link>
            </div>
          </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {experiences.map((experience, index) => (
            <div 
              key={experience.id} 
              className="bg-white rounded-xl shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden group transform hover:-translate-y-2 border border-gray-100"
              style={{ animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both` }}
            >
                  <div className="relative h-48 bg-gradient-to-br from-emerald-400 to-teal-500 overflow-hidden">
                    {experience.image && (experience.image.startsWith('http') || experience.image.startsWith('data:') || experience.image.startsWith('/')) ? (
                      <img
                        src={experience.image}
                        alt={experience.title}
                        className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-6xl">
                        🌿
                      </div>
                    )}
                    <button 
                      onClick={() => toggleFavorite(experience.id)} 
                      className={`absolute top-3 right-3 p-2.5 rounded-full shadow-lg transition-all duration-300 z-10 ${
                        isFavorited(experience.id) 
                          ? 'bg-red-500 text-white scale-110' 
                          : 'bg-white text-gray-600 hover:bg-gray-50 hover:scale-110'
                      }`}
                    >
                      <svg 
                        className="w-5 h-5" 
                        viewBox="0 0 24 24" 
                        fill={isFavorited(experience.id) ? 'currentColor' : 'none'} 
                        stroke="currentColor" 
                        strokeWidth={isFavorited(experience.id) ? 0 : 2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                    <div className="absolute bottom-3 left-3">
                      <span className="bg-white/90 backdrop-blur-sm text-gray-700 text-xs px-3 py-1.5 rounded-full font-semibold shadow-md">
                        ⏱️ {experience.duration}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-teal-600 transition-colors duration-300 line-clamp-1 flex-1">
                        {experience.title}
                      </h3>
                      <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-full flex-shrink-0 ml-2">
                        <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                        </svg>
                        <span className="text-gray-900 font-semibold text-sm">{experience.rating || 'New'}</span>
                        <span className="text-gray-500 text-xs">({experience.reviews || 0})</span>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-2 flex items-center gap-1">
                      <span className="text-emerald-600 font-medium">{experience.category}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {experience.location}
                      </span>
                    </p>
                    <p className="text-gray-600 text-sm mb-3 flex items-center gap-1">
                      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {experience.host}
                    </p>
                    
                    <p className="text-gray-700 text-sm mb-4 leading-relaxed line-clamp-2">
                      {experience.description}
                    </p>
                    
                    {/* Features */}
                    {experience.features && experience.features.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {experience.features.slice(0, 3).map((feature, idx) => (
                          <span 
                            key={idx}
                            className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-1 rounded-full border border-emerald-100 font-medium"
                          >
                            {feature}
                          </span>
                        ))}
                        {experience.features.length > 3 && (
                          <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full">
                            +{experience.features.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                      <div>
                        <span className="font-bold text-gray-900 text-xl">{experience.price}</span>
                        <span className="text-gray-600 text-sm"> / person</span>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => shareItem(experience)} 
                          className="p-2.5 border-2 border-gray-200 rounded-lg text-gray-600 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all duration-200"
                          title="Share"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342c0 .479.185.958.684 1.316.6.367 1.5.684 2.684.684.479 0 1.05.019 1.632.082 1.316.123 2.632.518 3.684.868v-2.211c-1.5-.684-3.158-.868-4.632-.632-1.158.184-2.316.553-3.316.947-.6.316-1.053.789-1.316 1.158zM8.684 13.342c-.6-.684-1.5-1.026-2.684-1.026-.479 0-1.05.019-1.632.082-1.316.123-2.632.518-3.684.868v-2.211c1.5-.684 3.158-.868 4.632-.632 1.158.184 2.316.553 3.316.947.6.316 1.053.789 1.316 1.158zM8.684 8.658c-.6-.684-1.5-1.026-2.684-1.026-.479 0-1.05.019-1.632.082-1.316.123-2.632.518-3.684.868v-2.211c1.5-.684 3.158-.868 4.632-.632 1.158.184 2.316.553 3.316.947.6.316 1.053.789 1.316 1.158z" />
                          </svg>
                        </button>
                        <Link 
                          to={`/listing/${experience.id}`} 
                          className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 inline-block text-center"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
        )}
          </div>

      {/* Call to Action Section */}
      <section className="py-16 bg-gradient-to-r from-emerald-600 to-teal-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready for Your Next Eco Adventure?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto text-emerald-100">
            Join our community of eco-conscious travelers and create unforgettable sustainable memories.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/signup" 
              className="bg-white text-teal-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
            >
              Sign Up Now
            </Link>
            <Link 
              to="/services" 
              className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-teal-600 transition-all duration-300 transform hover:scale-105"
            >
              Explore Services
            </Link>
        </div>
      </div>
      </section>
    </div>
  );
}

export default PublicExperiences;
