import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../Firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getServiceFeePercentage, updateServiceFeePercentage } from '../services/ServiceFeeService';
import toast from 'react-hot-toast';

function AdminSettings() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [serviceFee, setServiceFee] = useState(10); // Percentage (10 = 10%)
  const [serviceFeeInput, setServiceFeeInput] = useState('10');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!currentUser) {
      navigate('/admin/login');
      return;
    }

    checkAdminAccess();
    loadSettings();
  }, [currentUser, navigate]);

  const checkAdminAccess = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (!userDoc.exists() || userDoc.data().role !== 'admin') {
        navigate('/admin/login');
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/admin/login');
    }
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      const feePercentage = await getServiceFeePercentage();
      const feePercent = feePercentage * 100; // Convert to percentage (0.1 -> 10)
      setServiceFee(feePercent);
      setServiceFeeInput(feePercent.toString());
      
      // Update global cache
      if (typeof window !== 'undefined') {
        window.__SERVICE_FEE__ = feePercentage;
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveServiceFee = async () => {
    const newPercentage = parseFloat(serviceFeeInput);
    
    if (isNaN(newPercentage) || newPercentage < 0 || newPercentage > 100) {
      toast.error('Please enter a valid percentage (0-100)');
      return;
    }

    if (newPercentage === serviceFee) {
      toast.error('No changes to save');
      return;
    }

    if (!window.confirm(`Are you sure you want to change the service fee from ${serviceFee}% to ${newPercentage}%?\n\nThis will affect all future bookings.`)) {
      return;
    }

    try {
      setSaving(true);
      const feeDecimal = newPercentage / 100; // Convert to decimal (10 -> 0.1)
      await updateServiceFeePercentage(feeDecimal);
      
      setServiceFee(newPercentage);
      toast.success(`✅ Service fee updated to ${newPercentage}%`);
    } catch (error) {
      console.error('Error saving service fee:', error);
      toast.error(`Failed to update service fee: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="lg:ml-64 transition-all duration-300">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Settings</h1>
          <p className="text-gray-600">Manage platform settings and configurations</p>
        </div>

        {/* Service Fee Management */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Service Fee Management</h2>
              <p className="text-sm text-gray-600">
                Set the service fee percentage charged on each booking
              </p>
            </div>
            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-blue-900 mb-1">How Service Fees Work</p>
                <p className="text-sm text-blue-800">
                  The service fee is a percentage of each booking total. For example, if a guest books for ₱10,000 
                  and the service fee is 10%, the admin receives ₱1,000 and the host receives ₱9,000.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Service Fee Display */}
            <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border-2 border-teal-200 rounded-lg p-6">
              <p className="text-sm font-medium text-teal-700 mb-2">Current Service Fee</p>
              <p className="text-4xl font-bold text-teal-900 mb-1">{serviceFee}%</p>
              <p className="text-xs text-teal-600">
                Applied to all bookings
              </p>
            </div>

            {/* Service Fee Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Service Fee (%)
              </label>
              <div className="flex gap-3">
                <input
                  type="number"
                  value={serviceFeeInput}
                  onChange={(e) => setServiceFeeInput(e.target.value)}
                  min="0"
                  max="100"
                  step="0.1"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Enter percentage (0-100)"
                />
                <button
                  onClick={handleSaveServiceFee}
                  disabled={saving || parseFloat(serviceFeeInput) === serviceFee}
                  className="px-6 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-teal-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Save</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Enter a value between 0% and 100%
              </p>
            </div>
          </div>

          {/* Example Calculation */}
          {serviceFeeInput && !isNaN(parseFloat(serviceFeeInput)) && (
            <div className="mt-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm font-semibold text-gray-700 mb-3">Example Calculation</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Booking Total:</span>
                  <span className="font-semibold text-gray-900">₱10,000.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Service Fee ({parseFloat(serviceFeeInput) || 0}%):</span>
                  <span className="font-semibold text-teal-600">
                    ₱{((10000 * (parseFloat(serviceFeeInput) || 0)) / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="border-t border-gray-300 pt-2 flex justify-between">
                  <span className="text-gray-700 font-semibold">Host Receives:</span>
                  <span className="font-bold text-gray-900">
                    ₱{(10000 - ((10000 * (parseFloat(serviceFeeInput) || 0)) / 100)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Additional Settings Placeholder */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Additional Settings</h2>
          <p className="text-gray-600 text-sm">
            More admin settings will be available here (cancellation policies, platform rules, etc.)
          </p>
        </div>
      </div>
    </div>
    </div>
  );
}

export default AdminSettings;

