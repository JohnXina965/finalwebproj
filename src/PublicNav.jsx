import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import logo from './assets/logo.png';
import ThemeToggle from './components/ThemeToggle';

function PublicNav() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Stays", path: "/stays" },
    { name: "Experiences", path: "/experiences" },
    { name: "Services", path: "/services" },
  ];

  // Track scroll for navbar background effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/10 backdrop-blur-2xl border-b border-white/20 shadow-xl' 
          : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo/Brand with Premium Styling */}
          <Link to="/" className="flex items-center space-x-3 group">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center overflow-hidden shadow-lg shadow-emerald-500/50"
            >
              <img 
                src={logo} 
                alt="Eco Express Logo" 
                className="w-full h-full object-cover"
              />
            </motion.div>
            <motion.span
              className="text-2xl font-bold bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent"
              style={{ fontFamily: "'Playfair Display', serif" }}
              whileHover={{ scale: 1.05 }}
            >
              EcoExpress
            </motion.span>
          </Link>

          {/* Center Navigation - Premium Glassmorphism Links */}
          <div className="hidden md:flex items-center space-x-2">
            {navLinks.map((link, index) => {
              const isActive = location.pathname === link.path;
              return (
                <motion.div
                  key={link.name}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 + 0.2, duration: 0.5 }}
                >
                  <Link
                    to={link.path}
                    className="relative px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group"
                  >
                    <span className={`relative z-10 inline-block ${
                      isActive 
                        ? 'text-white' 
                        : 'text-white/80 hover:text-white'
                    }`}>
                      {link.name}
                    </span>
                    {!isActive && (
                      <span className="absolute bottom-1.5 left-1/2 transform -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-emerald-400 to-teal-400 group-hover:w-[calc(100%-2rem)] transition-all duration-300" />
                    )}
                    {isActive && (
                      <motion.div
                        layoutId="activeNav"
                        className="absolute inset-0 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30"
                        initial={false}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    {!isActive && (
                      <div className="absolute inset-0 bg-white/0 hover:bg-white/10 backdrop-blur-sm rounded-xl border border-transparent hover:border-white/20 transition-all duration-300" />
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* Right Section - Premium CTA Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <Link 
                to="/login" 
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-white/90 hover:text-white transition-colors duration-300 relative group"
              >
                <span className="relative z-10">Log in</span>
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-emerald-400 to-teal-400 group-hover:w-full transition-all duration-300" />
              </Link>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link 
                to="/signup" 
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-sm font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 shadow-lg shadow-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/60"
              >
                Sign up
              </Link>
            </motion.div>
          </div>

          {/* Mobile Menu Button - Premium Styling */}
          <motion.button
            className="md:hidden p-2.5 rounded-xl text-white/90 hover:text-white hover:bg-white/10 backdrop-blur-sm border border-transparent hover:border-white/20 focus:outline-none transition-all duration-300"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            whileTap={{ scale: 0.95 }}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <AnimatePresence mode="wait">
                {isMenuOpen ? (
                  <motion.path
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <motion.path
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </AnimatePresence>
            </svg>
          </motion.button>
        </div>

        {/* Mobile Menu - Premium Glassmorphism */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden overflow-hidden"
            >
              <div className="py-4 border-t border-white/20 bg-white/5 backdrop-blur-2xl rounded-b-2xl mt-2">
                <div className="flex flex-col space-y-2">
                  {navLinks.map((link, index) => {
                    const isActive = location.pathname === link.path;
                    return (
                      <motion.div
                        key={link.name}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.3 }}
                      >
                        <Link
                          to={link.path}
                          className={`relative block px-4 py-3 rounded-xl text-base font-medium transition-all duration-300 group ${
                            isActive
                              ? 'bg-white/20 text-white border border-white/30'
                              : 'text-white/80 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/20'
                          }`}
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <span className="relative z-10 inline-block">{link.name}</span>
                          {!isActive && (
                            <span className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-emerald-400 to-teal-400 group-hover:w-[calc(100%-2rem)] transition-all duration-300" />
                          )}
                        </Link>
                      </motion.div>
                    );
                  })}
                  
                  {/* Mobile Auth Buttons */}
                  <div className="pt-4 border-t border-white/20 space-y-2">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4, duration: 0.3 }}
                    >
                      <Link 
                        to="/login" 
                        className="block w-full text-white/90 hover:text-white px-4 py-3 rounded-xl text-base font-medium text-center transition-colors border border-white/20 hover:border-white/30 hover:bg-white/10"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Log in
                      </Link>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5, duration: 0.3 }}
                    >
                      <Link 
                        to="/signup" 
                        className="block w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 px-4 py-3 rounded-xl text-base font-semibold transition-all duration-300 shadow-lg shadow-emerald-500/50 text-center"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Sign up
                      </Link>
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}

export default PublicNav;
