import { currentUser } from '@clerk/nextjs/server';

export async function BottomNav() {
  let role = 'VIEWER';
  let storeId: string | null = null;

  try {
    const user = await currentUser();
    if (user) {
      role = (user.publicMetadata?.role as string) || 'VIEWER';
      storeId = (user.publicMetadata?.storeId as string) || null;
    }
  } catch {
    // Not authenticated — show nothing
    return null;
  }

  if (role === 'VIEWER') {
    const viewerHome = storeId ? `/viewer/${storeId}` : '/viewer/no-store';
    return (
      <nav className="bottom-nav">
        <div className="mx-auto max-w-lg flex justify-around py-1.5">
          <NavItem href={viewerHome} icon="📊" label="Dashboard" />
        </div>
      </nav>
    );
  }

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
