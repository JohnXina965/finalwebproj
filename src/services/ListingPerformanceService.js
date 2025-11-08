import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../Firebase';
import { calculateServiceFee } from './ServiceFeeService';

/**
 * Calculate performance metrics for a listing
 * @param {string} listingId - Listing ID
 * @param {Array} bookings - Array of bookings for this listing
 * @param {Object} listing - Listing data
 * @returns {Object} Performance metrics
 */
export const calculateListingPerformance = (listingId, bookings, listing) => {
  const listingBookings = bookings.filter(b => b.listingId === listingId);
  
  const views = listing?.views || 0;
  const totalBookings = listingBookings.length;
  const confirmedBookings = listingBookings.filter(b => 
    b.status === 'confirmed' || b.status === 'completed'
  ).length;
  
  // Calculate conversion rate (views to bookings)
  const conversionRate = views > 0 ? ((confirmedBookings / views) * 100) : 0;
  
  // Calculate revenue
  const revenue = listingBookings
    .filter(b => b.status === 'completed' || b.status === 'confirmed')
    .reduce((sum, b) => {
      const amount = parseFloat(b.totalAmount || 0);
      const serviceFee = parseFloat(b.serviceFee || calculateServiceFee(amount));
      return sum + (amount - serviceFee);
    }, 0);
  
  // Calculate average revenue per booking
  const avgRevenuePerBooking = confirmedBookings > 0 
    ? revenue / confirmedBookings 
    : 0;
  
  // Calculate revenue per view
  const revenuePerView = views > 0 ? revenue / views : 0;
  
  // Get listing title
  const title = listing?.homeDetails?.title || 
                listing?.experienceDetails?.title || 
                listing?.serviceDetails?.title || 
                'Untitled Listing';
  
  return {
    listingId,
    title,
    views,
    totalBookings,
    confirmedBookings,
    conversionRate: Math.round(conversionRate * 100) / 100, // Round to 2 decimal places
    revenue: Math.round(revenue),
    avgRevenuePerBooking: Math.round(avgRevenuePerBooking),
    revenuePerView: Math.round(revenuePerView * 100) / 100, // Round to 2 decimal places
    rating: listing?.rating || 0,
    reviewCount: listing?.reviewCount || 0,
    status: listing?.status || 'inactive'
  };
};

/**
 * Get performance metrics for all listings of a host
 * @param {Array} listings - Array of listings
 * @param {Array} bookings - Array of bookings
 * @returns {Array} Array of performance metrics for each listing
 */
export const getHostListingPerformance = (listings, bookings) => {
  return listings.map(listing => 
    calculateListingPerformance(listing.id, bookings, listing)
  ).sort((a, b) => {
    // Sort by revenue (highest first)
    return b.revenue - a.revenue;
  });
};

/**
 * Get performance summary for a host
 * @param {Array} performanceData - Array of listing performance metrics
 * @returns {Object} Summary statistics
 */
export const getPerformanceSummary = (performanceData) => {
  if (performanceData.length === 0) {
    return {
      totalViews: 0,
      totalBookings: 0,
      totalRevenue: 0,
      avgConversionRate: 0,
      avgRevenuePerListing: 0,
      bestPerformer: null,
      worstPerformer: null
    };
  }
  
  const totalViews = performanceData.reduce((sum, p) => sum + p.views, 0);
  const totalBookings = performanceData.reduce((sum, p) => sum + p.confirmedBookings, 0);
  const totalRevenue = performanceData.reduce((sum, p) => sum + p.revenue, 0);
  const avgConversionRate = performanceData.reduce((sum, p) => sum + p.conversionRate, 0) / performanceData.length;
  const avgRevenuePerListing = totalRevenue / performanceData.length;
  
  // Find best and worst performers by revenue
  const bestPerformer = performanceData[0]; // Already sorted by revenue
  const worstPerformer = performanceData[performanceData.length - 1];
  
  return {
    totalViews,
    totalBookings,
    totalRevenue,
    avgConversionRate: Math.round(avgConversionRate * 100) / 100,
    avgRevenuePerListing: Math.round(avgRevenuePerListing),
    bestPerformer,
    worstPerformer
  };
};

