// HostPropertyType.jsx - Second step (UI Only)
import { useState } from 'react';

function HostPropertyType() {
  const [selectedCategory, setSelectedCategory] = useState('');

  const categories = [
    {
      id: 'home',
      name: 'Accommodation',
      icon: '🏡',
      description: 'Rent out your space for stays',
      examples: 'Villas, Treehouses, Eco-pods, etc.'
    },
    {
      id: 'experience', 
      name: 'Experience',
      icon: '🌿',
      description: 'Host activities and tours',
      examples: 'Farm tours, Cooking classes, Eco-workshops'
    },
    {
      id: 'service',
      name: 'Service', 
      icon: '🔧',
      description: 'Offer professional services',
      examples: 'Eco-consulting, Garden setup, Sustainability audits'
    }
  ];

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
  };

  const handleContinue = () => {
    // We'll add navigation logic here later
    console.log('Selected category:', selectedCategory);
    alert(`You selected: ${selectedCategory}. Navigation logic coming soon!`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="w-1/4 h-2 bg-teal-500 rounded-full"></div>
            <div className="w-1/4 h-2 bg-teal-500 rounded-full"></div>
            <div className="w-1/4 h-2 bg-gray-200 rounded-full"></div>
            <div className="w-1/4 h-2 bg-gray-200 rounded-full"></div>
          </div>
          <p className="text-center text-sm text-gray-600">Step 2 of 4 - Property Type</p>
        </div>

        <h1 className="text-3xl font-bold text-center mb-4">What are you offering?</h1>
        <p className="text-lg text-gray-600 text-center mb-8">
          Choose the category that best fits your offering
        </p>
        
        {/* Category Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {categories.map((category) => (
            <div 
              key={category.id}
              onClick={() => handleCategorySelect(category.id)}
              className={`border-2 rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
                selectedCategory === category.id 
                  ? 'border-teal-500 bg-teal-50 shadow-md' 
                  : 'border-gray-200 bg-white hover:border-teal-300 hover:shadow-sm'
              }`}
            >
              <div className="text-5xl mb-4">{category.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{category.name}</h3>
              <p className="text-gray-600 mb-4">{category.description}</p>
              <div className="text-xs text-gray-500 bg-gray-100 rounded-lg py-2 px-3">
                {category.examples}
              </div>
            </div>
          ))}
        </div>

        {/* Continue Button */}
        <div className="text-center">
          <button 
            onClick={handleContinue}
            disabled={!selectedCategory}
            className={`px-8 py-3 rounded-lg font-semibold transition-colors ${
              selectedCategory 
                ? 'bg-teal-600 text-white hover:bg-teal-700' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Continue
          </button>
          <p className="text-gray-500 text-sm mt-4">
            {!selectedCategory ? 'Please select a category to continue' : 'Ready to set up your listing!'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default HostPropertyType;