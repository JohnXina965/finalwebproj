import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../Firebase';
import toast from 'react-hot-toast';

function GuestWishlist() {
  const { currentUser } = useAuth();
  const [favorites, setFavorites] = useState({
    homes: [],
    experiences: [],
    services: []
  });
  const [listings, setListings] = useState({});
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'homes', 'experiences', 'services'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadFavorites();
  }, [currentUser]);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load from localStorage
      const homesFav = localStorage.getItem('ee_favorites_home');
      const experiencesFav = localStorage.getItem('ee_favorites_experiences');
      const servicesFav = localStorage.getItem('ee_favorites_services');

      const favoriteIds = {
        homes: homesFav ? JSON.parse(homesFav) : [],
        experiences: experiencesFav ? JSON.parse(experiencesFav) : [],
        services: servicesFav ? JSON.parse(servicesFav) : []
      };

      setFavorites(favoriteIds);

      // Fetch listing details from Firestore
      const allIds = [...favoriteIds.homes, ...favoriteIds.experiences, ...favoriteIds.services];
      const listingsData = {};

      for (const listingId of allIds) {
        try {
          const listingDoc = await getDoc(doc(db, 'listings', listingId));
          if (listingDoc.exists()) {
            const listingData = listingDoc.data();
            const getPhotoUrl = (photos) => {
              if (!photos || photos.length === 0) return null;
              const firstPhoto = photos[0];
              return typeof firstPhoto === 'string' ? firstPhoto : (firstPhoto.url || firstPhoto);
            };

            listingsData[listingId] = {
              id: listingDoc.id,
              ...listingData,
              image: getPhotoUrl(listingData.photos) ||
                    getPhotoUrl(listingData.homeDetails?.photos) ||
                    getPhotoUrl(listingData.experienceDetails?.photos) ||
                    getPhotoUrl(listingData.serviceDetails?.photos),
              title: listingData.homeDetails?.title || 
                    listingData.experienceDetails?.title || 
                    listingData.serviceDetails?.title || 
                    listingData.title || 'Unknown Listing',
              location: listingData.location?.address || 
                       `${listingData.location?.city || ''}, ${listingData.location?.country || 'Philippines'}`.trim(),
              propertyType: listingData.propertyType || 'home',
              rating: listingData.rating || 0,
              reviewCount: listingData.reviewCount || 0,
              pricing: listingData.pricing || {}
            };
          }
        } catch (err) {
          console.error(`Error fetching listing ${listingId}:`, err);
        }
      }

      setListings(listingsData);
    } catch (e) {
      console.error('Error loading favorites:', e);
      setError('Failed to load favorites. Please try again.');
      toast.error('Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredItems = useMemo(() => {
    const allItems = [];
    
    // Add homes
    favorites.homes.forEach(id => {
      const listing = listings[id];
      if (listing && listing.propertyType === 'home') {
        allItems.push({ ...listing, type: 'home' });
      }
    });

    // Add experiences
    favorites.experiences.forEach(id => {
      const listing = listings[id];
      if (listing && listing.propertyType === 'experience') {
        allItems.push({ ...listing, type: 'experience' });
      }
    });

    // Add services
    favorites.services.forEach(id => {
      const listing = listings[id];
      if (listing && listing.propertyType === 'service') {
        allItems.push({ ...listing, type: 'service' });
      }
    });

    // Filter by active tab
    if (activeTab === 'all') {
      return allItems;
    }
    return allItems.filter(item => item.type === activeTab.slice(0, -1)); // Remove 's' from 'homes', 'experiences', 'services'
  }, [favorites, listings, activeTab]);

  const removeFavorite = useCallback((id, type) => {
    try {
      let newFavorites = { ...favorites };
      if (type === 'home') {
        newFavorites.homes = newFavorites.homes.filter(favId => favId !== id);
        localStorage.setItem('ee_favorites_home', JSON.stringify(newFavorites.homes));
      } else if (type === 'experience') {
        newFavorites.experiences = newFavorites.experiences.filter(favId => favId !== id);
        localStorage.setItem('ee_favorites_experiences', JSON.stringify(newFavorites.experiences));
      } else if (type === 'service') {
        newFavorites.services = newFavorites.services.filter(favId => favId !== id);
        localStorage.setItem('ee_favorites_services', JSON.stringify(newFavorites.services));
      }
      setFavorites(newFavorites);
      
      // Remove from listings cache
      const newListings = { ...listings };
      delete newListings[id];
      setListings(newListings);
      
      toast.success('Removed from favorites');
    } catch (e) {
      console.error('Error removing favorite:', e);
      toast.error('Failed to remove from favorites');
    }
  }, [favorites, listings]);

  const filteredItems = getFilteredItems;
  
  // Count only items that actually exist in listings (not just IDs in localStorage)
  const counts = useMemo(() => {
    const homesCount = favorites.homes.filter(id => listings[id] && listings[id].propertyType === 'home').length;
    const experiencesCount = favorites.experiences.filter(id => listings[id] && listings[id].propertyType === 'experience').length;
    const servicesCount = favorites.services.filter(id => listings[id] && listings[id].propertyType === 'service').length;
    return {
      all: homesCount + experiencesCount + servicesCount,
      homes: homesCount,
      experiences: experiencesCount,
      services: servicesCount
    };
  }, [favorites, listings]);

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 animate-pulse">
          <div className="h-48 bg-gray-200"></div>
          <div className="p-6">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 pb-12">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <div className="h-8 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-2 mb-6 flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-gray-200 rounded-lg w-24 animate-pulse"></div>
            ))}
          </div>
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 pb-12 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-md text-center" data-aos="fade-up">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Error Loading Favorites</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={loadFavorites}
            className="bg-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const getPrice = (listing) => {
    if (!listing.pricing) return 'Price not available';
    const basePrice = listing.pricing.basePrice || 0;
    return `₱${parseFloat(basePrice).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12">
      <div className="container mx-auto px-4">
        <div className="mb-8" data-aos="fade-down">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Favorites</h1>
          <p className="text-gray-600">
            {counts.all === 0 
              ? "Add listings to your favorites to see them here"
              : `${counts.all} saved ${counts.all === 1 ? 'item' : 'items'}`}
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl shadow-sm p-2 mb-6 flex flex-wrap gap-2" data-aos="fade-up" data-aos-delay="100">
          {[
            { key: 'all', label: 'All', count: counts.all },
            { key: 'homes', label: 'Homes', count: counts.homes },
            { key: 'experiences', label: 'Experiences', count: counts.experiences },
            { key: 'services', label: 'Services', count: counts.services }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Items Grid */}
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center" data-aos="fade-up" data-aos-delay="200">
            <div className="text-6xl mb-4">❤️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Your favorites is empty</h3>
            <p className="text-gray-600 mb-6">
              {activeTab === 'all'
                ? "Start exploring and add listings you love to favorites!"
                : `You haven't added any ${activeTab} to favorites yet.`}
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                to="/guest/homes"
                className="inline-block bg-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors"
              >
                Explore Homes
              </Link>
              <Link
                to="/guest/experiences"
                className="inline-block bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
              >
                Explore Experiences
              </Link>
              <Link
                to="/guest/services"
                className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Explore Services
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item, index) => (
              <div
                key={`${item.type}-${item.id}`}
                className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden group transform hover:-translate-y-2 border border-gray-100"
                data-aos="fade-up"
                data-aos-delay={index * 100}
              >
                <Link to={`/listing/${item.id}`} className="block">
                  <div className="relative h-48 bg-gradient-to-br from-teal-400 to-emerald-500 overflow-hidden transform group-hover:scale-110 transition-transform duration-500">
                    {item.image ? (
                      <img 
                        src={item.image} 
                        alt={item.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center text-6xl">' + 
                            (item.type === 'home' ? '🏠' : item.type === 'experience' ? '🎯' : '🔧') + '</div>';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-6xl">
                        {item.type === 'home' ? '🏠' : item.type === 'experience' ? '🎯' : '🔧'}
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeFavorite(item.id, item.type);
                      }}
                      className="absolute top-3 right-3 bg-white p-2 rounded-full shadow-md hover:scale-110 transition-transform duration-300 z-10"
                    >
                      <svg className="w-5 h-5 text-red-500 fill-current" viewBox="0 0 24 24">
                        <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                    <div className="absolute bottom-3 left-3">
                      <span className="bg-white/90 text-gray-700 text-xs px-2 py-1 rounded-full font-medium">
                        {item.type === 'home' ? 'Home' : item.type === 'experience' ? 'Experience' : 'Service'}
                      </span>
                    </div>
                  </div>
                </Link>

                <div className="p-6">
                  <Link to={`/listing/${item.id}`}>
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-teal-600 transition-colors duration-300 mb-2">
                      {item.title}
                    </h3>
                  </Link>

                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-600 text-sm">
                      {item.location || 'Location not specified'}
                    </p>
                    {item.rating > 0 && (
                      <div className="flex items-center space-x-1">
                        <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                        </svg>
                        <span className="text-gray-700 text-sm font-medium">{item.rating.toFixed(1)}</span>
                        {item.reviewCount > 0 && (
                          <span className="text-gray-500 text-sm">({item.reviewCount})</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                    <div>
                      <span className="font-bold text-gray-900 text-lg">{getPrice(item)}</span>
                      {item.type === 'home' && <span className="text-gray-600 text-sm"> / night</span>}
                      {item.type !== 'home' && <span className="text-gray-600 text-sm"> / person</span>}
                    </div>
                    <Link
                      to={`/listing/${item.id}`}
                      className="bg-teal-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-teal-600 transition-all duration-300 transform hover:scale-105"
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
    </div>
  );
}

export default GuestWishlist;

