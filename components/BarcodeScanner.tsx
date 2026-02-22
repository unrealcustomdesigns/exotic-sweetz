'use client';

import { useEffect, useRef, useState } from 'react';

type ScannerProps = {
  onScan: (barcode: string) => void;
  active?: boolean;
};

export function BarcodeScanner({ onScan, active = true }: ScannerProps) {
  const scannerRef = useRef<any>(null);
  const lastScanRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;

    let html5QrCode: any;

    async function startScanner() {
      try {
        // Dynamic import to avoid SSR issues
        const { Html5Qrcode } = await import('html5-qrcode');

        html5QrCode = new Html5Qrcode('barcode-reader');
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 280, height: 160 },
            aspectRatio: 1.5,
          },
          (decodedText: string) => {
            // Debounce: ignore same barcode within 3 seconds
            const now = Date.now();
            if (
              decodedText === lastScanRef.current &&
              now - lastScanTimeRef.current < 3000
            ) {
              return;
            }
            lastScanRef.current = decodedText;
            lastScanTimeRef.current = now;

            // Vibrate for feedback
            if (navigator.vibrate) navigator.vibrate(100);

            onScan(decodedText);
          },
          () => {
            // Ignore continuous "not found" errors
          }
        );
      } catch (err: any) {
        console.error('Scanner error:', err);
        setError(
          err?.message?.includes('NotAllowed')
            ? 'Camera access denied. Please allow camera permissions.'
            : 'Could not start camera. Try refreshing.'
        );
      }
    }

    startScanner();

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(() => {});
      }
    };
  }, [active, onScan]);

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-center">
        <p className="text-sm text-red-700">{error}</p>
        <button
          onClick={() => {
            setError(null);
            window.location.reload();
          }}
          className="btn-secondary mt-3 text-xs"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        id="barcode-reader"
        className="rounded-xl overflow-hidden bg-black"
        style={{ minHeight: 280 }}
      />
      <div className="absolute bottom-3 left-0 right-0 text-center">
        <span className="text-xs text-white/80 bg-black/50 px-3 py-1 rounded-full">
          Point camera at barcode
        </span>
      </div>
    </div>
  );
}
