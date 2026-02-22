# Exotic SweEatz 🍬

Inventory management and consignment tracking system for a candy distribution + retail business. Built with Next.js 14, PostgreSQL, Prisma, and Clerk authentication.

## What It Does

- **Barcode-first workflow** — scan a product, pick an action, confirm. Staff don't need to navigate menus.
- **Dual-unit tracking** — tracks both boxes (cases) and individual packs, with conversion events.
- **Append-only ledger** — inventory totals are *computed*, never stored. Every movement is permanent and auditable.
- **Consignment accounting** — deliver boxes to stores on consignment, do weekly counts, compute what's owed, record payments.
- **Shrinkage detection** — automatic alerts when physical counts don't match the ledger.
- **Role-based access** — Manager, Staff, and Viewer roles via Clerk.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 App Router, React 18, Tailwind CSS |
| Database | PostgreSQL (Neon recommended) |
| ORM | Prisma |
| Auth | Clerk |
| Barcode | html5-qrcode (camera-based) |
| Hosting | Vercel |
| Notifications | Sonner (toast) |

## Getting Started

### Prerequisites

- Node.js 18+
- A PostgreSQL database (e.g., [Neon](https://neon.tech) free tier)
- A [Clerk](https://clerk.com) account (free tier)

### 1. Clone and Install

```bash
git clone <your-repo>
cd exotic-sweetz
npm install
```

### 2. Set Up Environment

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```env
DATABASE_URL="postgresql://user:pass@host/exotic_sweetz?sslmode=require"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
CRON_SECRET="some-random-secret-for-cron"
```

### 3. Set Up Database

```bash
# Push schema to database
npx prisma db push

# Generate Prisma client
npx prisma generate

# Apply immutability trigger (IMPORTANT — protects the ledger)
# Copy the contents of prisma/migrations/immutability_trigger.sql
# and run it in your database console (Neon SQL Editor, psql, etc.)

# Seed sample data
npm run db:seed
```

### 4. Configure Clerk Roles

In the Clerk Dashboard, set up roles for your users:

1. Go to **Users** → select a user → **Public Metadata**
2. Add: `{ "role": "MANAGER" }` for managers
3. Staff get: `{ "role": "STAFF" }`
4. Viewers get: `{ "role": "VIEWER" }` (or leave blank — default)

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
exotic-sweetz/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Home — quick actions grid
│   ├── scan/               # 📷 Scan & Move (primary workflow)
│   ├── receive/            # 📦 Receive from vendor
│   ├── convert/            # 🔄 Convert box → packs
│   ├── shelf/              # 📥 Put on / take off shelf
│   ├── deliver/            # 🚚 Deliver to store
│   ├── return/             # ↩️ Return from store
│   ├── sell/               # 💰 Retail sale
│   ├── stores/             # 🏪 Store list, detail, count, payment
│   ├── products/           # 🍬 Product list, detail, create
│   ├── locations/          # 📍 Location management
│   ├── history/            # 📜 Movement audit log
│   ├── dashboard/          # 📊 Dashboards
│   │   ├── page.tsx        # Weekly summary
│   │   ├── inventory/      # Full inventory report
│   │   ├── balances/       # Outstanding balances
│   │   ├── alerts/         # Alert management
│   │   └── shrinkage/      # Shrinkage detection
│   └── api/                # API routes
│       ├── form-options/   # Dropdown data for forms
│       ├── cron/           # Daily alert checks
│       └── stores/[id]/    # Store count data
├── actions/                # Server actions
│   ├── movements.ts        # All 9 movement types + reversal
│   ├── stores.ts           # Store counts, payments, balances
│   ├── products.ts         # Barcode lookup, product CRUD
│   ├── locations.ts        # Location + store creation
│   └── alerts.ts           # Alert status updates
├── lib/                    # Business logic
│   ├── db.ts               # Prisma singleton
│   ├── auth.ts             # Role checking
│   ├── inventory.ts        # On-hand computation queries
│   ├── pricing.ts          # Price resolution with store overrides
│   ├── validation.ts       # Location rules per action
│   └── alerts.ts           # Daily alert check functions
├── components/             # Shared components
│   └── BarcodeScanner.tsx  # Camera barcode scanner
├── prisma/
│   ├── schema.prisma       # Database schema
│   ├── seed.ts             # Sample data
│   └── migrations/
│       └── immutability_trigger.sql
└── public/
    ├── manifest.json       # PWA manifest
    ├── icon-192.png
    └── icon-512.png
```

## Movement Types

| Action | From → To | Unit | Description |
|--------|-----------|------|-------------|
| `RECEIVE` | — → Storage | BOX | Vendor delivers boxes |
| `PUT_ON_SHELF` | Storage → Shelf | BOX/PACK | Display for retail |
| `TAKE_OFF_SHELF` | Shelf → Storage/Truck | BOX/PACK | Remove from display |
| `DELIVER_TO_STORE` | Storage/Shelf/Truck → Store | BOX | Consignment delivery |
| `RETURN_FROM_STORE` | Store → Storage/Truck | BOX | Unsold boxes back |
| `CONVERT_BOX_TO_PACKS` | Location → Location | BOX→PACK | Open box for retail |
| `SALE_RETAIL_PACK` | Shelf/Storage → ∅ | PACK | Walk-in customer |
| `SALE_RETAIL_BOX` | Shelf/Storage → ∅ | BOX | Walk-in customer |
| `ADJUSTMENT` | Any | BOX/PACK | Manual correction (Manager only) |

## Consignment Flow

```
DELIVER_TO_STORE → weekly COUNT → compute sold → compute owed → PAYMENT → balance
```

1. **Deliver** boxes to a store (logged with wholesale price snapshot)
2. **Friday Count** — physically count remaining boxes at the store
3. **System computes**: `boxes_sold = prior_remaining + delivered - returned - current_remaining`
4. **Amount owed** = boxes_sold × wholesale price (with store-specific overrides)
5. **Record payment** — cash, Zelle, or check
6. **Balance** = total_owed - total_paid

## Alerts

| Alert | Trigger | Severity |
|-------|---------|----------|
| Negative Inventory | On-hand < 0 anywhere | CRITICAL |
| Shrinkage Detected | Count < expected | CRITICAL |
| Reconciliation Mismatch | Count > expected | CRITICAL |
| Low Stock | Storage < 5 boxes | WARNING |
| Payment Overdue | No payment in 14+ days | WARNING |

Alerts run automatically via Vercel cron (daily at 6 AM UTC) and on store count submission.

## Deploying to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Set environment variables in Vercel dashboard
4. Deploy — Prisma generates automatically during build
5. Run the immutability trigger SQL on your production database
6. Set `CRON_SECRET` for the daily alert cron job

## Google Sheets Mirror

An Excel file (`exotic-sweetz-sheets-mirror.xlsx`) is included that mirrors the database structure. Upload to Google Sheets for a spreadsheet-based backup or starter before the app goes live. It includes:

- 8 data tabs (Products, Barcodes, Locations, Vendors, Pricing, Movements, Store Counts, Payments)
- 3 dashboard tabs with auto-computing formulas (Inventory, Store Summary, Balances)
- Instructions tab

The Movements tab is **append-only** — same rule as the app.

## Key Design Decisions

- **Append-only movements**: Inventory is never stored as a number — it's always computed from the sum of inflows minus outflows. This makes the system self-auditing.
- **Immutability trigger**: A PostgreSQL trigger prevents editing or deleting movements. Mistakes are corrected via reversal (a new opposite movement).
- **Barcode-first**: The primary workflow starts with a scan. This reduces errors from manual product/location selection.
- **Mobile-first**: Designed for phones. Bottom nav, large touch targets, camera scanner.
- **Dual-unit**: Boxes and packs are tracked separately with explicit conversion events, so you always know exactly how many of each exist.

## License

Private — Exotic SweEatz internal use.
