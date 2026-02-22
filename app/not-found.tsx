import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 animate-bounce-in">
      <div className="text-7xl mb-4 animate-float">🍬</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Fredoka, sans-serif' }}>
        Oops! Lost in the candy aisle
      </h1>
      <p className="text-sm text-gray-500 mb-6 text-center">
        This page doesn&apos;t exist. Let&apos;s get you back!
      </p>
      <Link href="/" className="btn-primary">
        🏠 Go Home
      </Link>
    </div>
  );
}
