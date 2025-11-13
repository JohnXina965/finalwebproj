import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { AuthProvider } from './contexts/AuthContext';
import { HostProvider } from './contexts/HostContext';
import { OTPProvider } from './contexts/OTPContext';
import { WalletProvider } from './contexts/WalletContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { initEmailJS } from './services/EmailService';
import { checkAndExpireListings } from './services/ListingExpirationService';
import { checkAndAutoConfirmBookings } from './services/BookingAutoConfirmService';
import { checkAndSendCheckInReminders, checkAndSendReviewReminders } from './services/BookingReminderService';
import PublicNav from "./PublicNav";
import GuestNav from "./GuestNav";
import PublicHomePage from "./pages/public/PublicHomePage";
import PublicStays from "./pages/public/PublicStays";
import PublicExperiences from "./pages/public/PublicExperiences";
import PublicServices from "./pages/public/PublicServices";
import GuestHomePage from "./pages/guest/GuestStaysPage";
import GuestExperiences from "./pages/guest/GuestExperiences";
import GuestServices from "./pages/guest/GuestServices";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import OTPVerification from "./pages/OTPVerification";
import HostOnBoarding from './pages/host/HostOnBoarding';
import HostCreateListing from './pages/host/HostCreateListing';

// ADD THESE NEW IMPORTS
import HostPolicyCompliance from './pages/host/HostPolicyCompliance';
import HostSubscription from './pages/host/HostSubscription';
import SubscriptionSuccess from './pages/host/SubscriptionSuccess';
import SubscriptionCancel from './pages/host/SubscriptionCancel';

import ListingDetail from './pages/ListingDetail';
import EmailVerificationHandler from './EmailVerificationHandler';
import LoginSignupNav from './LoginSignupNav';
import Wallet from './pages/Wallet';
import { useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import './App.css';

import HostDashboard from './pages/host/HostDashboard';
import HostAccountSettings from './pages/HostAccountSettings';
import HostProfile from './pages/host/HostProfile';
import HostNav from "./HostNav";
import GuestTrips from './pages/GuestTrips';
import GuestWishlist from './pages/GuestWishlist';
import GuestMessages from './pages/GuestMessages';
import HostMessages from './pages/HostMessages';
import GuestSettings from './pages/GuestSettings';
import GuestProfile from './pages/GuestProfile';
import GuestReviews from './pages/GuestReviews';
import GuestDashboard from './pages/guest/GuestDashboard';
import Footer from './Footer';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminSetup from './pages/AdminSetup';
import AdminFeedback from './pages/AdminFeedback';
import AdminSubscriptions from './pages/AdminSubscriptions';
import AdminReviews from './pages/AdminReviews';
import AdminBookings from './pages/AdminBookings';
import AdminUsers from './pages/AdminUsers';
import AdminSettings from './pages/AdminSettings';
import AdminPayouts from './pages/admin/AdminPayouts';
import AdminPolicyManagement from './pages/AdminPolicyManagement';
import AdminReports from './pages/AdminReports';
import AdminNav from './components/AdminNav';

// Footer component that conditionally renders
function ConditionalFooter() {
  const location = useLocation();
  // Hide footer on login/signup pages, admin pages, and onboarding for cleaner UI
  if (location.pathname === '/login' || 
      location.pathname === '/signup' || 
      location.pathname === '/verify-otp' ||
      location.pathname === '/host/onboarding' ||
      location.pathname.startsWith('/admin')) {
    return null;
  }
  return <Footer />;
}

// Fixed Navigation component
function Navigation() {
  const { currentUser } = useAuth();
  const location = useLocation();
  
  // Hide navigation for onboarding page (standalone flow)
  if (location.pathname === '/host/onboarding') {
    return null;
  }
  
  // Use simplified nav for login/signup/verify-otp pages
  if (location.pathname === '/login' || location.pathname === '/signup' || location.pathname === '/verify-otp') {
    return <LoginSignupNav />;
  }

  // Use AdminNav for all admin routes (highest priority)
  if (location.pathname.startsWith('/admin')) {
    return <AdminNav />;
  }

  // Use HostNav for all host routes (except onboarding)
  if (location.pathname.startsWith('/host')) {
    return <HostNav />;
  }

  // For guest/public routes, show GuestNav if logged in, PublicNav if not
  return currentUser ? <GuestNav /> : <PublicNav />;
}

// Footer component that conditionally renders
function AppFooter() {
  const location = useLocation();
  // Hide footer on login/signup pages for cleaner UI
  if (location.pathname === '/login' || location.pathname === '/signup' || location.pathname === '/verify-otp') {
    return null;
  }
  return <Footer />;
}

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function App() {
  useEffect(() => {
    initEmailJS();
    // Initialize AOS (Animate On Scroll)
    AOS.init({
      duration: 1000,
      easing: 'ease-in-out',
      once: true,
      mirror: false
    });
    
    // Check and expire listings on app load
    checkAndExpireListings().catch(error => {
      console.error('Error checking expired listings:', error);
    });
    
    // Check and auto-confirm pending bookings on app load
    checkAndAutoConfirmBookings().catch(error => {
      console.error('Error checking auto-confirm bookings:', error);
    });
    
    // Check and send booking reminders on app load
    checkAndSendCheckInReminders().catch(error => {
      console.error('Error checking check-in reminders:', error);
    });
    
    checkAndSendReviewReminders().catch(error => {
      console.error('Error checking review reminders:', error);
    });
    
    // Set up periodic checks
    const autoConfirmInterval = setInterval(() => {
      checkAndAutoConfirmBookings().catch(error => {
        console.error('Error checking auto-confirm bookings:', error);
      });
    }, 30 * 60 * 1000); // 30 minutes
    
    // Check reminders every hour
    const reminderInterval = setInterval(() => {
      checkAndSendCheckInReminders().catch(error => {
        console.error('Error checking check-in reminders:', error);
      });
      checkAndSendReviewReminders().catch(error => {
        console.error('Error checking review reminders:', error);
      });
    }, 60 * 60 * 1000); // 1 hour
    
    return () => {
      clearInterval(autoConfirmInterval);
      clearInterval(reminderInterval);
    };
  }, []);

  return ( 
    <ThemeProvider>
      <AuthProvider>
        <OTPProvider>
          <WalletProvider>
            <HostProvider>
              <Router>
              <ScrollToTop />
              <Toaster 
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#fff',
                    color: '#363636',
                    borderRadius: '12px',
                    padding: '16px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  },
                  success: {
                    duration: 3000,
                    iconTheme: {
                      primary: '#14b8a6',
                      secondary: '#fff',
                    },
                  },
                  error: {
                    duration: 4000,
                    iconTheme: {
                      primary: '#ef4444',
                      secondary: '#fff',
                    },
                  },
                }}
              />
              <div className="flex flex-col min-h-screen">
                <Navigation />
                <div className="flex-grow">
                  <Routes>
                  <Route path="/" element={<PublicHomePage />} />
                  {/* Public catalog routes */}
                  <Route path="/stays" element={<PublicStays />} />
                  <Route path="/homes" element={<PublicStays />} />
                  <Route path="/experiences" element={<PublicExperiences />} />
                  <Route path="/services" element={<PublicServices />} />

                  {/* Guest Dashboard */}
                  <Route path="/guest/dashboard" element={<GuestDashboard />} />
                  {/* Guest (authenticated) catalog routes */}
                  <Route path="/guest/homes" element={<GuestHomePage />} />
                  <Route path="/guest/experiences" element={<GuestExperiences />} />
                  <Route path="/guest/services" element={<GuestServices />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/verify-otp" element={<OTPVerification />} />
                  
                  <Route path="/profile" element={<GuestProfile />} />
                  <Route path="/trips" element={<GuestTrips />} />
                  <Route path="/wishlist" element={<GuestWishlist />} />
                  <Route path="/messages" element={<GuestMessages />} />
                  <Route path="/settings" element={<GuestSettings />} />
                  <Route path="/reviews" element={<GuestReviews />} />
                  <Route path="/wallet" element={<Wallet />} />
                  <Route path="/become-host" element={<div>Become Host Page - Coming Soon</div>} />
                  
                  {/* Host Onboarding Flow */}
                  <Route path="/host/onboarding" element={<HostOnBoarding />} />
                  {/* Combined Listing Creation Flow */}
                  <Route path="/host/create-listing" element={<HostCreateListing />} />
                  {/* Legacy routes - redirect to combined flow */}
                  <Route path="/host/property-type" element={<HostCreateListing />} />
                  <Route path="/host/home-details" element={<HostCreateListing />} />
                  <Route path="/host/experience-details" element={<HostCreateListing />} />
                  <Route path="/host/service-details" element={<HostCreateListing />} />
                  <Route path="/host/location" element={<HostCreateListing />} />
                  <Route path="/host/pricing" element={<HostCreateListing />} />
                  <Route path="/host/photos" element={<HostCreateListing />} />
                  
                  {/* NEW ROUTES - Policy & Compliance and Subscription */}
                  <Route path="/host/policy-compliance" element={<HostPolicyCompliance />} />
                  <Route path="/host/subscription" element={<HostSubscription />} />
                  <Route path="/host/subscription/success" element={<SubscriptionSuccess />} />
                  <Route path="/host/subscription/cancel" element={<SubscriptionCancel />} />
                  
                  {/* Final Step - Review & Publish (now handled in HostCreateListing) */}
                  <Route path="/host/publish-review" element={<HostCreateListing />} />
                  
                  <Route path="/host/dashboard" element={<HostDashboard />} />
                  <Route path="/host/messages" element={<HostMessages />} />
                  <Route path="/host/profile" element={<HostProfile />} />
                  <Route path="/host/settings" element={<HostAccountSettings />} />
                  
                  {/* Admin Routes */}
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route path="/admin/setup" element={<AdminSetup />} />
                  <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  <Route path="/admin/feedback" element={<AdminFeedback />} />
                  <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
                  <Route path="/admin/reviews" element={<AdminReviews />} />
                  <Route path="/admin/bookings" element={<AdminBookings />} />
                  <Route path="/admin/users" element={<AdminUsers />} />
                  <Route path="/admin/settings" element={<AdminSettings />} />
                  <Route path="/admin/payouts" element={<AdminPayouts />} />
                  <Route path="/admin/policy" element={<AdminPolicyManagement />} />
                  <Route path="/admin/reports" element={<AdminReports />} />
                  
                  <Route path="/listing/:id" element={<ListingDetail />} />
                  <Route path="/verify-email" element={<EmailVerificationHandler />} />
                  </Routes>
                </div>
                <ConditionalFooter />
              </div>
              </Router>
            </HostProvider>
          </WalletProvider>
        </OTPProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;