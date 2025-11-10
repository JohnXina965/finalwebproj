import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../Firebase';
import DateRangePicker from '../../components/DateRangePicker';

function PublicStays() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const locationFilter = searchParams.get('location') || '';

  // Redirect authenticated users to guest homes page
  useEffect(() => {
    if (currentUser) {
      navigate('/guest/homes', { replace: true });
    }
  }, [currentUser, navigate]);

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
    location: locationFilter,
    checkIn: '',
    checkOut: '',
    guests: '',
    maxPrice: 100000
  });
  const [showPriceFilter, setShowPriceFilter] = useState(false);
  const [isClosingFilter, setIsClosingFilter] = useState(false);
  const [sortBy, setSortBy] = useState('featured');

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
      
      const listingsToShow = publishedListings.length > 0 ? publishedListings : allListings;
      setListings(listingsToShow);
      setLoading(false);
    }, (error) => {
      console.error('❌ Error fetching listings:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('ee_public_favorites_home', JSON.stringify(favorites));
    } catch (e) {}
  }, [favorites]);

  // Filter and sort listings
  const filteredListings = useMemo(() => {
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
    if (searchFilters.maxPrice < 100000) {
      filtered = filtered.filter(l => {
        const price = parseFloat(l.price.replace(/[₱,]/g, '')) || 0;
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
      case 'newest':
        filtered.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
        break;
      default: // 'featured'
        filtered.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
    }
    
    return filtered;
  }, [listings, searchFilters, sortBy]);

  const isFavorited = (id) => favorites.includes(id);
  const toggleFavorite = (id) => setFavorites(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-amber-50/20 pt-0">
      {/* Hero Search Section */}
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
        <div className="relative container mx-auto px-4">
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
                    {filteredListings.length} of {listings.length} listings
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

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">All Eco Stays</h2>
            <p className="text-gray-600">Showing {filteredListings.length} stays</p>
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
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🏡</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No stays available</h3>
            <p className="text-gray-600 mb-4">There are no published stays matching your criteria.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link 
                to="/experiences"
                className="px-6 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors"
              >
                Browse Experiences
              </Link>
              <Link 
                to="/services"
                className="px-6 py-2 border-2 border-teal-600 text-teal-600 rounded-lg font-semibold hover:bg-teal-50 transition-colors"
              >
                Browse Services
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredListings.map((listing, index) => (
              <div 
                key={listing.id} 
                className="bg-white rounded-xl shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden group transform hover:-translate-y-2 border border-gray-100"
              >
                <div className="relative h-48 bg-gradient-to-br from-teal-400 to-blue-500 overflow-hidden">
                  {listing.image && (listing.image.startsWith('http') || listing.image.startsWith('data:') || listing.image.startsWith('/')) ? (
                    <img
                      src={listing.image}
                      alt={listing.title}
                      className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl">
                      🏡
                    </div>
                  )}
                  <button 
                    onClick={() => toggleFavorite(listing.id)} 
                    className={`absolute top-3 right-3 p-2.5 rounded-full shadow-lg transition-all duration-300 z-10 ${
                      isFavorited(listing.id) 
                        ? 'bg-red-500 text-white scale-110' 
                        : 'bg-white text-gray-600 hover:bg-gray-50 hover:scale-110'
                    }`}
                  >
                    <svg 
                      className="w-5 h-5" 
                      viewBox="0 0 24 24" 
                      fill={isFavorited(listing.id) ? 'currentColor' : 'none'} 
                      stroke="currentColor" 
                      strokeWidth={isFavorited(listing.id) ? 0 : 2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                </div>
                
                <div className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-teal-600 transition-colors duration-300 line-clamp-1 flex-1">
                      {listing.title}
                    </h3>
                    <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-full flex-shrink-0 ml-2">
                      <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                      <span className="text-gray-900 font-semibold text-sm">{listing.rating || 'New'}</span>
                      <span className="text-gray-500 text-xs">({listing.reviews || 0})</span>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-2 flex items-center gap-1">
                    <span className="text-teal-600 font-medium">{listing.type}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {listing.location}
                    </span>
                  </p>
                  
                  {listing.features && listing.features.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {listing.features.slice(0, 3).map((feature, idx) => (
                        <span 
                          key={idx}
                          className="bg-teal-50 text-teal-700 text-xs px-2.5 py-1 rounded-full border border-teal-100 font-medium"
                        >
                          {feature}
                        </span>
                      ))}
                      {listing.features.length > 3 && (
                        <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full">
                          +{listing.features.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                    <div>
                      <span className="font-bold text-gray-900 text-xl">{listing.price}</span>
                      <span className="text-gray-600 text-sm"> / night</span>
                    </div>
                    <Link 
                      to={`/listing/${listing.id}`} 
                      className="bg-gradient-to-r from-teal-600 to-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:from-teal-700 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 inline-block text-center"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Call to Action Section */}
      <section className="py-16 bg-gradient-to-r from-teal-600 to-blue-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready for Your Next Stay?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto text-teal-100">
            Join our community of eco-conscious travelers and discover sustainable accommodations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/signup" 
              className="bg-white text-teal-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
            >
              Sign Up Now
            </Link>
            <Link 
              to="/experiences" 
              className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-teal-600 transition-all duration-300 transform hover:scale-105"
            >
              Explore Experiences
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default PublicStays;

