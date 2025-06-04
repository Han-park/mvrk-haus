import { Suspense } from 'react';
import SignUpJuneClient from './SignUpJuneClient';

// Basic loading component
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="text-black text-xl mb-4">Loading page...</div>
        {/* You can add a spinner or a more styled loading indicator here */}
      </div>
    </div>
  );
}

export default function SignUpJunePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SignUpJuneClient />
    </Suspense>
  );
}