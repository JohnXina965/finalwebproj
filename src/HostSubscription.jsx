import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useHost } from './contexts/HostContext';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { paypalConfig } from './config/paypal';
import { createPayPalSubscription, verifyPayPalSubscription, convertToPHP } from './services/PaypalServices';

const HostSubscription = () => {
  const { hostData, updateHostData } = useHost();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [showPayPal, setShowPayPal] = useState(false);
  const [paypalError, setPaypalError] = useState(null);

  const subscriptionPlans = [
    {
      id: 'basic',
      name: 'Basic',
      price: 9.99,
      period: 'month',
      description: 'Perfect for getting started',
      features: [
        '1 Active Listing',
        'Basic Analytics',
        'Standard Support',
        'Community Access'
      ],
      popular: false
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 19.99,
      period: 'month',
      description: 'Best for growing hosts',
      features: [
        'Up to 5 Active Listings',
        'Advanced Analytics',
        'Priority Support',
        'Featured Listings',
        'Booking Management Tools'
      ],
      popular: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 49.99,
      period: 'month',
      description: 'For power hosts & businesses',
      features: [
        'Unlimited Listings',
        'Full Analytics Suite',
        '24/7 Premium Support',
        'API Access',
        'Custom Domain',
        'Dedicated Account Manager'
      ],
      popular: false
    }
  ];

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    setShowPayPal(false);
    setPaypalError(null);
  };

  const handleSubscribeClick = () => {
    if (!selectedPlan) {
      alert('Please select a subscription plan');
      return;
    }
    setShowPayPal(true);
    setPaypalError(null);
  };

  const processDemoPayment = async () => {
    if (!selectedPlan) {
      alert('Please select a subscription plan');
      return;
    }

    setProcessing(true);

    try {
      // Simulate payment processing
      console.log('Processing demo subscription for plan:', selectedPlan);
      
      setTimeout(() => {
        // Save subscription data to context
        updateHostData({
          subscriptionPlan: selectedPlan,
          subscriptionStatus: 'active',
          paymentVerified: true,
          paypalSubscriptionId: `I-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          currentStep: 9
        });

        console.log('Demo subscription processed successfully:', selectedPlan);
        navigate('/host/publish-review');
      }, 2000);

    } catch (error) {
      console.error('Demo payment error:', error);
      setPaypalError('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const paypalOptions = {
    clientId: paypalConfig.clientId,
    currency: paypalConfig.currency,
    intent: paypalConfig.intent,
    components: "buttons",
  };

  // Convert price to PHP for display
  const getPriceInPHP = (usdPrice) => {
    return convertToPHP(usdPrice);
  };

  return (
    <PayPalScriptProvider options={paypalOptions}>
      <div className={`min-h-screen bg-gray-50 py-8 animate-multi-layer transition-all duration-1000 ${
        mounted ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="max-w-6xl mx-auto px-4">
          {/* Progress Bar - Step 8 of 9 */}
          <div className={`mb-8 transition-all duration-700 delay-200 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            <div className="flex items-center justify-between mb-2 transition-all duration-500 delay-300">
              <span className="text-sm font-medium text-teal-600">Step 8 of 9</span>
              <span className="text-sm text-gray-500">Subscription</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 transition-all duration-500 delay-400">
              <div className="bg-teal-600 h-2 rounded-full w-8/9 transition-all duration-700 delay-500"></div>
            </div>
          </div>

          <div className={`text-center mb-8 transition-all duration-700 delay-300 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 transition-all duration-700 delay-400">
              Choose Your Subscription Plan
            </h1>
            <p className="text-gray-600 transition-all duration-700 delay-500">
              Select a plan to start hosting on EcoExpress. Cancel anytime.
            </p>
          </div>

          {/* Error Message */}
          {paypalError && (
            <div className={`bg-red-50 border border-red-200 rounded-lg p-4 mb-6 max-w-2xl mx-auto transition-all duration-500 delay-600 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
              <div className="flex items-center transition-all duration-500 delay-700">
                <svg className="w-5 h-5 text-red-400 mr-2 transition-all duration-500 delay-800" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-red-700 transition-all duration-500 delay-900">{paypalError}</p>
              </div>
            </div>
          )}

          {/* Subscription Plans */}
          <div className={`grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-8 transition-all duration-700 delay-400 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            {subscriptionPlans.map((plan, index) => (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl shadow-sm border-2 p-6 transition-all duration-500 cursor-pointer ${
                  selectedPlan?.id === plan.id
                    ? 'border-teal-500 ring-2 ring-teal-200 transform scale-105'
                    : plan.popular
                    ? 'border-teal-200 hover:border-teal-300'
                    : 'border-gray-200 hover:border-gray-300'
                } delay-${500 + (index * 100)} hover:shadow-lg hover:-translate-y-1`}
                onClick={() => handlePlanSelect(plan)}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-teal-500 text-white px-4 py-1 rounded-full text-sm font-medium transition-all duration-500 delay-600 hover:scale-110">
                    Most Popular
                  </div>
                )}
                
                <div className="text-center mb-6 transition-all duration-500 delay-700">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2 transition-all duration-500 delay-800">{plan.name}</h3>
                  <div className="flex items-baseline justify-center mb-2 transition-all duration-500 delay-900">
                    <span className="text-4xl font-bold text-teal-600 transition-all duration-500 delay-1000">${plan.price}</span>
                    <span className="text-gray-500 ml-2 transition-all duration-500 delay-1100">/{plan.period}</span>
                  </div>
                  <div className="text-sm text-gray-500 mb-1 transition-all duration-500 delay-1200">
                    ≈ ₱{getPriceInPHP(plan.price)} PHP
                  </div>
                  <p className="text-gray-600 text-sm transition-all duration-500 delay-1300">{plan.description}</p>
                </div>

                <ul className="space-y-3 mb-6 transition-all duration-500 delay-1400">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center text-sm text-gray-600 transition-all duration-500 delay-1500 hover:translate-x-1">
                      <svg className="w-5 h-5 text-teal-500 mr-3 flex-shrink-0 transition-all duration-300 delay-1600 hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 delay-1700 ${
                    selectedPlan?.id === plan.id
                      ? 'bg-teal-600 text-white hover:bg-teal-700 hover:shadow-lg hover:-translate-y-0.5'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md hover:-translate-y-0.5'
                  }`}
                >
                  {selectedPlan?.id === plan.id ? 'Selected' : 'Select Plan'}
                </button>
              </div>
            ))}
          </div>

          {/* Payment Section */}
          {selectedPlan && (
            <div className={`bg-white rounded-xl shadow-sm p-6 mb-6 max-w-2xl mx-auto transition-all duration-700 delay-600 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 transition-all duration-700 delay-700">
                Complete Your Subscription
              </h3>
              
              {/* Selected Plan Summary */}
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-6 transition-all duration-500 delay-800 hover:shadow-md">
                <h4 className="font-semibold text-teal-900 mb-2 transition-all duration-500 delay-900">Order Summary</h4>
                <div className="flex justify-between items-center transition-all duration-500 delay-1000">
                  <div>
                    <p className="text-teal-700 font-medium transition-all duration-500 delay-1100">{selectedPlan.name} Plan</p>
                    <p className="text-teal-600 text-sm transition-all duration-500 delay-1200">Billed monthly, cancel anytime</p>
                  </div>
                  <div className="text-right">
                    <p className="text-teal-700 font-bold text-lg transition-all duration-500 delay-1300">${selectedPlan.price}/{selectedPlan.period}</p>
                    <p className="text-teal-600 text-sm transition-all duration-500 delay-1400">≈ ₱{getPriceInPHP(selectedPlan.price)} PHP</p>
                  </div>
                </div>
              </div>

              {/* PayPal Buttons - Only show when user clicks Subscribe */}
              {showPayPal ? (
                <div className="mb-6 transition-all duration-500 delay-900">
                  <h4 className="font-medium text-gray-700 mb-3 transition-all duration-500 delay-1000">Pay with PayPal</h4>
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 transition-all duration-500 delay-1100 hover:shadow-md">
                    <div className="text-center mb-4 transition-all duration-500 delay-1200">
                      <p className="text-lg font-semibold text-gray-900 transition-all duration-500 delay-1300">
                        Amount: ₱{getPriceInPHP(selectedPlan.price)} PHP
                      </p>
                      <p className="text-sm text-gray-600 transition-all duration-500 delay-1400">
                        You'll be redirected to PayPal to complete your payment
                      </p>
                    </div>
                    
                    <PayPalButtons
                      style={{ 
                        layout: "vertical",
                        shape: "rect",
                        color: "blue",
                        label: "subscribe",
                        height: 45
                      }}
                      createSubscription={async (data, actions) => {
                        try {
                          console.log('Creating PayPal subscription...');
                          const subscription = await createPayPalSubscription(selectedPlan);
                          console.log('Subscription created:', subscription);
                          return subscription.id;
                        } catch (error) {
                          console.error('Error creating subscription:', error);
                          setPaypalError('Failed to create subscription. Please try again.');
                          throw error;
                        }
                      }}
                      onApprove={async (data, actions) => {
                        try {
                          console.log('PayPal subscription approved:', data);
                          setProcessing(true);
                          
                          // Verify the subscription
                          const subscriptionDetails = await verifyPayPalSubscription(data.subscriptionID);
                          console.log('Subscription verified:', subscriptionDetails);
                          
                          // Save subscription data to context
                          updateHostData({
                            subscriptionPlan: selectedPlan,
                            subscriptionStatus: 'active',
                            paymentVerified: true,
                            paypalSubscriptionId: data.subscriptionID,
                            currentStep: 9
                          });

                          console.log('Subscription activated successfully');
                          navigate('/host/subscription/success');
                          
                        } catch (error) {
                          console.error('Error capturing subscription:', error);
                          setPaypalError('Failed to activate subscription. Please try again.');
                        } finally {
                          setProcessing(false);
                        }
                      }}
                      onError={(err) => {
                        console.error('PayPal error:', err);
                        setPaypalError('Payment failed. Please try again or use a different payment method.');
                        setShowPayPal(false);
                      }}
                      onCancel={() => {
                        console.log('Payment cancelled by user');
                        setPaypalError('Payment was cancelled. Please try again if you want to continue.');
                        setShowPayPal(false);
                      }}
                    />
                    
                    <div className="text-center mt-4 transition-all duration-500 delay-1500">
                      <button
                        onClick={() => setShowPayPal(false)}
                        className="text-sm text-gray-600 hover:text-gray-800 underline transition-all duration-300 delay-1600 hover:scale-105"
                      >
                        ← Choose different payment method
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Show Subscribe Button when PayPal is not visible */
                <div className="text-center transition-all duration-500 delay-700">
                  <button
                    onClick={handleSubscribeClick}
                    disabled={processing}
                    className="w-full py-4 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-all duration-300 delay-800 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                  >
                    {processing ? (
                      <div className="flex items-center justify-center space-x-2 transition-all duration-300 delay-900">
                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Processing...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2 transition-all duration-300 delay-1000">
                        <span>Subscribe with PayPal</span>
                        <span>•</span>
                        <span>₱{getPriceInPHP(selectedPlan.price)} PHP/{selectedPlan.period}</span>
                      </div>
                    )}
                  </button>
                  
                  {/* Demo Payment Option */}
                  <div className="mt-4 pt-4 border-t border-gray-200 transition-all duration-500 delay-900">
                    <p className="text-sm text-gray-500 text-center mb-3 transition-all duration-500 delay-1000">
                      <strong>Development Mode:</strong> Quick test without PayPal
                    </p>
                    <button
                      onClick={processDemoPayment}
                      disabled={processing}
                      className="w-full py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-all duration-300 delay-1100 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processing ? 'Processing Demo...' : 'Demo Payment (Skip PayPal)'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Policy Compliance Reminder */}
          <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 max-w-2xl mx-auto transition-all duration-500 delay-800 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            <h4 className="font-semibold text-blue-900 mb-2 transition-all duration-500 delay-900">Policy Compliance Verified</h4>
            <p className="text-blue-700 text-sm transition-all duration-500 delay-1000">
              You've successfully accepted all required policies. Your listing will go live immediately after payment confirmation.
            </p>
          </div>

          {/* Action Buttons */}
          <div className={`flex justify-between items-center max-w-2xl mx-auto transition-all duration-500 delay-900 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            <Link 
              to="/host/policy-compliance"
              className="inline-flex items-center text-gray-600 hover:text-gray-800 font-medium transition-all duration-300 delay-1000 hover:scale-105"
            >
              ← Back to Policies
            </Link>

            {!selectedPlan && (
              <button
                disabled
                className="px-8 py-3 bg-gray-300 text-gray-500 rounded-lg font-semibold cursor-not-allowed transition-all duration-300 delay-1100"
              >
                Select a Plan to Continue
              </button>
            )}
          </div>

          {/* Sandbox Testing Instructions */}
          <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-8 max-w-2xl mx-auto transition-all duration-500 delay-1000 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            <h4 className="font-semibold text-yellow-900 mb-2 transition-all duration-500 delay-1100">🔄 PayPal Sandbox Testing</h4>
            <p className="text-yellow-700 text-sm mb-2 transition-all duration-500 delay-1200">
              <strong>Test Account Email:</strong> sb-43f7j29374685@personal.example.com
            </p>
            <p className="text-yellow-700 text-sm mb-2 transition-all duration-500 delay-1300">
              <strong>Test Password:</strong> X&gt;r8W4#&
            </p>
            <p className="text-yellow-700 text-sm transition-all duration-500 delay-1400">
              When PayPal opens, login with the test account above. Amount will be shown in <strong>Philippine Pesos (PHP)</strong>.
            </p>
          </div>

          {/* Money Back Guarantee */}
          <div className={`text-center mt-6 transition-all duration-500 delay-1100 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            <p className="text-gray-500 text-sm transition-all duration-500 delay-1200">
              🔒 Secure payment · 30-day money-back guarantee · Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </PayPalScriptProvider>
  );
};

export default HostSubscription;