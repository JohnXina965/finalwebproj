import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import PayPalButton from './PayPalButton';
import toast from 'react-hot-toast';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../Firebase';

const WalletModal = ({ isOpen, onClose, userType = 'guest' }) => {
  const { currentUser } = useAuth();
  const { balance, transactions, loading, cashIn, cashOut, refreshTransactions, loadWalletData } = useWallet();
  const [cashInAmount, setCashInAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [cashOutAmount, setCashOutAmount] = useState('');
  const [paypalEmail, setPaypalEmail] = useState(''); // Manual entry (overrides hostPaypalEmail if set)
  const [cashOutProcessing, setCashOutProcessing] = useState(false);
  const [showCashInSuccess, setShowCashInSuccess] = useState(false);
  const [cashInSuccessData, setCashInSuccessData] = useState(null);
  const [showWithdrawalConfirm, setShowWithdrawalConfirm] = useState(false);
  const [withdrawalConfirmData, setWithdrawalConfirmData] = useState(null);
  const [hostPaypalEmail, setHostPaypalEmail] = useState('');
  const amountInputRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen && userType === 'host' && currentUser) {
      // Reset paypalEmail when modal opens so we can load fresh from profile
      setPaypalEmail('');
      
      // Load host PayPal email from host profile
      // Host profile is stored in 'hosts' collection with document ID = currentUser.uid
      const loadHostPaypal = async () => {
        try {
          const { doc: docRef, getDoc } = await import('firebase/firestore');
          const hostDocRef = docRef(db, 'hosts', currentUser.uid);
          const hostDoc = await getDoc(hostDocRef);
          
          if (hostDoc.exists()) {
            const hostData = hostDoc.data();
            const savedPaypalEmail = hostData.paypalEmail || '';
            setHostPaypalEmail(savedPaypalEmail);
            
            // Pre-fill the input field with saved email
            if (savedPaypalEmail) {
              setPaypalEmail(savedPaypalEmail);
            }
            
            if (!savedPaypalEmail) {
              // Silently handle - error message will show in UI
              console.log('Host PayPal email not found in profile. User can enter it manually or set it in host settings.');
            }
          } else {
            // Host profile doesn't exist yet (might not have completed onboarding)
            // This is normal if the user hasn't completed onboarding yet
            setHostPaypalEmail('');
          }
        } catch (error) {
          console.error('Error loading host PayPal email:', error);
          setHostPaypalEmail('');
        }
      };
      
      loadHostPaypal();
    } else if (!isOpen) {
      // Reset states when modal closes
      setHostPaypalEmail('');
      setPaypalEmail('');
      setCashOutAmount('');
    }
  }, [isOpen, userType, currentUser]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't close if confirmation modal is open
      if (showWithdrawalConfirm || showCashInSuccess) {
        return;
      }
      
      // Check if click is outside the main modal
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        // Also check if click is outside confirmation modals
        const confirmationModal = document.querySelector('[data-confirmation-modal]');
        const successModal = document.querySelector('[data-success-modal]');
        
        if (!confirmationModal && !successModal) {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      setCashInAmount('');
      setSelectedAmount(null);
      setShowCashInSuccess(false);
      setCashInSuccessData(null);
      setShowWithdrawalConfirm(false);
      setWithdrawalConfirmData(null);
      setCashOutAmount('');
      setPaypalEmail('');
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, showWithdrawalConfirm, showCashInSuccess]);

  const handleAmountChange = (e) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      setCashInAmount(value);
      const amount = parseFloat(value);
      if (amount >= 100) {
        setSelectedAmount(amount);
      } else {
        setSelectedAmount(null);
      }
    }
  };

  const handleCashInSuccess = async (amount, newBalance) => {
    setCashInSuccessData({ amount, newBalance });
    setShowCashInSuccess(true);
    setCashInAmount('');
    setSelectedAmount(null);
    await refreshTransactions();
    if (loadWalletData) {
      await loadWalletData();
    }

    // Send cash-in confirmation email
    try {
      const { sendCashInConfirmationEmail } = await import('../services/EmailService');
      if (currentUser?.email) {
        await sendCashInConfirmationEmail(
          currentUser.email,
          currentUser.displayName || currentUser.email,
          {
            amount: amount,
            newBalance: newBalance,
            transactionId: `cashin_${Date.now()}`,
            dateTime: new Date()
          }
        );
      }
    } catch (emailError) {
      console.error('Error sending cash-in confirmation email:', emailError);
      // Don't block cash-in success if email fails
    }
  };

  const handleWithdrawalConfirm = () => {
    const amount = parseFloat(cashOutAmount);
    const emailToUse = paypalEmail || hostPaypalEmail;
    
    if (!amount || amount < 100) {
      toast.error('Minimum withdrawal amount is ₱100');
      return;
    }

    if (amount > balance) {
      toast.error(`Insufficient wallet balance. Available: ₱${balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`);
      return;
    }

    if (!emailToUse || !emailToUse.includes('@')) {
      toast.error('Please enter a valid PayPal email address');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToUse)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setWithdrawalConfirmData({ amount, paypalEmail: emailToUse });
    setShowWithdrawalConfirm(true);
  };

  const handleWithdrawalProceed = async () => {
    if (!withdrawalConfirmData) {
      console.error('❌ No withdrawal confirmation data');
      return;
    }

    try {
      setCashOutProcessing(true);
      console.log('🔄 Starting withdrawal process...', withdrawalConfirmData);
      
      const { amount, paypalEmail } = withdrawalConfirmData;
      
      if (!amount || amount <= 0) {
        throw new Error('Invalid withdrawal amount');
      }
      
      if (!paypalEmail || !paypalEmail.includes('@')) {
        throw new Error('Invalid PayPal email address');
      }
      
      console.log('📤 Calling cashOut function...', { amount, paypalEmail });
      
      const result = await cashOut(amount, paypalEmail, `Withdrawal to ${paypalEmail}`);
      
      console.log('✅ CashOut result:', result);
      
      if (!result || !result.success) {
        throw new Error(result?.error || 'Withdrawal failed');
      }
      
      const payoutId = result?.payoutId || 'N/A';
      const newBalance = result?.newBalance || balance - amount;
      console.log('✅ Withdrawal successful! Payout ID:', payoutId);
      
      toast.success(
        `✅ Withdrawal successful! ₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} has been sent to ${paypalEmail}. Payout ID: ${payoutId}`,
        { duration: 6000 }
      );
      
      setCashOutAmount('');
      setShowWithdrawalConfirm(false);
      setWithdrawalConfirmData(null);
      
      // Refresh transactions to show the new withdrawal transaction
      // Note: Balance should already be updated by cashOut function via context
      try {
        await refreshTransactions();
        // Reload wallet data to ensure balance is synced from Firestore
        if (loadWalletData) {
          await loadWalletData();
        }
      } catch (refreshError) {
        console.error('Error refreshing wallet data:', refreshError);
        // Balance is already updated in context, so this is just for transactions
      }

      // Send withdrawal confirmation email
      try {
        const { sendWithdrawalConfirmationEmail } = await import('../services/EmailService');
        if (currentUser?.email) {
          await sendWithdrawalConfirmationEmail(
            currentUser.email,
            currentUser.displayName || currentUser.email,
            {
              amount: amount,
              newBalance: newBalance,
              paypalEmail: paypalEmail,
              payoutId: payoutId,
              dateTime: new Date()
            }
          );
        }
      } catch (emailError) {
        console.error('Error sending withdrawal confirmation email:', emailError);
        // Don't block withdrawal success if email fails
      }
    } catch (error) {
      console.error('❌ Withdrawal error:', error);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Error details:', {
        message: error.message,
        name: error.name,
        withdrawalData: withdrawalConfirmData
      });
      
      const errorMessage = error.message || 'Failed to process withdrawal. Please try again.';
      toast.error(errorMessage, { duration: 8000 });
      
      // Don't close the modal on error so user can try again
      // setShowWithdrawalConfirm(false);
    } finally {
      setCashOutProcessing(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const dateObj = date?.toDate ? date.toDate() : new Date(date);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(dateObj);
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

  const getTransactionCategory = (type) => {
    switch (type) {
      case 'cash_in':
        return 'Deposit';
      case 'cash_out':
        return 'Withdrawal';
      case 'payment':
        return 'Payment';
      case 'payment_received':
        return 'Payment Received';
      default:
        return 'Other';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <div 
          ref={modalRef}
          className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <span className="text-2xl">💰</span>
              <h2 className="text-xl font-bold text-gray-900">
                {userType === 'host' ? 'Wallet' : 'My Wallet'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-5">
            {/* Current Balance */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 mb-6 text-white">
              <p className="text-sm text-green-100 mb-1">Current Balance</p>
              <p className="text-3xl font-bold">
                {loading ? 'Loading...' : `₱${balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}
              </p>
            </div>

            {/* Guest: Cash In Section */}
            {userType === 'guest' && (
              <div className="mb-6">
                <button
                  onClick={() => amountInputRef.current?.focus()}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 mb-4"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Cash In
                </button>

                {/* Amount Input */}
                <div className="mb-4">
                  <div className="relative">
                    <input
                      ref={amountInputRef}
                      type="text"
                      value={cashInAmount}
                      onChange={handleAmountChange}
                      placeholder="Enter amount (minimum ₱100)"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                    />
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex flex-col">
                      <button
                        onClick={() => {
                          const current = parseFloat(cashInAmount) || 0;
                          setCashInAmount((current + 100).toString());
                          handleAmountChange({ target: { value: (current + 100).toString() } });
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          const current = parseFloat(cashInAmount) || 0;
                          if (current >= 100) {
                            setCashInAmount((current - 100).toString());
                            handleAmountChange({ target: { value: (current - 100).toString() } });
                          }
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* PayPal Payment - Show automatically when amount >= 100 */}
                {selectedAmount && selectedAmount >= 100 && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <PayPalButton
                      amount={selectedAmount}
                      description={`Wallet Cash In - ₱${selectedAmount}`}
                      onSuccess={async (paymentData) => {
                        try {
                          setProcessing(true);
                          await cashIn(selectedAmount, 'paypal', {
                            orderId: paymentData.orderID,
                            payerId: paymentData.payerID,
                            orderDetails: paymentData.orderDetails
                          });
                          await handleCashInSuccess(selectedAmount, balance + selectedAmount);
                        } catch (error) {
                          console.error('Payment error:', error);
                          toast.error('Payment failed. Please try again.');
                          setProcessing(false);
                        }
                      }}
                      onError={(err) => {
                        console.error('PayPal error:', err);
                        toast.error('An error occurred. Please try again.');
                      }}
                      onCancel={() => {
                        toast('Payment cancelled', { icon: 'ℹ️' });
                      }}
                      disabled={processing}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Host: Withdrawal Section */}
            {userType === 'host' && (
              <div className="mb-6">
                {/* PayPal Email Input - Always show, allow manual entry or use saved */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PayPal Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={paypalEmail || hostPaypalEmail || ''}
                    onChange={(e) => setPaypalEmail(e.target.value)}
                    placeholder="your-email@paypal.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                  />
                  {hostPaypalEmail && (
                    <p className="text-xs text-gray-500 mt-1">
                      Using saved PayPal email. You can change it above.
                    </p>
                  )}
                  {!hostPaypalEmail && (
                    <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-xs text-yellow-800 mb-2">
                        ⚠️ No PayPal email found in your profile. Please enter one above or set it in{' '}
                        <Link 
                          to="/host/settings" 
                          onClick={onClose}
                          className="text-green-600 hover:text-green-700 underline font-semibold"
                        >
                          Settings
                        </Link>
                      </p>
                    </div>
                  )}
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-800">
                      💡 <strong>For testing:</strong> Use a PayPal sandbox email (e.g., <code className="bg-blue-100 px-1 rounded">sb-bbsz447207047@business.example.com</code>)
                    </p>
                  </div>
                </div>

                {/* Amount Input */}
                <div className="relative mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (Minimum: ₱100) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={cashOutAmount}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^\d*\.?\d*$/.test(value)) {
                        setCashOutAmount(value);
                      }
                    }}
                    placeholder="Enter amount to withdraw"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none pr-20"
                  />
                  <div className="absolute right-2 top-10 transform -translate-y-1/2 flex flex-col">
                    <button
                      onClick={() => {
                        const current = parseFloat(cashOutAmount) || 0;
                        setCashOutAmount((current + 100).toString());
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        const current = parseFloat(cashOutAmount) || 0;
                        if (current >= 100) {
                          setCashOutAmount((current - 100).toString());
                        }
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  {cashOutAmount && (
                    <p className="text-xs text-gray-500 mt-1">
                      Available balance: ₱{balance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  )}
                </div>

                {/* Error Messages */}
                {cashOutAmount && parseFloat(cashOutAmount) > balance && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs text-red-700">
                      ⚠️ Amount exceeds available balance (₱{balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })})
                    </p>
                  </div>
                )}
                
                {cashOutAmount && parseFloat(cashOutAmount) < 100 && parseFloat(cashOutAmount) > 0 && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs text-red-700">
                      ⚠️ Minimum withdrawal amount is ₱100
                    </p>
                  </div>
                )}

                {/* Withdraw Button */}
                <button
                  onClick={handleWithdrawalConfirm}
                  disabled={
                    !cashOutAmount || 
                    parseFloat(cashOutAmount) < 100 || 
                    parseFloat(cashOutAmount) > balance || 
                    (!paypalEmail && !hostPaypalEmail) ||
                    (paypalEmail && !paypalEmail.includes('@'))
                  }
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed disabled:hover:bg-gray-300"
                >
                  {cashOutProcessing ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    'Withdraw to PayPal'
                  )}
                </button>

                {/* Help Text */}
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-xs text-green-800 mb-2">
                    <strong>✅ Instant Withdrawal:</strong> Your withdrawal will be processed immediately via PayPal Payouts API. The amount will be deducted from your wallet and sent directly to your PayPal account.
                  </p>
                  <p className="text-xs text-green-700">
                    <strong>Note:</strong> Make sure your PayPal email is correct. The money will be sent instantly to your PayPal account (sandbox mode for testing).
                  </p>
                </div>
              </div>
            )}

            {/* Recent Transactions */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Transactions</h3>
              
              {loading ? (
                <div className="text-center py-4 text-gray-500">Loading transactions...</div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <p>No transactions yet.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-start justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <div className="text-2xl">{getTransactionIcon(transaction.type)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm">
                            {getTransactionCategory(transaction.type)}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {transaction.description || 'Transaction'}
                          </p>
                          {transaction.paypalEmail && (
                            <p className="text-xs text-gray-500 mt-1">
                              To: {transaction.paypalEmail}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(transaction.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-sm ${
                          transaction.type === 'cash_in' || transaction.type === 'payment_received'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}>
                          {(transaction.type === 'cash_in' || transaction.type === 'payment_received') ? '+' : '-'}
                          ₱{transaction.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </p>
                        {transaction.status === 'pending' && (
                          <p className="text-xs text-yellow-600 font-medium mt-1">Pending</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Cash-In Success Modal - Only show if wallet modal is open */}
      {isOpen && showCashInSuccess && cashInSuccessData && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
          data-success-modal
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCashInSuccess(false);
              setCashInSuccessData(null);
            }
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-green-500 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Cash-In Successful!</h3>
              <p className="text-gray-700 mb-4">
                You've successfully added <span className="text-green-600 font-bold">₱{cashInSuccessData.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span> to your wallet.
              </p>
              <div className="bg-gray-100 rounded-lg p-4 mb-6 flex items-center justify-center gap-2">
                <span className="text-2xl">💰</span>
                <div>
                  <p className="text-sm text-gray-600">New Balance:</p>
                  <p className="text-xl font-bold text-green-600">
                    ₱{cashInSuccessData.newBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCashInSuccess(false);
                  setCashInSuccessData(null);
                }}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Confirmation Modal - Only show if wallet modal is open */}
      {isOpen && showWithdrawalConfirm && withdrawalConfirmData && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
          data-confirmation-modal
          onClick={(e) => {
            // Only close if clicking the backdrop, not the modal content
            if (e.target === e.currentTarget && !cashOutProcessing) {
              setShowWithdrawalConfirm(false);
              setWithdrawalConfirmData(null);
            }
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">Confirm Withdrawal</h3>
            <p className="text-gray-700 mb-4">
              Are you sure you want to withdraw <span className="text-green-600 font-bold">₱{withdrawalConfirmData.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>?
            </p>
            <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>✅ Instant Transfer:</strong> The amount will be deducted from your wallet and sent immediately to your PayPal account ({withdrawalConfirmData.paypalEmail}) via PayPal Payouts API.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (!cashOutProcessing) {
                    setShowWithdrawalConfirm(false);
                    setWithdrawalConfirmData(null);
                  }
                }}
                disabled={cashOutProcessing}
                className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleWithdrawalProceed();
                }}
                disabled={cashOutProcessing}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cashOutProcessing ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  'Yes, Withdraw'
                )}
              </button>
            </div>
            {cashOutProcessing && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  ⏳ Processing withdrawal... Please wait. This may take a few seconds.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default WalletModal;

