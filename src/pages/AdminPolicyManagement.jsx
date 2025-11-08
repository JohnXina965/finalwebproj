import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../Firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

function AdminPolicyManagement() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [activeTab, setActiveTab] = useState('cancellation');
  
  // Policy states
  const [policies, setPolicies] = useState({
    cancellationPolicy: {
      flexible: {
        fullRefundDays: 1,
        partialRefundPercent: 50,
        noRefundDays: 0
      },
      moderate: {
        fullRefundDays: 5,
        partialRefundPercent: 50,
        noRefundDays: 1
      },
      strict: {
        fullRefundDays: 14,
        partialRefundPercent: 25,
        noRefundDays: 7
      },
      adminDeductionPercent: 10
    },
    termsOfService: {
      content: ''
    },
    privacyPolicy: {
      content: ''
    },
    hostingRules: {
      content: ''
    },
    safetyGuidelines: {
      content: ''
    },
    communityStandards: {
      content: ''
    }
  });

  useEffect(() => {
    if (!currentUser) {
      navigate('/admin/login');
      return;
    }

    checkAdminAccess();
    loadPolicies();
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

  const loadPolicies = async () => {
    try {
      setLoading(true);
      const policiesDoc = await getDoc(doc(db, 'adminSettings', 'policies'));
      
      if (policiesDoc.exists()) {
        setPolicies(policiesDoc.data());
      } else {
        // Initialize with default policies
        await initializeDefaultPolicies();
      }
    } catch (error) {
      console.error('Error loading policies:', error);
      toast.error('Failed to load policies');
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultPolicies = async () => {
    const defaultPolicies = {
      cancellationPolicy: {
        flexible: {
          fullRefundDays: 1,
          partialRefundPercent: 50,
          noRefundDays: 0
        },
        moderate: {
          fullRefundDays: 5,
          partialRefundPercent: 50,
          noRefundDays: 1
        },
        strict: {
          fullRefundDays: 14,
          partialRefundPercent: 25,
          noRefundDays: 7
        },
        adminDeductionPercent: 10
      },
      termsOfService: {
        content: 'Default Terms of Service content...'
      },
      privacyPolicy: {
        content: 'Default Privacy Policy content...'
      },
      hostingRules: {
        content: 'Default Hosting Rules content...'
      },
      safetyGuidelines: {
        content: 'Default Safety Guidelines content...'
      },
      communityStandards: {
        content: 'Default Community Standards content...'
      },
      updatedAt: serverTimestamp()
    };

    await setDoc(doc(db, 'adminSettings', 'policies'), defaultPolicies);
    setPolicies(defaultPolicies);
  };

  const handleSaveCancellationPolicy = async (policyType) => {
    try {
      setSaving({ ...saving, [`cancellation_${policyType}`]: true });
      
      const updatedPolicies = {
        ...policies,
        cancellationPolicy: {
          ...policies.cancellationPolicy,
          [policyType]: policies.cancellationPolicy[policyType]
        },
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'adminSettings', 'policies'), updatedPolicies, { merge: true });
      setPolicies(updatedPolicies);
      toast.success(`✅ ${policyType.charAt(0).toUpperCase() + policyType.slice(1)} policy updated!`);
    } catch (error) {
      console.error('Error saving cancellation policy:', error);
      toast.error(`Failed to save ${policyType} policy`);
    } finally {
      setSaving({ ...saving, [`cancellation_${policyType}`]: false });
    }
  };

  const handleSaveAdminDeduction = async () => {
    try {
      setSaving({ ...saving, adminDeduction: true });
      
      const updatedPolicies = {
        ...policies,
        cancellationPolicy: {
          ...policies.cancellationPolicy,
          adminDeductionPercent: policies.cancellationPolicy.adminDeductionPercent
        },
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'adminSettings', 'policies'), updatedPolicies, { merge: true });
      setPolicies(updatedPolicies);
      toast.success('✅ Admin deduction percentage updated!');
    } catch (error) {
      console.error('Error saving admin deduction:', error);
      toast.error('Failed to save admin deduction');
    } finally {
      setSaving({ ...saving, adminDeduction: false });
    }
  };

  const handleSavePolicyContent = async (policyKey) => {
    try {
      setSaving({ ...saving, [policyKey]: true });
      
      const updatedPolicies = {
        ...policies,
        [policyKey]: policies[policyKey],
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'adminSettings', 'policies'), updatedPolicies, { merge: true });
      setPolicies(updatedPolicies);
      toast.success(`✅ ${policyKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} updated!`);
    } catch (error) {
      console.error(`Error saving ${policyKey}:`, error);
      toast.error(`Failed to save ${policyKey}`);
    } finally {
      setSaving({ ...saving, [policyKey]: false });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading policies...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'cancellation', label: 'Cancellation Policies', icon: '📋' },
    { id: 'terms', label: 'Terms of Service', icon: '📜' },
    { id: 'privacy', label: 'Privacy Policy', icon: '🔒' },
    { id: 'hosting', label: 'Hosting Rules', icon: '🏠' },
    { id: 'safety', label: 'Safety Guidelines', icon: '⚠️' },
    { id: 'community', label: 'Community Standards', icon: '🤝' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="lg:ml-64 transition-all duration-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Policy & Compliance Management</h1>
          <p className="text-gray-600">Manage platform policies, rules, and regulations</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 mb-6 flex flex-wrap gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Cancellation Policies Tab */}
        {activeTab === 'cancellation' && (
          <div className="space-y-6">
            {/* Admin Deduction */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Admin Deduction Percentage</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Deduction (%)
                  </label>
                  <input
                    type="number"
                    value={policies.cancellationPolicy.adminDeductionPercent}
                    onChange={(e) => setPolicies({
                      ...policies,
                      cancellationPolicy: {
                        ...policies.cancellationPolicy,
                        adminDeductionPercent: parseFloat(e.target.value) || 10
                      }
                    })}
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Percentage deducted from refundable amounts
                  </p>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleSaveAdminDeduction}
                    disabled={saving.adminDeduction}
                    className="px-6 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-teal-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving.adminDeduction ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>

            {/* Flexible Policy */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Flexible Policy</h2>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">Most Guest-Friendly</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Refund (Days Before Check-in)
                  </label>
                  <input
                    type="number"
                    value={policies.cancellationPolicy.flexible.fullRefundDays}
                    onChange={(e) => setPolicies({
                      ...policies,
                      cancellationPolicy: {
                        ...policies.cancellationPolicy,
                        flexible: {
                          ...policies.cancellationPolicy.flexible,
                          fullRefundDays: parseInt(e.target.value) || 1
                        }
                      }
                    })}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Partial Refund (%)
                  </label>
                  <input
                    type="number"
                    value={policies.cancellationPolicy.flexible.partialRefundPercent}
                    onChange={(e) => setPolicies({
                      ...policies,
                      cancellationPolicy: {
                        ...policies.cancellationPolicy,
                        flexible: {
                          ...policies.cancellationPolicy.flexible,
                          partialRefundPercent: parseInt(e.target.value) || 50
                        }
                      }
                    })}
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    No Refund (Days Before Check-in)
                  </label>
                  <input
                    type="number"
                    value={policies.cancellationPolicy.flexible.noRefundDays}
                    onChange={(e) => setPolicies({
                      ...policies,
                      cancellationPolicy: {
                        ...policies.cancellationPolicy,
                        flexible: {
                          ...policies.cancellationPolicy.flexible,
                          noRefundDays: parseInt(e.target.value) || 0
                        }
                      }
                    })}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>
              <button
                onClick={() => handleSaveCancellationPolicy('flexible')}
                disabled={saving.cancellation_flexible}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving.cancellation_flexible ? 'Saving...' : 'Save Flexible Policy'}
              </button>
            </div>

            {/* Moderate Policy */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Moderate Policy (Default)</h2>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">Balanced</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Refund (Days Before Check-in)
                  </label>
                  <input
                    type="number"
                    value={policies.cancellationPolicy.moderate.fullRefundDays}
                    onChange={(e) => setPolicies({
                      ...policies,
                      cancellationPolicy: {
                        ...policies.cancellationPolicy,
                        moderate: {
                          ...policies.cancellationPolicy.moderate,
                          fullRefundDays: parseInt(e.target.value) || 5
                        }
                      }
                    })}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Partial Refund (%)
                  </label>
                  <input
                    type="number"
                    value={policies.cancellationPolicy.moderate.partialRefundPercent}
                    onChange={(e) => setPolicies({
                      ...policies,
                      cancellationPolicy: {
                        ...policies.cancellationPolicy,
                        moderate: {
                          ...policies.cancellationPolicy.moderate,
                          partialRefundPercent: parseInt(e.target.value) || 50
                        }
                      }
                    })}
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    No Refund (Days Before Check-in)
                  </label>
                  <input
                    type="number"
                    value={policies.cancellationPolicy.moderate.noRefundDays}
                    onChange={(e) => setPolicies({
                      ...policies,
                      cancellationPolicy: {
                        ...policies.cancellationPolicy,
                        moderate: {
                          ...policies.cancellationPolicy.moderate,
                          noRefundDays: parseInt(e.target.value) || 1
                        }
                      }
                    })}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>
              <button
                onClick={() => handleSaveCancellationPolicy('moderate')}
                disabled={saving.cancellation_moderate}
                className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving.cancellation_moderate ? 'Saving...' : 'Save Moderate Policy'}
              </button>
            </div>

            {/* Strict Policy */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Strict Policy</h2>
                <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">Host-Friendly</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Partial Refund (Days Before Check-in)
                  </label>
                  <input
                    type="number"
                    value={policies.cancellationPolicy.strict.fullRefundDays}
                    onChange={(e) => setPolicies({
                      ...policies,
                      cancellationPolicy: {
                        ...policies.cancellationPolicy,
                        strict: {
                          ...policies.cancellationPolicy.strict,
                          fullRefundDays: parseInt(e.target.value) || 14
                        }
                      }
                    })}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Note: Strict policy uses partial refund, not full</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Partial Refund (%)
                  </label>
                  <input
                    type="number"
                    value={policies.cancellationPolicy.strict.partialRefundPercent}
                    onChange={(e) => setPolicies({
                      ...policies,
                      cancellationPolicy: {
                        ...policies.cancellationPolicy,
                        strict: {
                          ...policies.cancellationPolicy.strict,
                          partialRefundPercent: parseInt(e.target.value) || 25
                        }
                      }
                    })}
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    No Refund (Days Before Check-in)
                  </label>
                  <input
                    type="number"
                    value={policies.cancellationPolicy.strict.noRefundDays}
                    onChange={(e) => setPolicies({
                      ...policies,
                      cancellationPolicy: {
                        ...policies.cancellationPolicy,
                        strict: {
                          ...policies.cancellationPolicy.strict,
                          noRefundDays: parseInt(e.target.value) || 7
                        }
                      }
                    })}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>
              <button
                onClick={() => handleSaveCancellationPolicy('strict')}
                disabled={saving.cancellation_strict}
                className="mt-4 px-6 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving.cancellation_strict ? 'Saving...' : 'Save Strict Policy'}
              </button>
            </div>
          </div>
        )}

        {/* Other Policy Tabs - Text Editors */}
        {activeTab !== 'cancellation' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {tabs.find(t => t.id === activeTab)?.label}
            </h2>
            <textarea
              value={policies[activeTab === 'terms' ? 'termsOfService' : activeTab === 'privacy' ? 'privacyPolicy' : activeTab === 'hosting' ? 'hostingRules' : activeTab === 'safety' ? 'safetyGuidelines' : 'communityStandards']?.content || ''}
              onChange={(e) => {
                const policyKey = activeTab === 'terms' ? 'termsOfService' : activeTab === 'privacy' ? 'privacyPolicy' : activeTab === 'hosting' ? 'hostingRules' : activeTab === 'safety' ? 'safetyGuidelines' : 'communityStandards';
                setPolicies({
                  ...policies,
                  [policyKey]: {
                    ...policies[policyKey],
                    content: e.target.value
                  }
                });
              }}
              rows={20}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent font-mono text-sm"
              placeholder="Enter policy content here..."
            />
            <button
              onClick={() => handleSavePolicyContent(activeTab === 'terms' ? 'termsOfService' : activeTab === 'privacy' ? 'privacyPolicy' : activeTab === 'hosting' ? 'hostingRules' : activeTab === 'safety' ? 'safetyGuidelines' : 'communityStandards')}
              disabled={saving[activeTab === 'terms' ? 'termsOfService' : activeTab === 'privacy' ? 'privacyPolicy' : activeTab === 'hosting' ? 'hostingRules' : activeTab === 'safety' ? 'safetyGuidelines' : 'communityStandards']}
              className="mt-4 px-6 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-teal-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving[activeTab === 'terms' ? 'termsOfService' : activeTab === 'privacy' ? 'privacyPolicy' : activeTab === 'hosting' ? 'hostingRules' : activeTab === 'safety' ? 'safetyGuidelines' : 'communityStandards'] ? 'Saving...' : 'Save Policy'}
            </button>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}

export default AdminPolicyManagement;

