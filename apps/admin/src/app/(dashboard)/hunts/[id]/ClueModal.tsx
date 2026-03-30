// Clue (Stop) create / edit / delete modal.
// Supports multi-content clues, unlock types (GPS / Password / Photo), and hidden location pins.

'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { clientFetch } from '@/lib/api';
import ImageUpload from '@/components/ui/ImageUpload';
import type { AdminClue, PaginatedData, SponsorDetail } from '@treasure-hunt/shared';

// MapPinPicker requires browser — dynamic import to avoid SSR
const MapPinPicker = dynamic(() => import('@/components/MapPinPicker'), { ssr: false });

interface SponsorOption {
  id: string;
  businessName: string;
}

interface ContentItem {
  id?: string;
  type: 'TEXT' | 'IMAGE';
  content: string;
  imageUrl: string;
  isHint: boolean;
  order: number;
}

interface AnswerItem {
  id?: string;
  answer: string;
}

interface Props {
  huntId: string;
  clue: AdminClue | null;
  lat: number;
  lng: number;
  clueOrder?: number; // position in hunt (1-based) — determines if locationHidden toggle is shown
  onClose: () => void;
  onSaved: (clue: AdminClue) => void;
  onDeleted: (clueId: string) => void;
}

const inputCls =
  'w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white ' +
  'placeholder:text-text-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent ' +
  'transition-colors';

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[11px] uppercase tracking-wider text-text-muted font-medium mb-1">
      {children}
      {required && <span className="text-accent ml-1">*</span>}
    </label>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-semibold text-white mb-3">{children}</p>;
}

export function ClueModal({ huntId, clue, lat, lng, clueOrder = 1, onClose, onSaved, onDeleted }: Props) {
  const isEdit = clue !== null;

  // --- Location state ---
  const [pinLat, setPinLat] = useState<number | null>(clue?.latitude ?? lat);
  const [pinLng, setPinLng] = useState<number | null>(clue?.longitude ?? lng);
  const [radius, setRadius] = useState(String(clue?.proximityRadiusMeters ?? 50));
  const [locationHidden, setLocationHidden] = useState(
    (clue as AdminClue & { locationHidden?: boolean })?.locationHidden ?? false,
  );

  // --- Content state ---
  const existingContents = (clue as AdminClue & { contents?: ContentItem[] })?.contents;
  const [contents, setContents] = useState<ContentItem[]>(
    existingContents?.length
      ? existingContents.map((c) => ({ ...c, content: c.content ?? '', imageUrl: c.imageUrl ?? '' }))
      : [{ type: 'TEXT', content: '', imageUrl: '', isHint: false, order: 0 }],
  );

  // --- Unlock state ---
  type UnlockType = 'GPS_PROXIMITY' | 'PASSWORD' | 'PHOTO';
  const existingUnlock = (clue as AdminClue & { unlockType?: UnlockType })?.unlockType;
  const [unlockType, setUnlockType] = useState<UnlockType>(existingUnlock ?? 'GPS_PROXIMITY');
  const existingAnswers = (clue as AdminClue & { answers?: AnswerItem[] })?.answers;
  const [answers, setAnswers] = useState<AnswerItem[]>(existingAnswers ?? []);

  // --- Other fields ---
  const [title, setTitle] = useState(clue?.title ?? '');
  const [points, setPoints] = useState(String(clue?.points ?? 10));
  const [isBonus, setIsBonus] = useState(clue?.isBonus ?? false);
  const [unlockMessage, setUnlockMessage] = useState(clue?.unlockMessage ?? '');
  const [sponsorId, setSponsorId] = useState(clue?.sponsorId ?? '');
  const [sponsors, setSponsors] = useState<SponsorOption[]>([]);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch active sponsors for dropdown
  useEffect(() => {
    void clientFetch<PaginatedData<SponsorDetail>>('/api/v1/admin/sponsors?status=active&pageSize=100')
      .then((data) => setSponsors(data.items.map((s) => ({ id: s.id, businessName: s.businessName }))))
      .catch(() => {});
  }, []);

  // Sync pin if parent updates coordinates (map re-click while modal open)
  useEffect(() => {
    if (!isEdit) { setPinLat(lat); setPinLng(lng); }
  }, [lat, lng, isEdit]);

  // --- Content helpers ---
  const updateContent = (i: number, field: keyof ContentItem, value: unknown) =>
    setContents((prev) => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  const removeContent = (i: number) =>
    setContents((prev) => prev.filter((_, idx) => idx !== i));
  const addClue = () =>
    setContents((prev) => [...prev, { type: 'TEXT', content: '', imageUrl: '', isHint: false, order: prev.length }]);
  const addHint = () =>
    setContents((prev) => [...prev, { type: 'TEXT', content: '', imageUrl: '', isHint: true, order: prev.length }]);
  const moveContent = (i: number, dir: -1 | 1) => {
    const next = i + dir;
    if (next < 0 || next >= contents.length) return;
    setContents((prev) => {
      const arr = [...prev];
      [arr[i], arr[next]] = [arr[next]!, arr[i]!];
      return arr.map((c, idx) => ({ ...c, order: idx }));
    });
  };

  // --- Answer helpers ---
  const updateAnswer = (i: number, val: string) =>
    setAnswers((prev) => prev.map((a, idx) => idx === i ? { ...a, answer: val } : a));
  const removeAnswer = (i: number) =>
    setAnswers((prev) => prev.filter((_, idx) => idx !== i));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) { setError('Title is required'); return; }
    if (pinLat === null || pinLng === null) { setError('Please click the map to set a location'); return; }
    if (unlockType === 'PASSWORD' && answers.length === 0) {
      setError('Add at least one accepted answer for password unlock'); return;
    }

    const payload: Record<string, unknown> = {
      title: title.trim(),
      latitude: pinLat,
      longitude: pinLng,
      proximityRadiusMeters: parseInt(radius, 10) || 50,
      points: parseInt(points, 10) || 10,
      isBonus,
      unlockType,
      locationHidden,
      contents: contents.map((c, i) => ({
        ...(c.id ? { id: c.id } : {}),
        type: c.type,
        content: c.content.trim() || null,
        imageUrl: c.imageUrl.trim() || null,
        isHint: c.isHint,
        order: i,
      })),
      answers: unlockType === 'PASSWORD'
        ? answers.filter((a) => a.answer.trim()).map((a) => ({ ...(a.id ? { id: a.id } : {}), answer: a.answer.trim() }))
        : [],
      sponsorId: sponsorId || null,
    };

    if (unlockMessage.trim()) payload.unlockMessage = unlockMessage.trim();

    // Keep legacy fields populated for backwards compat
    const firstText = contents.find((c) => c.type === 'TEXT' && !c.isHint);
    const firstImage = contents.find((c) => c.type === 'IMAGE' && !c.isHint);
    if (firstText) payload.description = firstText.content;
    if (firstImage) payload.imageUrl = firstImage.imageUrl;

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
    try {
      setDeleting(true);
      await clientFetch(`/api/v1/admin/hunts/${huntId}/clues/${clue.id}`, { method: 'DELETE' });
      onDeleted(clue.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete clue');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-sidebar border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-sidebar z-10">
          <h2 className="text-base font-semibold text-white">{isEdit ? 'Edit Stop' : 'Add Stop'}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-white transition-colors p-1">
            <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">
          {error && (
            <div className="px-3 py-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <Label required>Stop Title</Label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              className={inputCls} placeholder="e.g. The Old Bridge" maxLength={200} />
          </div>

          {/* Section 1 — Location */}
          <div className="space-y-3">
            <SectionTitle>Location</SectionTitle>
            <MapPinPicker
              lat={pinLat}
              lng={pinLng}
              onChange={(lat, lng) => { setPinLat(lat); setPinLng(lng); }}
              height={240}
            />
            <div className="w-40">
              <Label>Arrival Radius (m)</Label>
              <input type="number" min="5" max="5000" value={radius}
                onChange={(e) => setRadius(e.target.value)} className={inputCls} placeholder="50" />
            </div>
            {clueOrder > 1 && (
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input type="checkbox" checked={locationHidden}
                  onChange={(e) => setLocationHidden(e.target.checked)}
                  className="w-4 h-4 rounded accent-amber-400" />
                <span className="text-sm text-text-muted">Hide pin until previous stop is completed</span>
              </label>
            )}
          </div>

          {/* Section 2 — Clues & Hints */}
          <div className="space-y-3">
            <SectionTitle>Clues & Hints</SectionTitle>
            {contents.map((item, i) => (
              <div key={i} className="bg-surface-2 border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Type toggle */}
                  {(['TEXT', 'IMAGE'] as const).map((t) => (
                    <button key={t} type="button" onClick={() => updateContent(i, 'type', t)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        item.type === t ? 'bg-accent text-black' : 'bg-surface text-text-muted hover:text-white'
                      }`}
                    >{t}</button>
                  ))}
                  {/* Hint toggle */}
                  <button type="button" onClick={() => updateContent(i, 'isHint', !item.isHint)}
                    className={`ml-auto px-3 py-1 rounded text-xs font-medium transition-colors ${
                      item.isHint
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-surface text-text-muted hover:text-white'
                    }`}
                  >{item.isHint ? 'Hidden Hint' : 'Shown Upfront'}</button>
                  {/* Reorder */}
                  <button type="button" onClick={() => moveContent(i, -1)} disabled={i === 0}
                    className="text-text-faint hover:text-white disabled:opacity-30 px-1 text-xs">↑</button>
                  <button type="button" onClick={() => moveContent(i, 1)} disabled={i === contents.length - 1}
                    className="text-text-faint hover:text-white disabled:opacity-30 px-1 text-xs">↓</button>
                  {/* Delete */}
                  {contents.length > 1 && (
                    <button type="button" onClick={() => removeContent(i)}
                      className="text-red-400 hover:text-red-300 px-1 text-xs">✕</button>
                  )}
                </div>
                {item.type === 'TEXT' ? (
                  <textarea value={item.content} onChange={(e) => updateContent(i, 'content', e.target.value)}
                    placeholder={item.isHint ? 'Enter hint text…' : 'Enter clue text or riddle…'}
                    rows={3}
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-text-faint focus:outline-none focus:border-accent resize-none" />
                ) : (
                  <ImageUpload folder="clues" value={item.imageUrl}
                    onChange={(url) => updateContent(i, 'imageUrl', url)} />
                )}
              </div>
            ))}
            <div className="flex gap-2">
              <button type="button" onClick={addClue}
                className="flex-1 py-2 border border-dashed border-border rounded-lg text-xs text-text-muted hover:border-accent hover:text-accent transition-colors">
                + Add Clue
              </button>
              <button type="button" onClick={addHint}
                className="flex-1 py-2 border border-dashed border-amber-500/30 rounded-lg text-xs text-amber-500/70 hover:border-amber-500 hover:text-amber-400 transition-colors">
                + Add Hint
              </button>
            </div>
          </div>

          {/* Section 3 — Unlock Method */}
          <div className="space-y-3">
            <SectionTitle>Unlock Method</SectionTitle>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'GPS_PROXIMITY' as const, label: '📍 Arrive' },
                { value: 'PASSWORD' as const, label: '🔑 Password' },
                { value: 'PHOTO' as const, label: '📸 Photo' },
              ]).map((opt) => (
                <button key={opt.value} type="button" onClick={() => setUnlockType(opt.value)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    unlockType === opt.value
                      ? 'bg-accent text-black'
                      : 'bg-surface-2 text-text-muted border border-border hover:border-accent/50'
                  }`}
                >{opt.label}</button>
              ))}
            </div>
            {unlockType === 'PASSWORD' && (
              <div className="space-y-2">
                <p className="text-xs text-text-muted">Accepted answers (case-insensitive)</p>
                {answers.map((a, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={a.answer} onChange={(e) => updateAnswer(i, e.target.value)}
                      placeholder="e.g. clocktower"
                      className="flex-1 bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent" />
                    <button type="button" onClick={() => removeAnswer(i)}
                      className="text-red-400 hover:text-red-300 px-2">✕</button>
                  </div>
                ))}
                <button type="button"
                  onClick={() => setAnswers((a) => [...a, { answer: '' }])}
                  className="w-full py-2 border border-dashed border-border rounded-lg text-xs text-text-muted hover:border-accent hover:text-accent transition-colors">
                  + Add Answer
                </button>
                <p className="text-xs text-text-faint">
                  Players within 2 letters of an answer see &ldquo;Almost! Check your spelling&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* Section 4 — Points & extras */}
          <div className="space-y-3">
            <SectionTitle>Points & Details</SectionTitle>
            <div className="flex items-end gap-4">
              <div className="w-28">
                <Label>Points</Label>
                <input type="number" min="0" value={points}
                  onChange={(e) => setPoints(e.target.value)} className={inputCls} placeholder="10" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer mb-0.5 select-none">
                <input type="checkbox" checked={isBonus} onChange={(e) => setIsBonus(e.target.checked)}
                  className="w-4 h-4 rounded accent-amber-400" />
                <span className="text-sm text-text-muted">Bonus stop</span>
              </label>
            </div>
            <div>
              <Label>Unlock Message</Label>
              <input type="text" value={unlockMessage} onChange={(e) => setUnlockMessage(e.target.value)}
                className={inputCls} placeholder="Shown to players when they unlock this stop" />
            </div>
            <div>
              <Label>Sponsor</Label>
              <select value={sponsorId} onChange={(e) => setSponsorId(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent transition-colors cursor-pointer">
                <option value="" className="bg-surface">No sponsor</option>
                {sponsors.map((s) => (
                  <option key={s.id} value={s.id} className="bg-surface">{s.businessName}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Action row */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-3">
              <button type="submit" disabled={loading}
                className="bg-accent hover:bg-accent-hover text-black font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Stop'}
              </button>
              <button type="button" onClick={onClose}
                className="text-sm text-text-muted hover:text-white transition-colors">
                Cancel
              </button>
            </div>
            {isEdit && (
              <button type="button" onClick={handleDelete} disabled={deleting}
                className="text-sm text-red-400 hover:text-red-300 transition-colors disabled:opacity-50">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
