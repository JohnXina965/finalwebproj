import { useState } from 'react';
import { Link } from 'react-router-dom';

function Experiences() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  const categories = ['All', 'Agriculture', 'Conservation', 'Culinary', 'Adventure', 'Education'];
  
  const experiences = [
    {
      id: 1,
      title: "Eco Farm Tour & Harvesting",
      category: "Agriculture",
      price: "₱1,500",
      rating: 4.8,
      reviews: 124,
      image: "🌱",
      location: "Laguna",
      duration: "4 hours",
      description: "Experience organic farming and harvest fresh produce from our sustainable farm."
    },
    {
      id: 2,
      title: "Beach Cleanup & Marine Conservation",
      category: "Conservation",
      price: "₱800",
      rating: 4.9,
      reviews: 89,
      image: "🏖️",
      location: "Batangas",
      duration: "3 hours",
      description: "Join our coastal cleanup and learn about marine ecosystem preservation."
    },
    {
      id: 3,
      title: "Organic Cooking Masterclass",
      category: "Culinary",
      price: "₱2,000",
      rating: 4.7,
      reviews: 67,
      image: "👨‍🍳",
      location: "Manila",
      duration: "2.5 hours",
      description: "Learn to cook delicious meals using organic ingredients from local farms."
    },
    {
      id: 4,
      title: "Forest Trek & Wildlife Spotting",
      category: "Adventure",
      price: "₱1,200",
      rating: 4.6,
      reviews: 156,
      image: "🌲",
      location: "Rizal",
      duration: "5 hours",
      description: "Guided trek through protected forests with wildlife education."
    },
    {
      id: 5,
      title: "Sustainable Living Workshop",
      category: "Education",
      price: "₱1,800",
      rating: 4.9,
      reviews: 45,
      image: "📚",
      location: "Quezon City",
      duration: "3 hours",
      description: "Hands-on workshop on zero-waste living and sustainable practices."
    },
    {
      id: 6,
      title: "River Kayaking & Cleanup",
      category: "Adventure",
      price: "₱1,500",
      rating: 4.7,
      reviews: 78,
      image: "🛶",
      location: "Pampanga",
      duration: "4 hours",
      description: "Combine adventure with environmental conservation on our river kayaking tour."
    }
  ];

  const filteredExperiences = selectedCategory === 'All' 
    ? experiences 
    : experiences.filter(exp => exp.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gray-50 pt-0">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Eco Experiences</h1>
          <p className="text-lg text-gray-600 max-w-2xl">
            Discover immersive activities that connect you with nature and sustainable living practices.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="lg:w-1/4">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
              <h3 className="font-semibold text-gray-900 mb-4">Categories</h3>
              <div className="space-y-2">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedCategory === category
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
                  <option value="medium">₱1,000 - ₱2,000</option>
                  <option value="premium">Over ₱2,000</option>
                </select>
              </div>

              {/* Location Filter */}
              <div className="mt-6">
                <h3 className="font-semibold text-gray-900 mb-4">Location</h3>
                <input 
                  type="text" 
                  placeholder="Enter location..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Experiences Grid */}
          <div className="lg:w-3/4">
            <div className="flex justify-between items-center mb-6">
              <p className="text-gray-600">
                Showing {filteredExperiences.length} experiences
                {selectedCategory !== 'All' && ` in ${selectedCategory}`}
              </p>
              <select className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="featured">Sort by: Featured</option>
                <option value="rating">Sort by: Highest Rating</option>
                <option value="price-low">Sort by: Price: Low to High</option>
                <option value="price-high">Sort by: Price: High to Low</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredExperiences.map(experience => (
                <div key={experience.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-gray-100 group">
                  <div className="h-48 bg-gradient-to-br from-teal-400 to-green-500 flex items-center justify-center text-6xl group-hover:scale-105 transition-transform duration-300">
                    {experience.image}
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{experience.title}</h3>
                      <span className="text-teal-600 font-bold">{experience.price}</span>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-3">
                      {experience.category} • {experience.location}
                    </p>
                    
                    <p className="text-gray-700 text-sm mb-4 line-clamp-2">
                      {experience.description}
                    </p>
                    
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>⏱️ {experience.duration}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-yellow-500">⭐</span>
                        <span className="text-gray-700 ml-1 text-sm">{experience.rating}</span>
                        <span className="text-gray-500 ml-1 text-sm">({experience.reviews})</span>
                      </div>
                    </div>
                    
                    <button className="w-full bg-teal-500 text-white py-3 rounded-lg font-semibold hover:bg-teal-600 transition-colors">
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Experiences;