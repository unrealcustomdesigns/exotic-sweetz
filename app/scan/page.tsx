'use client';

import { useState, useCallback } from 'react';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { lookupBarcode, getLocationsByType } from '@/actions/products';
import { transferInventory, receiveInventory, convertBoxToPacks, recordSale } from '@/actions/movements';
import { ACTION_LABELS, getActionsForUnit } from '@/lib/validation';
import { toast } from 'sonner';

type ScanResult = Awaited<ReturnType<typeof lookupBarcode>>;
type LocationOption = Awaited<ReturnType<typeof getLocationsByType>>[number];

type Step = 'scanning' | 'identified' | 'action' | 'details' | 'confirm' | 'success';

export default function ScanPage() {
  const [step, setStep] = useState<Step>('scanning');
  const [scanResult, setScanResult] = useState<ScanResult>(null);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  // ── Handle barcode scan ──
  const handleScan = useCallback(async (barcode: string) => {
    setScannedBarcode(barcode);

    try {
      const result = await lookupBarcode(barcode);

      if (!result) {
        toast.error('Unknown barcode', {
          description: `"${barcode}" is not registered. Ask a manager to add it.`,
        });
        return;
      }

      setScanResult(result);
      setStep('identified');

      // Pre-load locations
      const locs = await getLocationsByType();
      setLocations(locs);
    } catch (err: any) {
      toast.error('Lookup failed', { description: err.message });
    }
  }, []);

  // ── Select action ──
  const handleSelectAction = (action: string) => {
    setSelectedAction(action);
    setQuantity(1);
    setFromLocationId('');
    setToLocationId('');
    setStep('details');
  };

  // ── Submit movement ──
  const handleSubmit = async () => {
    if (!scanResult || !selectedAction) return;
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.set('productId', scanResult.product.id);
      formData.set('barcodeScanned', scannedBarcode);

      let result: any;

      switch (selectedAction) {
        case 'RECEIVE': {
          formData.set('quantity', String(quantity));
          formData.set('toLocationId', toLocationId);
          formData.set('vendorId', ''); // TODO: vendor picker
          formData.set('costPerBox', String(scanResult.pricing?.costPerBox ?? 0));
          result = await receiveInventory(formData);
          break;
        }
        case 'CONVERT_BOX_TO_PACKS': {
          formData.set('quantity', String(quantity));
          formData.set('locationId', fromLocationId);
          result = await convertBoxToPacks(formData);
          break;
        }
        case 'SALE_RETAIL_PACK':
        case 'SALE_RETAIL_BOX': {
          const unitType = selectedAction === 'SALE_RETAIL_PACK' ? 'PACK' : 'BOX';
          const price =
            unitType === 'PACK'
              ? scanResult.pricing?.retailPricePerPack ?? 0
              : scanResult.pricing?.retailPricePerBox ?? 0;
          formData.set('unitType', unitType);
          formData.set('quantity', String(quantity));
          formData.set('fromLocationId', fromLocationId);
          formData.set('pricePerUnit', String(price));
          result = await recordSale(formData);
          break;
        }
        default: {
          // PUT_ON_SHELF, TAKE_OFF_SHELF, DELIVER_TO_STORE, RETURN_FROM_STORE
          formData.set('action', selectedAction);
          formData.set('unitType', scanResult.unitType);
          formData.set('quantity', String(quantity));
          formData.set('fromLocationId', fromLocationId);
          formData.set('toLocationId', toLocationId);

          // If delivering to store, find the store ID
          if (selectedAction === 'DELIVER_TO_STORE' || selectedAction === 'RETURN_FROM_STORE') {
            const storeLoc = locations.find((l) => l.id === (selectedAction === 'DELIVER_TO_STORE' ? toLocationId : fromLocationId));
            if (storeLoc?.storeId) formData.set('storeId', storeLoc.storeId);
          }

          result = await transferInventory(formData);
          break;
        }
      }

      setLastResult(result);
      setStep('success');
      toast.success('Movement recorded!');
    } catch (err: any) {
      toast.error('Failed', { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Reset to scan again ──
  const reset = () => {
    setStep('scanning');
    setScanResult(null);
    setScannedBarcode('');
    setSelectedAction(null);
    setFromLocationId('');
    setToLocationId('');
    setQuantity(1);
    setLastResult(null);
  };

  // ── Filter locations based on action + direction ──
  const filterLocations = (direction: 'from' | 'to') => {
    if (!selectedAction) return locations;

    const typeMap: Record<string, Record<string, string[]>> = {
      PUT_ON_SHELF: { from: ['STORAGE'], to: ['SHELF'] },
      TAKE_OFF_SHELF: { from: ['SHELF'], to: ['STORAGE', 'TRUCK'] },
      DELIVER_TO_STORE: { from: ['STORAGE', 'SHELF', 'TRUCK'], to: ['STORE'] },
      RETURN_FROM_STORE: { from: ['STORE'], to: ['STORAGE', 'TRUCK'] },
      RECEIVE: { to: ['STORAGE'] },
      CONVERT_BOX_TO_PACKS: { from: ['STORAGE', 'SHELF'] },
      SALE_RETAIL_PACK: { from: ['SHELF', 'STORAGE'] },
      SALE_RETAIL_BOX: { from: ['SHELF', 'STORAGE'] },
    };

    const allowed = typeMap[selectedAction]?.[direction];
    if (!allowed) return locations;
    return locations.filter((l) => allowed.includes(l.locationType));
  };

  // ── Needs from/to/both ──
  const needsFrom = selectedAction && !['RECEIVE'].includes(selectedAction);
  const needsTo = selectedAction && !['SALE_RETAIL_PACK', 'SALE_RETAIL_BOX', 'CONVERT_BOX_TO_PACKS'].includes(selectedAction);

  return (
    <div>
      <h1 className="page-header">📷 Scan & Move</h1>

      {/* ── Step: Scanning ── */}
      {step === 'scanning' && (
        <div>
          <BarcodeScanner onScan={handleScan} active={step === 'scanning'} />
          <p className="text-center text-xs text-gray-400 mt-3">
            Scan a product barcode to get started
          </p>
          {/* Manual entry fallback */}
          <div className="mt-4">
            <input
              type="text"
              placeholder="Or type barcode manually..."
              className="input text-center"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleScan(e.currentTarget.value);
              }}
            />
          </div>
        </div>
      )}

      {/* ── Step: Identified ── */}
      {step === 'identified' && scanResult && (
        <div>
          <div className="card mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🍬</span>
              <div>
                <div className="font-bold text-lg">{scanResult.product.name}</div>
                {scanResult.product.variant && (
                  <div className="text-sm text-gray-500">{scanResult.product.variant}</div>
                )}
                <div className="flex gap-2 mt-1">
                  <span className="inline-flex items-center rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                    {scanResult.unitType}
                  </span>
                  <span className="text-xs text-gray-400">{scanResult.product.sku}</span>
                </div>
              </div>
            </div>
          </div>

          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            What are you doing?
          </h2>

          <div className="grid grid-cols-1 gap-2">
            {getActionsForUnit(scanResult.unitType).map((action) => (
              <button
                key={action}
                onClick={() => handleSelectAction(action)}
                className="card text-left hover:border-brand-400 transition flex items-center gap-3"
              >
                <span className="text-lg">{actionIcon(action)}</span>
                <span className="font-medium text-sm">
                  {ACTION_LABELS[action]}
                </span>
              </button>
            ))}
          </div>

          <button onClick={reset} className="btn-ghost w-full mt-4">
            ← Scan Different Item
          </button>
        </div>
      )}

      {/* ── Step: Details (location + quantity pickers) ── */}
      {step === 'details' && scanResult && selectedAction && (
        <div>
          <div className="card mb-4">
            <div className="text-sm text-gray-500">{scanResult.product.name}</div>
            <div className="font-bold">
              {ACTION_LABELS[selectedAction as keyof typeof ACTION_LABELS]}
            </div>
          </div>

          <div className="space-y-4">
            {/* From location */}
            {needsFrom && (
              <div>
                <label className="label">
                  {selectedAction === 'CONVERT_BOX_TO_PACKS' ? 'Location' : 'From'}
                </label>
                <select
                  className="input"
                  value={fromLocationId}
                  onChange={(e) => setFromLocationId(e.target.value)}
                >
                  <option value="">Select location...</option>
                  {filterLocations('from').map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.locationType})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* To location */}
            {needsTo && (
              <div>
                <label className="label">To</label>
                <select
                  className="input"
                  value={toLocationId}
                  onChange={(e) => setToLocationId(e.target.value)}
                >
                  <option value="">Select destination...</option>
                  {filterLocations('to').map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                      {loc.store ? ` — ${loc.store.name}` : ` (${loc.locationType})`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="label">
                Quantity ({scanResult.unitType === 'BOX' ? 'boxes' : 'packs'})
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="btn-secondary h-10 w-10"
                >
                  −
                </button>
                <input
                  type="number"
                  className="input text-center w-20"
                  value={quantity}
                  min={1}
                  onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                />
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="btn-secondary h-10 w-10"
                >
                  +
                </button>
              </div>

              {selectedAction === 'CONVERT_BOX_TO_PACKS' && (
                <p className="text-xs text-gray-500 mt-1">
                  = {quantity * scanResult.product.packsPerBox} packs
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep('identified')} className="btn-ghost flex-1">
              ← Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={
                submitting ||
                (needsFrom && !fromLocationId) ||
                (needsTo && !toLocationId)
              }
              className="btn-primary flex-1"
            >
              {submitting ? 'Saving...' : 'Confirm'}
            </button>
          </div>
        </div>
      )}

      {/* ── Step: Success ── */}
      {step === 'success' && (
        <div className="text-center py-8">
          <div className="text-5xl mb-3">✅</div>
          <h2 className="text-lg font-bold mb-1">Movement Recorded!</h2>
          <p className="text-sm text-gray-500 mb-6">
            {scanResult?.product.name} — {quantity}{' '}
            {scanResult?.unitType === 'BOX' ? 'box(es)' : 'pack(s)'}
          </p>

          {lastResult?.packsCreated && (
            <p className="text-sm text-brand-600 font-medium mb-4">
              Created {lastResult.packsCreated} packs
            </p>
          )}

          <button onClick={reset} className="btn-primary w-full">
            📷 Scan Another
          </button>
        </div>
      )}
    </div>
  );
}

function actionIcon(action: string): string {
  const icons: Record<string, string> = {
    PUT_ON_SHELF: '📥',
    TAKE_OFF_SHELF: '📤',
    DELIVER_TO_STORE: '🚚',
    RETURN_FROM_STORE: '↩️',
    CONVERT_BOX_TO_PACKS: '🔄',
    SALE_RETAIL_PACK: '💰',
    SALE_RETAIL_BOX: '💰',
    RECEIVE: '📦',
    ADJUSTMENT: '⚙️',
  };
  return icons[action] || '📋';
}
