import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useHost } from './contexts/HostContext';

const HostPropertyType = () => {
  const { updateHostData } = useHost();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [selectedType, setSelectedType] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePropertyTypeSelect = (type) => {
    setSelectedType(type);
    
    // Add a small delay for smooth transition
    setTimeout(() => {
      // Update context with selected property type
      updateHostData({
        propertyType: type,
        currentStep: 3
      });

      // Navigate to appropriate form
      switch(type) {
        case 'home':
          navigate('/host/home-details');
          break;
        case 'experience':
          navigate('/host/experience-details');
          break;
        case 'service':
          navigate('/host/service-details');
          break;
        default:
          break;
      }
    }, 300);
  };

  return (
    <div className={`min-h-screen bg-gray-50 py-8 animate-multi-layer transition-all duration-1000 ${
      mounted ? 'opacity-100' : 'opacity-0'
    }`}>
      <div className="max-w-4xl mx-auto px-4">
        {/* Progress Bar */}
        <div className={`mb-8 transition-all duration-700 delay-200 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <div className="flex items-center justify-between mb-2 transition-all duration-500 delay-300">
            <span className="text-sm font-medium text-teal-600">Step 2 of 9</span>
            <span className="text-sm text-gray-500">Choose Category</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 transition-all duration-500 delay-400">
            <div className="bg-teal-600 h-2 rounded-full w-2/7 transition-all duration-700 delay-500"></div>
          </div>
        </div>

        {/* Header Section */}
        <div className={`text-center mb-8 transition-all duration-700 delay-300 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 transition-all duration-700 delay-400">
            What are you offering?
          </h1>
          <p className="text-gray-600 transition-all duration-700 delay-500">
            Choose the category that best fits your listing.
          </p>
        </div>

        {/* Property Type Cards */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto transition-all duration-700 delay-400 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          {/* Home Card */}
          <button
            onClick={() => handlePropertyTypeSelect('home')}
            className={`bg-white rounded-xl shadow-sm border-2 p-6 text-center transition-all duration-300 delay-500 hover:shadow-md group ${
              selectedType === 'home' 
                ? 'border-teal-500 bg-teal-50 scale-105' 
                : 'border-gray-200 hover:border-teal-500'
            }`}
          >
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-500 delay-600 group-hover:scale-110 ${
              selectedType === 'home' ? 'bg-teal-200' : 'bg-teal-100 group-hover:bg-teal-200'
            }`}>
              <span className="text-2xl transition-all duration-300 delay-700">🏠</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2 transition-all duration-500 delay-700">Home</h3>
            <p className="text-gray-600 text-sm transition-all duration-500 delay-800">
              Rent out your property, apartment, or vacation home
            </p>
          </button>

          {/* Experience Card */}
          <button
            onClick={() => handlePropertyTypeSelect('experience')}
            className={`bg-white rounded-xl shadow-sm border-2 p-6 text-center transition-all duration-300 delay-600 hover:shadow-md group ${
              selectedType === 'experience' 
                ? 'border-teal-500 bg-teal-50 scale-105' 
                : 'border-gray-200 hover:border-teal-500'
            }`}
          >
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-500 delay-700 group-hover:scale-110 ${
              selectedType === 'experience' ? 'bg-teal-200' : 'bg-teal-100 group-hover:bg-teal-200'
            }`}>
              <span className="text-2xl transition-all duration-300 delay-800">🎭</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2 transition-all duration-500 delay-800">Experience</h3>
            <p className="text-gray-600 text-sm transition-all duration-500 delay-900">
              Host tours, activities, workshops, or events
            </p>
          </button>

          {/* Service Card */}
          <button
            onClick={() => handlePropertyTypeSelect('service')}
            className={`bg-white rounded-xl shadow-sm border-2 p-6 text-center transition-all duration-300 delay-700 hover:shadow-md group ${
              selectedType === 'service' 
                ? 'border-teal-500 bg-teal-50 scale-105' 
                : 'border-gray-200 hover:border-teal-500'
            }`}
          >
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-500 delay-800 group-hover:scale-110 ${
              selectedType === 'service' ? 'bg-teal-200' : 'bg-teal-100 group-hover:bg-teal-200'
            }`}>
              <span className="text-2xl transition-all duration-300 delay-900">🔧</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2 transition-all duration-500 delay-900">Service</h3>
            <p className="text-gray-600 text-sm transition-all duration-500 delay-1000">
              Offer your skills, repairs, consultations, or professional services
            </p>
          </button>
        </div>

        {/* Back Button */}
        <div className={`text-center mt-8 transition-all duration-700 delay-800 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <Link 
            to="/host/onboarding"
            className="inline-flex items-center text-gray-600 hover:text-gray-800 font-medium transition-all duration-300 delay-900 hover:scale-105"
          >
            ← Back
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HostPropertyType;