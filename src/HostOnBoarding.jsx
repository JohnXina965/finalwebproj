// HostOnboarding.jsx - First step after clicking "Become a Host"
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

function HostOnboarding() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleGetStarted = () => {
    navigate('/host/property-type'); // Navigate to Step 2
  };

  return (
    <div className={`min-h-screen bg-gray-50 py-8 animate-multi-layer transition-all duration-1000 ${
      mounted ? 'opacity-100' : 'opacity-0'
    }`}>
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Progress Bar */}
        <div className={`mb-8 transition-all duration-700 delay-200 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="w-1/4 h-2 bg-teal-500 rounded-full transition-all duration-500 delay-300"></div>
            <div className="w-1/4 h-2 bg-gray-300 rounded-full transition-all duration-500 delay-400"></div>
            <div className="w-1/4 h-2 bg-gray-200 rounded-full transition-all duration-500 delay-500"></div>
            <div className="w-1/4 h-2 bg-gray-200 rounded-full transition-all duration-500 delay-600"></div>
            <div className="w-1/4 h-2 bg-gray-200 rounded-full transition-all duration-500 delay-700"></div>
            <div className="w-1/4 h-2 bg-gray-200 rounded-full transition-all duration-500 delay-800"></div>
            <div className="w-1/4 h-2 bg-gray-200 rounded-full transition-all duration-500 delay-900"></div>
            <div className="w-1/4 h-2 bg-gray-200 rounded-full transition-all duration-500 delay-800"></div>
            <div className="w-1/4 h-2 bg-gray-200 rounded-full transition-all duration-500 delay-900"></div>
          </div>
          <p className="text-center text-sm text-gray-600 transition-all duration-500 delay-1000">
            Step 1 of 9
          </p>
        </div>

        {/* Welcome Section */}
        <div className={`text-center mb-8 transition-all duration-700 delay-300 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <h1 className="text-3xl font-bold text-gray-900 mb-4 transition-all duration-700 delay-400">
            Welcome to EcoExpress Hosting!
          </h1>
          <p className="text-lg text-gray-600 transition-all duration-700 delay-500">
            Let's get your space ready for eco-conscious travelers
          </p>
        </div>

        {/* Hosting Benefits */}
        <div className={`grid md:grid-cols-3 gap-6 mb-8 transition-all duration-700 delay-400 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <div className="text-center p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 delay-500 hover:-translate-y-1">
            <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 text-xl mx-auto mb-4 transition-all duration-500 delay-600 hover:scale-110">
              💰
            </div>
            <h3 className="font-semibold mb-2 transition-all duration-500 delay-700">Earn Extra Income</h3>
            <p className="text-gray-600 text-sm transition-all duration-500 delay-800">Generate revenue from your unused space</p>
          </div>
          
          <div className="text-center p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 delay-600 hover:-translate-y-1">
            <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 text-xl mx-auto mb-4 transition-all duration-500 delay-700 hover:scale-110">
              🌍
            </div>
            <h3 className="font-semibold mb-2 transition-all duration-500 delay-800">Promote Sustainability</h3>
            <p className="text-gray-600 text-sm transition-all duration-500 delay-900">Share eco-friendly practices with travelers</p>
          </div>
          
          <div className="text-center p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 delay-700 hover:-translate-y-1">
            <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 text-xl mx-auto mb-4 transition-all duration-500 delay-800 hover:scale-110">
              👥
            </div>
            <h3 className="font-semibold mb-2 transition-all duration-500 delay-900">Join Our Community</h3>
            <p className="text-gray-600 text-sm transition-all duration-500 delay-1000">Connect with like-minded hosts and guests</p>
          </div>
        </div>

        {/* Get Started Button */}
        <div className={`text-center transition-all duration-700 delay-500 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <button 
            onClick={handleGetStarted}
            className="bg-teal-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-all duration-300 delay-1100 hover:shadow-lg hover:-translate-y-0.5"
          >
            Get Started with Hosting
          </button>
          <p className="text-gray-500 text-sm mt-4 transition-all duration-500 delay-1200">
            It only takes 10-15 minutes to create your first listing
          </p>
        </div>
      </div>
    </div>
  );
}

export default HostOnboarding;