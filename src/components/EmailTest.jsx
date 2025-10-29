import React from 'react';
import { sendEmail, initEmailJS } from '../services/EmailService';

const EmailTest = () => {
  const testEmail = async () => {
    try {
      initEmailJS();
      
      const testEmail = 'santosjerico420@test.com'; // Replace with your actual email
      const testOTP = '123456';

      console.log('Testing EmailJS with your template...');
      const result = await sendEmail(testEmail, testOTP);
      
      alert('Test email sent successfully! Check your inbox.');
    } catch (error) {
      console.error('Test failed:', error);
      alert('Test failed: ' + error.message);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>EmailJS Test</h2>
      <p>Testing with your template variables: {{email}}, {{passcode}}, {{time}}</p>
      <button onClick={testEmail} style={{ padding: '10px 20px', background: '#0d9488', color: 'white', border: 'none', borderRadius: '5px' }}>
        Send Test OTP Email
      </button>
    </div>
  );
};

export default EmailTest;