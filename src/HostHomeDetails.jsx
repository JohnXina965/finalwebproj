import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useHost } from './contexts/HostContext';
import { useAuth } from './contexts/AuthContext';

const HostHomeDetails = () => {
  const { updateHostData } = useHost();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    console.log('Current User:', currentUser);
  }, [currentUser]);

  const [homeDetails, setHomeDetails] = useState({
    title: '',
    description: '',
    bedrooms: 1,
    bathrooms: 1,
    maxGuests: 1,
    amenities: []
  });

  const amenitiesList = [
    'WiFi', 'Kitchen', 'Parking', 'Pool', 'Hot Tub', 
    'Air Conditioning', 'Heating', 'Washer', 'Dryer',
    'TV', 'Essentials', 'Pet Friendly', 'Gym'
  ];

  const handleAmenityToggle = (amenity) => {
    setHomeDetails(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    updateHostData({
      homeDetails,
      currentStep: 4
    });

    console.log('Home Details Saved:', homeDetails);
    navigate('/host/location');
  };

  return (
    <div className={`min-h-screen bg-gray-50 py-8 animate-multi-layer transition-all duration-1000 ${
      mounted ? 'opacity-100' : 'opacity-0'
    }`}>
      <div className="max-w-2xl mx-auto px-4">
        {/* Progress Bar */}
        <div className={`mb-8 transition-all duration-700 delay-200 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <div className="flex items-center justify-between mb-2 transition-all duration-500 delay-300">
            <span className="text-sm font-medium text-teal-600">Step 3 of 9</span>
            <span className="text-sm text-gray-500">Home Details</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 transition-all duration-500 delay-400">
            <div className="bg-teal-600 h-2 rounded-full w-3/9 transition-all duration-700 delay-500"></div>
          </div>
        </div>

        {/* Form */}
        <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all duration-700 delay-300 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <h1 className="text-2xl font-bold text-gray-900 mb-2 transition-all duration-700 delay-400">
            Tell us about your place
          </h1>
          <p className="text-gray-600 mb-6 transition-all duration-700 delay-500">
            Share some basic info about your property.
          </p>

          <form onSubmit={handleSubmit}>
            {/* Title */}
            <div className="mb-6 transition-all duration-500 delay-600">
              <label className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-500 delay-700">
                Property Title *
              </label>
              <input
                type="text"
                required
                value={homeDetails.title}
                onChange={(e) => setHomeDetails(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Cozy apartment with city view"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300 delay-800 hover:border-gray-400 focus:scale-[1.02]"
              />
            </div>

            {/* Description */}
            <div className="mb-6 transition-all duration-500 delay-700">
              <label className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-500 delay-800">
                Description *
              </label>
              <textarea
                required
                value={homeDetails.description}
                onChange={(e) => setHomeDetails(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your space, amenities, and what makes it special..."
                rows="4"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300 delay-900 hover:border-gray-400 focus:scale-[1.02]"
              />
            </div>

            {/* Basic Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 transition-all duration-500 delay-800">
              <div className="transition-all duration-500 delay-900">
                <label className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-500 delay-1000">
                  Bedrooms *
                </label>
                <select
                  value={homeDetails.bedrooms}
                  onChange={(e) => setHomeDetails(prev => ({ ...prev, bedrooms: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300 delay-1100 hover:border-gray-400 focus:scale-[1.02]"
                >
                  {[1,2,3,4,5,6,7,8].map(num => (
                    <option key={num} value={num}>{num} {num === 1 ? 'bedroom' : 'bedrooms'}</option>
                  ))}
                </select>
              </div>

              <div className="transition-all duration-500 delay-1000">
                <label className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-500 delay-1100">
                  Bathrooms *
                </label>
                <select
                  value={homeDetails.bathrooms}
                  onChange={(e) => setHomeDetails(prev => ({ ...prev, bathrooms: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300 delay-1200 hover:border-gray-400 focus:scale-[1.02]"
                >
                  {[1,1.5,2,2.5,3,3.5,4,4.5,5].map(num => (
                    <option key={num} value={num}>{num} {num === 1 ? 'bathroom' : 'bathrooms'}</option>
                  ))}
                </select>
              </div>

              <div className="transition-all duration-500 delay-1100">
                <label className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-500 delay-1200">
                  Max Guests *
                </label>
                <select
                  value={homeDetails.maxGuests}
                  onChange={(e) => setHomeDetails(prev => ({ ...prev, maxGuests: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300 delay-1300 hover:border-gray-400 focus:scale-[1.02]"
                >
                  {[1,2,3,4,5,6,7,8,9,10].map(num => (
                    <option key={num} value={num}>{num} {num === 1 ? 'guest' : 'guests'}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Amenities */}
            <div className="mb-8 transition-all duration-500 delay-900">
              <label className="block text-sm font-medium text-gray-700 mb-3 transition-all duration-500 delay-1000">
                What amenities do you offer? *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 transition-all duration-500 delay-1100">
                {amenitiesList.map((amenity, index) => (
                  <label key={amenity} className="flex items-center space-x-2 cursor-pointer transition-all duration-300 delay-1200 hover:scale-105">
                    <input
                      type="checkbox"
                      checked={homeDetails.amenities.includes(amenity)}
                      onChange={() => handleAmenityToggle(amenity)}
                      className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 transition-all duration-300"
                    />
                    <span className="text-sm text-gray-700 transition-all duration-300">{amenity}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t border-gray-200 transition-all duration-500 delay-1000">
              <Link
                to="/host/property-type"
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-all duration-300 delay-1100 hover:shadow-md hover:-translate-y-0.5"
              >
                Back
              </Link>
              <button
                type="submit"
                className="px-6 py-3 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-all duration-300 delay-1200 hover:shadow-lg hover:-translate-y-0.5"
              >
                Continue to Location
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default HostHomeDetails;