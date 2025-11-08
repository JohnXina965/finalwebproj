import React, { useRef, useEffect } from 'react';
import { paypalPaymentConfig } from '../config/paypal';

export default function PayPalButton({ amount, description, onSuccess, onError, onCancel, disabled = false }) {
  const paypal = useRef();

  useEffect(() => {
    let rendered = false; // Flag to prevent duplicate rendering

    // Function to render buttons
    const renderButtons = () => {
      if (!window.paypal) {
        console.log('PayPal SDK not loaded yet, waiting...');
        return;
      }

      if (rendered) {
        return; // Prevent duplicate rendering
      }

      // Render PayPal button
      if (paypal.current && !paypal.current.hasChildNodes()) {
        console.log('Rendering PayPal button...');
        window.paypal
          .Buttons({
            createOrder: (data, actions, err) => {
              if (err) {
                console.error('Error creating order:', err);
                return;
              }
              // Round to 2 decimal places for PayPal (required for currencies with decimals)
              const roundedAmount = parseFloat(amount).toFixed(2);
              return actions.order.create({
                intent: "CAPTURE",
                purchase_units: [
                  {
                    description: description || "Payment",
                    amount: {
                      currency_code: paypalPaymentConfig.currency,
                      value: roundedAmount,
                    },
                    payee: {
                      email_address: 'sb-xivle46740431@business.admin.com' // Route to admin PayPal account
                    }
                  },
                ],
              });
            },
            onApprove: async (data, actions) => {
              try {
                const order = await actions.order.capture();
                console.log('Payment captured:', order);
                
                if (onSuccess) {
                  onSuccess({
                    orderID: data.orderID,
                    payerID: data.payerID,
                    orderDetails: order
                  });
                }
              } catch (error) {
                console.error('Payment capture error:', error);
                if (onError) {
                  onError(error);
                }
              }
            },
            onError: (err) => {
              console.error('PayPal error:', err);
              if (onError) {
                onError(err);
              }
            },
            onCancel: (data) => {
              console.log('Payment cancelled:', data);
              if (onCancel) {
                onCancel(data);
              }
            },
            disabled: disabled
          })
          .render(paypal.current)
          .catch((err) => {
            console.error('Error rendering PayPal button:', err);
          });
      }

      rendered = true; // Mark as rendered
    };

    // Try to render immediately if SDK is already loaded
    if (window.paypal) {
      // Small delay to ensure refs are ready
      setTimeout(renderButtons, 100);
    } else {
      // Wait for SDK to load
      const checkInterval = setInterval(() => {
        if (window.paypal) {
          clearInterval(checkInterval);
          setTimeout(renderButtons, 100);
        }
      }, 100);

      // Cleanup after 10 seconds if SDK doesn't load
      setTimeout(() => {
        clearInterval(checkInterval);
      }, 10000);
    }

    // Also try rendering when component updates (with delay to prevent duplicates)
    const timeout = setTimeout(() => {
      if (!rendered) {
        renderButtons();
      }
    }, 500);

    return () => {
      clearTimeout(timeout);
      // Clear the container when component unmounts
      if (paypal.current) {
        paypal.current.innerHTML = '';
      }
    };
  }, [amount, description, onSuccess, onError, onCancel, disabled]);

  return (
    <div className="w-full">
      {/* PayPal Button (includes PayPal and Card options when card funding is enabled) */}
      <div ref={paypal} className="w-full min-h-[50px]"></div>
    </div>
  );
}


