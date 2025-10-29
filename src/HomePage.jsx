import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import bamboohouse from './assets/bamboohouse2.jpg';
import makatieco from './assets/hotelroom.jpg';
import treehouse from './assets/treehouse3.jpg';
import treehouse2 from './assets/beachhouse1.jpg';

function HomePage() {
  const { currentUser } = useAuth();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timeoutRef = useRef(null);

  const heroImages = [
    {
      src: bamboohouse,
      title: "Eco Bamboo House",
      description: "Sustainable living in harmony with nature"
    },
    {
      src: makatieco,
      title: "Urban Eco Loft",
      description: "Modern sustainable living in the city"
    },
    {
      src: treehouse,
      title: "Treehouse Retreat",
      description: "Elevated experiences in the forest canopy"
    },
    {
      src: treehouse2,
      title: "Beach Eco Pod",
      description: "Minimalist coastal sustainable stays"
    }
  ];

  // Auto-rotate images with smooth transitions
  useEffect(() => {
    const rotateImages = () => {
      setIsTransitioning(true);
      
      // Wait for fade-out to complete before changing image
      timeoutRef.current = setTimeout(() => {
        setCurrentImageIndex((prevIndex) => 
          prevIndex === heroImages.length - 1 ? 0 : prevIndex + 1
        );
        
        // Wait a bit before starting fade-in
        setTimeout(() => {
          setIsTransitioning(false);
        }, 50);
      }, 800); // Match this with the CSS transition duration
    };

    const interval = setInterval(rotateImages, 5000); // Change every 5 seconds

    return () => {
      clearInterval(interval);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [heroImages.length]);

  // Manual navigation
  const goToImage = (index) => {
    setIsTransitioning(true);
    
    timeoutRef.current = setTimeout(() => {
      setCurrentImageIndex(index);
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 500);
  };

  // Mock data for featured accommodations
  const featuredAccommodations = [
    {
      id: 1,
      title: "Eco Bamboo House",
      type: "Entire Villa",
      price: "₱3,500",
      rating: 4.9,
      reviews: 128,
      image: bamboohouse,
      location: "El Nido, Palawan",
      features: ["Beachfront", "Solar Power", "Organic Garden"],
      host: "Maria Santos"
    },
    {
      id: 2,
      title: "Treehouse Retreat",
      type: "Entire Treehouse",
      price: "₱2,800",
      rating: 4.8,
      reviews: 94,
      image: treehouse,
      location: "Batangas",
      features: ["Forest View", "Eco-Friendly", "Yoga Deck"],
      host: "Juan Dela Cruz"
    },
    {
      id: 3,
      title: "Urban Eco Loft",
      type: "Entire Apartment",
      price: "₱1,900",
      rating: 4.7,
      reviews: 156,
      image: makatieco,
      location: "Makati, Manila",
      features: ["City Center", "Recycling", "Green Roof"],
      host: "Anna Reyes"
    },
    {
      id: 4,
      title: "Beach Eco Pod",
      type: "Tiny House",
      price: "₱2,200",
      rating: 4.6,
      reviews: 67,
      image: treehouse2,
      location: "La Union",
      features: ["Ocean View", "Compost Toilet", "Beach Access"],
      host: "Carlos Garcia"
    }
  ];

  const popularDestinations = [
    {
      id: 1,
      name: "Palawan",
      image: "🏝️",
      properties: "120+ stays",
      description: "Pristine islands and eco-resorts"
    },
    {
      id: 2,
      name: "Siargao",
      image: "🏄‍♂️",
      properties: "85+ stays",
      description: "Surf paradise with sustainable stays"
    },
    {
      id: 3,
      name: "Baguio",
      image: "⛰️",
      properties: "150+ stays",
      description: "Mountain retreats and cool climate"
    },
    {
      id: 4,
      name: "Cebu",
      image: "🏞️",
      properties: "200+ stays",
      description: "Beaches and mountain escapes"
    }
  ];

  const accommodationTypes = [
    {
      id: 1,
      name: "Eco Villas",
      icon: "🏡",
      description: "Private sustainable villas"
    },
    {
      id: 2,
      name: "Treehouses",
      icon: "🌳",
      description: "Unique elevated stays"
    },
    {
      id: 3,
      name: "Tiny Homes",
      icon: "📦",
      description: "Minimalist eco-living"
    },
    {
      id: 4,
      name: "Farm Stays",
      icon: "🚜",
      description: "Agricultural experiences"
    },
    {
      id: 5,
      name: "Beach Huts",
      icon: "🏖️",
      description: "Coastal eco-accommodations"
    },
    {
      id: 6,
      name: "Urban Eco",
      icon: "🏢",
      description: "City sustainable stays"
    }
  ];

  return (
    <div className="min-h-screen animate-multi-layer">
      {/* Hero Section with Animated Image Background */}
      <section className="relative text-white py-20 min-h-[80vh] flex items-center justify-center overflow-hidden">
        
        {/* Animated Image Background */}
        <div className="absolute inset-0">
          {heroImages.map((image, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
                index === currentImageIndex
                  ? isTransitioning
                    ? 'opacity-0 scale-105'
                    : 'opacity-100 scale-100'
                  : 'opacity-0 scale-105'
              }`}
              style={{
                backgroundImage: `url(${image.src})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                transition: 'opacity 1000ms ease-in-out, transform 1000ms ease-in-out'
              }}
            />
          ))}
          
          {/* Gradient overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/20"></div>
          
          {/* Subtle moving gradient overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-r from-teal-600/10 via-emerald-500/5 to-green-600/10 animate-pulse-slow"></div>
        </div>

        {/* Image Navigation Dots */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20 flex space-x-3">
          {heroImages.map((_, index) => (
            <button
              key={index}
              onClick={() => goToImage(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentImageIndex
                  ? 'bg-white scale-125'
                  : 'bg-white/50 hover:bg-white/80'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 relative z-10 text-center">
          <div className="max-w-4xl mx-auto">
            {/* Image Title */}
            <div className="mb-8 transition-all duration-500 transform hover:scale-105">
              <h2 className="text-2xl md:text-3xl font-light mb-2 text-white/90">
                {heroImages[currentImageIndex].title}
              </h2>
              <p className="text-lg text-white/70">
                {heroImages[currentImageIndex].description}
              </p>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              {currentUser ? `Welcome back to EcoExpress!` : `Discover Sustainable Living`}
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto">
              {currentUser 
                ? `Ready to book your next eco-friendly experience?` 
                : `Connect with eco-friendly experiences and services that make a difference for our planet.`
              }
            </p>
            
            {/* Search Bar */}
            <div className="max-w-4xl mx-auto transform transition-all duration-500 hover:scale-[1.02]">
              <div className="bg-white rounded-2xl p-2 shadow-2xl backdrop-blur-sm bg-white/95">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <div className="p-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input 
                      type="text" 
                      placeholder="Where are you going?"
                      className="w-full text-gray-800 placeholder-gray-500 focus:outline-none bg-transparent"
                    />
                  </div>
                  <div className="p-3 border-l border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Check-in</label>
                    <input 
                      type="date" 
                      placeholder="Add dates"
                      className="w-full text-gray-800 placeholder-gray-500 focus:outline-none bg-transparent"
                    />
                  </div>
                  <div className="p-3 border-l border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Check-out</label>
                    <input 
                      type="date" 
                      placeholder="Add dates"
                      className="w-full text-gray-800 placeholder-gray-500 focus:outline-none bg-transparent"
                    />
                  </div>
                  <div className="p-3 border-l border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Guests</label>
                    <div className="flex justify-between items-center">
                      <input 
                        type="text" 
                        placeholder="Add guests"
                        className="w-full text-gray-800 placeholder-gray-500 focus:outline-none bg-transparent"
                      />
                      <button className="bg-teal-600 text-white p-2 rounded-lg hover:bg-teal-700 transition-all duration-300 transform hover:scale-110">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Accommodation Types Section
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            Types of Eco-Stays
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {accommodationTypes.map((type) => (
              <div 
                key={type.id} 
                className="text-center group cursor-pointer transition-all duration-500 transform hover:scale-105 hover:-translate-y-2"
              >
                <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3 group-hover:bg-teal-200 transition-all duration-300 group-hover:shadow-lg">
                  {type.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-teal-600 transition-colors duration-300">
                  {type.name}
                </h3>
                <p className="text-sm text-gray-600 group-hover:text-gray-700 transition-colors duration-300">
                  {type.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section> */}

      {/* Featured Accommodations */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Featured Eco-Stays</h2>
              <p className="text-gray-600">Sustainable accommodations loved by travelers</p>
            </div>
            <Link 
              to="/experiences" 
              className="text-teal-600 hover:text-teal-700 font-semibold whitespace-nowrap transition-all duration-300 transform hover:translate-x-1"
            >
              Show all →
            </Link>
          </div>
          
          <div className="relative group">
            <button 
              className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-4 bg-white border border-gray-200 rounded-full p-2 shadow-lg hover:shadow-xl transition-all duration-300 opacity-0 group-hover:opacity-100 z-10 hover:scale-110"
              onClick={() => document.getElementById('scrollContainer').scrollBy({ left: -300, behavior: 'smooth' })}
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <button 
              className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-4 bg-white border border-gray-200 rounded-full p-2 shadow-lg hover:shadow-xl transition-all duration-300 opacity-0 group-hover:opacity-100 z-10 hover:scale-110"
              onClick={() => document.getElementById('scrollContainer').scrollBy({ left: 300, behavior: 'smooth' })}
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <div 
              id="scrollContainer"
              className="flex overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-teal-300 scrollbar-track-gray-100"
            >
              <div className="flex space-x-6 px-2">
                {featuredAccommodations.map((stay) => (
                  <div 
                    key={stay.id} 
                    className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden group flex-shrink-0 transform hover:-translate-y-2"
                    style={{ minWidth: '300px', maxWidth: '300px' }}
                  >
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={stay.image}
                        alt={stay.title}
                        className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                      />
                      <button className="absolute top-3 right-3 bg-white p-2 rounded-full shadow-md hover:scale-110 transition-transform duration-300">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </button>
                    </div>
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-900 group-hover:text-teal-600 transition-colors duration-300">
                          {stay.title}
                        </h3>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                          </svg>
                          <span className="text-gray-700 ml-1 text-sm">{stay.rating}</span>
                          <span className="text-gray-500 ml-1 text-sm">({stay.reviews})</span>
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm mb-2">{stay.type} • {stay.location}</p>
                      <p className="text-gray-600 text-sm mb-2">Host: {stay.host}</p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {stay.features.map((feature, index) => (
                          <span 
                            key={index} 
                            className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded transition-all duration-300 hover:bg-teal-100 hover:text-teal-700"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-bold text-gray-900">{stay.price}</span>
                          <span className="text-gray-600 text-sm"> / night</span>
                        </div>
                        <button className="bg-teal-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-teal-600 transition-all duration-300 transform hover:scale-105">
                          Reserve
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Rest of the sections remain the same with added transitions */}
      {/* Popular Destinations */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Popular Destinations</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {popularDestinations.map((destination) => (
              <div 
                key={destination.id} 
                className="group cursor-pointer transition-all duration-500 transform hover:scale-105"
              >
                <div className="relative h-64 bg-gradient-to-br from-teal-400 to-green-500 rounded-2xl overflow-hidden mb-3 group-hover:shadow-xl transition-all duration-500">
                  <div className="flex items-center justify-center h-full text-6xl transform group-hover:scale-110 transition-transform duration-500">
                    {destination.image}
                  </div>
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300"></div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-teal-600 transition-colors duration-300">
                  {destination.name}
                </h3>
                <p className="text-gray-600 text-sm mb-1">{destination.properties}</p>
                <p className="text-gray-500 text-sm">{destination.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Host Benefits Section */}
      <section className="py-16 bg-teal-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Become an Eco-Host</h2>
            <p className="text-xl text-gray-600 mb-8">
              Share your sustainable space and join our community of eco-conscious hosts
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              {[
                { icon: "💰", title: "Earn Income", description: "Generate revenue from your eco-friendly property" },
                { icon: "🌍", title: "Make Impact", description: "Promote sustainable tourism practices" },
                { icon: "👥", title: "Join Community", description: "Connect with like-minded travelers and hosts" }
              ].map((benefit, index) => (
                <div 
                  key={index} 
                  className="text-center transition-all duration-500 transform hover:scale-105"
                >
                  <div className="w-12 h-12 bg-teal-100 rounded-2xl flex items-center justify-center text-xl text-teal-600 mx-auto mb-4 transition-all duration-300 hover:bg-teal-200 hover:shadow-lg">
                    {benefit.icon}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                  <p className="text-gray-600">{benefit.description}</p>
                </div>
              ))}
            </div>
            <button className="bg-teal-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-all duration-300 transform hover:scale-105 hover:shadow-lg">
              Start Hosting
            </button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-teal-600 to-emerald-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready for Your Eco-Getaway?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Book your sustainable stay today and travel responsibly
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/signup" 
              className="bg-white text-teal-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
            >
              Sign Up to Book
            </Link>
            <Link 
              to="/experiences" 
              className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-teal-600 transition-all duration-300 transform hover:scale-105"
            >
              Explore Stays
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;