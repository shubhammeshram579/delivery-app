'use client';
import { useState, useCallback } from 'react';
import { paymentService } from '../services/index';
import toast from 'react-hot-toast';



const loadRazorpayScript = () => {
  return new Promise((resolve) => {

    // already loaded
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');

    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;

    script.onload = () => {
      resolve(true);
    };

    script.onerror = () => {
      resolve(false);
    };

    document.body.appendChild(script);
  });
};

export const useRazorpay = () => {
  const [loading, setLoading] = useState(false);
  

  const openPayment = useCallback(async ({ orderId, orderNumber, amount, user, onSuccess, onError }) => {
    setLoading(true);

    try {
      // Step 1 — Create Razorpay order on backend
      const res  = await paymentService.createRazorpayOrder(orderId);
      const data = res.data.data;

    const isLoaded = await loadRazorpayScript();

    if (!isLoaded) {
      toast.error('Payment gateway not loaded. Please refresh and try again.');
      return;
    }

      // Step 3 — Open Razorpay checkout
      const options = {
        key:      data.keyId,
        amount:   data.amount,
        currency: data.currency || 'INR',
        order_id: data.razorpayOrderId,
        name:     'DeliverPro',
        description: `Payment for order #${orderNumber}`,
        image:    '/logo.png',
        prefill: {
          name:  user?.name  || '',
          email: user?.email || '',
        },
        theme: { color: '#0284c7' },

        handler: async (response) => {
          // Step 4 — Verify payment on backend
          try {
            await paymentService.verifyPayment({
              razorpayOrderId:   data.razorpayOrderId,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              orderId,
            });
            toast.success('Payment successful!');
            onSuccess?.();
          } catch (err) {
            toast.error('Payment verification failed. Contact support.');
            onError?.(err);
          }
        },

        modal: {
          ondismiss: () => {
            toast('Payment cancelled.');
            setLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);

      rzp.on('payment.failed', (response) => {
        toast.error(`Payment failed: ${response.error.description}`);
        onError?.(response.error);
        setLoading(false);
      });

      rzp.open();

    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to initiate payment';
      toast.error(msg);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { openPayment, loading };
};