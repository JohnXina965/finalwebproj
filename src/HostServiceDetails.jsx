import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useHost } from './contexts/HostContext';

const HostServiceDetails = () => {
  const { hostData, updateHostData } = useHost();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [serviceDetails, setServiceDetails] = useState(hostData.serviceDetails || {
    title: '',
    description: '',
    serviceCategory: '',
    skills: [],
    availability: {
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false
    },
    serviceRadius: 10,
    toolsProvided: [],
    certifications: [],
    experienceYears: 1,
    ecoFriendly: false,
    sustainablePractices: []
  });

  const serviceCategories = [
    'Home Repair & Maintenance',
    'Cleaning Services',
    'Gardening & Landscaping',
    'Personal Training',
    'Tutoring & Education',
    'Beauty & Wellness',
    'Pet Care',
    'Moving & Transportation',
    'Tech Support',
    'Consulting & Coaching',
    'Event Planning',
    'Photography & Videography',
    'Other'
  ];

  const sustainablePracticesOptions = [
    'Uses eco-friendly products',
    'Zero-waste approach',
    'Energy efficient methods',
    'Water conservation',
    'Local materials sourcing',
    'Carbon neutral transportation',
    'Repair over replacement',
    'Upcycling & repurposing'
  ];

  const handleSkillsAdd = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      e.preventDefault();
      const newSkill = e.target.value.trim();
      setServiceDetails(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill]
      }));
      e.target.value = '';
    }
  };

  const handleToolsAdd = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      e.preventDefault();
      const newTool = e.target.value.trim();
      setServiceDetails(prev => ({
        ...prev,
        toolsProvided: [...prev.toolsProvided, newTool]
      }));
      e.target.value = '';
    }
  };

  const handleCertificationsAdd = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      e.preventDefault();
      const newCert = e.target.value.trim();
      setServiceDetails(prev => ({
        ...prev,
        certifications: [...prev.certifications, newCert]
      }));
      e.target.value = '';
    }
  };

  const removeArrayItem = (field, index) => {
    setServiceDetails(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleAvailabilityToggle = (day) => {
    setServiceDetails(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        [day]: !prev.availability[day]
      }
    }));
  };

  const handleSustainablePracticeToggle = (practice) => {
    setServiceDetails(prev => ({
      ...prev,
      sustainablePractices: prev.sustainablePractices.includes(practice)
        ? prev.sustainablePractices.filter(p => p !== practice)
        : [...prev.sustainablePractices, practice]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    updateHostData({
      serviceDetails,
      currentStep: 4
    });

    console.log('Service Details Saved:', serviceDetails);
    
    navigate('/host/location');
  };

  const daysOfWeek = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' }
  ];

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
            <span className="text-sm text-gray-500">Service Details</span>
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
            Describe your service
          </h1>
          <p className="text-gray-600 mb-6 transition-all duration-700 delay-500">
            Tell customers about your skills, expertise, and what makes your service special.
          </p>

          <form onSubmit={handleSubmit}>
            {/* Title */}
            <div className="mb-6 transition-all duration-500 delay-600">
              <label className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-500 delay-700">
                Service Title *
              </label>
              <input
                type="text"
                required
                value={serviceDetails.title}
                onChange={(e) => setServiceDetails(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Professional Home Cleaning Service"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300 delay-800 hover:border-gray-400 focus:scale-[1.02]"
              />
            </div>

            {/* Service Category */}
            <div className="mb-6 transition-all duration-500 delay-700">
              <label className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-500 delay-800">
                Service Category *
              </label>
              <select
                required
                value={serviceDetails.serviceCategory}
                onChange={(e) => setServiceDetails(prev => ({ ...prev, serviceCategory: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300 delay-900 hover:border-gray-400 focus:scale-[1.02]"
              >
                <option value="">Select a category</option>
                {serviceCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="mb-6 transition-all duration-500 delay-800">
              <label className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-500 delay-900">
                Service Description *
              </label>
              <textarea
                required
                value={serviceDetails.description}
                onChange={(e) => setServiceDetails(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what your service includes, your approach, and what customers can expect..."
                rows="4"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300 delay-1000 hover:border-gray-400 focus:scale-[1.02]"
              />
            </div>

            {/* Skills & Expertise */}
            <div className="mb-6 transition-all duration-500 delay-900">
              <label className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-500 delay-1000">
                Skills & Expertise *
              </label>
              <input
                type="text"
                onKeyDown={handleSkillsAdd}
                placeholder="Press Enter to add skills (e.g., Plumbing, Electrical, Deep Cleaning)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300 delay-1100 hover:border-gray-400 focus:scale-[1.02]"
              />
              <div className="flex flex-wrap gap-2 mt-2 transition-all duration-500 delay-1200">
                {serviceDetails.skills.map((skill, index) => (
                  <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 transition-all duration-300 delay-1300 hover:scale-105">
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeArrayItem('skills', index)}
                      className="ml-1.5 text-purple-600 hover:text-purple-800 transition-colors duration-200"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Experience & Service Radius */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 transition-all duration-500 delay-1000">
              <div className="transition-all duration-500 delay-1100">
                <label className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-500 delay-1200">
                  Years of Experience *
                </label>
                <select
                  value={serviceDetails.experienceYears}
                  onChange={(e) => setServiceDetails(prev => ({ ...prev, experienceYears: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300 delay-1300 hover:border-gray-400 focus:scale-[1.02]"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20].map(years => (
                    <option key={years} value={years}>{years} {years === 1 ? 'year' : 'years'}</option>
                  ))}
                </select>
              </div>

              <div className="transition-all duration-500 delay-1200">
                <label className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-500 delay-1300">
                  Service Radius (miles) *
                </label>
                <select
                  value={serviceDetails.serviceRadius}
                  onChange={(e) => setServiceDetails(prev => ({ ...prev, serviceRadius: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300 delay-1400 hover:border-gray-400 focus:scale-[1.02]"
                >
                  {[5, 10, 15, 20, 25, 30, 40, 50, 100].map(miles => (
                    <option key={miles} value={miles}>{miles} miles</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Availability */}
            <div className="mb-6 transition-all duration-500 delay-1100">
              <label className="block text-sm font-medium text-gray-700 mb-3 transition-all duration-500 delay-1200">
                Availability *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 transition-all duration-500 delay-1300">
                {daysOfWeek.map((day, index) => (
                  <label key={day.key} className="flex items-center space-x-2 cursor-pointer transition-all duration-300 delay-1400 hover:scale-105">
                    <input
                      type="checkbox"
                      checked={serviceDetails.availability[day.key]}
                      onChange={() => handleAvailabilityToggle(day.key)}
                      className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 transition-all duration-300"
                    />
                    <span className="text-sm text-gray-700 transition-all duration-300">{day.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Tools Provided */}
            <div className="mb-6 transition-all duration-500 delay-1200">
              <label className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-500 delay-1300">
                Tools & Equipment Provided
              </label>
              <input
                type="text"
                onKeyDown={handleToolsAdd}
                placeholder="Press Enter to add tools (e.g., Professional cleaning equipment, Power tools)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300 delay-1400 hover:border-gray-400 focus:scale-[1.02]"
              />
              <div className="flex flex-wrap gap-2 mt-2 transition-all duration-500 delay-1500">
                {serviceDetails.toolsProvided.map((tool, index) => (
                  <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 transition-all duration-300 delay-1600 hover:scale-105">
                    {tool}
                    <button
                      type="button"
                      onClick={() => removeArrayItem('toolsProvided', index)}
                      className="ml-1.5 text-blue-600 hover:text-blue-800 transition-colors duration-200"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Certifications */}
            <div className="mb-6 transition-all duration-500 delay-1300">
              <label className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-500 delay-1400">
                Certifications & Licenses
              </label>
              <input
                type="text"
                onKeyDown={handleCertificationsAdd}
                placeholder="Press Enter to add certifications"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300 delay-1500 hover:border-gray-400 focus:scale-[1.02]"
              />
              <div className="flex flex-wrap gap-2 mt-2 transition-all duration-500 delay-1600">
                {serviceDetails.certifications.map((cert, index) => (
                  <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 transition-all duration-300 delay-1700 hover:scale-105">
                    {cert}
                    <button
                      type="button"
                      onClick={() => removeArrayItem('certifications', index)}
                      className="ml-1.5 text-green-600 hover:text-green-800 transition-colors duration-200"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Eco-Friendly Options */}
            <div className="mb-6 transition-all duration-500 delay-1400">
              <label className="block text-sm font-medium text-gray-700 mb-3 transition-all duration-500 delay-1500">
                Eco-Friendly & Sustainable Practices
              </label>
              
              <div className="mb-4 transition-all duration-500 delay-1600">
                <label className="flex items-center space-x-2 cursor-pointer transition-all duration-300 delay-1700 hover:scale-105">
                  <input
                    type="checkbox"
                    checked={serviceDetails.ecoFriendly}
                    onChange={(e) => setServiceDetails(prev => ({ ...prev, ecoFriendly: e.target.checked }))}
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 transition-all duration-300"
                  />
                  <span className="text-sm text-gray-700 transition-all duration-300">This is an eco-friendly service</span>
                </label>
              </div>

              {serviceDetails.ecoFriendly && (
                <div className="transition-all duration-500 delay-1800">
                  <p className="text-sm text-gray-600 mb-3 transition-all duration-500 delay-1900">Select sustainable practices you follow:</p>
                  <div className="grid grid-cols-1 gap-2 transition-all duration-500 delay-2000">
                    {sustainablePracticesOptions.map((practice, index) => (
                      <label key={practice} className="flex items-center space-x-2 cursor-pointer transition-all duration-300 delay-2100 hover:scale-105">
                        <input
                          type="checkbox"
                          checked={serviceDetails.sustainablePractices.includes(practice)}
                          onChange={() => handleSustainablePracticeToggle(practice)}
                          className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 transition-all duration-300"
                        />
                        <span className="text-sm text-gray-700 transition-all duration-300">{practice}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t border-gray-200 transition-all duration-500 delay-1500">
              <Link
                to="/host/property-type"
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-all duration-300 delay-1600 hover:shadow-md hover:-translate-y-0.5"
              >
                Back
              </Link>
              <button
                type="submit"
                className="px-6 py-3 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-all duration-300 delay-1700 hover:shadow-lg hover:-translate-y-0.5"
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

export default HostServiceDetails;