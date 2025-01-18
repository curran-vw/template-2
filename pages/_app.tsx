import { isAbortError } from 'next/dist/server/pipe-readable';

// Add error handling for unhandled rejections
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    // Check if it's a ResponseAborted error
    if (event.reason?.name === 'ResponseAborted') {
      // Prevent the error from being logged
      event.preventDefault();
    }
  });
}

// Your existing App component
function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}

export default MyApp; 