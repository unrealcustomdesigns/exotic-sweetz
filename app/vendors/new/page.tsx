import Link from 'next/link';
import { VendorForm } from '../VendorForm';

export default function NewVendorPage() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link href="/vendors" className="text-gray-400 hover:text-gray-600">←</Link>
        <h1 className="page-header mb-0">Add Vendor</h1>
      </div>
      <VendorForm />
    </div>
  );
}
