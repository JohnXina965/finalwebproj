import { useState } from 'react';
import { Link } from 'react-router-dom';

function Services() {
  const [selectedService, setSelectedService] = useState('All');
  
  const serviceCategories = ['All', 'Accommodation', 'Tours', 'Transportation', 'Dining', 'Wellness'];
  
  const services = [
    {
      id: 1,
      title: "Eco-Friendly Resort Stay",
      category: "Accommodation",
      price: "₱2,500/night",
      rating: 4.9,
      reviews: 234,
      image: "🏨",
      location: "Palawan",
      duration: "Flexible",
      description: "Stay in our sustainable resort powered by solar energy with zero-waste practices.",
      features: ["Solar Powered", "Organic Toiletries", "Waste Recycling", "Local Materials"]
    },
    {
      id: 2,
      title: "Guided Eco Tour",
      category: "Tours",
      price: "₱1,200/person",
      rating: 4.8,
      reviews: 167,
      image: "🚶‍♂️",
      location: "Various Locations",
      duration: "6 hours",
      description: "Expert-guided tours through natural habitats with environmental education.",
      features: ["Certified Guides", "Small Groups", "Educational", "Photo Opportunities"]
    },
    {
      id: 3,
      title: "Electric Vehicle Transfer",
      category: "Transportation",
      price: "₱800/trip",
      rating: 4.7,
      reviews: 89,
      image: "🚗",
      location: "Nationwide",
      duration: "As needed",
      description: "Carbon-neutral transportation using fully electric vehicles.",
      features: ["Zero Emissions", "Comfortable", "Reliable", "Eco-Certified"]
    },
    {
      id: 4,
      title: "Organic Farm-to-Table Dining",
      category: "Dining",
      price: "₱1,500/meal",
      rating: 4.9,
      reviews: 145,
      image: "🍽️",
      location: "Tagaytay",
      duration: "2 hours",
      description: "Fresh organic meals sourced directly from local sustainable farms.",
      features: ["Local Ingredients", "Vegetarian Options", "Seasonal Menu", "Chef's Special"]
    },
    {
      id: 5,
      title: "Eco Wellness Retreat",
      category: "Wellness",
      price: "₱3,500/session",
      rating: 4.8,
      reviews: 78,
      image: "🧘‍♀️",
      location: "Baguio",
      duration: "3 hours",
      description: "Holistic wellness experiences in natural settings with eco-friendly practices.",
      features: ["Yoga Sessions", "Meditation", "Natural Therapies", "Mindfulness"]
    },
    {
      id: 6,
      title: "Sustainable Camping Experience",
      category: "Accommodation",
      price: "₱1,800/night",
      rating: 4.6,
      reviews: 112,
      image: "⛺",
      location: "Rizal",
      duration: "Overnight",
      description: "Low-impact camping with all eco-friendly amenities and equipment.",
      features: ["Eco-Tents", "Solar Lighting", "Compost Toilets", "Campfire Cooking"]
    },
    {
      id: 7,
      title: "Marine Conservation Dive",
      category: "Tours",
      price: "₱2,200/person",
      rating: 4.9,
      reviews: 93,
      image: "🤿",
      location: "Batangas",
      duration: "4 hours",
      description: "Scuba diving experience combined with coral reef conservation activities.",
      features: ["PADI Certified", "Conservation Focus", "Marine Education", "Equipment Provided"]
    },
    {
      id: 8,
      title: "Bamboo Bike Tours",
      category: "Transportation",
      price: "₱600/tour",
      rating: 4.7,
      reviews: 67,
      image: "🚲",
      location: "Ilocos",
      duration: "3 hours",
      description: "Explore scenic routes on handcrafted bamboo bicycles.",
      features: ["Eco-Friendly Bikes", "Scenic Routes", "Local Guides", "Flexible Duration"]
    }
  ];

  const filteredServices = selectedService === 'All' 
    ? services 
    : services.filter(service => service.category === selectedService);

  return (
    <div className="min-h-screen bg-gray-50 pt-0">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Eco Services</h1>
          <p className="text-lg text-gray-600 max-w-2xl">
            Discover sustainable services that prioritize environmental conservation and community support.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="lg:w-1/4">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
              <h3 className="font-semibold text-gray-900 mb-4">Service Categories</h3>
              <div className="space-y-2">
                {serviceCategories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedService(category)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedService === category
                        ? 'bg-teal-50 text-teal-700 font-semibold'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              {/* Price Filter */}
              <div className="mt-6">
                <h3 className="font-semibold text-gray-900 mb-4">Price Range</h3>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="">Any Price</option>
                  <option value="budget">Under ₱1,000</option>
                  <option value="medium">₱1,000 - ₱2,500</option>
                  <option value="premium">Over ₱2,500</option>
                </select>
              </div>

              {/* Duration Filter */}
              <div className="mt-6">
                <h3 className="font-semibold text-gray-900 mb-4">Duration</h3>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="">Any Duration</option>
                  <option value="short">Under 2 hours</option>
                  <option value="medium">2-4 hours</option>
                  <option value="long">Over 4 hours</option>
                  <option value="overnight">Overnight</option>
                </select>
              </div>

              {/* Rating Filter */}
              <div className="mt-6">
                <h3 className="font-semibold text-gray-900 mb-4">Minimum Rating</h3>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="">Any Rating</option>
                  <option value="4.5">4.5+ Stars</option>
                  <option value="4.0">4.0+ Stars</option>
                  <option value="3.5">3.5+ Stars</option>
                </select>
              </div>
            </div>
          </div>

          {/* Services Grid */}
          <div className="lg:w-3/4">
            <div className="flex justify-between items-center mb-6">
              <p className="text-gray-600">
                Showing {filteredServices.length} services
                {selectedService !== 'All' && ` in ${selectedService}`}
              </p>
              <select className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="featured">Sort by: Featured</option>
                <option value="rating">Sort by: Highest Rating</option>
                <option value="price-low">Sort by: Price: Low to High</option>
                <option value="price-high">Sort by: Price: High to Low</option>
                <option value="popular">Sort by: Most Popular</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
              {filteredServices.map(service => (
                <div key={service.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-gray-100 group">
                  <div className="h-48 bg-gradient-to-br from-teal-400 to-green-500 flex items-center justify-center text-6xl group-hover:scale-105 transition-transform duration-300">
                    {service.image}
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{service.title}</h3>
                      <span className="text-teal-600 font-bold">{service.price}</span>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-3">
                      {service.category} • {service.location} • {service.duration}
                    </p>
                    
                    <p className="text-gray-700 text-sm mb-4">
                      {service.description}
                    </p>
                    
                    {/* Features */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {service.features.map((feature, index) => (
                        <span 
                          key={index}
                          className="bg-teal-50 text-teal-700 text-xs px-2 py-1 rounded-full"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                    
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>📍 {service.location}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-yellow-500">⭐</span>
                        <span className="text-gray-700 ml-1 text-sm">{service.rating}</span>
                        <span className="text-gray-500 ml-1 text-sm">({service.reviews})</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <button className="flex-1 bg-teal-500 text-white py-3 rounded-lg font-semibold hover:bg-teal-600 transition-colors">
                        Book Now
                      </button>
                      <button className="px-4 border border-teal-500 text-teal-500 py-3 rounded-lg font-semibold hover:bg-teal-50 transition-colors">
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action Section */}
      <div className="bg-teal-600 mt-12">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Ready to Experience Sustainable Travel?</h2>
            <p className="text-teal-100 text-lg mb-6 max-w-2xl mx-auto">
              Join thousands of eco-conscious travelers who have discovered the joy of sustainable tourism with Eco Express.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/signup" 
                className="bg-white text-teal-600 px-8 py-3 rounded-lg font-semibold hover:bg-teal-50 transition-colors"
              >
                Create Account
              </Link>
              <Link 
                to="/experiences" 
                className="border border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors"
              >
                Explore Experiences
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Services;