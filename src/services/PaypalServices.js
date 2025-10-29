import { paypalConfig } from '../config/paypal';

// Convert USD to PHP (approximate conversion rate)
const USD_TO_PHP = 56.50;

export const convertToPHP = (usdAmount) => {
  return (usdAmount * USD_TO_PHP).toFixed(2);
};

// Mock function to create PayPal subscription (for demo)
export const createPayPalSubscription = async (plan) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Convert price to PHP
      const priceInPHP = convertToPHP(plan.price);
      
      resolve({
        id: `I-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        status: 'APPROVAL_PENDING',
        plan_id: `P-${plan.id.toUpperCase()}-${Math.random().toString(36).substr(2, 6)}`,
        price_php: priceInPHP,
        links: [
          {
            href: `https://www.sandbox.paypal.com/webapps/billing/subscriptions?subscription_token=TEST-${Math.random().toString(36).substr(2, 20)}`,
            rel: 'approve',
            method: 'GET'
          },
          {
            href: '#',
            rel: 'edit',
            method: 'GET'
          }
        ]
      });
    }, 1500);
  });
};

// Mock function to verify subscription
export const verifyPayPalSubscription = async (subscriptionId) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        status: 'ACTIVE',
        id: subscriptionId,
        start_time: new Date().toISOString(),
        subscriber: {
          email_address: 'buyer@example.com',
          name: {
            given_name: 'John',
            surname: 'Doe'
          }
        },
        billing_info: {
          last_payment: {
            amount: {
              value: '9.99',
              currency_code: 'PHP'
            },
            time: new Date().toISOString()
          },
          next_billing_time: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      });
    }, 1000);
  });
};