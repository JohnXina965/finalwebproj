import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import PayPalButton from '../components/PayPalButton';
import toast from 'react-hot-toast';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../Firebase';

const Wallet = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { balance, transactions, loading, cashIn, cashOut, refreshTransactions, loadWalletData } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [checkingHost, setCheckingHost] = useState(true);
  const [cashInAmount, setCashInAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [showPayPal, setShowPayPal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [cashOutAmount, setCashOutAmount] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [cashOutProcessing, setCashOutProcessing] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if user is a host (has listings or drafts)
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const checkUserType = async () => {
      try {
        setCheckingHost(true);
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        
        // Check if user has listings or drafts (indicates they're a host)
        const [listingsSnapshot, draftsSnapshot] = await Promise.all([
          getDocs(query(collection(db, 'listings'), where('hostId', '==', currentUser.uid))),
          getDocs(query(collection(db, 'drafts'), where('hostId', '==', currentUser.uid)))
        ]);

        const hasHostActivity = !listingsSnapshot.empty || !draftsSnapshot.empty;
        setIsHost(hasHostActivity);
      } catch (error) {
        console.error('Error checking user type:', error);
        setIsHost(false); // Default to guest if check fails
      } finally {
        setCheckingHost(false);
      }
    };

    checkUserType();
  }, [currentUser, navigate]);

  const quickAmounts = [500, 1000, 2000, 5000, 10000];

  const handleQuickAmount = (amount) => {
    setCashInAmount(amount.toString());
    setSelectedAmount(amount);
    setShowPayPal(true);
  };

  const handleCustomAmount = (e) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      setCashInAmount(value);
      setSelectedAmount(value ? parseFloat(value) : null);
      setShowPayPal(false);
    }
  };

  const handleCashInClick = () => {
    const amount = parseFloat(cashInAmount);
    if (!amount || amount < 100) {
      toast.error('Minimum cash-in amount is ₱100');
      return;
    }
    setSelectedAmount(amount);
    setShowPayPal(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handleCashOut = async () => {
    const amount = parseFloat(cashOutAmount);
    if (!amount || amount < 100) {
      toast.error('Minimum cash-out amount is ₱100');
      return;
    }

    if (amount > balance) {
      toast.error(`Insufficient wallet balance. Available: ₱${formatCurrency(balance)}`);
      return;
    }

    if (!paypalEmail || !paypalEmail.includes('@')) {
      toast.error('Please enter a valid PayPal email address');
      return;
    }

    try {
      setCashOutProcessing(true);
      console.log('🔄 Processing cash-out:', { amount, paypalEmail, currentBalance: balance });
      
      const result = await cashOut(amount, paypalEmail, `Cash out to ${paypalEmail}`);
      
      console.log('✅ Cash-out result:', result);
      
      toast.success(
        `Cash-out request submitted successfully! ₱${formatCurrency(amount)} will be processed and sent to ${paypalEmail} within 1-3 business days.`,
        { duration: 5000 }
      );
      
      setCashOutAmount('');
      setPaypalEmail('');
      
      // Refresh transactions and wallet data to show the new cash-out
      await refreshTransactions();
      
      // Reload wallet data to get updated balance
      if (loadWalletData) {
        await loadWalletData();
      }
      
    } catch (error) {
      console.error('❌ Cash-out error:', error);
      console.error('Error stack:', error.stack);
      
      const errorMessage = error.message || 'Failed to process cash-out. Please try again.';
      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setCashOutProcessing(false);
    }
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'cash_in':
        return '💰';
      case 'cash_out':
        return '💸';
      case 'payment':
        return '💸';
      case 'payment_received':
        return '✅';
      default:
        return '📝';
    }
  };

  const getTransactionColor = (type) => {
    switch (type) {
      case 'cash_in':
      case 'payment_received':
        return 'text-green-600';
      case 'cash_out':
      case 'payment':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (checkingHost) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isHost) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 animate-multi-layer transition-all duration-1000 ${
      mounted ? 'opacity-100' : 'opacity-0'
    }`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className={`mb-8 transition-all duration-700 delay-200 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <button
            onClick={() => navigate(-1)}
            className="mb-4 text-teal-600 hover:text-teal-700 font-medium flex items-center"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{isHost ? 'Wallet' : 'My Wallet'}</h1>
          <p className="text-gray-600 mt-2">
            {isHost 
              ? 'Withdraw your earnings to PayPal' 
              : 'Add funds to your wallet for bookings'}
          </p>
        </div>

        {/* Wallet Balance Card */}
        <div className={`bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl shadow-xl p-8 mb-8 text-white transition-all duration-700 delay-300 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-teal-100 text-sm mb-2">Current Balance</p>
              <h2 className="text-4xl font-bold">
                {loading ? 'Loading...' : formatCurrency(balance)}
              </h2>
            </div>
            <div className="text-6xl opacity-20">💳</div>
          </div>
        </div>

        {/* Cash In Section - Only for Guests */}
        {!isHost && (
        <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8 transition-all duration-700 delay-400 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Add Funds</h2>
          
          {/* Quick Amount Buttons */}
          <div className="grid grid-cols-5 gap-3 mb-6">
            {quickAmounts.map((amount) => (
              <button
                key={amount}
                onClick={() => handleQuickAmount(amount)}
                className={`px-4 py-3 rounded-lg border-2 font-medium transition-all duration-300 ${
                  selectedAmount === amount
                    ? 'border-teal-500 bg-teal-50 text-teal-700'
                    : 'border-gray-200 hover:border-teal-300 hover:bg-gray-50'
                }`}
              >
                ₱{amount.toLocaleString()}
              </button>
            ))}
          </div>

          {/* Custom Amount Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Or enter custom amount (Minimum: ₱100)
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={cashInAmount}
                onChange={handleCustomAmount}
                placeholder="Enter amount"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
              <button
                onClick={handleCashInClick}
                disabled={!selectedAmount || parseFloat(cashInAmount) < 100}
                className="px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Cash In
              </button>
            </div>
          </div>

          {/* PayPal Payment */}
          {showPayPal && selectedAmount && (
            <div className="border-t border-gray-200 pt-6">
              <div className="mb-4 p-4 bg-teal-50 border border-teal-200 rounded-lg">
                <p className="text-sm font-medium text-teal-900 mb-1">
                  Complete your cash-in via PayPal
                </p>
                <p className="text-lg font-bold text-teal-700">
                  {formatCurrency(selectedAmount)}
                </p>
              </div>
              
              <PayPalButton
                amount={selectedAmount}
                description={`Wallet Cash In - ₱${selectedAmount}`}
                onSuccess={async (paymentData) => {
                  try {
                    setProcessing(true);
                    
                    // Cash in to wallet
                    await cashIn(selectedAmount, 'paypal', {
                      orderId: paymentData.orderID,
                      payerId: paymentData.payerID,
                      orderDetails: paymentData.orderDetails
                    });

                    toast.success(`Successfully cashed in ${formatCurrency(selectedAmount)}!`);
                    setCashInAmount('');
                    setSelectedAmount(null);
                    setShowPayPal(false);
                    await refreshTransactions();
                  } catch (error) {
                    console.error('Payment error:', error);
                    toast.error('Payment failed. Please try again.');
                  } finally {
                    setProcessing(false);
                  }
                }}
                onError={(err) => {
                  console.error('PayPal error:', err);
                  toast.error('An error occurred. Please try again.');
                  setShowPayPal(false);
                }}
                onCancel={() => {
                  setShowPayPal(false);
                }}
                disabled={processing}
              />
              
              <div className="mt-4 text-center">
                <button
                  onClick={() => {
                    setShowPayPal(false);
                    setSelectedAmount(null);
                  }}
                  className="text-sm text-gray-600 hover:text-gray-800 underline transition-colors"
                >
                  Cancel Cash In
                </button>
              </div>
            </div>
          )}
        </div>
        )}

        {/* Cash Out Section - Only for Hosts */}
        {isHost && (
        <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8 transition-all duration-700 delay-500 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Withdraw to PayPal</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (Minimum: ₱100)
              </label>
              <input
                type="text"
                value={cashOutAmount}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^\d*$/.test(value)) {
                    setCashOutAmount(value);
                  }
                }}
                placeholder="Enter amount to cash out"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
              {cashOutAmount && (
                <p className="text-sm text-gray-600 mt-1">
                  Available balance: ₱{balance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PayPal Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                placeholder="your-email@example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Funds will be sent to this PayPal email address
              </p>
            </div>

            <button
              onClick={handleCashOut}
              disabled={!cashOutAmount || !paypalEmail || parseFloat(cashOutAmount) < 100 || parseFloat(cashOutAmount) > balance || cashOutProcessing}
              className="w-full px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {cashOutProcessing ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                'Cash Out to PayPal'
              )}
            </button>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900 mb-2">
                <strong>Important:</strong> Cash-out requests will deduct the amount from your wallet balance immediately and create a pending transaction.
              </p>
              <p className="text-sm text-blue-800">
                <strong>Processing:</strong> Funds are processed within 1-3 business days. The transaction status will be updated to "completed" once the funds have been sent to your PayPal account. You will receive an email confirmation.
              </p>
            </div>
          </div>
        </div>
        )}

        {/* Transaction History */}
        <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all duration-700 delay-500 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Transaction History</h2>
          
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading transactions...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-lg mb-2">No transactions yet</p>
              <p className="text-sm">Your transaction history will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">{getTransactionIcon(transaction.type)}</div>
                    <div>
                      <p className="font-medium text-gray-900">{transaction.description}</p>
                      <p className="text-sm text-gray-500">{formatDate(transaction.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${getTransactionColor(transaction.type)}`}>
                      {transaction.type === 'payment' || transaction.type === 'cash_out' ? '-' : '+'}
                      {formatCurrency(transaction.amount)}
                    </p>
                    {transaction.type === 'cash_out' && transaction.status === 'pending' && (
                      <p className="text-xs text-yellow-600 font-medium mt-1">Pending</p>
                    )}
                    {transaction.paypalEmail && (
                      <p className="text-xs text-gray-500 mt-1">To: {transaction.paypalEmail}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      Balance: {formatCurrency(transaction.balanceAfter)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Wallet;

