import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import manilaImg from '../../assets/manila.jpg';
import batanesImg from '../../assets/treehouse.jpg';
import baguioImg from '../../assets/baguio.jpg';
import palawanImg from '../../assets/palawan.jpg';
import cebuImg from '../../assets/cebu.jpg';
import heroRoom1 from '../../assets/hotelroom.jpg';
import heroRoom2 from '../../assets/mansion.jpg';
import discover1 from '../../assets/bamboohouse2.jpg';
import discover2 from '../../assets/beachhouse1.jpg';
import discover3 from '../../assets/treehouse3.jpg';
import discover4 from '../../assets/lake.jpg';
import discover5 from '../../assets/pinetree.jpg';
import discover6 from '../../assets/artem-pavlov-yCBa-4jdB9g-unsplash.jpg';
import memory1 from '../../assets/treehouse.jpg';
import memory2 from '../../assets/bamboohouse.jpg';
import memory3 from '../../assets/makatieco.jpg';

// Counter Component for Stats
function CountUpNumber({ target, suffix, duration = 2000 }) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (!hasStarted) {
      setHasStarted(true);
      const increment = target / (duration / 16);
      let current = 0;
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          setCount(target);
          clearInterval(timer);
        } else {
          setCount(Math.floor(current));
        }
      }, 16);

      return () => clearInterval(timer);
    }
  }, [target, duration, hasStarted]);

  const formatNumber = (num) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(num % 1000 === 0 ? 0 : 1)}K`;
    }
    return num.toString();
  };

  return <span>{formatNumber(count)}{suffix}</span>;
}

function PublicHomePage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [activeSlide, setActiveSlide] = useState(null);
  const [animatingSlides, setAnimatingSlides] = useState(new Set());
  const [lastViewed, setLastViewed] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [visibleSections, setVisibleSections] = useState(new Set());
  const [countedStats, setCountedStats] = useState(false);
  
  // Redirect authenticated users to guest home page
  useEffect(() => {
    if (currentUser) {
      navigate('/guest/homes', { replace: true });
    }
  }, [currentUser, navigate]);

  // Scroll to top button visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set([...prev, entry.target.id]));
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -100px 0px' }
    );

    const sections = document.querySelectorAll('[data-section]');
    sections.forEach((section) => observer.observe(section));

    return () => {
      sections.forEach((section) => observer.unobserve(section));
    };
  }, []);

  // Stats counter animation
  useEffect(() => {
    const statsSection = document.getElementById('stats-section');
    if (!statsSection) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !countedStats) {
          setCountedStats(true);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(statsSection);
    return () => observer.disconnect();
  }, [countedStats]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    // Here you can add newsletter subscription logic
    console.log('Newsletter subscription:', email);
    alert('Thank you for subscribing! We\'ll keep you updated with the latest deals and travel tips.');
    e.target.reset();
  };
  
  // Don't render content if authenticated user (prevent flash)
  if (currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  const trendingDestinations = [
    { name: 'Manila', image: manilaImg, count: '1,234 stays', description: 'Experience the vibrant capital city with its rich history and modern attractions.', emblem: null },
    { name: 'Batanes', image: batanesImg, count: '456 stays', description: 'Discover untouched beauty and breathtaking landscapes in the northernmost province.', emblem: null },
    { name: 'Baguio', image: baguioImg, count: '789 stays', description: 'Escape to the cool mountain city known as the Summer Capital of the Philippines.', emblem: null },
    { name: 'Palawan', image: palawanImg, count: '2,345 stays', description: 'Explore pristine beaches and crystal-clear waters in this tropical paradise.', emblem: null },
    { name: 'Cebu', image: cebuImg, count: '1,567 stays', description: 'Enjoy the perfect blend of historical sites and stunning natural wonders.', emblem: null },
  ];

  const handleSlideClick = (index) => {
    if (activeSlide === index || animatingSlides.has(index)) return;
    
    if (activeSlide === null) {
      // Opening a slide
      setAnimatingSlides(new Set([index]));
      setTimeout(() => {
        setActiveSlide(index);
        setAnimatingSlides(new Set());
      }, 50);
    } else {
      // Switching slides
      setAnimatingSlides(new Set([activeSlide, index]));
      setTimeout(() => {
        setActiveSlide(index);
        setAnimatingSlides(new Set());
      }, 50);
    }
  };

  const handleCloseSlide = () => {
    if (activeSlide === null) return;
    
    // Close the active slide
    const currentActive = activeSlide;
    setLastViewed(currentActive);
    setAnimatingSlides(new Set([currentActive]));
    
    setTimeout(() => {
      setActiveSlide(null);
      setAnimatingSlides(new Set());
      // Reset lastViewed after animation completes
      setTimeout(() => {
        setLastViewed(null);
      }, 1200);
    }, 50);
  };

  const features = [
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
      title: 'Smart Search',
      description: 'Discover locations that match your needs perfectly with our advanced filtering system.',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      title: 'Verified Hosts',
      description: 'All hosts are verified and committed to providing exceptional experiences.',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: '24/7 Support',
      description: 'Get help anytime you need it with our round-the-clock customer support.',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      title: 'Community Driven',
      description: 'Join a community of travelers and hosts passionate about sustainable travel.',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        {/* Animated gradient blob */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-teal-500/30 via-purple-500/20 to-pink-500/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/20 via-teal-500/30 to-cyan-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-white space-y-6">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
                Where Comfort<br />
                <span className="text-teal-400">Meets Elegance</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-300 max-w-xl">
                Handpicked stays designed for modern travelers seeking style, serenity, and unforgettable experiences.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link
                  to="/stays"
                  className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  Explore Stays
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link
                  to="/signup"
                  className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 border border-white/20 hover:border-white/40"
                >
                  Become A Host
                </Link>
              </div>
              {/* User Counter */}
              <div className="pt-8 flex items-center gap-4">
                <div className="flex -space-x-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 border-2 border-white"></div>
                  ))}
                </div>
                <div>
                  <p className="text-2xl font-bold">27K+</p>
                  <p className="text-gray-400 text-sm">Active Users</p>
                </div>
              </div>
            </div>

            {/* Right Content - Video Collage */}
            <div className="relative hidden lg:block">
              <div className="relative space-y-4">
                {/* Top Video */}
                <div className="transform rotate-3 hover:rotate-0 transition-transform duration-500">
                  <div className="bg-white rounded-2xl p-2 shadow-2xl overflow-hidden">
                    <video 
                      src="/videos/landingpagevideo1.mp4"
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-64 object-cover rounded-xl"
                    />
                  </div>
                </div>
                {/* Bottom Video */}
                <div className="transform -rotate-2 hover:rotate-0 transition-transform duration-500 ml-8">
                  <div className="bg-white rounded-2xl p-2 shadow-2xl overflow-hidden">
                    <video 
                      src="/videos/landingpagevideo2.mp4"
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-64 object-cover rounded-xl"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Discover Spaces Section */}
      <section data-section id="discover-section" className={`py-20 bg-white transition-all duration-1000 ${visibleSections.has('discover-section') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left - Text Content */}
            <div className="lg:col-span-4 space-y-6">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
                Discover Spaces Made for{' '}
                <span className="relative">
                  Every Occasion
                  <span className="absolute bottom-0 left-0 w-24 h-1 bg-teal-500"></span>
                </span>
              </h2>
              <p className="text-xl text-gray-600">
                Smart search made simple. Discover locations that match your needs perfectly.
              </p>
              <div className="pt-4">
                <Link
                  to="/stays"
                  className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 font-semibold text-lg group"
                >
                  Browse All Stays
                  <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Right - Photo Stream Layout */}
            <div className="lg:col-span-8 w-full">
              <ul className="flex flex-wrap photo-stream">
                {[
                  discover1, discover2, discover3, 
                  discover4, discover5, discover6
                ].map((imgSrc, i) => (
                  <li 
                    key={i}
                    className={`h-[40vh] flex-grow transition-all duration-700 ${
                      visibleSections.has('discover-section') 
                        ? 'opacity-100 translate-y-0 scale-100' 
                        : 'opacity-0 translate-y-5 scale-95'
                    }`}
                    style={{ transitionDelay: `${i * 100}ms` }}
                  >
                    <img 
                      src={imgSrc}
                      alt={`Discovery ${i + 1}`}
                      loading="lazy"
                      className="max-h-full min-w-full object-cover align-bottom hover:opacity-90 transition-opacity duration-300"
                    />
                  </li>
                ))}
                {/* Empty li to prevent last image from stretching */}
                <li className="h-[40vh] flex-grow-[10]"></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Turn Moments Into Memories Section */}
      <section data-section id="memories-section" className={`py-20 bg-gradient-to-br from-gray-50 to-gray-100 transition-all duration-1000 ${visibleSections.has('memories-section') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left - Text Content */}
            <div className="lg:col-span-4 space-y-6 text-gray-900 order-2 lg:order-1">
              <h2 className="text-4xl md:text-5xl font-bold">
                Turn Moments Into{' '}
                <span className="relative">
                  Memories
                  <span className="absolute bottom-0 left-0 w-24 h-1 bg-teal-500"></span>
                </span>
              </h2>
              <p className="text-xl text-gray-600">
                Explore experiences that connect you with people, culture, and places, creating stories worth sharing.
              </p>
              <div className="pt-4">
                <Link
                  to="/experiences"
                  className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 font-semibold text-lg group"
                >
                  Explore Experiences
                  <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Right - Layered Video Cards - Desktop */}
            <div className="lg:col-span-8 relative hidden lg:block order-1 lg:order-2">
              <div className="relative space-y-4">
                {[
                  { video: '/videos/landingpagevideo6couple.mp4', rotate: 'rotate-2', translate: '', zIndex: 'z-10' },
                  { video: '/videos/landingpagevideo7jurassicpark.mp4', rotate: '-rotate-2', translate: 'translate-x-8', zIndex: 'z-20' },
                  { video: '/videos/landingpagevideo5baguio.mp4', rotate: 'rotate-1', translate: 'translate-x-4 translate-y-4', zIndex: 'z-30' },
                  { video: '/videos/landingpagevideo3.mp4', rotate: '-rotate-1', translate: 'translate-x-6 translate-y-2', zIndex: 'z-40' }
                ].map((item, index) => (
                  <div 
                    key={index}
                    className={`transform transition-all duration-500 hover:scale-105 ${item.rotate} ${item.translate} ${item.zIndex}`}
                  >
                    <div className="bg-white rounded-2xl p-2 shadow-2xl overflow-hidden">
                      <video 
                        src={item.video}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-80 object-cover rounded-xl"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile Video Grid */}
            <div className="lg:col-span-8 grid grid-cols-2 gap-4 lg:hidden order-1">
              {[
                { video: '/videos/landingpagevideo6couple.mp4' },
                { video: '/videos/landingpagevideo7jurassicpark.mp4' },
                { video: '/videos/landingpagevideo5baguio.mp4' },
                { video: '/videos/landingpagevideo3.mp4' }
              ].map((item, index) => (
                <div 
                  key={index}
                  className="bg-white rounded-xl overflow-hidden shadow-lg"
                >
                  <video 
                    src={item.video}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-48 object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trending Destinations Section */}
      <section className="bg-gray-900 relative py-20" style={{ minHeight: '100vh' }}>
        {/* Title Above Slider */}
        <div className="container mx-auto px-4 mb-8 text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2" style={{ fontFamily: "'Abril Fatface', serif", letterSpacing: '0.05em' }}>
            TRENDING IN THE PHILIPPINES 🇵🇭
          </h2>
          <p className="text-gray-300 text-sm md:text-base" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            Discover the most popular destinations across the country
          </p>
        </div>

        <div className="w-full flex items-center relative" style={{ height: 'calc(100vh - 200px)', minHeight: '80vh' }}>
    {trendingDestinations.map((destination, index) => {
      const isActive = activeSlide === index;
      const isAnimating = animatingSlides.has(index);
      const isLastViewed = lastViewed === index;
      const isAnimOut = !isActive && activeSlide !== null && !isAnimating;
      
      return (
        <div
          key={destination.name}
          onClick={() => !isActive && handleSlideClick(index)}
          className={`slide relative h-full overflow-hidden transition-all duration-1000 group ${
            isActive ? 'cursor-default flex-[0_0_100%]' : 'cursor-pointer flex-1'
          } ${
            isAnimating && !isActive ? 'anim-in' : ''
          } ${
            isAnimOut ? 'anim-out flex-0' : ''
          } ${
            isLastViewed ? 'last-viewed' : ''
          }`}
                style={{ height: 'calc(100vh - 200px)', minHeight: '80vh' }}
              >
          {/* Background Image */}
          <div
            className={`image absolute bg-cover bg-center pointer-events-none transition-all duration-1000 ${
              isActive || isLastViewed
                ? 'top-0 left-0 h-full w-full'
                : isAnimating
                ? 'top-[-20%] left-[-140%] h-[140%] w-[140%] animate-[imgAnimIn_1.2s_forwards]'
                : 'top-0 left-0 h-full w-full'
            } ${
              isAnimOut ? 'animate-[imgAnimOut_1.2s_forwards]' : ''
            }`}
            style={{
              backgroundImage: `url(${destination.image})`,
              animationDelay: `${index * 0.2}s`
            }}
          />

          {/* Overlay */}
          <div
            className={`overlay absolute top-0 left-0 h-full w-full bg-gradient-to-t from-black/70 via-black/0 to-transparent pointer-events-none transition-all duration-500 ${
              isActive ? 'w-full bg-[length:100%_100%] transition-all duration-[1.25s] delay-[1.75s]' : ''
            }`}
          />

          {/* Content */}
          <div className={`content absolute top-0 left-0 h-full w-full ${isActive ? 'pointer-events-none' : 'pointer-events-auto'}`}>
            {/* Title */}
            <h1
              className={`title absolute top-[-10px] h-[65px] w-full text-5xl text-center transition-all duration-500 z-30 tracking-wide ${
                isActive
                  ? 'w-full opacity-100 translate-y-[30px] transition-all duration-1000 delay-[1.25s] text-white'
                  : 'opacity-0 text-white'
              } ${
                !isActive && !isAnimOut ? 'group-hover:opacity-100 group-hover:translate-y-[30px]' : ''
              }`}
              data-title={destination.name}
              style={{ fontFamily: "'Abril Fatface', serif" }}
            >
              <span
                className={`absolute top-0 h-0 w-full block overflow-hidden transition-all duration-[0.85s] ${
                  isActive 
                    ? 'h-full text-yellow-300' 
                    : (!isAnimOut ? 'group-hover:h-full text-yellow-300' : 'h-0 text-yellow-300')
                }`}
              >
                {destination.name}
              </span>
              <span
                className={`absolute bottom-[15px] left-1/2 -translate-x-1/2 block h-0.5 w-[85%] bg-white shadow-[0_2px_6px_rgba(0,0,0,0.3)] origin-left transition-transform duration-[1.25s] ${
                  isActive ? 'scale-x-100 delay-[2s]' : 'scale-x-0'
                }`}
              />
            </h1>

            {/* Emblem */}
            {destination.emblem && (
              <div
                className={`emblem absolute left-8 h-[200px] w-[200px] bg-no-repeat bg-center bg-contain transition-all duration-1000 delay-[1.75s] ${
                  isActive
                    ? 'opacity-80 translate-y-[100px]'
                    : 'opacity-0 translate-y-[120px]'
                }`}
                style={{
                  backgroundImage: `url(${destination.emblem})`
                }}
              />
            )}

            {/* City Info */}
            <ul
              className={`city-info absolute bottom-8 right-8 px-8 py-8 pl-32 text-xl text-white bg-gradient-to-r from-transparent to-black/70 transition-all duration-1000 delay-[2s] font-light ${
                isActive ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ 
                textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                fontFamily: "'Montserrat', sans-serif"
              }}
            >
              <li
                className={`relative mb-1.5 text-right opacity-0 -translate-x-[30px] transition-all duration-[750ms] delay-[2.5s] ${
                  isActive ? 'opacity-100 translate-x-0' : ''
                }`}
              >
                Country: Philippines
              </li>
              <li
                className={`relative mb-1.5 text-right opacity-0 -translate-x-[30px] transition-all duration-[750ms] delay-[2.7s] ${
                  isActive ? 'opacity-100 translate-x-0' : ''
                }`}
              >
                Region: {destination.name === 'Manila' ? 'Metro Manila' : destination.name === 'Batanes' ? 'Cagayan Valley' : destination.name === 'Baguio' ? 'Cordillera' : destination.name === 'Palawan' ? 'MIMAROPA' : 'Central Visayas'}
              </li>
              <li
                className={`relative mb-1.5 text-right opacity-0 -translate-x-[30px] transition-all duration-[750ms] delay-[2.9s] font-medium ${
                  isActive ? 'opacity-100 translate-x-0' : ''
                }`}
              >
                Stays: {destination.count}
              </li>
            </ul>

            {/* Explore Button - Only visible when active */}
            {isActive && (
              <div className="absolute bottom-32 left-8 opacity-0 animate-[fadeIn_0.6s_ease-out_3s_forwards]">
                <Link
                  to={`/stays?location=${destination.name}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-teal-600 hover:bg-teal-700 text-white text-lg font-semibold rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  <span>Explore Stays in {destination.name}</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCloseSlide();
            }}
            className={`btn-close absolute z-[100] top-16 right-5 h-6 w-6 ${isActive ? 'cursor-pointer pointer-events-auto' : 'pointer-events-none'}`}
          >
            <span
              className={`absolute top-3 block w-full h-1 bg-white transition-all duration-500 ${
                isActive
                  ? 'opacity-100 rotate-45 translate-x-0 delay-[3s]'
                  : 'opacity-0 rotate-45 translate-x-[-12px]'
              }`}
            />
            <span
              className={`absolute top-3 block w-full h-1 bg-white transition-all duration-500 ${
                isActive
                  ? 'opacity-100 rotate-[-45deg] translate-x-0 delay-[3.2s]'
                  : 'opacity-0 rotate-[-45deg] translate-x-[12px]'
              }`}
            />
          </button>

          {/* Hover Effect */}
          {!isActive && !isAnimOut && (
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
              <div 
                className="absolute inset-0 scale-110 transition-transform duration-300" 
                style={{ 
                  backgroundImage: `url(${destination.image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }} 
              />
              <div className="absolute inset-0 bg-black/40 transition-opacity duration-300" />
            </div>
          )}
        </div>
      );
    })}
  </div>
</section>

      {/* Features Section */}
      <section data-section id="features-section" className={`py-20 bg-gradient-to-br from-teal-50 to-blue-50 transition-all duration-1000 ${visibleSections.has('features-section') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Why Choose EcoExpress
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need for an amazing travel experience
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
              >
                <div className="w-16 h-16 bg-teal-100 rounded-xl flex items-center justify-center text-teal-600 mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Host CTA Section */}
      <section data-section id="host-cta-section" className={`py-20 bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 transition-all duration-1000 ${visibleSections.has('host-cta-section') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-r from-gray-700/50 to-gray-800/50 backdrop-blur-sm rounded-3xl p-8 md:p-12 lg:p-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Left Content */}
              <div className="text-white space-y-6">
                <h2 className="text-4xl md:text-5xl font-bold">
                  Share What You Have,<br />
                  <span className="text-teal-400">Earn While You Host</span>
                </h2>
                <p className="text-xl text-gray-300">
                  Sign up as a host and make your first listing in just a few clicks.
                </p>
                <Link
                  to="/signup"
                  className="inline-block bg-teal-600 hover:bg-teal-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  Become A Host
                </Link>
              </div>

              {/* Right Visual */}
              <div className="relative hidden lg:block">
                <div className="relative">
                  {/* Mock phone illustration */}
                  <div className="bg-gray-900 rounded-3xl p-4 shadow-2xl mx-auto max-w-xs">
                    <div className="bg-gray-800 rounded-2xl overflow-hidden aspect-[9/16] relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-teal-400/20 to-blue-500/20"></div>
                      <div className="absolute bottom-4 left-4 right-4 space-y-2">
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-white text-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
                            <span className="font-semibold">4k followers</span>
                          </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-white text-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-red-400">❤️</span>
                            <span className="font-semibold">5k likes</span>
                          </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-white text-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-blue-400">💬</span>
                            <span className="font-semibold">11 comments</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats-section" data-section className={`py-20 bg-white transition-all duration-1000 ${visibleSections.has('stats-section') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { number: 27000, label: 'Active Users', suffix: '+' },
              { number: 5000, label: 'Listings', suffix: '+' },
              { number: 150, label: 'Destinations', suffix: '+' },
              { number: 98, label: 'Satisfaction Rate', suffix: '%' },
            ].map((stat, index) => (
              <div key={index} className={`text-center transition-all duration-1000 ${visibleSections.has('stats-section') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`} style={{ transitionDelay: `${index * 100}ms` }}>
                <div className="text-5xl md:text-6xl font-bold text-teal-600 mb-2">
                  {countedStats ? (
                    <CountUpNumber target={stat.number} suffix={stat.suffix} duration={2000} />
                  ) : (
                    `0${stat.suffix}`
                  )}
                </div>
                <div className="text-xl text-gray-600">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Destinations Quick Links */}
      <section data-section id="popular-destinations" className={`py-20 bg-gradient-to-br from-gray-50 to-white transition-all duration-1000 ${visibleSections.has('popular-destinations') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Popular Destinations
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Explore these trending destinations in the Philippines
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {trendingDestinations.map((destination, index) => (
              <Link
                key={index}
                to={`/stays?location=${destination.name}`}
                className={`group relative overflow-hidden rounded-2xl aspect-square transition-all duration-500 hover:scale-105 hover:shadow-2xl ${
                  visibleSections.has('popular-destinations') 
                    ? 'opacity-100 translate-y-0' 
                    : 'opacity-0 translate-y-5'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <img 
                  src={destination.image}
                  alt={destination.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h3 className="text-xl font-bold mb-1">{destination.name}</h3>
                  <p className="text-sm text-gray-200">{destination.count}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section data-section id="testimonials-section" className={`py-20 bg-white transition-all duration-1000 ${visibleSections.has('testimonials-section') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              What Our Guests Say
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Real experiences from travelers who've stayed with EcoExpress
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: 'Maria Santos',
                location: 'Manila, Philippines',
                image: '👩',
                rating: 5,
                text: 'Amazing experience! The host was incredibly welcoming and the place exceeded all expectations. Will definitely book again!',
              },
              {
                name: 'John Chen',
                location: 'Cebu, Philippines',
                image: '👨',
                rating: 5,
                text: 'Perfect location and stunning views. The photos don\'t do justice to how beautiful this place really is. Highly recommended!',
              },
              {
                name: 'Sarah Johnson',
                location: 'Palawan, Philippines',
                image: '👩',
                rating: 5,
                text: 'Such a unique stay! The host provided excellent recommendations for local spots. This made our trip unforgettable.',
              },
            ].map((testimonial, index) => (
              <div
                key={index}
                className={`bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 ${
                  visibleSections.has('testimonials-section') 
                    ? 'opacity-100 translate-y-0' 
                    : 'opacity-0 translate-y-5'
                }`}
                style={{ transitionDelay: `${index * 150}ms` }}
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-700 mb-6 leading-relaxed italic">
                  "{testimonial.text}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center text-2xl">
                    {testimonial.image}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-600">{testimonial.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section data-section id="newsletter-section" className={`py-20 bg-gradient-to-r from-teal-600 to-teal-700 transition-all duration-1000 ${visibleSections.has('newsletter-section') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Stay Updated
            </h2>
            <p className="text-xl text-teal-100 mb-8">
              Get exclusive deals, travel tips, and new destination updates delivered to your inbox
            </p>
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
              <input
                type="email"
                name="email"
                placeholder="Enter your email address"
                className="flex-1 px-6 py-4 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-teal-600 text-lg"
                required
              />
              <button
                type="submit"
                className="bg-white text-teal-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Subscribe
              </button>
            </form>
            <p className="text-teal-100 text-sm mt-4">
              We respect your privacy. Unsubscribe at any time.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section data-section id="faq-section" className={`py-20 bg-white transition-all duration-1000 ${visibleSections.has('faq-section') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to know about EcoExpress
            </p>
          </div>
          <div className="max-w-3xl mx-auto space-y-4">
            {[
              {
                question: 'How do I book a stay?',
                answer: 'Simply browse our listings, select your dates, and click "Book Now". You\'ll receive a confirmation email with all the details. Our hosts typically respond within 24 hours.',
              },
              {
                question: 'What payment methods do you accept?',
                answer: 'We accept all major credit cards, debit cards, and digital wallets. Payment is processed securely through our platform, and you\'ll only be charged after your booking is confirmed.',
              },
              {
                question: 'Can I cancel my booking?',
                answer: 'Yes! You can cancel your booking according to the host\'s cancellation policy. Most listings offer free cancellation up to 24-48 hours before check-in. Check the listing details for specific cancellation terms.',
              },
              {
                question: 'How do I become a host?',
                answer: 'Sign up as a host, verify your account, and create your first listing. It\'s free to list your space, and you only pay a small commission when you receive a booking. Our team is here to help you every step of the way!',
              },
              {
                question: 'Is my personal information secure?',
                answer: 'Absolutely. We use industry-standard encryption to protect your personal and payment information. Your data is never shared with third parties without your consent.',
              },
            ].map((faq, index) => (
              <div
                key={index}
                className={`bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 ${
                  visibleSections.has('faq-section') 
                    ? 'opacity-100 translate-x-0' 
                    : 'opacity-0 translate-x-5'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <h3 className="text-xl font-bold text-gray-900 mb-3">{faq.question}</h3>
                <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 bg-teal-600 hover:bg-teal-700 text-white p-4 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 hover:shadow-teal-500/50 animate-[fadeIn_0.3s_ease-out]"
          aria-label="Scroll to top"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default PublicHomePage;

