import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useHost } from './contexts/HostContext';

const HostPricing = () => {
  const { hostData, updateHostData } = useHost();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [pricing, setPricing] = useState(hostData.pricing || {
    basePrice: '',
    currency: 'USD',
    cleaningFee: '',
    extraGuestFee: '',
    securityDeposit: '',
    discountWeekly: '',
    discountMonthly: '',
    pricingModel: 'per-person',
    minParticipants: 1,
    includesEquipment: false,
    ecoDiscount: false,
    sustainableChoice: false
  });

  const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' }
  ];

  useEffect(() => {
    if (!hostData.pricing) {
      const defaults = {
        home: { basePrice: '99', cleaningFee: '50', extraGuestFee: '25' },
        experience: { basePrice: '45', pricingModel: 'per-person', minParticipants: 2 },
        service: { basePrice: '75', pricingModel: 'flat-rate' }
      };
      
      const propertyType = hostData.propertyType;
      if (propertyType && defaults[propertyType]) {
        setPricing(prev => ({ ...prev, ...defaults[propertyType] }));
      }
    }
  }, [hostData.propertyType, hostData.pricing]);

  const getCurrencySymbol = () => {
    const currency = currencies.find(c => c.code === pricing.currency);
    return currency ? currency.symbol : '$';
  };

  const calculateTotal = (guests = 1) => {
    const base = parseFloat(pricing.basePrice) || 0;
    const cleaning = parseFloat(pricing.cleaningFee) || 0;
    const extraGuests = Math.max(0, guests - 1) * (parseFloat(pricing.extraGuestFee) || 0);
    
    return base + cleaning + extraGuests;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!pricing.basePrice || parseFloat(pricing.basePrice) <= 0) {
      alert('Please set a valid base price');
      return;
    }

    updateHostData({
      pricing,
      currentStep: 6
    });

    console.log('Pricing Saved:', pricing);
    navigate('/host/photos');
  };

  const isHome = hostData.propertyType === 'home';
  const isExperience = hostData.propertyType === 'experience';
  const isService = hostData.propertyType === 'service';

  return (
    <div className={`min-h-screen bg-gray-50 py-8 animate-multi-layer transition-all duration-1000 ${
      mounted ? 'opacity-100' : 'opacity-0'
    }`}>
      <div className="max-w-2xl mx-auto px-4">
        {/* Progress Bar - UPDATED to 9 steps */}
        <div className={`mb-8 transition-all duration-700 delay-200 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <div className="flex items-center justify-between mb-2 transition-all duration-500 delay-300">
            <span className="text-sm font-medium text-teal-600">Step 5 of 9</span>
            <span className="text-sm text-gray-500">Pricing</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 transition-all duration-500 delay-400">
            <div className="bg-teal-600 h-2 rounded-full w-5/9 transition-all duration-700 delay-500"></div>
          </div>
        </div>

        {/* Form */}
        <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all duration-700 delay-300 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <h1 className="text-2xl font-bold text-gray-900 mb-2 transition-all duration-700 delay-400">
            Set your pricing
          </h1>
          <p className="text-gray-600 mb-6 transition-all duration-700 delay-500">
            Choose how you want to price your {hostData.propertyType}.
          </p>

          <form onSubmit={handleSubmit}>
            {/* Currency Selection */}
            <div className="mb-6 transition-all duration-500 delay-600">
              <label className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-500 delay-700">
                Currency *
              </label>
              <select
                value={pricing.currency}
                onChange={(e) => setPricing(prev => ({ ...prev, currency: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300 delay-800 hover:border-gray-400 focus:scale-[1.02]"
              >
                {currencies.map(currency => (
                  <option key={currency.code} value={currency.code}>
                    {currency.symbol} {currency.name} ({currency.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Base Price */}
            <div className="mb-6 transition-all duration-500 delay-700">
              <label className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-500 delay-800">
                {isHome && 'Price per night'}
                {isExperience && 'Price per person'}
                {isService && 'Base service price'}
                *
              </label>
              <div className="relative transition-all duration-500 delay-900">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">{getCurrencySymbol()}</span>
                </div>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  value={pricing.basePrice}
                  onChange={(e) => setPricing(prev => ({ ...prev, basePrice: e.target.value }))}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300 delay-1000 hover:border-gray-400 focus:scale-[1.02]"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Experience/Service Specific Pricing */}
            {(isExperience || isService) && (
              <div className="mb-6 transition-all duration-500 delay-800">
                <label className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-500 delay-900">
                  Pricing Model *
                </label>
                <div className="grid grid-cols-2 gap-4 transition-all duration-500 delay-1000">
                  <label className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none transition-all duration-300 delay-1100 hover:scale-105 ${
                    pricing.pricingModel === 'per-person' 
                      ? 'border-teal-500 bg-teal-50 scale-105' 
                      : 'border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      name="pricingModel"
                      value="per-person"
                      checked={pricing.pricingModel === 'per-person'}
                      onChange={(e) => setPricing(prev => ({ ...prev, pricingModel: e.target.value }))}
                      className="sr-only"
                    />
                    <div className="flex w-full items-center justify-between">
                      <div className="flex items-center">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">Per Person</div>
                          <div className="text-gray-500">Charged per participant</div>
                        </div>
                      </div>
                    </div>
                  </label>

                  <label className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none transition-all duration-300 delay-1200 hover:scale-105 ${
                    pricing.pricingModel === 'flat-rate' 
                      ? 'border-teal-500 bg-teal-50 scale-105' 
                      : 'border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      name="pricingModel"
                      value="flat-rate"
                      checked={pricing.pricingModel === 'flat-rate'}
                      onChange={(e) => setPricing(prev => ({ ...prev, pricingModel: e.target.value }))}
                      className="sr-only"
                    />
                    <div className="flex w-full items-center justify-between">
                      <div className="flex items-center">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">Flat Rate</div>
                          <div className="text-gray-500">Fixed price for group</div>
                        </div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Home-specific Pricing */}
            {isHome && (
              <>
                {/* Cleaning Fee */}
                <div className="mb-6 transition-all duration-500 delay-900">
                  <label className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-500 delay-1000">
                    Cleaning fee (optional)
                  </label>
                  <div className="relative transition-all duration-500 delay-1100">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">{getCurrencySymbol()}</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={pricing.cleaningFee}
                      onChange={(e) => setPricing(prev => ({ ...prev, cleaningFee: e.target.value }))}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300 delay-1200 hover:border-gray-400 focus:scale-[1.02]"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Extra Guest Fee */}
                <div className="mb-6 transition-all duration-500 delay-1000">
                  <label className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-500 delay-1100">
                    Extra guest fee (optional)
                  </label>
                  <div className="relative transition-all duration-500 delay-1200">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">{getCurrencySymbol()}</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={pricing.extraGuestFee}
                      onChange={(e) => setPricing(prev => ({ ...prev, extraGuestFee: e.target.value }))}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300 delay-1300 hover:border-gray-400 focus:scale-[1.02]"
                      placeholder="0.00"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">per extra guest</span>
                    </div>
                  </div>
                </div>

                {/* Security Deposit */}
                <div className="mb-6 transition-all duration-500 delay-1100">
                  <label className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-500 delay-1200">
                    Security deposit (optional)
                  </label>
                  <div className="relative transition-all duration-500 delay-1300">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">{getCurrencySymbol()}</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={pricing.securityDeposit}
                      onChange={(e) => setPricing(prev => ({ ...prev, securityDeposit: e.target.value }))}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300 delay-1400 hover:border-gray-400 focus:scale-[1.02]"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Discounts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 transition-all duration-500 delay-1200">
                  <div className="transition-all duration-500 delay-1300">
                    <label className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-500 delay-1400">
                      Weekly discount (optional)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={pricing.discountWeekly}
                        onChange={(e) => setPricing(prev => ({ ...prev, discountWeekly: e.target.value }))}
                        className="w-full pr-12 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300 delay-1500 hover:border-gray-400 focus:scale-[1.02]"
                        placeholder="0"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">%</span>
                      </div>
                    </div>
                  </div>

                  <div className="transition-all duration-500 delay-1400">
                    <label className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-500 delay-1500">
                      Monthly discount (optional)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={pricing.discountMonthly}
                        onChange={(e) => setPricing(prev => ({ ...prev, discountMonthly: e.target.value }))}
                        className="w-full pr-12 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300 delay-1600 hover:border-gray-400 focus:scale-[1.02]"
                        placeholder="0"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Eco-Friendly Pricing Options */}
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg transition-all duration-500 delay-1300">
              <h3 className="text-lg font-medium text-green-900 mb-3 transition-all duration-500 delay-1400">🌱 Eco-Friendly Pricing</h3>
              
              <div className="space-y-3 transition-all duration-500 delay-1500">
                <label className="flex items-start space-x-3 cursor-pointer transition-all duration-300 delay-1600 hover:scale-105">
                  <input
                    type="checkbox"
                    checked={pricing.ecoDiscount}
                    onChange={(e) => setPricing(prev => ({ ...prev, ecoDiscount: e.target.checked }))}
                    className="mt-1 rounded border-gray-300 text-green-600 focus:ring-green-500 transition-all duration-300"
                  />
                  <div>
                    <div className="font-medium text-green-900 transition-all duration-300">Eco Discount</div>
                    <div className="text-sm text-green-700 transition-all duration-300">Offer a discount for eco-conscious choices (e.g., bringing reusable items, using public transport)</div>
                  </div>
                </label>

                <label className="flex items-start space-x-3 cursor-pointer transition-all duration-300 delay-1700 hover:scale-105">
                  <input
                    type="checkbox"
                    checked={pricing.sustainableChoice}
                    onChange={(e) => setPricing(prev => ({ ...prev, sustainableChoice: e.target.checked }))}
                    className="mt-1 rounded border-gray-300 text-green-600 focus:ring-green-500 transition-all duration-300"
                  />
                  <div>
                    <div className="font-medium text-green-900 transition-all duration-300">Sustainable Choice Badge</div>
                    <div className="text-sm text-green-700 transition-all duration-300">Highlight this as an eco-friendly option in search results</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Price Preview */}
            {isHome && (
              <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg transition-all duration-500 delay-1400">
                <h3 className="text-lg font-medium text-gray-900 mb-2 transition-all duration-500 delay-1500">Price Preview</h3>
                <div className="space-y-1 text-sm transition-all duration-500 delay-1600">
                  <div className="flex justify-between">
                    <span>${pricing.basePrice || '0'} x 1 night</span>
                    <span>{getCurrencySymbol()}{pricing.basePrice || '0'}</span>
                  </div>
                  {pricing.cleaningFee && (
                    <div className="flex justify-between">
                      <span>Cleaning fee</span>
                      <span>{getCurrencySymbol()}{pricing.cleaningFee}</span>
                    </div>
                  )}
                  {pricing.extraGuestFee && (
                    <div className="flex justify-between">
                      <span>Extra guest fee (1 guest)</span>
                      <span>{getCurrencySymbol()}{pricing.extraGuestFee}</span>
                    </div>
                  )}
                  <div className="border-t pt-1 font-medium flex justify-between">
                    <span>Total</span>
                    <span>{getCurrencySymbol()}{calculateTotal(2).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t border-gray-200 transition-all duration-500 delay-1500">
              <Link
                to="/host/location"
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-all duration-300 delay-1600 hover:shadow-md hover:-translate-y-0.5"
              >
                Back
              </Link>
              <button
                type="submit"
                className="px-6 py-3 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-all duration-300 delay-1700 hover:shadow-lg hover:-translate-y-0.5"
              >
                Continue to Photos
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default HostPricing;