import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useHost } from './contexts/HostContext';

const HostExperienceDetails = () => {
  const { hostData, updateHostData } = useHost();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [experienceDetails, setExperienceDetails] = useState(hostData.experienceDetails || {
    title: '',
    description: '',
    experienceType: '',
    duration: 2,
    groupSize: 1,
    includes: [],
    requirements: [],
    whatToBring: [],
    ageRequirement: 'all-ages',
    fitnessLevel: 'easy'
  });

  const experienceTypes = [
    'Nature & Adventure',
    'Food & Drink',
    'Arts & Culture',
    'Wellness & Fitness',
    'History & Education',
    'Photography',
    'Music & Dance',
    'Craft & Workshop',
    'Water Sports',
    'Wildlife & Safari'
  ];

  const includesOptions = [
    'Food & Drinks',
    'Equipment',
    'Transportation',
    'Professional Guide',
    'Souvenirs',
    'Photos',
    'Entrance Fees',
    'Certificates'
  ];

  const fitnessLevels = [
    { value: 'easy', label: 'Easy (Suitable for everyone)' },
    { value: 'moderate', label: 'Moderate (Some physical activity)' },
    { value: 'active', label: 'Active (Good fitness level required)' },
    { value: 'challenging', label: 'Challenging (Experienced participants)' }
  ];

  const handleArrayToggle = (field, item) => {
    setExperienceDetails(prev => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter(i => i !== item)
        : [...prev[field], item]
    }));
  };

  const handleWhatToBringAdd = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      e.preventDefault();
      const newItem = e.target.value.trim();
      setExperienceDetails(prev => ({
        ...prev,
        whatToBring: [...prev.whatToBring, newItem]
      }));
      e.target.value = '';
    }
  };

  const handleRequirementAdd = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      e.preventDefault();
      const newItem = e.target.value.trim();
      setExperienceDetails(prev => ({
        ...prev,
        requirements: [...prev.requirements, newItem]
      }));
      e.target.value = '';
    }
  };

  const removeArrayItem = (field, index) => {
    setExperienceDetails(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Save to context
    updateHostData({
      experienceDetails,
      currentStep: 4
    });

    console.log('Experience Details Saved:', experienceDetails);
    
    // Navigate to next step
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
            <span className="text-sm text-gray-500">Experience Details</span>
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
            Create your experience
          </h1>
          <p className="text-gray-600 mb-6 transition-all duration-700 delay-500">
            Tell guests what makes your experience unique and memorable.
          </p>

          <form onSubmit={handleSubmit}>
            {/* Title */}
            <div className="mb-6 transition-all duration-500 delay-600">
              <label className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-500 delay-700">
                Experience Title *
              </label>
              <input
                type="text"
                required
                value={experienceDetails.title}
                onChange={(e) => setExperienceDetails(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Sunset Yoga on the Beach"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300 delay-800 hover:border-gray-400 focus:scale-[1.02]"
              />
            </div>

            {/* Experience Type */}
            <div className="mb-6 transition-all duration-500 delay-700">
              <label className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-500 delay-800">
                Experience Type *
              </label>
              <select
                required
                value={experienceDetails.experienceType}
                onChange={(e) => setExperienceDetails(prev => ({ ...prev, experienceType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300 delay-900 hover:border-gray-400 focus:scale-[1.02]"
              >
                <option value="">Select a category</option>
                {experienceTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="mb-6 transition-all duration-500 delay-800">
              <label className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-500 delay-900">
                Experience Description *
              </label>
              <textarea
                required
                value={experienceDetails.description}
                onChange={(e) => setExperienceDetails(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what guests will do, learn, and experience. What makes this special?"
                rows="4"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300 delay-1000 hover:border-gray-400 focus:scale-[1.02]"
              />
            </div>

            {/* Duration & Group Size */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 transition-all duration-500 delay-900">
              <div className="transition-all duration-500 delay-1000">
                <label className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-500 delay-1100">
                  Duration (hours) *
                </label>
                <select
                  value={experienceDetails.duration}
                  onChange={(e) => setExperienceDetails(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300 delay-1200 hover:border-gray-400 focus:scale-[1.02]"
                >
                  {[1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8].map(hours => (
                    <option key={hours} value={hours}>{hours} {hours === 1 ? 'hour' : 'hours'}</option>
                  ))}
                </select>
              </div>

              <div className="transition-all duration-500 delay-1100">
                <label className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-500 delay-1200">
                  Max Group Size *
                </label>
                <select
                  value={experienceDetails.groupSize}
                  onChange={(e) => setExperienceDetails(prev => ({ ...prev, groupSize: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300 delay-1300 hover:border-gray-400 focus:scale-[1.02]"
                >
                  {[1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30].map(size => (
                    <option key={size} value={size}>{size} {size === 1 ? 'guest' : 'guests'}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* What's Included */}
            <div className="mb-6 transition-all duration-500 delay-1000">
              <label className="block text-sm font-medium text-gray-700 mb-3 transition-all duration-500 delay-1100">
                What's included in your experience? *
              </label>
              <div className="grid grid-cols-2 gap-3 transition-all duration-500 delay-1200">
                {includesOptions.map((item, index) => (
                  <label key={item} className="flex items-center space-x-2 cursor-pointer transition-all duration-300 delay-1300 hover:scale-105">
                    <input
                      type="checkbox"
                      checked={experienceDetails.includes.includes(item)}
                      onChange={() => handleArrayToggle('includes', item)}
                      className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 transition-all duration-300"
                    />
                    <span className="text-sm text-gray-700 transition-all duration-300">{item}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Requirements */}
            <div className="mb-6 transition-all duration-500 delay-1100">
              <label className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-500 delay-1200">
                Requirements (e.g., "Must speak English", "Valid ID required")
              </label>
              <input
                type="text"
                onKeyDown={handleRequirementAdd}
                placeholder="Press Enter to add a requirement"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300 delay-1300 hover:border-gray-400 focus:scale-[1.02]"
              />
              <div className="flex flex-wrap gap-2 mt-2 transition-all duration-500 delay-1400">
                {experienceDetails.requirements.map((req, index) => (
                  <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800 transition-all duration-300 delay-1500 hover:scale-105">
                    {req}
                    <button
                      type="button"
                      onClick={() => removeArrayItem('requirements', index)}
                      className="ml-1.5 text-teal-600 hover:text-teal-800 transition-colors duration-200"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* What to Bring */}
            <div className="mb-6 transition-all duration-500 delay-1200">
              <label className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-500 delay-1300">
                What should guests bring?
              </label>
              <input
                type="text"
                onKeyDown={handleWhatToBringAdd}
                placeholder="Press Enter to add items (e.g., Water bottle, Comfortable shoes)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300 delay-1400 hover:border-gray-400 focus:scale-[1.02]"
              />
              <div className="flex flex-wrap gap-2 mt-2 transition-all duration-500 delay-1500">
                {experienceDetails.whatToBring.map((item, index) => (
                  <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 transition-all duration-300 delay-1600 hover:scale-105">
                    {item}
                    <button
                      type="button"
                      onClick={() => removeArrayItem('whatToBring', index)}
                      className="ml-1.5 text-blue-600 hover:text-blue-800 transition-colors duration-200"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Age & Fitness Requirements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 transition-all duration-500 delay-1300">
              <div className="transition-all duration-500 delay-1400">
                <label className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-500 delay-1500">
                  Age Requirement *
                </label>
                <select
                  value={experienceDetails.ageRequirement}
                  onChange={(e) => setExperienceDetails(prev => ({ ...prev, ageRequirement: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300 delay-1600 hover:border-gray-400 focus:scale-[1.02]"
                >
                  <option value="all-ages">All ages welcome</option>
                  <option value="18-plus">18+ only</option>
                  <option value="21-plus">21+ only</option>
                  <option value="family">Family-friendly (specify in description)</option>
                </select>
              </div>

              <div className="transition-all duration-500 delay-1500">
                <label className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-500 delay-1600">
                  Fitness Level *
                </label>
                <select
                  value={experienceDetails.fitnessLevel}
                  onChange={(e) => setExperienceDetails(prev => ({ ...prev, fitnessLevel: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300 delay-1700 hover:border-gray-400 focus:scale-[1.02]"
                >
                  {fitnessLevels.map(level => (
                    <option key={level.value} value={level.value}>{level.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t border-gray-200 transition-all duration-500 delay-1400">
              <Link
                to="/host/property-type"
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-all duration-300 delay-1500 hover:shadow-md hover:-translate-y-0.5"
              >
                Back
              </Link>
              <button
                type="submit"
                className="px-6 py-3 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-all duration-300 delay-1600 hover:shadow-lg hover:-translate-y-0.5"
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

export default HostExperienceDetails;