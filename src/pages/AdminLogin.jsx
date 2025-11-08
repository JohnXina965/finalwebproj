import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../Firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth } from '../Firebase';
import LoginSignupNav from '../LoginSignupNav';

function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const checkAdminRole = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const isAdmin = userData.role === 'admin' || userData.isAdmin === true;
        console.log('Admin check result:', { uid, role: userData.role, isAdmin, userData });
        return isAdmin;
      }
      console.log('User document does not exist for UID:', uid);
      return false;
    } catch (error) {
      console.error('Error checking admin role:', error);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { user } = await login(formData.email, formData.password);
      
      // Check if user is admin
      const isAdmin = await checkAdminRole(user.uid);
      
      if (!isAdmin) {
        // Sign out non-admin users
        await signOut(auth);
        setError('Access denied. Admin credentials required.');
        setLoading(false);
        return;
      }

      // Ensure isAdmin field is set in user document
      await setDoc(doc(db, 'users', user.uid), {
        role: 'admin',
        isAdmin: true,
        email: user.email,
        displayName: user.displayName || 'Admin User'
      }, { merge: true });

      // Store admin session
      await setDoc(doc(db, 'admin_sessions', user.uid), {
        uid: user.uid,
        email: user.email,
        loggedInAt: serverTimestamp()
      });

      // Clear any redirect mode preferences that might interfere
      localStorage.removeItem('ecoexpress_redirect_mode');

      // Force navigation to admin dashboard and prevent any other redirects
      // Use window.location.href to bypass React Router and prevent any redirect logic
      window.location.href = '/admin/dashboard';
    } catch (error) {
      console.error('Admin login error:', error);
      if (error.message === 'Not an admin') {
        setError('Access denied. Admin credentials required.');
      } else {
        setError('Failed to log in. Please check your credentials.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center py-12 px-4">
      <LoginSignupNav />
      <div className="max-w-md w-full">
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-200">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl mb-4 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Admin Portal</h2>
            <p className="text-gray-600">Sign in to access admin dashboard</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-600 text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Admin Email
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                placeholder="admin@ecoexpress.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-3 rounded-xl font-bold hover:from-red-700 hover:to-red-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign In as Admin'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center space-y-3">
            <div>
              <Link
                to="/admin/setup"
                className="text-sm font-semibold text-red-600 hover:text-red-700 transition-colors inline-block mb-2"
              >
                Create Admin Account →
              </Link>
            </div>
            <div>
              <Link
                to="/login"
                className="text-sm text-gray-600 hover:text-red-600 transition-colors"
              >
                ← Back to Guest Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;

