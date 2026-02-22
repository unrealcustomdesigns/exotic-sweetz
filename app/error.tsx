'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 animate-bounce-in">
      <div className="text-7xl mb-4 animate-wiggle">😵</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Fredoka, sans-serif' }}>
        Something went wrong!
      </h1>
      <p className="text-sm text-gray-500 mb-6 text-center max-w-xs">
        {error.message || 'An unexpected error occurred.'}
      </p>
      <button onClick={reset} className="btn-primary">
        🔄 Try Again
      </button>
    </div>
  );
}
