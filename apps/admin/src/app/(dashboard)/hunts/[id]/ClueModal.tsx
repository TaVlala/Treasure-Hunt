// Clue create / edit / delete modal.
// In create mode (clue=null) it POSTs a new clue; in edit mode it PATCHes.
// Lat/lng are pre-filled from the map click but remain editable.

'use client';

import { useState, useEffect } from 'react';
import { clientFetch } from '@/lib/api';
import type { AdminClue } from '@treasure-hunt/shared';

interface Props {
  huntId: string;
  /** null = create mode; AdminClue = edit mode */
  clue: AdminClue | null;
  /** Pre-filled coordinates from the map click */
  lat: number;
  lng: number;
  onClose: () => void;
  onSaved: (clue: AdminClue) => void;
  onDeleted: (clueId: string) => void;
}

// Clue types with human-readable labels
const CLUE_TYPES = [
  { value: 'text_riddle', label: 'Text Riddle' },
  { value: 'image', label: 'Image' },
  { value: 'gps_proximity', label: 'GPS Proximity' },
  { value: 'qr_code', label: 'QR Code' },
  { value: 'photo_challenge', label: 'Photo Challenge' },
] as const;

interface FormValues {
  title: string;
  clueType: string;
  description: string;
  answer: string;
  hintText: string;
  lat: string;
  lng: string;
  proximityRadiusMeters: string;
  points: string;
  isBonus: boolean;
  imageUrl: string;
  unlockMessage: string;
}

const inputCls =
  'w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white ' +
  'placeholder:text-text-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent ' +
  'transition-colors';

const selectCls =
  'w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white ' +
  'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors cursor-pointer';

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[11px] uppercase tracking-wider text-text-muted font-medium mb-1">
      {children}
      {required && <span className="text-accent ml-1">*</span>}
    </label>
  );
}

export function ClueModal({ huntId, clue, lat, lng, onClose, onSaved, onDeleted }: Props) {
  const isEdit = clue !== null;

  // Initialise form from existing clue or from map-click coordinates
  const [form, setForm] = useState<FormValues>({
    title: clue?.title ?? '',
    clueType: clue?.clueType ?? 'text_riddle',
    description: clue?.description ?? '',
    answer: clue?.answer ?? '',
    hintText: clue?.hintText ?? '',
    lat: String(clue?.latitude ?? lat),
    lng: String(clue?.longitude ?? lng),
    proximityRadiusMeters: String(clue?.proximityRadiusMeters ?? 50),
    points: String(clue?.points ?? 10),
    isBonus: clue?.isBonus ?? false,
    imageUrl: clue?.imageUrl ?? '',
    unlockMessage: clue?.unlockMessage ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync lat/lng if parent updates the coordinates (e.g. map re-click while modal is open)
  useEffect(() => {
    if (!isEdit) {
      setForm((prev) => ({ ...prev, lat: String(lat), lng: String(lng) }));
    }
  }, [lat, lng, isEdit]);

  function update(field: keyof FormValues, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Shows answer field for riddles and QR codes; image field for image types
  const showAnswer = form.clueType === 'text_riddle' || form.clueType === 'qr_code';
  const showImage = form.clueType === 'image' || form.clueType === 'photo_challenge';
  const showRadius = form.clueType === 'gps_proximity';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.title.trim()) { setError('Title is required'); return; }
    if (!form.description.trim()) { setError('Description is required'); return; }

    const latNum = parseFloat(form.lat);
    const lngNum = parseFloat(form.lng);
    if (isNaN(latNum) || isNaN(lngNum)) { setError('Valid coordinates are required'); return; }

    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      clueType: form.clueType,
      description: form.description.trim(),
      latitude: latNum,
      longitude: lngNum,
      points: parseInt(form.points, 10) || 10,
      isBonus: form.isBonus,
      proximityRadiusMeters: parseInt(form.proximityRadiusMeters, 10) || 50,
    };

    if (form.answer.trim()) payload.answer = form.answer.trim();
    if (form.hintText.trim()) payload.hintText = form.hintText.trim();
    if (form.imageUrl.trim()) payload.imageUrl = form.imageUrl.trim();
    if (form.unlockMessage.trim()) payload.unlockMessage = form.unlockMessage.trim();

    try {
      setLoading(true);
      const url = isEdit
        ? `/api/v1/admin/hunts/${huntId}/clues/${clue.id}`
        : `/api/v1/admin/hunts/${huntId}/clues`;

      const saved = await clientFetch<AdminClue>(url, {
        method: isEdit ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save clue');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!isEdit) return;
    setError(null);
    try {
      setDeleting(true);
      await clientFetch(`/api/v1/admin/hunts/${huntId}/clues/${clue.id}`, {
        method: 'DELETE',
      });
      onDeleted(clue.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete clue');
    } finally {
      setDeleting(false);
    }
  }

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal panel */}
      <div
        className="relative bg-sidebar border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-sidebar z-10">
          <h2 className="text-base font-semibold text-white">
            {isEdit ? 'Edit Clue' : 'Add Clue'}
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-white transition-colors p-1"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* Error */}
          {error && (
            <div className="px-3 py-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Title + Type row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <Label required>Title</Label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                className={inputCls}
                placeholder="e.g. The Old Bridge"
                maxLength={200}
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label required>Clue Type</Label>
              <select
                value={form.clueType}
                onChange={(e) => update('clueType', e.target.value)}
                className={selectCls}
              >
                {CLUE_TYPES.map(({ value, label }) => (
                  <option key={value} value={value} className="bg-surface">
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label required>Description / Riddle</Label>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              className={`${inputCls} resize-none`}
              rows={3}
              placeholder="Describe the clue or write the riddle players must solve…"
            />
          </div>

          {/* Answer — only for riddles and QR */}
          {showAnswer && (
            <div>
              <Label>Answer</Label>
              <input
                type="text"
                value={form.answer}
                onChange={(e) => update('answer', e.target.value)}
                className={inputCls}
                placeholder="The correct answer players must submit"
              />
            </div>
          )}

          {/* Image URL — for image/photo types */}
          {showImage && (
            <div>
              <Label>Image URL</Label>
              <input
                type="url"
                value={form.imageUrl}
                onChange={(e) => update('imageUrl', e.target.value)}
                className={inputCls}
                placeholder="https://…"
              />
            </div>
          )}

          {/* Hint */}
          <div>
            <Label>Hint (optional)</Label>
            <input
              type="text"
              value={form.hintText}
              onChange={(e) => update('hintText', e.target.value)}
              className={inputCls}
              placeholder="A nudge shown when players ask for help"
            />
          </div>

          {/* Coordinates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label required>Latitude</Label>
              <input
                type="number"
                step="any"
                value={form.lat}
                onChange={(e) => update('lat', e.target.value)}
                className={inputCls}
                placeholder="41.6938"
              />
            </div>
            <div>
              <Label required>Longitude</Label>
              <input
                type="number"
                step="any"
                value={form.lng}
                onChange={(e) => update('lng', e.target.value)}
                className={inputCls}
                placeholder="44.8015"
              />
            </div>
          </div>

          {/* Proximity radius — GPS only */}
          {showRadius && (
            <div>
              <Label>Proximity Radius (metres)</Label>
              <input
                type="number"
                min="5"
                max="5000"
                value={form.proximityRadiusMeters}
                onChange={(e) => update('proximityRadiusMeters', e.target.value)}
                className={inputCls}
                placeholder="50"
              />
            </div>
          )}

          {/* Points + bonus row */}
          <div className="flex items-end gap-4">
            <div className="w-28">
              <Label>Points</Label>
              <input
                type="number"
                min="0"
                value={form.points}
                onChange={(e) => update('points', e.target.value)}
                className={inputCls}
                placeholder="10"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer mb-0.5 select-none">
              <input
                type="checkbox"
                checked={form.isBonus}
                onChange={(e) => update('isBonus', e.target.checked)}
                className="w-4 h-4 rounded accent-amber-400"
              />
              <span className="text-sm text-text-muted">Bonus clue</span>
            </label>
          </div>

          {/* Unlock message */}
          <div>
            <Label>Unlock Message</Label>
            <input
              type="text"
              value={form.unlockMessage}
              onChange={(e) => update('unlockMessage', e.target.value)}
              className={inputCls}
              placeholder="Shown to players when they unlock this clue"
            />
          </div>

          {/* Action row */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="
                  bg-accent hover:bg-accent-hover text-black font-semibold text-sm
                  px-6 py-2.5 rounded-lg transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Clue'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="text-sm text-text-muted hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>

            {/* Delete — edit mode only */}
            {isEdit && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="
                  text-sm text-red-400 hover:text-red-300 transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
