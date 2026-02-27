import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function HomePage() {
  const user = await getAuthUser();
  const isManager = user.role === 'MANAGER';

  // Viewers go straight to their store dashboard
  if (user.role === 'VIEWER') {
    if (user.storeId) {
      redirect(`/viewer/${user.storeId}`);
    } else {
      redirect('/viewer/no-store');
    }
  }

  const [productCount, storeCount, openAlerts] = await Promise.all([
    prisma.product.count({ where: { isActive: true } }),
    prisma.store.count({ where: { isActive: true } }),
    prisma.alert.count({ where: { status: 'OPEN' } }),
  ]);

  return (
    <div>
      {/* Hero Banner */}
      <div className="hero-banner animate-slide-up">
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                Exotic SweEatz 🍬
              </h1>
              <p className="text-sm text-white/80 font-medium mt-0.5">
                Hey {user.name} 👋
              </p>
            </div>
            {openAlerts > 0 && (
              <Link
                href="/dashboard/alerts"
                className="flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-sm
                           px-3 py-1.5 text-xs font-bold text-white
                           hover:bg-white/30 transition-all animate-pulse-glow"
              >
                🔔 {openAlerts}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="stat-card animate-slide-up-1">
          <div className="text-3xl font-bold text-brand-500">{productCount}</div>
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Products</div>
        </div>
        <div className="stat-card animate-slide-up-2">
          <div className="text-3xl font-bold text-candy-purple">{storeCount}</div>
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Stores</div>
        </div>
        <div className={`stat-card animate-slide-up-3 ${openAlerts > 0 ? 'stat-alert' : ''}`}>
          <div className={`text-3xl font-bold ${openAlerts > 0 ? 'text-candy-red' : 'text-candy-teal'}`}>
            {openAlerts}
          </div>
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Alerts</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="section-header">Quick Actions</div>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <ActionCard href="/scan"    icon="📷" title="Scan & Move" desc="Primary workflow" delay={0} />
        <ActionCard href="/receive" icon="📦" title="Receive"     desc="From vendor"     delay={1} />
        <ActionCard href="/convert" icon="🔄" title="Convert"     desc="Box → Packs"     delay={2} />
        <ActionCard href="/deliver" icon="🚚" title="Deliver"     desc="To store"        delay={3} />
        <ActionCard href="/sell"    icon="💰" title="Sell"         desc="Retail sale"     delay={4} />
        <ActionCard href="/shelf"   icon="📥" title="Shelf"        desc="Put on / take off" delay={5} />
        <ActionCard href="/return"  icon="↩️" title="Return"       desc="From store"      delay={6} />
        <ActionCard href="/stores"  icon="🏪" title="Stores"       desc="Counts & payments" delay={7} />
      </div>

      {/* Manager section */}
      {isManager && (
        <>
          <div className="section-header">Manager Tools</div>
          <div className="grid grid-cols-2 gap-3">
            <ActionCard href="/products"          icon="🍬" title="Products"  desc="Manage catalog"  delay={0} />
            <ActionCard href="/vendors"           icon="🏭" title="Vendors"   desc="Manage suppliers" delay={1} />
            <ActionCard href="/locations"         icon="📍" title="Locations" desc="Shelves & storage" delay={2} />
            <ActionCard href="/dashboard"         icon="📊" title="Reports"   desc="Full dashboards" delay={3} />
            <ActionCard href="/history"           icon="📜" title="History"   desc="Audit log"       delay={4} />
            <ActionCard href="/dashboard/alerts"  icon="🔔" title="Alerts"    desc="Review issues"   delay={5} />
          </div>
        </>
      )}
    </div>
  );
}

function ActionCard({
  href, icon, title, desc, delay = 0,
}: {
  href: string; icon: string; title: string; desc: string; delay?: number;
}) {
  const animClass = delay <= 4 ? `animate-slide-up-${Math.min(delay + 1, 4)}` : 'animate-slide-up';
  return (
    <Link href={href} className={`action-card ${animClass}`}>
      <span className="action-icon">{icon}</span>
      <div>
        <div className="text-sm font-bold text-gray-800">{title}</div>
        <div className="text-[11px] font-medium text-gray-400">{desc}</div>
      </div>
    </Link>
  );
}
