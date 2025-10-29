import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getListingById } from './services/ListingServices';

const ListingDetail = () => {
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const listingData = await getListingById(id);
        setListing(listingData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchListing();
    }
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p>Loading listing...</p>
      </div>
    </div>
  );
  
  if (error) return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Listing Not Found</h1>
        <p className="text-gray-600">{error}</p>
      </div>
    </div>
  );
  
  if (!listing) return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Listing Not Found</h1>
        <p className="text-gray-600">The listing you're looking for doesn't exist.</p>
      </div>
    </div>
  );

  const getPropertyDetails = () => {
    switch(listing.propertyType) {
      case 'home': return listing.homeDetails;
      case 'experience': return listing.experienceDetails;
      case 'service': return listing.serviceDetails;
      default: return null;
    }
  };

  const propertyDetails = getPropertyDetails();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{propertyDetails?.title}</h1>
          <p className="text-gray-600 mb-4">{propertyDetails?.description}</p>
          
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-teal-600">
              ${listing.pricing?.basePrice}
              <span className="text-sm font-normal text-gray-600 ml-1">
                {listing.propertyType === 'home' && '/night'}
                {listing.propertyType === 'experience' && '/person'}
                {listing.propertyType === 'service' && '/service'}
              </span>
            </div>
            <button className="px-6 py-3 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors">
              Book Now
            </button>
          </div>
        </div>

        {/* Photos */}
        {listing.photos && listing.photos.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">📸 Photos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {listing.photos.map((photo, index) => (
                <img
                  key={photo.id}
                  src={photo.url}
                  alt={`Listing photo ${index + 1}`}
                  className="w-full h-64 object-cover rounded-lg"
                />
              ))}
            </div>
          </div>
        )}

        {/* Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">ℹ️ Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Location</h3>
              <p className="text-gray-600">
                {listing.location?.city}, {listing.location?.state} {listing.location?.country}
              </p>
            </div>
            
            {listing.propertyType === 'home' && (
              <>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Accommodation</h3>
                  <p className="text-gray-600">
                    {propertyDetails?.bedrooms} bedrooms · {propertyDetails?.bathrooms} bathrooms · {propertyDetails?.maxGuests} guests
                  </p>
                </div>
              </>
            )}
            
            {listing.propertyType === 'experience' && (
              <>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Experience Details</h3>
                  <p className="text-gray-600">
                    {propertyDetails?.duration} hours · {propertyDetails?.groupSize} guests max
                  </p>
                </div>
              </>
            )}
            
            {listing.propertyType === 'service' && (
              <>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Service Details</h3>
                  <p className="text-gray-600">
                    {propertyDetails?.serviceCategory} · {propertyDetails?.experienceYears} years experience
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Eco Features */}
        {(listing.pricing?.ecoDiscount || listing.pricing?.sustainableChoice) && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mt-6">
            <h2 className="text-xl font-semibold text-green-900 mb-4">🌱 Eco-Friendly Features</h2>
            <div className="flex flex-wrap gap-2">
              {listing.pricing?.ecoDiscount && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  🌿 Eco Discount Available
                </span>
              )}
              {listing.pricing?.sustainableChoice && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  ♻️ Sustainable Choice
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ListingDetail;