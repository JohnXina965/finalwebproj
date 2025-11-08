import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useHost } from '../../contexts/HostContext';

const SubscriptionSuccess = () => {
  const { hostData } = useHost();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 text-center">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">✅</span>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Payment Successful!</h1>
          <p className="text-gray-600 mb-6">
            Your {hostData.subscriptionPlan?.name} subscription has been activated successfully.
          </p>

          {hostData.subscriptionPlan && (
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-teal-900 mb-2">Subscription Details</h3>
              <p className="text-teal-700">
                <strong>{hostData.subscriptionPlan.name} Plan</strong> - 
                ${hostData.subscriptionPlan.price}/{hostData.subscriptionPlan.period}
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/host/publish-review')}
              className="px-6 py-3 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
            >
              Continue to Publish
            </button>
            <Link
              to="/host/dashboard"
              className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>

          <p className="text-sm text-gray-500 mt-6">
            You can manage your subscription anytime from your host dashboard.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionSuccess;