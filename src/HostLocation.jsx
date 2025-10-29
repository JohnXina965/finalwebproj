import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useHost } from './contexts/HostContext';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const HostLocation = () => {
  const { updateHostData } = useHost();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [location, setLocation] = useState({
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    coordinates: [51.505, -0.09] // Same default coordinates as Leaflet example (London)
  });

  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Map click handler component
  function MapClickHandler({ onMapClick }) {
    useMapEvents({
      click: (e) => {
        onMapClick(e);
      },
    });
    return null;
  }

  const handleMapClick = (e) => {
    const { lat, lng } = e.latlng;
    setLocation(prev => ({
      ...prev,
      coordinates: [lat, lng]
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setLocation(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Save to context
    updateHostData({
      location,
      currentStep: 5
    });

    console.log('Location Saved:', location);
    navigate('/host/pricing');
  };

  // Get user's current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation(prev => ({
            ...prev,
            coordinates: [latitude, longitude]
          }));
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to get your current location. Please allow location access or select manually.');
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  };

  useEffect(() => {
    setIsMapLoaded(true);
  }, []);

  return (
    <div className={`min-h-screen bg-gray-50 py-8 animate-multi-layer transition-all duration-1000 ${
      mounted ? 'opacity-100' : 'opacity-0'
    }`}>
      <div className="max-w-4xl mx-auto px-4">
        {/* Progress Bar - UPDATED to 9 steps */}
        <div className={`mb-8 transition-all duration-700 delay-200 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <div className="flex items-center justify-between mb-2 transition-all duration-500 delay-300">
            <span className="text-sm font-medium text-teal-600">Step 4 of 9</span>
            <span className="text-sm text-gray-500">Location</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 transition-all duration-500 delay-400">
            <div className="bg-teal-600 h-2 rounded-full w-4/9 transition-all duration-700 delay-500"></div>
          </div>
        </div>

        <div className={`text-center mb-8 transition-all duration-700 delay-300 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 transition-all duration-700 delay-400">
            Where's your place located?
          </h1>
          <p className="text-gray-600 transition-all duration-700 delay-500">
            Guests will only get your exact address once they book a reservation.
          </p>
        </div>

        <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all duration-700 delay-400 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <form onSubmit={handleSubmit}>
            {/* Map Section */}
            <div className="mb-8 transition-all duration-500 delay-500">
              <div className="flex justify-between items-center mb-4 transition-all duration-500 delay-600">
                <label className="block text-sm font-medium text-gray-700 transition-all duration-500 delay-700">
                  Pin your location on the map *
                </label>
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  className="px-4 py-2 text-sm bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 transition-all duration-300 delay-800 hover:shadow-md hover:-translate-y-0.5"
                >
                  Use My Current Location
                </button>
              </div>
              
              <div className="h-96 rounded-lg overflow-hidden border border-gray-300 transition-all duration-500 delay-700">
                {isMapLoaded && (
                  <MapContainer
                    center={location.coordinates}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    
                    <Marker position={location.coordinates}>
                      <Popup>
                        Your property location<br />
                        Latitude: {location.coordinates[0].toFixed(6)}<br />
                        Longitude: {location.coordinates[1].toFixed(6)}
                      </Popup>
                    </Marker>
                    
                    <MapClickHandler onMapClick={handleMapClick} />
                  </MapContainer>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-2 transition-all duration-500 delay-800">
                Click on the map to set your exact location. Coordinates: {location.coordinates[0].toFixed(6)}, {location.coordinates[1].toFixed(6)}
              </p>
            </div>

            {/* Address Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 transition-all duration-500 delay-600">
              <div className="transition-all duration-500 delay-700">
                <label className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-500 delay-800">
                  Street Address *
                </label>
                <input
                  type="text"
                  name="address"
                  required
                  value={location.address}
                  onChange={handleInputChange}
                  placeholder="123 Main Street"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300 delay-900 hover:border-gray-400 focus:scale-[1.02]"
                />
              </div>

              <div className="transition-all duration-500 delay-800">
                <label className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-500 delay-900">
                  City *
                </label>
                <input
                  type="text"
                  name="city"
                  required
                  value={location.city}
                  onChange={handleInputChange}
                  placeholder="London"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300 delay-1000 hover:border-gray-400 focus:scale-[1.02]"
                />
              </div>

              <div className="transition-all duration-500 delay-900">
                <label className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-500 delay-1000">
                  State/Province *
                </label>
                <input
                  type="text"
                  name="state"
                  required
                  value={location.state}
                  onChange={handleInputChange}
                  placeholder="England"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300 delay-1100 hover:border-gray-400 focus:scale-[1.02]"
                />
              </div>

              <div className="transition-all duration-500 delay-1000">
                <label className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-500 delay-1100">
                  ZIP/Postal Code *
                </label>
                <input
                  type="text"
                  name="zipCode"
                  required
                  value={location.zipCode}
                  onChange={handleInputChange}
                  placeholder="SW1A 1AA"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300 delay-1200 hover:border-gray-400 focus:scale-[1.02]"
                />
              </div>

              <div className="md:col-span-2 transition-all duration-500 delay-1100">
                <label className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-500 delay-1200">
                  Country *
                </label>
                <input
                  type="text"
                  name="country"
                  required
                  value={location.country}
                  onChange={handleInputChange}
                  placeholder="United Kingdom"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300 delay-1300 hover:border-gray-400 focus:scale-[1.02]"
                />
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t border-gray-200 transition-all duration-500 delay-700">
              <Link
                to="/host/home-details"
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-all duration-300 delay-800 hover:shadow-md hover:-translate-y-0.5"
              >
                Back
              </Link>
              <button
                type="submit"
                className="px-6 py-3 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-all duration-300 delay-900 hover:shadow-lg hover:-translate-y-0.5"
              >
                Continue to Pricing
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default HostLocation;