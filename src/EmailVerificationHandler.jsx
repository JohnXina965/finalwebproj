import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { auth } from './Firebase';
import { applyActionCode } from 'firebase/auth';

const EmailVerificationHandler = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error, invalid

  useEffect(() => {
    const verifyEmail = async () => {
      const oobCode = searchParams.get('oobCode');
      const mode = searchParams.get('mode');
      
      console.log('🔍 Verification params:', { mode, oobCode });
      
      // Check if this is an email verification request
      if (mode !== 'verifyEmail' || !oobCode) {
        setStatus('invalid');
        return;
      }

      try {
        console.log('🔄 Applying verification code...');
        
        // Apply the verification code to verify the email
        await applyActionCode(auth, oobCode);
        
        console.log('✅ Email verified successfully!');
        setStatus('success');
        
        // Redirect to login after success with a message
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              message: '✅ Email verified successfully! You can now log in.',
              messageType: 'success'
            }
          });
        }, 3000);
        
      } catch (error) {
        console.error('❌ Verification error:', error);
        
        // Handle specific error cases
        if (error.code === 'auth/invalid-action-code') {
          setStatus('expired');
        } else if (error.code === 'auth/user-disabled') {
          setStatus('disabled');
        } else {
          setStatus('error');
        }
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
        {/* Verifying State */}
        {status === 'verifying' && (
          <div className="space-y-6">
            <div className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying Your Email</h2>
              <p className="text-gray-600">Please wait while we verify your email address...</p>
            </div>
          </div>
        )}
        
        {/* Success State */}
        {status === 'success' && (
          <div className="space-y-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-3xl text-green-600">✅</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h2>
              <p className="text-gray-600 mb-4">Your email has been successfully verified.</p>
              <p className="text-sm text-gray-500">Redirecting you to login...</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full animate-pulse"></div>
            </div>
          </div>
        )}
        
        {/* Invalid Link State */}
        {status === 'invalid' && (
          <div className="space-y-6">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-3xl text-yellow-600">⚠️</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Verification Link</h2>
              <p className="text-gray-600 mb-4">This verification link appears to be invalid or malformed.</p>
            </div>
            <button 
              onClick={() => navigate('/login')}
              className="w-full bg-teal-600 text-white py-3 px-4 rounded-lg hover:bg-teal-700 transition-colors font-medium"
            >
              Go to Login
            </button>
          </div>
        )}
        
        {/* Expired Link State */}
        {status === 'expired' && (
          <div className="space-y-6">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-3xl text-orange-600">⏰</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Link Expired</h2>
              <p className="text-gray-600 mb-4">This verification link has expired. Please request a new one.</p>
            </div>
            <div className="space-y-3">
              <button 
                onClick={() => navigate('/login')}
                className="w-full bg-teal-600 text-white py-3 px-4 rounded-lg hover:bg-teal-700 transition-colors font-medium"
              >
                Go to Login
              </button>
              <button 
                onClick={() => navigate('/signup')}
                className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Sign Up Again
              </button>
            </div>
          </div>
        )}
        
        {/* Error State */}
        {status === 'error' && (
          <div className="space-y-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-3xl text-red-600">❌</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h2>
              <p className="text-gray-600 mb-4">We couldn't verify your email address. Please try again.</p>
            </div>
            <button 
              onClick={() => navigate('/login')}
              className="w-full bg-teal-600 text-white py-3 px-4 rounded-lg hover:bg-teal-700 transition-colors font-medium"
            >
              Go to Login
            </button>
          </div>
        )}
        
        {/* Disabled Account State */}
        {status === 'disabled' && (
          <div className="space-y-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-3xl text-red-600">🚫</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Disabled</h2>
              <p className="text-gray-600 mb-4">This account has been disabled. Please contact support.</p>
            </div>
            <button 
              onClick={() => navigate('/')}
              className="w-full bg-teal-600 text-white py-3 px-4 rounded-lg hover:bg-teal-700 transition-colors font-medium"
            >
              Go to Homepage
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailVerificationHandler;