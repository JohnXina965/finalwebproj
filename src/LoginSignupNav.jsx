import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import logo from './assets/logo.png';

function LoginSignupNav() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

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
      className={`fixed top-0 left-0 right-0 z-[9999] transition-all duration-300 ${
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

          {/* Right Section - Premium Auth Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <Link 
                to="/login" 
                className="relative px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group"
              >
                <span className="relative z-10 inline-block text-white/80 hover:text-white">
                  Log in
                </span>
                <span className="absolute bottom-1.5 left-1/2 transform -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-emerald-400 to-teal-400 group-hover:w-[calc(100%-2rem)] transition-all duration-300" />
                <div className="absolute inset-0 bg-white/0 hover:bg-white/10 backdrop-blur-sm rounded-xl border border-transparent hover:border-white/20 transition-all duration-300" />
              </Link>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <Link 
                to="/signup" 
                className="relative px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 overflow-hidden group"
              >
                <span className="relative z-10 inline-block text-white">
                  Sign up
                </span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
              </Link>
            </motion.div>
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            className="md:hidden p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 focus:outline-none transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            whileTap={{ scale: 0.95 }}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
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
              <div className="py-4 border-t border-white/20 bg-white/10 backdrop-blur-2xl">
                <div className="flex flex-col space-y-2">
                  <Link 
                    to="/login" 
                    className="w-full text-white/80 hover:text-white px-4 py-3 rounded-xl text-base font-medium text-left transition-all duration-300 hover:bg-white/10 block"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Log in
                  </Link>
                  <Link 
                    to="/signup" 
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 px-4 py-3 rounded-xl text-base font-semibold transition-all duration-300 block text-center shadow-lg"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign up
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}

export default LoginSignupNav;