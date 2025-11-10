import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import manilaImg from '../../assets/manila.jpg';
import batanesImg from '../../assets/treehouse.jpg';
import baguioImg from '../../assets/baguio.jpg';
import palawanImg from '../../assets/palawan.jpg';
import cebuImg from '../../assets/cebu.jpg';
import discover1 from '../../assets/bamboohouse2.jpg';
import discover2 from '../../assets/beachhouse1.jpg';
import discover3 from '../../assets/treehouse3.jpg';
import discover4 from '../../assets/lake.jpg';
import discover5 from '../../assets/pinetree.jpg';
import discover6 from '../../assets/artem-pavlov-yCBa-4jdB9g-unsplash.jpg';

// Premium Counter Component with Glassmorphism
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

  return (
    <motion.span
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {formatNumber(count)}{suffix}
    </motion.span>
  );
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
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const heroRef = useRef(null);
  
  // Redirect authenticated users to guest home page
  useEffect(() => {
    if (currentUser) {
      navigate('/guest/homes', { replace: true });
    }
  }, [currentUser, navigate]);

  // Mouse tracking for parallax effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

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
    console.log('Newsletter subscription:', email);
    alert('Thank you for subscribing! We\'ll keep you updated with the latest deals and travel tips.');
    e.target.reset();
  };
  
  // Don't render content if authenticated user (prevent flash)
  if (currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-teal-500/30 border-t-teal-500 rounded-full"
        />
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
      setAnimatingSlides(new Set([index]));
      setTimeout(() => {
        setActiveSlide(index);
        setAnimatingSlides(new Set());
      }, 50);
    } else {
      setAnimatingSlides(new Set([activeSlide, index]));
      setTimeout(() => {
        setActiveSlide(index);
        setAnimatingSlides(new Set());
      }, 50);
    }
  };

  const handleCloseSlide = () => {
    if (activeSlide === null) return;
    
    const currentActive = activeSlide;
    setLastViewed(currentActive);
    setAnimatingSlides(new Set([currentActive]));
    
    setTimeout(() => {
      setActiveSlide(null);
      setAnimatingSlides(new Set());
      setTimeout(() => {
        setLastViewed(null);
      }, 1200);
    }, 50);
  };

  const features = [
    {
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
      title: 'Smart Search',
      description: 'Discover locations that match your needs perfectly with our advanced filtering system.',
      gradient: 'from-emerald-500/20 to-teal-500/20',
    },
    {
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      title: 'Verified Hosts',
      description: 'All hosts are verified and committed to providing exceptional experiences.',
      gradient: 'from-amber-500/20 to-yellow-500/20',
    },
    {
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: '24/7 Support',
      description: 'Get help anytime you need it with our round-the-clock customer support.',
      gradient: 'from-blue-500/20 to-cyan-500/20',
    },
    {
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      title: 'Community Driven',
      description: 'Join a community of travelers and hosts passionate about sustainable travel.',
      gradient: 'from-purple-500/20 to-pink-500/20',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* Premium Hero Section with Cinematic Lighting */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated gradient orbs with cinematic lighting */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{
              x: [0, 100, 0],
              y: [0, 50, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-gradient-to-r from-emerald-500/40 via-teal-500/30 to-cyan-500/40 rounded-full blur-[120px]"
          />
          <motion.div
            animate={{
              x: [0, -80, 0],
              y: [0, -60, 0],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute bottom-1/4 right-1/4 w-[700px] h-[700px] bg-gradient-to-r from-amber-500/30 via-yellow-500/20 to-orange-500/30 rounded-full blur-[140px]"
          />
          <motion.div
            animate={{
              x: [0, 60, 0],
              y: [0, -40, 0],
            }}
            transition={{
              duration: 30,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-rose-500/20 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2"
          />
        </div>

        {/* Radial gradient overlay for depth */}
        <div 
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_#0a0a0a_70%)] pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 0%, rgba(10, 10, 10, 0.8) 50%, #0a0a0a 100%)'
          }}
        />


        <div className="container mx-auto px-4 relative z-10 pt-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left Content with Premium Typography */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="text-white space-y-8"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.8 }}
              >
                <h1 
                  className="text-6xl md:text-7xl lg:text-8xl font-bold leading-[1.1] mb-6"
                  style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}
                >
                  Where{' '}
                  <span className="relative inline-block">
                    <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                      Comfort
                    </span>
                    <motion.span
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ delay: 1, duration: 0.8 }}
                      className="absolute bottom-2 left-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-400"
                    />
                  </span>
                  <br />
                  Meets{' '}
                  <span className="bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 bg-clip-text text-transparent">
                    Elegance
                  </span>
                </h1>
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="text-xl md:text-2xl text-gray-300 max-w-xl leading-relaxed"
              >
                Handpicked stays designed for modern travelers seeking style, serenity, and unforgettable experiences.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="flex flex-col sm:flex-row gap-4 pt-4"
              >
                {/* Premium Glassmorphism CTA Button */}
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full sm:w-auto"
                >
                  <Link
                    to="/stays"
                    className="group relative w-full sm:w-auto inline-flex items-center justify-center px-10 py-5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl font-semibold text-lg text-white overflow-hidden shadow-2xl shadow-emerald-500/50 transition-all duration-300"
                    style={{ minHeight: '60px', height: '60px' }}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-3 whitespace-nowrap">
                      Explore Stays
                      <motion.svg
                        className="w-5 h-5 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        animate={{ x: [0, 5, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </motion.svg>
                    </span>
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-teal-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      initial={false}
                    />
                  </Link>
                </motion.div>

                {/* Frosted Glass Secondary Button */}
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full sm:w-auto"
                >
                  <Link
                    to="/signup"
                    className="w-full sm:w-auto inline-flex items-center justify-center px-10 py-5 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl font-semibold text-lg text-white hover:bg-white/20 transition-all duration-300 shadow-xl whitespace-nowrap"
                    style={{ minHeight: '60px', height: '60px' }}
                  >
                    Become A Host
                  </Link>
                </motion.div>
              </motion.div>

              {/* Premium User Counter with Glassmorphism */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.8 }}
                className="pt-8 flex items-center gap-6"
              >
                <div className="flex -space-x-3">
                  {[...Array(4)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1 + i * 0.1, duration: 0.5 }}
                      whileHover={{ scale: 1.2, zIndex: 10 }}
                      className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 border-4 border-[#0a0a0a] shadow-lg"
                    />
                  ))}
                </div>
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-4">
                  <p className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">27K+</p>
                  <p className="text-gray-400 text-sm">Active Users</p>
                </div>
              </motion.div>
            </motion.div>

            {/* Right Content - Premium Video Collage with Parallax */}
            <motion.div
              initial={{ opacity: 0, x: 50, rotateY: 15 }}
              animate={{ opacity: 1, x: 0, rotateY: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="relative hidden lg:block"
              style={{
                transform: `perspective(1000px) rotateY(${mousePosition.x * 0.5}deg) rotateX(${-mousePosition.y * 0.5}deg)`,
              }}
            >
              <div className="relative space-y-6">
                {/* Top Video with Premium Shadow */}
                <motion.div
                  whileHover={{ scale: 1.02, zIndex: 20 }}
                  className="transform rotate-2 hover:rotate-0 transition-transform duration-500"
                >
                  <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-3 shadow-2xl overflow-hidden">
                    <video 
                      src="/videos/landingpagevideo1.mp4"
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-72 object-cover rounded-2xl"
                    />
                  </div>
                </motion.div>
                {/* Bottom Video */}
                <motion.div
                  whileHover={{ scale: 1.02, zIndex: 20 }}
                  className="transform -rotate-2 hover:rotate-0 transition-transform duration-500 ml-12"
                >
                  <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-3 shadow-2xl overflow-hidden">
                    <video 
                      src="/videos/landingpagevideo2.mp4"
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-72 object-cover rounded-2xl"
                    />
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex flex-col items-center gap-2 text-white/60"
          >
            <span className="text-sm">Scroll to explore</span>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </motion.div>
        </motion.div>
      </section>

      {/* Premium Discover Spaces Section with Glassmorphism Cards */}
      <section data-section id="discover-section" className="relative py-32 bg-gradient-to-b from-[#0a0a0a] via-[#111111] to-[#0a0a0a]">
        {/* Subtle background gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.1)_0%,_transparent_50%)] pointer-events-none" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
            {/* Left - Premium Text Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="lg:col-span-4 space-y-8"
            >
              <h2 
                className="text-5xl md:text-6xl font-bold text-white leading-tight"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Discover Spaces Made for{' '}
                <span className="relative inline-block">
                  <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                    Every Occasion
                  </span>
                  <motion.span
                    initial={{ width: 0 }}
                    whileInView={{ width: '100%' }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="absolute bottom-2 left-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-400"
                  />
                </span>
              </h2>
              <p className="text-xl text-gray-300 leading-relaxed">
                Smart search made simple. Discover locations that match your needs perfectly with our advanced filtering system.
              </p>
              <motion.div
                whileHover={{ x: 5 }}
                className="pt-4"
              >
                <Link
                  to="/stays"
                  className="inline-flex items-center gap-3 text-emerald-400 hover:text-teal-400 font-semibold text-lg group"
                >
                  Browse All Stays
                  <motion.svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </motion.svg>
                </Link>
              </motion.div>
            </motion.div>

            {/* Right - Premium Photo Stream with Glassmorphism Overlay */}
            <div className="lg:col-span-8 w-full">
              <div className="grid grid-cols-3 gap-4">
                {[
                  discover1, discover2, discover3, 
                  discover4, discover5, discover6
                ].map((imgSrc, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.6, delay: i * 0.1 }}
                    whileHover={{ scale: 1.05, zIndex: 10 }}
                    className="relative group overflow-hidden rounded-2xl aspect-square"
                  >
                    <img 
                      src={imgSrc}
                      alt={`Discovery ${i + 1}`}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-4 left-4 right-4 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4">
                        <p className="text-white text-sm font-medium">Explore Now</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Premium Features Section with Glassmorphism Cards */}
      <section data-section id="features-section" className="relative py-32 bg-gradient-to-b from-[#0a0a0a] to-[#111111]">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <h2 
              className="text-5xl md:text-6xl font-bold text-white mb-6"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Why Choose{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                EcoExpress
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Everything you need for an amazing travel experience, crafted with precision and care.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="group relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/0 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 hover:border-white/20 transition-all duration-300 h-full">
                  <div className={`w-20 h-20 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {feature.title}
                  </h3>
                  <p className="text-gray-300 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Premium Trending Destinations Section - Enhanced (Hidden on Mobile) */}
      <section className="hidden md:block relative bg-[#0a0a0a] py-20" style={{ minHeight: '100vh' }}>
        <div className="container mx-auto px-4 mb-12 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4"
            style={{ fontFamily: "'Playfair Display', serif", letterSpacing: '0.05em' }}
          >
            TRENDING IN THE{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              PHILIPPINES
            </span>{' '}
            🇵🇭
          </motion.h2>
          <p className="text-gray-300 text-lg">
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
              <motion.div
                key={destination.name}
                onClick={() => !isActive && handleSlideClick(index)}
                initial={false}
                animate={{
                  flex: isActive ? '0 0 100%' : '1',
                  opacity: isAnimOut ? 0 : 1,
                }}
                transition={{ duration: 1, ease: "easeInOut" }}
                className={`slide relative h-full overflow-hidden cursor-pointer group ${
                  isActive ? 'cursor-default' : ''
                }`}
                style={{ height: 'calc(100vh - 200px)', minHeight: '80vh' }}
              >
                {/* Background Image with Premium Overlay */}
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-110"
                  style={{
                    backgroundImage: `url(${destination.image})`,
                  }}
                />
                
                {/* Premium Gradient Overlay */}
                <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30 transition-all duration-1000 ${
                  isActive ? 'from-black/70' : ''
                }`} />

                {/* Content */}
                <div className="absolute inset-0 flex flex-col justify-between p-12">
                  {/* Title */}
                  <motion.h1
                    initial={false}
                    animate={{
                      opacity: isActive ? 1 : 0,
                      y: isActive ? 0 : 20,
                    }}
                    transition={{ duration: 0.8, delay: isActive ? 0.5 : 0 }}
                    className="text-6xl md:text-7xl font-bold text-white mb-8"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    <span className="bg-gradient-to-r from-amber-300 to-yellow-400 bg-clip-text text-transparent">
                      {destination.name}
                    </span>
                  </motion.h1>

                  {/* City Info with Glassmorphism */}
                  <motion.div
                    initial={false}
                    animate={{
                      opacity: isActive ? 1 : 0,
                      x: isActive ? 0 : 50,
                    }}
                    transition={{ duration: 0.8, delay: isActive ? 0.8 : 0 }}
                    className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl p-8 max-w-md"
                  >
                    <ul className="space-y-3 text-white text-lg">
                      <li className="flex justify-between">
                        <span className="text-gray-300">Country:</span>
                        <span className="font-semibold">Philippines</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-300">Region:</span>
                        <span className="font-semibold">
                          {destination.name === 'Manila' ? 'Metro Manila' : 
                           destination.name === 'Batanes' ? 'Cagayan Valley' : 
                           destination.name === 'Baguio' ? 'Cordillera' : 
                           destination.name === 'Palawan' ? 'MIMAROPA' : 'Central Visayas'}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-300">Stays:</span>
                        <span className="font-semibold text-emerald-400">{destination.count}</span>
                      </li>
                    </ul>
                  </motion.div>

                  {/* Explore Button */}
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.2 }}
                      className="mt-8"
                    >
                      <Link
                        to={`/stays?location=${destination.name}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-lg font-semibold rounded-full hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 shadow-2xl shadow-emerald-500/50"
                      >
                        <span>Explore Stays in {destination.name}</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </Link>
                    </motion.div>
                  )}
                </div>

                {/* Close Button */}
                {isActive && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseSlide();
                    }}
                    className="absolute top-8 right-8 z-50 w-12 h-12 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all duration-300"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </motion.button>
                )}

                {/* Hover Effect */}
                {!isActive && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                )}
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Premium Host CTA Section with Glassmorphism */}
      <section data-section id="host-cta-section" className="relative py-32 bg-gradient-to-b from-[#0a0a0a] to-[#111111] overflow-hidden">
        {/* Animated background orbs */}
        <div className="absolute inset-0">
          <motion.div
            animate={{
              x: [0, 100, 0],
              y: [0, 50, 0],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-full blur-3xl"
          />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-12 md:p-16 lg:p-20 overflow-hidden relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-teal-500/5" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
              <div className="text-white space-y-8">
                <h2 
                  className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Share What You Have,
                  <br />
                  <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                    Earn While You Host
                  </span>
                </h2>
                <p className="text-xl text-gray-300 leading-relaxed">
                  Sign up as a host and make your first listing in just a few clicks. Join thousands of hosts earning passive income.
                </p>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    to="/signup"
                    className="inline-block px-10 py-5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-semibold text-lg hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 shadow-2xl shadow-emerald-500/50"
                  >
                    Become A Host
                  </Link>
                </motion.div>
              </div>
              <div className="relative hidden lg:block">
                <motion.div
                  animate={{
                    y: [0, -20, 0],
                  }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl"
                >
                  <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-2xl p-8 space-y-4">
                    <div className="flex items-center gap-3 text-white">
                      <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
                      <span className="font-semibold">4.2k followers</span>
                    </div>
                    <div className="flex items-center gap-3 text-white">
                      <span className="text-red-400">❤️</span>
                      <span className="font-semibold">12.5k likes</span>
                    </div>
                    <div className="flex items-center gap-3 text-white">
                      <span className="text-blue-400">💬</span>
                      <span className="font-semibold">2.1k comments</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Premium Stats Section with Glassmorphism */}
      <section id="stats-section" data-section className="relative py-32 bg-gradient-to-b from-[#111111] to-[#0a0a0a]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(16,185,129,0.1)_0%,_transparent_70%)] pointer-events-none" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { number: 27000, label: 'Active Users', suffix: '+' },
              { number: 5000, label: 'Listings', suffix: '+' },
              { number: 150, label: 'Destinations', suffix: '+' },
              { number: 98, label: 'Satisfaction Rate', suffix: '%' },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="text-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-white/20 transition-all duration-300"
              >
                <div className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent mb-4">
                  {countedStats ? (
                    <CountUpNumber target={stat.number} suffix={stat.suffix} duration={2000} />
                  ) : (
                    `0${stat.suffix}`
                  )}
                </div>
                <div className="text-lg text-gray-300">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Premium Popular Destinations Quick Links */}
      <section data-section id="popular-destinations" className="relative py-32 bg-gradient-to-b from-[#0a0a0a] to-[#111111]">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <h2 
              className="text-5xl md:text-6xl font-bold text-white mb-6"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Popular{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Destinations
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Explore these trending destinations in the Philippines
            </p>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {trendingDestinations.map((destination, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -10 }}
              >
                <Link
                  to={`/stays?location=${destination.name}`}
                  className="group relative block overflow-hidden rounded-3xl aspect-square"
                >
                  <img 
                    src={destination.image}
                    alt={destination.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6">
                    <h3 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                      {destination.name}
                    </h3>
                    <p className="text-sm text-gray-300">{destination.count}</p>
                  </div>
                  <div className="absolute inset-0 border-2 border-white/0 group-hover:border-white/30 rounded-3xl transition-all duration-300" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Premium Testimonials Section */}
      <section data-section id="testimonials-section" className="relative py-32 bg-gradient-to-b from-[#111111] to-[#0a0a0a]">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <h2 
              className="text-5xl md:text-6xl font-bold text-white mb-6"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              What Our{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Guests Say
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Real experiences from travelers who've stayed with EcoExpress
            </p>
          </motion.div>
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
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 hover:border-white/20 transition-all duration-300 relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/0 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10">
                  <div className="flex items-center gap-1 mb-6">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <svg key={i} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-gray-300 mb-8 leading-relaxed italic text-lg">
                    "{testimonial.text}"
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-2xl shadow-lg">
                      {testimonial.image}
                    </div>
                    <div>
                      <p className="font-semibold text-white text-lg">{testimonial.name}</p>
                      <p className="text-sm text-gray-400">{testimonial.location}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Premium FAQ Section */}
      <section data-section id="faq-section" className="relative py-32 bg-gradient-to-b from-[#0a0a0a] to-[#111111]">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <h2 
              className="text-5xl md:text-6xl font-bold text-white mb-6"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Frequently Asked{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Questions
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Everything you need to know about EcoExpress
            </p>
          </motion.div>
          <div className="max-w-4xl mx-auto space-y-6">
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
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ x: 10, scale: 1.01 }}
                className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-all duration-300 group"
              >
                <h3 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {faq.question}
                </h3>
                <p className="text-gray-300 leading-relaxed text-lg">{faq.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Premium Newsletter Section with Glassmorphism */}
      <section data-section id="newsletter-section" className="relative py-32 bg-gradient-to-b from-[#0a0a0a] to-[#111111] overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute top-1/2 left-1/2 w-96 h-96 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"
          />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto text-center"
          >
            <h2 
              className="text-5xl md:text-6xl font-bold text-white mb-6"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Stay{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Updated
              </span>
            </h2>
            <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
              Get exclusive deals, travel tips, and new destination updates delivered to your inbox
            </p>
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
              <motion.input
                whileFocus={{ scale: 1.02 }}
                type="email"
                name="email"
                placeholder="Enter your email address"
                className="flex-1 px-6 py-5 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-lg"
                required
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                className="px-10 py-5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-semibold text-lg hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 shadow-2xl shadow-emerald-500/50"
              >
                Subscribe
              </motion.button>
            </form>
            <p className="text-gray-400 text-sm mt-6">
              We respect your privacy. Unsubscribe at any time.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Premium Scroll to Top Button */}
      {showScrollTop && (
        <motion.button
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          whileHover={{ scale: 1.1, y: -5 }}
          whileTap={{ scale: 0.9 }}
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 w-14 h-14 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full shadow-2xl shadow-emerald-500/50 flex items-center justify-center transition-all duration-300"
          aria-label="Scroll to top"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </motion.button>
      )}

      {/* Add custom styles for fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800&display=swap');
      `}</style>
    </div>
  );
}

export default PublicHomePage;
