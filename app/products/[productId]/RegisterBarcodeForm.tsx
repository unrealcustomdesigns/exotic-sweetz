'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { registerBarcode } from '@/actions/products';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

function MiniScanner({ onScan, onClose }: { onScan: (code: string) => void; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const containerId = 'barcode-register-reader';

  useEffect(() => {
    let html5QrCode: any;

    async function start() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        html5QrCode = new Html5Qrcode(containerId);

        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 140 }, aspectRatio: 1.5 },
          (decodedText: string) => {
            if (navigator.vibrate) navigator.vibrate(100);
            onScan(decodedText);
            html5QrCode.stop().catch(() => {});
          },
          () => {}
        );
      } catch (err: any) {
        setError(
          err?.message?.includes('NotAllowed')
            ? 'Camera access denied.'
            : 'Could not start camera.'
        );
      }
    }

    start();

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(() => {});
      }
    };
  }, [onScan]);

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-center">
        <p className="text-xs text-red-700">{error}</p>
        <button onClick={onClose} className="btn-ghost text-xs mt-2">Close</button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        id={containerId}
        className="rounded-xl overflow-hidden bg-black"
        style={{ minHeight: 200 }}
      />
      <div className="absolute bottom-2 left-0 right-0 text-center">
        <span className="text-[10px] text-white/80 bg-black/50 px-2 py-0.5 rounded-full">
          Point at barcode
        </span>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs"
      >
        ✕
      </button>
    </div>
  );
}

export function RegisterBarcodeForm({ productId }: { productId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [barcodeValue, setBarcodeValue] = useState('');

  const handleScan = useCallback((code: string) => {
    setBarcodeValue(code);
    setScanning(false);
    toast.success(`Scanned: ${code}`);
  }, []);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-ghost text-xs w-full">
        + Register Barcode
      </button>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setSubmitting(true);

    try {
      const formData = new FormData(form);
      formData.set('productId', productId);
      formData.set('barcodeValue', barcodeValue);
      await registerBarcode(formData);
      toast.success('Barcode registered!');
      setBarcodeValue('');
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

      {scanning && (
        <MiniScanner onScan={handleScan} onClose={() => setScanning(false)} />
      )}

      <div className="flex gap-2">
        <input
          name="barcodeValue"
          className="input text-sm flex-1"
          placeholder="Barcode value"
          required
          value={barcodeValue}
          onChange={(e) => setBarcodeValue(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setScanning(!scanning)}
          className={`btn text-sm flex-shrink-0 ${
            scanning
              ? 'bg-red-100 text-red-600 hover:bg-red-200'
              : 'bg-brand-100 text-brand-700 hover:bg-brand-200'
          }`}
        >
          {scanning ? '✕' : '📷'}
        </button>
      </div>

      {barcodeValue && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
          <span className="text-green-600 text-sm">✓</span>
          <code className="text-sm font-mono text-green-800 flex-1">{barcodeValue}</code>
          <button
            type="button"
            onClick={() => { setBarcodeValue(''); setScanning(false); }}
            className="text-xs text-green-600 hover:text-green-800"
          >
            Clear
          </button>
        </div>
      )}

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
        <button type="button" onClick={() => { setOpen(false); setBarcodeValue(''); setScanning(false); }} className="btn-ghost text-xs flex-1">
          Cancel
        </button>
        <button type="submit" disabled={submitting || !barcodeValue} className="btn-primary text-xs flex-1">
          {submitting ? 'Saving...' : 'Register'}
        </button>
      </div>
    </form>
  );
}
