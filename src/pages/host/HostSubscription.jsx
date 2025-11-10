import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useHost } from '../../contexts/HostContext';
import { useWallet } from '../../contexts/WalletContext';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { paypalConfig, adminPayPalEmail } from '../../config/paypal';
import { createPayPalSubscription, verifyPayPalSubscription, convertToPHP } from '../../services/PaypalServices';

const HostSubscription = () => {
  const { hostData, updateHostData } = useHost();
  const { balance, deduct } = useWallet();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('paypal'); // 'paypal' or 'wallet'
  const [showPayPal, setShowPayPal] = useState(false);
  const [paypalError, setPaypalError] = useState(null);
  const [walletError, setWalletError] = useState(null);

  const subscriptionPlans = [
    {
      id: 'starter',
      name: 'Starter',
      price: 399,
      period: 'year',
      postingDuration: 1,
      postingDurationUnit: 'years',
      listingLimit: 3,
      description: 'Perfect for new hosts',
      features: [
        '3 Listings Maximum',
        '1 Year Listing Duration',
        'Basic Performance Analytics',
        'Standard Customer Support'
      ],
      popular: false
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 799,
      period: 'year',
      postingDuration: 1,
      postingDurationUnit: 'years',
      listingLimit: 10,
      description: 'Perfect for growing hosts',
      features: [
        '10 Listings Maximum',
        '1 Year Listing Duration',
        'Advanced Performance Analytics',
        'Priority Customer Support',
        'Featured Listing Badge'
      ],
      popular: true
    },
    {
      id: 'elite',
      name: 'Elite',
      price: 1299,
      period: 'year',
      postingDuration: 1,
      postingDurationUnit: 'years',
      listingLimit: 15,
      description: 'Perfect for businesses',
      features: [
        '15 Listings Maximum',
        '1 Year Listing Duration',
        'Premium Analytics Dashboard',
        '24/7 Priority Support',
        'Advanced Marketing Tools'
      ],
      popular: false
    }
  ];

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    setShowPayPal(false);
    setPaypalError(null);
    setWalletError(null);
  };

  const handlePaymentMethodChange = (method) => {
    setPaymentMethod(method);
    setShowPayPal(false);
    setPaypalError(null);
    setWalletError(null);
  };

  const handleSubscribeClick = () => {
    if (!selectedPlan) {
      alert('Please select a subscription plan');
      return;
    }
    
    if (paymentMethod === 'paypal') {
      setShowPayPal(true);
      setPaypalError(null);
    } else if (paymentMethod === 'wallet') {
      handleWalletPayment();
    }
  };

  const handleWalletPayment = async () => {
    if (!selectedPlan) {
      alert('Please select a subscription plan');
      return;
    }

    const amountInPHP = selectedPlan.price; // Already in PHP

    // Check balance but don't deduct yet - will be deducted when listing is published
    if (balance < amountInPHP) {
      setWalletError(`Insufficient wallet balance. You need ₱${amountInPHP.toLocaleString('en-PH', { minimumFractionDigits: 2 })} but only have ₱${balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}. Payment will be required when you publish your listing.`);
      return;
    }

    setProcessing(true);
    setWalletError(null);

    try {
      // Save subscription data to context without deducting yet
      // Payment will be deducted when listing is published
      updateHostData({
        subscriptionPlan: selectedPlan,
        subscriptionStatus: 'pending', // Changed to pending until published
        paymentVerified: false, // Will be verified when published
        paymentMethod: 'wallet',
        paypalSubscriptionId: null,
        currentStep: 9
      });

      console.log('Wallet subscription selected. Payment will be deducted when listing is published:', selectedPlan);
      navigate('/host/publish-review');
      
    } catch (error) {
      console.error('Error selecting wallet payment:', error);
      setWalletError(error.message || 'Failed to select payment method. Please try again.');
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
              Select a plan to start hosting on EcoExpress. One-time payment for listing duration.
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
                    <span className="text-4xl font-bold text-teal-600 transition-all duration-500 delay-1000">₱{plan.price.toLocaleString()}</span>
                    <span className="text-gray-500 ml-2 transition-all duration-500 delay-1100 text-sm">
                      / {plan.period}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm transition-all duration-500 delay-1300">{plan.description}</p>
                  <p className="text-xs text-teal-600 font-medium mt-1 transition-all duration-500 delay-1400">
                    Listings: {plan.listingLimit} • Duration: {plan.postingDuration} {plan.postingDurationUnit}
                  </p>
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
                    <p className="text-teal-600 text-sm transition-all duration-500 delay-1200">
                      {selectedPlan.listingLimit} Listings • {selectedPlan.postingDuration} {selectedPlan.postingDurationUnit} Duration
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-teal-700 font-bold text-lg transition-all duration-500 delay-1300">
                      ₱{selectedPlan.price.toLocaleString()}
                      / {selectedPlan.period}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="mb-6 transition-all duration-500 delay-700">
                <h4 className="font-medium text-gray-700 mb-3 transition-all duration-500 delay-800">Choose Payment Method</h4>
                <div className="grid grid-cols-2 gap-4 transition-all duration-500 delay-900">
                  <button
                    onClick={() => handlePaymentMethodChange('paypal')}
                    className={`p-4 border-2 rounded-lg transition-all duration-300 ${
                      paymentMethod === 'paypal'
                        ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        paymentMethod === 'paypal' ? 'border-teal-500 bg-teal-500' : 'border-gray-300'
                      } flex items-center justify-center`}>
                        {paymentMethod === 'paypal' && (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-gray-900">PayPal</p>
                        <p className="text-xs text-gray-500">Direct payment</p>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => handlePaymentMethodChange('wallet')}
                    className={`p-4 border-2 rounded-lg transition-all duration-300 ${
                      paymentMethod === 'wallet'
                        ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        paymentMethod === 'wallet' ? 'border-teal-500 bg-teal-500' : 'border-gray-300'
                      } flex items-center justify-center`}>
                        {paymentMethod === 'wallet' && (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-gray-900">Wallet</p>
                        <p className="text-xs text-gray-500">Balance: ₱{balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Wallet Error */}
              {walletError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 transition-all duration-500">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <p className="text-red-700">{walletError}</p>
                  </div>
                  {balance < selectedPlan.price && (
                    <Link to="/wallet" className="mt-2 inline-block text-sm text-red-600 hover:text-red-800 underline">
                      Add funds to wallet →
                    </Link>
                  )}
                </div>
              )}

              {/* Wallet Payment Info */}
              {paymentMethod === 'wallet' && balance >= selectedPlan.price && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 transition-all duration-500">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-blue-800 font-medium">Payment will be deducted when you publish your listing</p>
                      <p className="text-blue-700 text-sm mt-1">
                        Your wallet balance (₱{balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}) is sufficient. 
                        The subscription fee will be charged only when you click "Publish Listing".
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* PayPal Buttons - Only show when user clicks Subscribe with PayPal */}
              {showPayPal && paymentMethod === 'paypal' ? (
                <div className="mb-6 transition-all duration-500 delay-900">
                  <h4 className="font-medium text-gray-700 mb-3 transition-all duration-500 delay-1000">Pay with PayPal</h4>
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 transition-all duration-500 delay-1100 hover:shadow-md">
                    <div className="text-center mb-4 transition-all duration-500 delay-1200">
                      <p className="text-lg font-semibold text-gray-900 transition-all duration-500 delay-1300">
                        Amount: ₱{selectedPlan.price.toLocaleString()} PHP
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
                        label: "pay",
                        height: 45
                      }}
                      createOrder={async (data, actions) => {
                        try {
                          console.log('Creating PayPal order...');
                          const amountInPHP = selectedPlan.price; // Already in PHP
                          
                          return actions.order.create({
                            purchase_units: [{
                              description: `${selectedPlan.name} Plan - ${selectedPlan.listingLimit} listings, ${selectedPlan.postingDuration} ${selectedPlan.postingDurationUnit} duration`,
                              amount: {
                                value: (parseFloat(amountInPHP) / 56.50).toFixed(2), // Convert PHP back to USD for PayPal
                                currency_code: "USD"
                              },
                              payee: {
                                email_address: adminPayPalEmail // Route subscription payment to admin PayPal account
                              }
                            }]
                          });
                        } catch (error) {
                          console.error('Error creating order:', error);
                          setPaypalError('Failed to create payment order. Please try again.');
                          throw error;
                        }
                      }}
                      onApprove={async (data, actions) => {
                        try {
                          console.log('PayPal payment approved:', data);
                          setProcessing(true);
                          
                          // Capture the payment
                          const order = await actions.order.capture();
                          console.log('Payment captured:', order);
                          
                          // Save subscription data to context
                          updateHostData({
                            subscriptionPlan: selectedPlan,
                            subscriptionStatus: 'active',
                            paymentVerified: true,
                            paypalOrderId: order.id,
                            currentStep: 9
                          });

                          console.log('Payment completed successfully');
                          navigate('/host/subscription/success');
                          
                        } catch (error) {
                          console.error('Error capturing payment:', error);
                          setPaypalError('Failed to process payment. Please try again.');
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
                /* Show Subscribe Button */
                <div className="text-center transition-all duration-500 delay-700">
                  <button
                    onClick={handleSubscribeClick}
                    disabled={processing}
                    className={`w-full py-4 font-semibold rounded-lg transition-all duration-300 delay-800 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed text-lg ${
                      paymentMethod === 'wallet'
                        ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white hover:from-teal-700 hover:to-emerald-700'
                        : 'bg-teal-600 text-white hover:bg-teal-700'
                    }`}
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
                        <span>
                          {paymentMethod === 'wallet' 
                            ? `Pay with Wallet - ₱${selectedPlan.price.toLocaleString()} / ${selectedPlan.period}`
                            : `Pay with PayPal - ₱${selectedPlan.price.toLocaleString()} / ${selectedPlan.period}`
                          }
                        </span>
                      </div>
                    )}
                  </button>
                  
                  {paymentMethod === 'wallet' && balance < selectedPlan.price && (
                    <div className="mt-4 pt-4 border-t border-gray-200 transition-all duration-500 delay-900">
                      <p className="text-sm text-gray-600 text-center mb-3 transition-all duration-500 delay-1000">
                        Insufficient wallet balance
                      </p>
                      <Link
                        to="/wallet"
                        className="inline-block w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all duration-300 delay-1100 hover:shadow-lg hover:-translate-y-0.5"
                      >
                        Add Funds to Wallet
                      </Link>
                    </div>
                  )}
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


          {/* Money Back Guarantee */}
          <div className={`text-center mt-6 transition-all duration-500 delay-1100 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            <p className="text-gray-500 text-sm transition-all duration-500 delay-1200">
              🔒 Secure payment · One-time payment for listing duration · No recurring charges
            </p>
          </div>
        </div>
      </div>
    </PayPalScriptProvider>
  );
};

export default HostSubscription;