import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../Firebase';

/**
 * Get guest recommendations based on booking history, favorites, and preferences
 * @param {string} guestId - Guest user ID
 * @param {string} propertyType - Type of property ('home', 'experience', 'service')
 * @param {number} limit - Maximum number of recommendations to return
 * @returns {Promise<Array>} Array of recommended listing IDs with scores
 */
export const getGuestRecommendations = async (guestId, propertyType = 'home', limit = 10) => {
  try {
    // Get guest's booking history
    const bookingsSnapshot = await getDocs(
      query(collection(db, 'bookings'), where('guestId', '==', guestId))
    );
    
    const bookings = bookingsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      checkIn: doc.data().checkIn?.toDate?.() || null,
      checkOut: doc.data().checkOut?.toDate?.() || null
    }));

    // Get guest's favorites from localStorage
    const favoritesKey = propertyType === 'home' 
      ? 'ee_favorites_home' 
      : propertyType === 'experience' 
      ? 'ee_favorites_experiences' 
      : 'ee_favorites_services';
    
    let favorites = [];
    try {
      favorites = JSON.parse(localStorage.getItem(favoritesKey) || '[]');
    } catch (e) {
      console.error('Error reading favorites:', e);
    }

    // Analyze preferences from bookings
    const preferences = analyzePreferences(bookings, propertyType);
    
    // Get all published listings of the requested type
    const listingsSnapshot = await getDocs(
      query(
        collection(db, 'listings'),
        where('propertyType', '==', propertyType)
      )
    );

    const allListings = listingsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        rating: data.rating || 0,
        reviewCount: data.reviewCount || 0,
        bookings: data.bookings || 0,
        pricing: data.pricing || {},
        location: data.location || {},
        homeDetails: data.homeDetails || {},
        experienceDetails: data.experienceDetails || {},
        serviceDetails: data.serviceDetails || {}
      };
    });

    // Filter out already booked/favorited listings
    const bookedListingIds = bookings.map(b => b.listingId);
    const availableListings = allListings.filter(listing => 
      listing.status === 'published' &&
      !bookedListingIds.includes(listing.id) &&
      !favorites.includes(listing.id)
    );

    // Score each listing based on preferences
    const scoredListings = availableListings.map(listing => {
      let score = 0;

      // Location preference (40% weight)
      if (preferences.topLocations.length > 0) {
        const listingLocation = `${listing.location?.city || ''} ${listing.location?.state || ''}`.toLowerCase();
        const locationMatch = preferences.topLocations.some(loc => 
          listingLocation.includes(loc.toLowerCase())
        );
        if (locationMatch) score += 40;
      }

      // Price range preference (25% weight)
      const listingPrice = parseFloat(listing.pricing?.basePrice || 0);
      if (preferences.priceRange.min > 0 && preferences.priceRange.max > 0) {
        if (listingPrice >= preferences.priceRange.min && listingPrice <= preferences.priceRange.max) {
          score += 25;
        } else {
          // Partial credit for close prices
          const avgPrice = (preferences.priceRange.min + preferences.priceRange.max) / 2;
          const priceDiff = Math.abs(listingPrice - avgPrice) / avgPrice;
          if (priceDiff < 0.3) score += 15; // Within 30% of preferred range
        }
      }

      // Rating preference (20% weight)
      if (listing.rating >= preferences.minRating) {
        score += 20;
      } else if (listing.rating >= preferences.minRating - 0.5) {
        score += 10;
      }

      // Popularity boost (10% weight)
      if (listing.bookings > 0) {
        score += Math.min(10, listing.bookings / 5); // Max 10 points for 5+ bookings
      }
      if (listing.reviewCount > 0) {
        score += Math.min(5, listing.reviewCount / 10); // Max 5 points for 10+ reviews
      }

      // Property type preference (5% weight)
      if (propertyType === 'home' && listing.homeDetails?.propertyType) {
        if (preferences.preferredPropertyTypes.includes(listing.homeDetails.propertyType)) {
          score += 5;
        }
      }

      return {
        ...listing,
        recommendationScore: score
      };
    });

    // Sort by score and return top recommendations
    const recommendations = scoredListings
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, limit);

    // If we don't have enough scored recommendations, fill with popular listings
    if (recommendations.length < limit) {
      const popularListings = allListings
        .filter(listing => 
          listing.status === 'published' &&
          !recommendations.some(r => r.id === listing.id) &&
          !bookedListingIds.includes(listing.id)
        )
        .sort((a, b) => {
          // Sort by rating * reviewCount (popularity)
          const aScore = (a.rating || 0) * (a.reviewCount || 0);
          const bScore = (b.rating || 0) * (b.reviewCount || 0);
          return bScore - aScore;
        })
        .slice(0, limit - recommendations.length);

      recommendations.push(...popularListings);
    }

    return recommendations;
  } catch (error) {
    console.error('Error getting recommendations:', error);
    return [];
  }
};

/**
 * Analyze guest preferences from booking history
 * @param {Array} bookings - Array of booking objects
 * @param {string} propertyType - Type of property
 * @returns {Object} Preferences object
 */
function analyzePreferences(bookings, propertyType) {
  const preferences = {
    topLocations: [],
    priceRange: { min: 0, max: 0 },
    minRating: 0,
    preferredPropertyTypes: []
  };

  if (bookings.length === 0) {
    // Default preferences if no bookings
    return {
      topLocations: [],
      priceRange: { min: 500, max: 5000 }, // Default price range
      minRating: 4.0,
      preferredPropertyTypes: ['Entire Place', 'Private Room']
    };
  }

  // Extract locations from bookings
  const locations = bookings
    .filter(b => b.listingType === propertyType || b.propertyType === propertyType)
    .map(b => b.location || '')
    .filter(loc => loc.length > 0);

  // Get top 3 locations
  const locationCounts = {};
  locations.forEach(loc => {
    // Extract city from location string
    const city = loc.split(',')[0].trim();
    locationCounts[city] = (locationCounts[city] || 0) + 1;
  });

  preferences.topLocations = Object.entries(locationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([city]) => city);

  // Calculate price range from bookings
  const prices = bookings
    .filter(b => b.basePrice || b.totalAmount)
    .map(b => parseFloat(b.basePrice || b.totalAmount || 0));

  if (prices.length > 0) {
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;

    // Set range ±50% from average
    preferences.priceRange = {
      min: Math.max(0, avgPrice * 0.5),
      max: avgPrice * 1.5
    };
  } else {
    preferences.priceRange = { min: 500, max: 5000 };
  }

  // Get average rating preference (if guests tend to book highly rated places)
  // For now, default to 4.0
  preferences.minRating = 4.0;

  // Property type preferences (for homes)
  if (propertyType === 'home') {
    const propertyTypes = bookings
      .filter(b => b.listingType === 'home' || b.propertyType === 'home')
      .map(b => b.homeDetails?.propertyType || 'Entire Place')
      .filter(pt => pt);

    const typeCounts = {};
    propertyTypes.forEach(pt => {
      typeCounts[pt] = (typeCounts[pt] || 0) + 1;
    });

    preferences.preferredPropertyTypes = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([type]) => type);

    if (preferences.preferredPropertyTypes.length === 0) {
      preferences.preferredPropertyTypes = ['Entire Place', 'Private Room'];
    }
  }

  return preferences;
}

/**
 * Get recommendations based on similar properties to favorites
 * @param {Array} favoriteIds - Array of favorite listing IDs
 * @param {string} propertyType - Type of property
 * @param {number} limit - Maximum number of recommendations
 * @returns {Promise<Array>} Array of recommended listings
 */
export const getSimilarToFavorites = async (favoriteIds, propertyType = 'home', limit = 5) => {
  if (favoriteIds.length === 0) return [];

  try {
    // Get favorite listings
    const favoritesPromises = favoriteIds.map(async (id) => {
      try {
        const favoriteDoc = await getDoc(doc(db, 'listings', id));
        if (favoriteDoc.exists()) {
          return { id, ...favoriteDoc.data() };
        }
      } catch (e) {
        console.error(`Error fetching favorite ${id}:`, e);
      }
      return null;
    });

    const favorites = (await Promise.all(favoritesPromises)).filter(f => f !== null);

    if (favorites.length === 0) return [];

    // Analyze common characteristics
    const avgPrice = favorites.reduce((sum, f) => sum + parseFloat(f.pricing?.basePrice || 0), 0) / favorites.length;
    const commonLocations = {};
    
    favorites.forEach(f => {
      const location = `${f.location?.city || ''} ${f.location?.state || ''}`.trim();
      if (location) {
        commonLocations[location] = (commonLocations[location] || 0) + 1;
      }
    });

    const topLocation = Object.entries(commonLocations)
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    // Find similar listings
    const listingsSnapshot = await getDocs(
      query(
        collection(db, 'listings'),
        where('propertyType', '==', propertyType)
      )
    );

    const similarListings = listingsSnapshot.docs
      .map(doc => {
        const data = doc.data();
        const listingPrice = parseFloat(data.pricing?.basePrice || 0);
        const listingLocation = `${data.location?.city || ''} ${data.location?.state || ''}`.trim();
        
        let similarityScore = 0;
        
        // Price similarity (50% weight)
        const priceDiff = Math.abs(listingPrice - avgPrice) / avgPrice;
        if (priceDiff < 0.2) similarityScore += 50;
        else if (priceDiff < 0.4) similarityScore += 25;

        // Location similarity (30% weight)
        if (topLocation && listingLocation.includes(topLocation.split(',')[0])) {
          similarityScore += 30;
        }

        // Rating similarity (20% weight)
        if (data.rating >= 4.0) similarityScore += 20;

        return {
          id: doc.id,
          ...data,
          similarityScore
        };
      })
      .filter(listing => 
        listing.status === 'published' &&
        !favoriteIds.includes(listing.id) &&
        listing.similarityScore > 0
      )
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit);

    return similarListings;
  } catch (error) {
    console.error('Error getting similar recommendations:', error);
    return [];
  }
};

