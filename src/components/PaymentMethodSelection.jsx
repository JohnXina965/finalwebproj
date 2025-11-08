import React, { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { Link } from 'react-router-dom';

const PaymentMethodSelection = ({ totalAmount, onMethodSelect, bookingData }) => {
  const { balance } = useWallet();
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [insufficientBalance, setInsufficientBalance] = useState(false);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const handleMethodSelect = (method) => {
    setSelectedMethod(method);
    setInsufficientBalance(false);
    
    if (method === 'wallet' && balance < totalAmount) {
      setInsufficientBalance(true);
      return;
    }
    
    if (onMethodSelect) {
      onMethodSelect(method);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">Select Payment Method</h3>
      
      <div className="space-y-4 mb-6">
        {/* Wallet Payment Option */}
        <button
          onClick={() => handleMethodSelect('wallet')}
          className={`w-full p-4 border-2 rounded-lg text-left transition-all duration-300 ${
            selectedMethod === 'wallet'
              ? 'border-teal-500 bg-teal-50'
              : 'border-gray-200 hover:border-teal-300 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-3xl">💳</div>
              <div>
                <p className="font-semibold text-gray-900">Pay with Wallet</p>
                <p className="text-sm text-gray-500">
                  Current balance: {formatCurrency(balance)}
                </p>
              </div>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 ${
              selectedMethod === 'wallet'
                ? 'border-teal-500 bg-teal-500'
                : 'border-gray-300'
            } flex items-center justify-center`}>
              {selectedMethod === 'wallet' && (
                <div className="w-2 h-2 bg-white rounded-full"></div>
              )}
            </div>
          </div>
        </button>

        {/* PayPal Direct Payment Option */}
        <button
          onClick={() => handleMethodSelect('paypal')}
          className={`w-full p-4 border-2 rounded-lg text-left transition-all duration-300 ${
            selectedMethod === 'paypal'
              ? 'border-teal-500 bg-teal-50'
              : 'border-gray-200 hover:border-teal-300 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-3xl">🔵</div>
              <div>
                <p className="font-semibold text-gray-900">Pay with PayPal</p>
                <p className="text-sm text-gray-500">Direct payment via PayPal</p>
              </div>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 ${
              selectedMethod === 'paypal'
                ? 'border-teal-500 bg-teal-500'
                : 'border-gray-300'
            } flex items-center justify-center`}>
              {selectedMethod === 'paypal' && (
                <div className="w-2 h-2 bg-white rounded-full"></div>
              )}
            </div>
          </div>
        </button>
      </div>

      {/* Insufficient Balance Warning */}
      {insufficientBalance && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-yellow-800 mb-2">
            ⚠️ Insufficient wallet balance. You need {formatCurrency(totalAmount - balance)} more.
          </p>
          <Link
            to="/wallet"
            className="text-teal-600 hover:text-teal-700 font-medium text-sm underline"
          >
            Cash in to wallet →
          </Link>
        </div>
      )}

      {/* Payment Summary */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-600">Total Amount</span>
          <span className="text-2xl font-bold text-gray-900">
            {formatCurrency(totalAmount)}
          </span>
        </div>
        {selectedMethod === 'wallet' && balance >= totalAmount && (
          <div className="flex justify-between items-center text-sm text-gray-500">
            <span>Balance after payment</span>
            <span>{formatCurrency(balance - totalAmount)}</span>
          </div>
        )}
      </div>

      {/* Action Button */}
      {selectedMethod && !insufficientBalance && (
        <button
          onClick={() => onMethodSelect && onMethodSelect(selectedMethod)}
          className="w-full mt-4 bg-teal-600 text-white py-3 rounded-lg font-medium hover:bg-teal-700 transition-colors"
        >
          Proceed with {selectedMethod === 'wallet' ? 'Wallet' : 'PayPal'} Payment
        </button>
      )}
    </div>
  );
};

export default PaymentMethodSelection;

