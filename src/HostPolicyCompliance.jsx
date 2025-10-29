import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useHost } from './contexts/HostContext';

const HostPolicyCompliance = () => {
  const { updateHostData } = useHost();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  const [acceptedPolicies, setAcceptedPolicies] = useState({
    termsOfService: false,
    privacyPolicy: false,
    hostingRules: false,
    safetyGuidelines: false,
    cancellationPolicy: false,
    communityStandards: false
  });

  const [activeModal, setActiveModal] = useState(null);

  // Policy content for modals
  const policyContent = {
    termsOfService: {
      title: "Terms of Service",
      content: `
        <h3 class="text-lg font-semibold mb-4">EcoExpress Terms of Service</h3>
        <p class="mb-4">Welcome to EcoExpress! By using our platform, you agree to these terms:</p>
        
        <h4 class="font-semibold mb-2">1. Host Responsibilities</h4>
        <ul class="list-disc list-inside mb-4 space-y-1">
          <li>Provide accurate and truthful listing information</li>
          <li>Maintain your property in safe, clean condition</li>
          <li>Respond to guest inquiries within 24 hours</li>
          <li>Honor confirmed bookings and cancellation policies</li>
        </ul>

        <h4 class="font-semibold mb-2">2. Guest Responsibilities</h4>
        <ul class="list-disc list-inside mb-4 space-y-1">
          <li>Treat properties with respect and care</li>
          <li>Follow house rules and community guidelines</li>
          <li>Communicate clearly with hosts</li>
          <li>Report any issues promptly</li>
        </ul>

        <h4 class="font-semibold mb-2">3. Platform Rules</h4>
        <ul class="list-disc list-inside mb-4 space-y-1">
          <li>No discrimination based on race, gender, religion, or orientation</li>
          <li>No illegal activities on our platform</li>
          <li>Respect intellectual property rights</li>
          <li>Maintain respectful communication</li>
        </ul>

        <p class="text-sm text-gray-600">Last updated: ${new Date().toLocaleDateString()}</p>
      `
    },
    privacyPolicy: {
      title: "Privacy Policy",
      content: `
        <h3 class="text-lg font-semibold mb-4">Privacy Policy</h3>
        <p class="mb-4">We are committed to protecting your personal information:</p>
        
        <h4 class="font-semibold mb-2">Information We Collect</h4>
        <ul class="list-disc list-inside mb-4 space-y-1">
          <li>Personal identification information</li>
          <li>Property details and photos</li>
          <li>Payment information (processed securely by PayPal)</li>
          <li>Communication history with other users</li>
          <li>Booking and transaction history</li>
        </ul>

        <h4 class="font-semibold mb-2">How We Use Your Information</h4>
        <ul class="list-disc list-inside mb-4 space-y-1">
          <li>Facilitate bookings and payments</li>
          <li>Provide customer support</li>
          <li>Improve our platform and services</li>
          <li>Send important updates and notifications</li>
          <li>Ensure platform security and prevent fraud</li>
        </ul>

        <h4 class="font-semibold mb-2">Data Protection</h4>
        <p class="mb-2">We implement security measures to protect your data and never sell your personal information to third parties.</p>
      `
    },
    hostingRules: {
      title: "Hosting Rules & Standards",
      content: `
        <h3 class="text-lg font-semibold mb-4">Hosting Rules & Standards</h3>
        <p class="mb-4">Maintain high-quality standards as an EcoExpress host:</p>
        
        <h4 class="font-semibold mb-2">Listing Accuracy</h4>
        <ul class="list-disc list-inside mb-4 space-y-1">
          <li>Provide accurate photos that represent your property</li>
          <li>Clearly describe amenities, features, and limitations</li>
          <li>Update availability calendar regularly</li>
          <li>Disclose any potential issues or restrictions</li>
        </ul>

        <h4 class="font-semibold mb-2">Communication Standards</h4>
        <ul class="list-disc list-inside mb-4 space-y-1">
          <li>Respond to inquiries within 24 hours</li>
          <li>Provide clear check-in instructions</li>
          <li>Be available during guest stays for emergencies</li>
          <li>Communicate professionally and respectfully</li>
        </ul>

        <h4 class="font-semibold mb-2">Property Standards</h4>
        <ul class="list-disc list-inside mb-4 space-y-1">
          <li>Maintain clean and well-maintained properties</li>
          <li>Ensure all amenities are in working order</li>
          <li>Provide essential supplies (linens, toiletries, etc.)</li>
          <li>Follow local safety regulations and building codes</li>
        </ul>

        <h4 class="font-semibold mb-2">Eco-Friendly Practices</h4>
        <ul class="list-disc list-inside mb-4 space-y-1">
          <li>Implement recycling and waste reduction</li>
          <li>Use eco-friendly cleaning products when possible</li>
          <li>Conserve water and energy</li>
          <li>Support local sustainable businesses</li>
        </ul>
      `
    },
    safetyGuidelines: {
      title: "Safety & Security Guidelines",
      content: `
        <h3 class="text-lg font-semibold mb-4">Safety & Security Guidelines</h3>
        <p class="mb-4">Ensure a safe environment for all community members:</p>
        
        <h4 class="font-semibold mb-2">Property Safety</h4>
        <ul class="list-disc list-inside mb-4 space-y-1">
          <li>Install smoke detectors and carbon monoxide alarms</li>
          <li>Provide fire extinguishers and first aid kits</li>
          <li>Ensure safe electrical wiring and appliances</li>
          <li>Maintain secure locks on all entry points</li>
          <li>Clear emergency exits and pathways</li>
        </ul>

        <h4 class="font-semibold mb-2">Guest Safety</h4>
        <ul class="list-disc list-inside mb-4 space-y-1">
          <li>Provide emergency contact information</li>
          <li>Share local emergency services numbers</li>
          <li>Disclose any potential hazards or risks</li>
          <li>Ensure swimming pool safety if applicable</li>
          <li>Maintain proper lighting in common areas</li>
        </ul>

        <h4 class="font-semibold mb-2">Community Security</h4>
        <ul class="list-disc list-inside mb-4 space-y-1">
          <li>Respect neighbor privacy and peace</li>
          <li>Follow local noise ordinances</li>
          <li>Manage guest behavior and compliance</li>
          <li>Report any security concerns immediately</li>
        </ul>
      `
    },
    cancellationPolicy: {
      title: "Cancellation Policy",
      content: `
        <h3 class="text-lg font-semibold mb-4">Cancellation Policy</h3>
        <p class="mb-4">Understand our cancellation terms and conditions:</p>
        
        <h4 class="font-semibold mb-2">Host Cancellations</h4>
        <ul class="list-disc list-inside mb-4 space-y-1">
          <li>Cancellations must be made at least 7 days before check-in</li>
          <li>Emergency cancellations require documentation</li>
          <li>Frequent cancellations may affect host status</li>
          <li>Guests receive full refund for host cancellations</li>
        </ul>

        <h4 class="font-semibold mb-2">Guest Cancellations</h4>
        <ul class="list-disc list-inside mb-4 space-y-1">
          <li>Free cancellation within 24 hours of booking</li>
          <li>50% refund if cancelled 7+ days before check-in</li>
          <li>No refund for cancellations within 7 days of check-in</li>
          <li>Travel insurance recommended for unexpected events</li>
        </ul>

        <h4 class="font-semibold mb-2">Extenuating Circumstances</h4>
        <p class="mb-2">We understand that emergencies happen. Contact support for situations like:</p>
        <ul class="list-disc list-inside mb-4 space-y-1">
          <li>Serious illness or death in immediate family</li>
          <li>Natural disasters affecting travel</li>
          <li>Government travel restrictions</li>
          <li>Significant property issues making stay impossible</li>
        </ul>
      `
    },
    communityStandards: {
      title: "Community Standards",
      content: `
        <h3 class="text-lg font-semibold mb-4">Community Standards</h3>
        <p class="mb-4">Foster an inclusive and respectful community environment:</p>
        
        <h4 class="font-semibold mb-2">Respect and Inclusion</h4>
        <ul class="list-disc list-inside mb-4 space-y-1">
          <li>No discrimination based on race, ethnicity, national origin</li>
          <li>No discrimination based on religion, gender, sexual orientation</li>
          <li>No discrimination based on age, disability, or marital status</li>
          <li>Welcome diversity and different perspectives</li>
          <li>Create inclusive spaces for all community members</li>
        </ul>

        <h4 class="font-semibold mb-2">Communication Standards</h4>
        <ul class="list-disc list-inside mb-4 space-y-1">
          <li>Use respectful and professional language</li>
          <li>No harassment, bullying, or threatening behavior</li>
          <li>Respect cultural differences and boundaries</li>
          <li>Communicate clearly and honestly</li>
          <li>Resolve conflicts constructively</li>
        </ul>

        <h4 class="font-semibold mb-2">Community Values</h4>
        <ul class="list-disc list-inside mb-4 space-y-1">
          <li>Build trust through transparency and honesty</li>
          <li>Support sustainable and eco-friendly practices</li>
          <li>Respect local communities and environments</li>
          <li>Share knowledge and help other community members</li>
          <li>Contribute positively to the EcoExpress community</li>
        </ul>

        <h4 class="font-semibold mb-2">Reporting Issues</h4>
        <p class="mb-2">If you experience or witness violations of these standards, please report them immediately through our support system.</p>
      `
    }
  };

  const handleReadPolicy = (policy) => {
    setActiveModal(policy);
  };

  const handleAcceptPolicy = (policy) => {
    setAcceptedPolicies(prev => ({
      ...prev,
      [policy]: true
    }));
    setActiveModal(null);
  };

  const handleCloseModal = () => {
    setActiveModal(null);
  };

  const allPoliciesAccepted = Object.values(acceptedPolicies).every(Boolean);

  const handleContinue = () => {
    if (!allPoliciesAccepted) {
      alert('Please read and accept all policies to continue');
      return;
    }

    // Save policy acceptance to context
    updateHostData({
      policiesAccepted: acceptedPolicies,
      policyAcceptedAt: new Date().toISOString(),
      currentStep: 8
    });

    // Navigate to subscription
    navigate('/host/subscription');
  };

  return (
    <div className={`min-h-screen bg-gray-50 py-8 animate-multi-layer transition-all duration-1000 ${
      mounted ? 'opacity-100' : 'opacity-0'
    }`}>
      <div className="max-w-4xl mx-auto px-4">
        {/* Progress Bar - Step 7 of 9 */}
        <div className={`mb-8 transition-all duration-700 delay-200 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <div className="flex items-center justify-between mb-2 transition-all duration-500 delay-300">
            <span className="text-sm font-medium text-teal-600">Step 7 of 9</span>
            <span className="text-sm text-gray-500">Policies & Compliance</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 transition-all duration-500 delay-400">
            <div className="bg-teal-600 h-2 rounded-full w-7/9 transition-all duration-700 delay-500"></div>
          </div>
        </div>

        <div className={`text-center mb-8 transition-all duration-700 delay-300 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 transition-all duration-700 delay-400">
            Policies & Compliance
          </h1>
          <p className="text-gray-600 transition-all duration-700 delay-500">
            Please read and accept all hosting policies before proceeding to payment
          </p>
          <p className="text-sm text-teal-600 mt-2 transition-all duration-700 delay-600">
            Click "Read Policy" to view each policy, then accept it within the popup
          </p>
        </div>

        {/* Policy Cards */}
        <div className={`bg-white rounded-xl shadow-sm p-6 mb-6 transition-all duration-700 delay-400 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <div className="space-y-6">
            {/* Terms of Service */}
            <div className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg transition-all duration-500 delay-500 hover:shadow-md hover:-translate-y-0.5">
              <div className="flex-shrink-0 mt-1 transition-all duration-500 delay-600">
                <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all duration-300 ${
                  acceptedPolicies.termsOfService 
                    ? 'bg-teal-600 border-teal-600 text-white scale-110' 
                    : 'border-gray-300 bg-white hover:border-teal-400'
                }`}>
                  {acceptedPolicies.termsOfService && (
                    <svg className="w-3 h-3 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <div className="flex-1 transition-all duration-500 delay-700">
                <label className="block text-lg font-semibold text-gray-900 mb-2 transition-all duration-500 delay-800">
                  Terms of Service
                </label>
                <p className="text-gray-600 text-sm mb-3 transition-all duration-500 delay-900">
                  I agree to the EcoExpress Terms of Service and understand that I am responsible for complying with all applicable laws and regulations.
                </p>
                <button
                  onClick={() => handleReadPolicy('termsOfService')}
                  className="text-teal-600 hover:text-teal-700 text-sm font-medium underline transition-all duration-300 delay-1000 hover:scale-105"
                >
                  Read Terms of Service
                </button>
              </div>
            </div>

            {/* Privacy Policy */}
            <div className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg transition-all duration-500 delay-600 hover:shadow-md hover:-translate-y-0.5">
              <div className="flex-shrink-0 mt-1 transition-all duration-500 delay-700">
                <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all duration-300 ${
                  acceptedPolicies.privacyPolicy 
                    ? 'bg-teal-600 border-teal-600 text-white scale-110' 
                    : 'border-gray-300 bg-white hover:border-teal-400'
                }`}>
                  {acceptedPolicies.privacyPolicy && (
                    <svg className="w-3 h-3 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <div className="flex-1 transition-all duration-500 delay-800">
                <label className="block text-lg font-semibold text-gray-900 mb-2 transition-all duration-500 delay-900">
                  Privacy Policy
                </label>
                <p className="text-gray-600 text-sm mb-3 transition-all duration-500 delay-1000">
                  I agree to the collection and use of my personal information as described in the Privacy Policy.
                </p>
                <button
                  onClick={() => handleReadPolicy('privacyPolicy')}
                  className="text-teal-600 hover:text-teal-700 text-sm font-medium underline transition-all duration-300 delay-1100 hover:scale-105"
                >
                  Read Privacy Policy
                </button>
              </div>
            </div>

            {/* Hosting Rules */}
            <div className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg transition-all duration-500 delay-700 hover:shadow-md hover:-translate-y-0.5">
              <div className="flex-shrink-0 mt-1 transition-all duration-500 delay-800">
                <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all duration-300 ${
                  acceptedPolicies.hostingRules 
                    ? 'bg-teal-600 border-teal-600 text-white scale-110' 
                    : 'border-gray-300 bg-white hover:border-teal-400'
                }`}>
                  {acceptedPolicies.hostingRules && (
                    <svg className="w-3 h-3 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <div className="flex-1 transition-all duration-500 delay-900">
                <label className="block text-lg font-semibold text-gray-900 mb-2 transition-all duration-500 delay-1000">
                  Hosting Rules & Standards
                </label>
                <p className="text-gray-600 text-sm mb-3 transition-all duration-500 delay-1100">
                  I agree to maintain high-quality standards, provide accurate listings, and respond to guest inquiries promptly.
                </p>
                <button
                  onClick={() => handleReadPolicy('hostingRules')}
                  className="text-teal-600 hover:text-teal-700 text-sm font-medium underline transition-all duration-300 delay-1200 hover:scale-105"
                >
                  Read Hosting Rules
                </button>
              </div>
            </div>

            {/* Safety Guidelines */}
            <div className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg transition-all duration-500 delay-800 hover:shadow-md hover:-translate-y-0.5">
              <div className="flex-shrink-0 mt-1 transition-all duration-500 delay-900">
                <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all duration-300 ${
                  acceptedPolicies.safetyGuidelines 
                    ? 'bg-teal-600 border-teal-600 text-white scale-110' 
                    : 'border-gray-300 bg-white hover:border-teal-400'
                }`}>
                  {acceptedPolicies.safetyGuidelines && (
                    <svg className="w-3 h-3 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <div className="flex-1 transition-all duration-500 delay-1000">
                <label className="block text-lg font-semibold text-gray-900 mb-2 transition-all duration-500 delay-1100">
                  Safety & Security Guidelines
                </label>
                <p className="text-gray-600 text-sm mb-3 transition-all duration-500 delay-1200">
                  I agree to maintain a safe environment, follow safety protocols, and comply with local safety regulations.
                </p>
                <button
                  onClick={() => handleReadPolicy('safetyGuidelines')}
                  className="text-teal-600 hover:text-teal-700 text-sm font-medium underline transition-all duration-300 delay-1300 hover:scale-105"
                >
                  Read Safety Guidelines
                </button>
              </div>
            </div>

            {/* Cancellation Policy */}
            <div className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg transition-all duration-500 delay-900 hover:shadow-md hover:-translate-y-0.5">
              <div className="flex-shrink-0 mt-1 transition-all duration-500 delay-1000">
                <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all duration-300 ${
                  acceptedPolicies.cancellationPolicy 
                    ? 'bg-teal-600 border-teal-600 text-white scale-110' 
                    : 'border-gray-300 bg-white hover:border-teal-400'
                }`}>
                  {acceptedPolicies.cancellationPolicy && (
                    <svg className="w-3 h-3 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <div className="flex-1 transition-all duration-500 delay-1100">
                <label className="block text-lg font-semibold text-gray-900 mb-2 transition-all duration-500 delay-1200">
                  Cancellation Policy
                </label>
                <p className="text-gray-600 text-sm mb-3 transition-all duration-500 delay-1300">
                  I understand and agree to the cancellation policy terms and will honor confirmed bookings.
                </p>
                <button
                  onClick={() => handleReadPolicy('cancellationPolicy')}
                  className="text-teal-600 hover:text-teal-700 text-sm font-medium underline transition-all duration-300 delay-1400 hover:scale-105"
                >
                  Read Cancellation Policy
                </button>
              </div>
            </div>

            {/* Community Standards */}
            <div className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg transition-all duration-500 delay-1000 hover:shadow-md hover:-translate-y-0.5">
              <div className="flex-shrink-0 mt-1 transition-all duration-500 delay-1100">
                <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all duration-300 ${
                  acceptedPolicies.communityStandards 
                    ? 'bg-teal-600 border-teal-600 text-white scale-110' 
                    : 'border-gray-300 bg-white hover:border-teal-400'
                }`}>
                  {acceptedPolicies.communityStandards && (
                    <svg className="w-3 h-3 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <div className="flex-1 transition-all duration-500 delay-1200">
                <label className="block text-lg font-semibold text-gray-900 mb-2 transition-all duration-500 delay-1300">
                  Community Standards
                </label>
                <p className="text-gray-600 text-sm mb-3 transition-all duration-500 delay-1400">
                  I agree to treat all community members with respect, avoid discrimination, and foster an inclusive environment.
                </p>
                <button
                  onClick={() => handleReadPolicy('communityStandards')}
                  className="text-teal-600 hover:text-teal-700 text-sm font-medium underline transition-all duration-300 delay-1500 hover:scale-105"
                >
                  Read Community Standards
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={`flex justify-between items-center transition-all duration-500 delay-1100 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <Link 
            to="/host/photos"
            className="inline-flex items-center text-gray-600 hover:text-gray-800 font-medium transition-all duration-300 delay-1200 hover:scale-105"
          >
            ← Back to Photos
          </Link>

          <button
            onClick={handleContinue}
            disabled={!allPoliciesAccepted}
            className={`px-8 py-3 rounded-lg font-semibold transition-all duration-300 delay-1300 ${
              allPoliciesAccepted 
                ? 'bg-teal-600 text-white hover:bg-teal-700 hover:shadow-lg hover:-translate-y-0.5' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Continue to Subscription
          </button>
        </div>

        {/* Progress Indicator */}
        <div className={`mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200 transition-all duration-500 delay-1200 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <div className="flex items-center justify-between mb-2 transition-all duration-500 delay-1300">
            <span className="text-blue-700 text-sm font-medium transition-all duration-500 delay-1400">
              Policies Accepted: {Object.values(acceptedPolicies).filter(Boolean).length} of {Object.keys(acceptedPolicies).length}
            </span>
            <span className="text-blue-600 text-sm transition-all duration-500 delay-1500">
              {allPoliciesAccepted ? '✅ All policies accepted!' : '📖 Read all policies to continue'}
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2 transition-all duration-500 delay-1600">
            <div 
              className="bg-teal-600 h-2 rounded-full transition-all duration-500 delay-1700"
              style={{ width: `${(Object.values(acceptedPolicies).filter(Boolean).length / Object.keys(acceptedPolicies).length) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Policy Modal */}
      {activeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 transition-all duration-300">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden transform transition-all duration-300 scale-95 animate-in fade-in-90 zoom-in-95">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 transition-all duration-300">
              <h2 className="text-xl font-bold text-gray-900 transition-all duration-300">
                {policyContent[activeModal].title}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-all duration-300 hover:scale-110"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh] transition-all duration-300">
              <div 
                className="prose prose-sm max-w-none transition-all duration-300"
                dangerouslySetInnerHTML={{ __html: policyContent[activeModal].content }}
              />
            </div>
            
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 transition-all duration-300">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-all duration-300 delay-100 hover:shadow-md hover:-translate-y-0.5"
              >
                Close
              </button>
              <button
                onClick={() => handleAcceptPolicy(activeModal)}
                className="px-4 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-all duration-300 delay-200 hover:shadow-lg hover:-translate-y-0.5"
              >
                Accept Policy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HostPolicyCompliance;