import type { Metadata, Viewport } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'Exotic SweEatz',
  description: 'Inventory management & consignment tracking',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#ee7a12',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-screen">
          {/* Floating candy blobs */}
          <div className="candy-bg" aria-hidden="true" />

          <div className="relative z-10 mx-auto max-w-lg min-h-screen flex flex-col">
            <main className="flex-1 pb-24 px-4 pt-4">{children}</main>
            <BottomNav />
          </div>
          <Toaster
            position="top-center"
            richColors
            toastOptions={{
              style: {
                fontFamily: 'Fredoka, Nunito, sans-serif',
                borderRadius: '16px',
                fontWeight: 600,
              },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}

function BottomNav() {
  return (
    <nav className="bottom-nav">
      <div className="mx-auto max-w-lg flex justify-around py-1.5">
        <NavItem href="/" icon="🏠" label="Home" />
        <NavItem href="/scan" icon="📷" label="Scan" />
        <NavItem href="/stores" icon="🏪" label="Stores" />
        <NavItem href="/dashboard" icon="📊" label="Reports" />
      </div>
    </nav>
  );
}

function NavItem({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <a href={href} className="nav-item">
      <span className="nav-icon">{icon}</span>
      <span className="text-[10px] font-bold">{label}</span>
    </a>
  );
}
