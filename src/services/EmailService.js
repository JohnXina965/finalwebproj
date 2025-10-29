const EMAILJS_CONFIG = {
  SERVICE_ID: 'service_z8ms74u',
  TEMPLATE_ID: 'template_44e0uoq', 
  USER_ID: 'GqhsogPCZps6-KE_V'
};

export const initEmailJS = () => {
  if (typeof window !== 'undefined' && window.emailjs) {
    window.emailjs.init(EMAILJS_CONFIG.USER_ID);
    console.log('EmailJS initialized');
  }
};

export const sendEmail = async (email, otp, userData = {}) => {
  try {
    if (typeof window === 'undefined' || !window.emailjs) {
      throw new Error('EmailJS not available. Make sure the script is loaded.');
    }

    const templateParams = {
      email: email,
      passcode: otp,
      time: getExpiryTime(),
      fullName: userData.name || 'User' // ADD THIS LINE
    };

    console.log('Sending OTP email to:', email);
    console.log('Using template parameters:', templateParams);
    console.log('User full name:', userData.name); // Debug log

    const response = await window.emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.TEMPLATE_ID,
      templateParams
    );

    console.log('Email sent successfully:', response);
    return response;
  } catch (error) {
    console.error('EmailJS error details:', error);
    throw new Error('Failed to send verification email: ' + (error.text || error.message));
  }
};

const getExpiryTime = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 15);
  return now.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
};