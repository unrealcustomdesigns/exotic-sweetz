'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createVendor, updateVendor } from '@/actions/vendors';
import { toast } from 'sonner';

type VendorData = {
  id: string;
  name: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  notes: string | null;
};

export function VendorForm({ vendor }: { vendor?: VendorData }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!vendor;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setSubmitting(true);
    try {
      const formData = new FormData(form);
      if (isEdit) {
        await updateVendor(vendor.id, formData);
        toast.success('Vendor updated!');
        router.push(`/vendors/${vendor.id}`);
      } else {
        const result = await createVendor(formData);
        toast.success('Vendor created!');
        router.push('/vendors');
      }
    } catch (err: any) {
      toast.error('Failed', { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Vendor Name *</label>
        <input
          name="name"
          className="input"
          required
          placeholder="e.g. Sweet Imports LLC"
          defaultValue={vendor?.name || ''}
        />
      </div>

      <div>
        <label className="label">Contact Name</label>
        <input
          name="contactName"
          className="input"
          placeholder="e.g. John Smith"
          defaultValue={vendor?.contactName || ''}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Phone</label>
          <input
            name="contactPhone"
            className="input"
            type="tel"
            placeholder="(555) 123-4567"
            defaultValue={vendor?.contactPhone || ''}
          />
        </div>
        <div>
          <label className="label">Email</label>
          <input
            name="contactEmail"
            className="input"
            type="email"
            placeholder="john@vendor.com"
            defaultValue={vendor?.contactEmail || ''}
          />
        </div>
      </div>

      <div>
        <label className="label">Notes</label>
        <textarea
          name="notes"
          className="input"
          rows={2}
          placeholder="Payment terms, delivery schedule..."
          defaultValue={vendor?.notes || ''}
        />
      </div>

      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Vendor'}
      </button>
    </form>
  );
}
