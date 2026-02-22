'use client';

import { useState } from 'react';
import { registerBarcode } from '@/actions/products';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export function RegisterBarcodeForm({ productId }: { productId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-ghost text-xs w-full">
        + Register Barcode
      </button>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      formData.set('productId', productId);
      await registerBarcode(formData);
      toast.success('Barcode registered!');
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error('Failed', { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="text-xs font-semibold text-gray-600">Register New Barcode</div>
      <div>
        <input
          name="barcodeValue"
          className="input text-sm"
          placeholder="Scan or type barcode value"
          required
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-gray-500">Unit Type</label>
          <select name="unitType" className="input text-sm" required>
            <option value="BOX">BOX</option>
            <option value="PACK">PACK</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-gray-500">Format</label>
          <select name="barcodeFormat" className="input text-sm">
            <option value="UPC_A">UPC-A</option>
            <option value="EAN_13">EAN-13</option>
            <option value="QR_CODE">QR Code</option>
            <option value="CODE_128">Code 128</option>
          </select>
        </div>
      </div>
      <div>
        <input name="label" className="input text-sm" placeholder="Label (e.g. Pack UPC)" />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost text-xs flex-1">
          Cancel
        </button>
        <button type="submit" disabled={submitting} className="btn-primary text-xs flex-1">
          {submitting ? 'Saving...' : 'Register'}
        </button>
      </div>
    </form>
  );
}
