import React from 'react';

/**
 * Cancellation Modal Component
 * Displays refund details and cancellation confirmation
 */
const CancellationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  refundDetails, 
  bookingTitle,
  isProcessing = false,
  userType = 'guest' // 'guest' or 'host'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-lg flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">
              Cancel Booking
            </h3>
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Warning Message */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Are you sure you want to cancel this booking?
                </p>
                {bookingTitle && (
                  <p className="text-sm text-yellow-700 mt-1">
                    {bookingTitle}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Refund Details */}
          {refundDetails && (
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Refund Details</h4>
              
              {/* Policy Description */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Policy:</strong> {refundDetails.policyDescription}
                </p>
              </div>

              {/* Refund Breakdown */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Original Amount:</span>
                  <span className="font-medium text-gray-900">
                    ₱{refundDetails.originalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                
                {refundDetails.cancellationFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Cancellation Fee:</span>
                    <span className="font-medium text-red-600">
                      -₱{refundDetails.cancellationFee.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                
                {refundDetails.adminDeduction > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Admin Fee (10%):</span>
                    <span className="font-medium text-red-600">
                      -₱{refundDetails.adminDeduction.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900">Refund Amount:</span>
                    <span className="font-bold text-green-600 text-lg">
                      ₱{refundDetails.finalRefundAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Days Until Check-in */}
              {refundDetails.daysUntilCheckIn !== undefined && (
                <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                  {refundDetails.daysUntilCheckIn > 0 ? (
                    <p>Cancelling {refundDetails.daysUntilCheckIn} day(s) before check-in</p>
                  ) : (
                    <p>Cancelling on or after check-in date</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Info Message */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-600">
              {userType === 'guest' ? (
                <>The refund amount will be added to your wallet balance.</>
              ) : (
                <>The guest will receive a refund according to the cancellation policy.</>
              )}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Keep Booking
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              'Cancel Booking'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancellationModal;

