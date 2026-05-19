// import { Geist } from 'next/font/google';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { Providers } from '../components/shared/Providers';
import { Toaster } from 'react-hot-toast';

// const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });
const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata = {
  title: 'Delivery App',
  description: 'Real-time delivery management platform',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
        <head>
        {/* Razorpay Checkout SDK */}
        {/* <script src="https://checkout.razorpay.com/v1/checkout.js" /> */}
        <Script
          id="razorpay-checkout-js"
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased">
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: { borderRadius: '10px', background: '#1e293b', color: '#f8fafc' },
              success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
