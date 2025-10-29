import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { HostProvider } from './contexts/HostContext';
import { OTPProvider } from './contexts/OTPContext';
import { initEmailJS } from './services/EmailService';
import PublicNav from "./PublicNav";
import GuestNav from "./GuestNav";
import HomePage from "./HomePage";
import Experiences from "./Experiences";
import Services from "./Services";
import Login from "./Login";
import Signup from "./Signup";
import OTPVerification from "./pages/OTPVerification";
import HostOnBoarding from './HostOnBoarding';
import HostPropertyType from './HostPropertyType';
import HostHomeDetails from './HostHomeDetails';
import HostExperienceDetails from './HostExperienceDetails';
import HostServiceDetails from './HostServiceDetails';
import HostPublishReview from './HostPublishReview';
import HostLocation from './HostLocation';
import HostPricing from './HostPricing';
import HostPhotos from './HostPhotos';

// ADD THESE NEW IMPORTS
import HostPolicyCompliance from './HostPolicyCompliance';
import HostSubscription from './HostSubscription';
import SubscriptionSuccess from './SubscriptionSuccess';
import SubscriptionCancel from './SubscriptionCancel';

import ListingDetail from './ListingDetail';
import EmailVerificationHandler from './EmailVerificationHandler';
import LoginSignupNav from './LoginSignupNav';
import { useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import './App.css';

import HostDashboard from './HostDashboard';
import HostNav from "./HostNav"; // Add this import

// Navigation switcher - Advanced version
function Navigation() {
  const { currentUser } = useAuth();
  const location = useLocation();
  
  // Use simplified nav for login/signup pages
  if (location.pathname === '/login' || location.pathname === '/signup') {
    return <LoginSignupNav />;
  }

  // Use HostNav for all host routes AND if user is on dashboard
  if (location.pathname.startsWith('/host') || location.pathname === '/host/dashboard') {
    return <HostNav />;
  }

  // For now, show GuestNav for all other logged-in users
  return currentUser ? <GuestNav /> : <PublicNav />;
}

function App() {
  useEffect(() => {
    initEmailJS();
  }, []);

  return ( 
    <AuthProvider>
      <OTPProvider>
        <HostProvider>
          <Router>
            <Navigation />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/experiences" element={<Experiences />} />
              <Route path="/services" element={<Services />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/verify-otp" element={<OTPVerification />} />
              
              <Route path="/profile" element={<div>Profile Page - Coming Soon</div>} />
              <Route path="/trips" element={<div>Trips Page - Coming Soon</div>} />
              <Route path="/wishlist" element={<div>Wishlist Page - Coming Soon</div>} />
              <Route path="/messages" element={<div>Messages Page - Coming Soon</div>} />
              <Route path="/become-host" element={<div>Become Host Page - Coming Soon</div>} />
              
              {/* Host Onboarding Flow - UPDATED ORDER */}
              <Route path="/host/onboarding" element={<HostOnBoarding />} />
              <Route path="/host/property-type" element={<HostPropertyType />} />
              <Route path="/host/home-details" element={<HostHomeDetails />} />
              <Route path="/host/experience-details" element={<HostExperienceDetails />} />
              <Route path="/host/service-details" element={<HostServiceDetails />} />
              <Route path="/host/location" element={<HostLocation />} />
              <Route path="/host/pricing" element={<HostPricing />} />
              <Route path="/host/photos" element={<HostPhotos />} />
              
              {/* NEW ROUTES - Policy & Compliance and Subscription */}
              <Route path="/host/policy-compliance" element={<HostPolicyCompliance />} />
              <Route path="/host/subscription" element={<HostSubscription />} />
              <Route path="/host/subscription/success" element={<SubscriptionSuccess />} />
              <Route path="/host/subscription/cancel" element={<SubscriptionCancel />} />
              
              {/* Final Step - Review & Publish */}
              <Route path="/host/publish-review" element={<HostPublishReview />} />
              
              <Route path="/host/dashboard" element={<HostDashboard />} />
              <Route path="/listing/:id" element={<ListingDetail />} />
              <Route path="/verify-email" element={<EmailVerificationHandler />} />

            </Routes>
          </Router>
        </HostProvider>
      </OTPProvider>
    </AuthProvider>
  );
}

export default App;