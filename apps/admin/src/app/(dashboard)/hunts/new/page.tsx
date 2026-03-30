// Hunt creation form — client component, multi-step wizard.
// Validates required fields per step client-side, then POSTs to /api/v1/admin/hunts.
// Redirects to /hunts on success.

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { clientFetch } from '@/lib/api';
import ImageUpload from '@/components/ui/ImageUpload';
import type { Hunt } from '@treasure-hunt/shared';

// MapPinPicker uses mapbox-gl which requires browser — must be dynamically imported
const MapPinPicker = dynamic(() => import('@/components/MapPinPicker'), { ssr: false });

// All number fields are stored as strings so they bind cleanly to <input>
interface FormValues {
  title: string;
  slug: string;
  description: string;
  city: string;
  region: string;
  difficulty: string;
  theme: string;
  huntType: string;
  teamMode: string;
  maxTeamSize: string;
  timeLimitMinutes: string;
  maxPlayers: string;
  startsAt: string;
  endsAt: string;
  centerLat: number | null;
  centerLng: number | null;
  zoomLevel: string;
  ticketPrice: string; // user enters dollars; converted to cents on submit
  currency: string;
  thumbnailUrl: string;
  coverImageUrl: string;
  whitelabelName: string;
  whitelabelLogoUrl: string;
  whitelabelColor: string;
  metaTitle: string;
  metaDescription: string;
  startMode: 'CLUE_FIRST' | 'LOCATION_FIRST';
}

const DEFAULTS: FormValues = {
  title: '',
  slug: '',
  description: '',
  city: '',
  region: '',
  difficulty: '',
  theme: 'general',
  huntType: 'free',
  teamMode: 'both',
  maxTeamSize: '4',
  timeLimitMinutes: '',
  maxPlayers: '',
  startsAt: '',
  endsAt: '',
  centerLat: null,
  centerLng: null,
  zoomLevel: '14',
  ticketPrice: '',
  currency: 'USD',
  thumbnailUrl: '',
  coverImageUrl: '',
  whitelabelName: '',
  whitelabelLogoUrl: '',
  whitelabelColor: '',
  metaTitle: '',
  metaDescription: '',
  startMode: 'LOCATION_FIRST',
};

// Required fields validated on Next for each step
const STEPS = [
  { label: 'Basics', fields: ['title', 'description', 'city'] as const },
  { label: 'Settings', fields: ['difficulty'] as const },
  { label: 'Schedule & Map', fields: [] as const },
  { label: 'Images', fields: [] as const },
  { label: 'SEO & White-label', fields: [] as const },
];

// Human-readable labels for required field error messages
const FIELD_LABELS: Partial<Record<keyof FormValues, string>> = {
  title: 'Title',
  description: 'Description',
  city: 'City',
  difficulty: 'Difficulty',
};

// ---- Reusable UI primitives ----

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[11px] uppercase tracking-wider text-text-muted font-medium mb-1.5">
      {children}
      {required && <span className="text-accent ml-1">*</span>}
    </label>
  );
}

const inputCls =
  'w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-white ' +
  'placeholder:text-text-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent ' +
  'transition-colors';

const selectCls =
  'w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-white ' +
  'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors cursor-pointer';

// Horizontal divider with a section title
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-4 mt-8 mb-6">
      <p className="text-[10px] uppercase tracking-widest text-text-faint font-medium whitespace-nowrap">
        {title}
      </p>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

// ---- Step indicator ----

function StepIndicator({
  current,
  total,
  labels,
}: {
  current: number;
  total: number;
  labels: string[];
}) {
  return (
    <div className="flex items-start w-full mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-start flex-1 min-w-0">
          {/* Circle + connector */}
          <div className="flex flex-col items-center flex-shrink-0">
            {/* Numbered circle */}
            <div
              className={`
                w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold
                transition-colors border-2
                ${
                  i < current
                    ? 'bg-accent border-accent text-black'
                    : i === current
                    ? 'bg-transparent border-accent text-accent'
                    : 'bg-transparent border-border text-text-faint'
                }
              `}
            >
              {i < current ? (
                // Checkmark for completed steps
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M2 6l3 3 5-5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            {/* Step label */}
            <span
              className={`mt-1.5 text-[10px] font-medium text-center leading-tight whitespace-nowrap
                ${i <= current ? 'text-text-muted' : 'text-text-faint opacity-50'}`}
            >
              {labels[i]}
            </span>
          </div>

          {/* Connecting line — shown between steps, not after the last */}
          {i < total - 1 && (
            <div
              className={`flex-1 h-px mt-4 mx-2 transition-colors ${
                i < current ? 'bg-accent' : 'bg-border'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ---- Step content components ----

function StepBasics({
  form,
  update,
}: {
  form: FormValues;
  update: (field: keyof FormValues, value: string | 'CLUE_FIRST' | 'LOCATION_FIRST') => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label required>Title</Label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            className={inputCls}
            placeholder="e.g. Tbilisi Old Town Hunt"
            maxLength={200}
          />
        </div>
        <div>
          <Label>Slug (optional)</Label>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => update('slug', e.target.value)}
            className={inputCls}
            placeholder="auto-generated from title"
          />
        </div>
      </div>

      <div>
        <Label required>Description</Label>
        <textarea
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          className={`${inputCls} resize-none`}
          rows={4}
          placeholder="Describe the hunt experience — what players will explore and discover…"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label required>City</Label>
          <input
            type="text"
            value={form.city}
            onChange={(e) => update('city', e.target.value)}
            className={inputCls}
            placeholder="Tbilisi"
            maxLength={100}
          />
        </div>
        <div>
          <Label>Region / Country</Label>
          <input
            type="text"
            value={form.region}
            onChange={(e) => update('region', e.target.value)}
            className={inputCls}
            placeholder="Georgia"
            maxLength={100}
          />
        </div>
      </div>

      {/* Hunt start mode — determines what players see first */}
      <div>
        <Label>How does the hunt start?</Label>
        <div className="grid grid-cols-2 gap-3 mt-1">
          {([
            { value: 'LOCATION_FIRST' as const, title: 'Location First', desc: 'Players see the starting pin on the map and navigate to it' },
            { value: 'CLUE_FIRST' as const, title: 'Clue First', desc: 'Players receive a clue and must figure out where to go' },
          ]).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update('startMode', opt.value)}
              className={`p-4 rounded-lg border text-left transition-colors ${
                form.startMode === opt.value
                  ? 'border-accent bg-accent/10 text-white'
                  : 'border-border bg-surface-2 text-text-muted hover:border-accent/50'
              }`}
            >
              <p className="font-medium text-sm mb-1">{opt.title}</p>
              <p className="text-xs opacity-70">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepSettings({
  form,
  update,
}: {
  form: FormValues;
  update: (field: keyof FormValues, value: string) => void;
}) {
  return (
    <div className="space-y-5">
      {/* Core selects */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <Label required>Difficulty</Label>
          <select
            value={form.difficulty}
            onChange={(e) => update('difficulty', e.target.value)}
            className={selectCls}
          >
            <option value="" disabled>Select…</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div>
          <Label>Theme</Label>
          <select
            value={form.theme}
            onChange={(e) => update('theme', e.target.value)}
            className={selectCls}
          >
            <option value="general">General</option>
            <option value="christmas">Christmas</option>
            <option value="halloween">Halloween</option>
            <option value="summer">Summer</option>
            <option value="festival">Festival</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div>
          <Label>Hunt Type</Label>
          <select
            value={form.huntType}
            onChange={(e) => update('huntType', e.target.value)}
            className={selectCls}
          >
            <option value="free">Free</option>
            <option value="paid">Paid</option>
          </select>
        </div>
        <div>
          <Label>Team Mode</Label>
          <select
            value={form.teamMode}
            onChange={(e) => update('teamMode', e.target.value)}
            className={selectCls}
          >
            <option value="solo">Solo</option>
            <option value="team">Team</option>
            <option value="both">Both</option>
          </select>
        </div>
      </div>

      {/* Ticket pricing — shown only when huntType = paid */}
      {form.huntType === 'paid' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Ticket Price ($)</Label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.ticketPrice}
              onChange={(e) => update('ticketPrice', e.target.value)}
              className={inputCls}
              placeholder="9.99"
            />
          </div>
          <div>
            <Label>Currency</Label>
            <input
              type="text"
              value={form.currency}
              onChange={(e) => update('currency', e.target.value.toUpperCase())}
              className={inputCls}
              placeholder="USD"
              maxLength={3}
            />
          </div>
        </div>
      )}

      {/* Limits */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>
            Max Team Size
            {form.teamMode === 'solo' && (
              <span className="ml-1 normal-case tracking-normal opacity-50">(solo)</span>
            )}
          </Label>
          <input
            type="number"
            min="2"
            max="10"
            value={form.maxTeamSize}
            onChange={(e) => update('maxTeamSize', e.target.value)}
            className={`${inputCls} disabled:opacity-40 disabled:cursor-not-allowed`}
            disabled={form.teamMode === 'solo'}
            placeholder="4"
          />
        </div>
        <div>
          <Label>Time Limit (min)</Label>
          <input
            type="number"
            min="1"
            value={form.timeLimitMinutes}
            onChange={(e) => update('timeLimitMinutes', e.target.value)}
            className={inputCls}
            placeholder="No limit"
          />
        </div>
        <div>
          <Label>Max Players</Label>
          <input
            type="number"
            min="1"
            value={form.maxPlayers}
            onChange={(e) => update('maxPlayers', e.target.value)}
            className={inputCls}
            placeholder="Unlimited"
          />
        </div>
      </div>
    </div>
  );
}

function StepScheduleMap({
  form,
  update,
}: {
  form: FormValues;
  update: (field: keyof FormValues, value: string | number | null) => void;
}) {
  return (
    <div className="space-y-0">
      <SectionHeader title="Schedule" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Start Date &amp; Time</Label>
          <input
            type="datetime-local"
            value={form.startsAt}
            onChange={(e) => update('startsAt', e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <Label>End Date &amp; Time</Label>
          <input
            type="datetime-local"
            value={form.endsAt}
            onChange={(e) => update('endsAt', e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      <SectionHeader title="Map Center" />
      <p className="text-xs text-text-muted mb-4">
        Click the map to set the starting position players see when they open this hunt.
      </p>
      <MapPinPicker
        lat={form.centerLat}
        lng={form.centerLng}
        onChange={(lat, lng) => { update('centerLat', lat); update('centerLng', lng); }}
        height={320}
      />
      <div className="mt-4 w-28">
        <Label>Zoom Level</Label>
        <input
          type="number"
          min="1"
          max="22"
          value={form.zoomLevel}
          onChange={(e) => update('zoomLevel', e.target.value)}
          className={inputCls}
          placeholder="14"
        />
      </div>
    </div>
  );
}

function StepImages({
  form,
  update,
}: {
  form: FormValues;
  update: (field: keyof FormValues, value: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <ImageUpload
          folder="hunts"
          label="Thumbnail"
          value={form.thumbnailUrl}
          onChange={(url) => update('thumbnailUrl', url)}
        />
        <div className="mt-2">
          <p className="text-[10px] text-text-faint mb-1">Or paste a URL directly</p>
          <input
            type="url"
            value={form.thumbnailUrl}
            onChange={(e) => update('thumbnailUrl', e.target.value)}
            className={inputCls}
            placeholder="https://…"
          />
        </div>
      </div>
      <div>
        <ImageUpload
          folder="hunts"
          label="Cover Image"
          value={form.coverImageUrl}
          onChange={(url) => update('coverImageUrl', url)}
        />
        <div className="mt-2">
          <p className="text-[10px] text-text-faint mb-1">Or paste a URL directly</p>
          <input
            type="url"
            value={form.coverImageUrl}
            onChange={(e) => update('coverImageUrl', e.target.value)}
            className={inputCls}
            placeholder="https://…"
          />
        </div>
      </div>
    </div>
  );
}

function StepSeoWhitelabel({
  form,
  update,
}: {
  form: FormValues;
  update: (field: keyof FormValues, value: string) => void;
}) {
  return (
    <div className="space-y-0">
      <SectionHeader title="SEO" />
      <div className="space-y-4">
        <div>
          <Label>Meta Title</Label>
          <input
            type="text"
            value={form.metaTitle}
            onChange={(e) => update('metaTitle', e.target.value)}
            className={inputCls}
            placeholder="Hunt title for search engines"
            maxLength={200}
          />
        </div>
        <div>
          <Label>Meta Description</Label>
          <textarea
            value={form.metaDescription}
            onChange={(e) => update('metaDescription', e.target.value)}
            className={`${inputCls} resize-none`}
            rows={3}
            placeholder="Short description for search results…"
            maxLength={500}
          />
        </div>
      </div>

      <SectionHeader title="White-label" />
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Brand Name</Label>
            <input
              type="text"
              value={form.whitelabelName}
              onChange={(e) => update('whitelabelName', e.target.value)}
              className={inputCls}
              placeholder="City Explorer Co."
              maxLength={200}
            />
          </div>
          <div>
            <Label>Brand Color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={form.whitelabelColor || '#f59e0b'}
                onChange={(e) => update('whitelabelColor', e.target.value)}
                className="w-11 h-10 rounded-lg border border-border bg-surface-2 cursor-pointer shrink-0 p-0.5"
              />
              <input
                type="text"
                value={form.whitelabelColor}
                onChange={(e) => update('whitelabelColor', e.target.value)}
                className={inputCls}
                placeholder="#FF5500"
                maxLength={7}
              />
            </div>
          </div>
        </div>
        <div>
          <ImageUpload
            folder="hunts"
            label="Logo"
            value={form.whitelabelLogoUrl}
            onChange={(url) => update('whitelabelLogoUrl', url)}
          />
          <div className="mt-2">
            <p className="text-[10px] text-text-faint mb-1">Or paste a URL directly</p>
            <input
              type="url"
              value={form.whitelabelLogoUrl}
              onChange={(e) => update('whitelabelLogoUrl', e.target.value)}
              className={inputCls}
              placeholder="https://…"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Main page component ----

export default function NewHuntPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormValues>(DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  // Updates a single field in form state
  function update(field: keyof FormValues, value: string | number | null | 'CLUE_FIRST' | 'LOCATION_FIRST') {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Validates required fields for the current step only
  function validateStep(stepIndex: number): string | null {
    const requiredFields = STEPS[stepIndex]!.fields as readonly (keyof FormValues)[];
    for (const key of requiredFields) {
      const val = form[key];
      if (typeof val === 'string' && !val.trim()) {
        const label = FIELD_LABELS[key] ?? key;
        return `${label} is required`;
      }
    }
    // Step 0 extra checks
    if (stepIndex === 0) {
      if (form.description.trim().length < 10) return 'Description must be at least 10 characters';
      if (form.title.trim().length < 3) return 'Title must be at least 3 characters';
    }
    return null;
  }

  // Advance to next step after validating current step
  function handleNext() {
    const validationError = validateStep(step);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setStep((s) => s + 1);
  }

  // Go back one step
  function handleBack() {
    setError(null);
    setStep((s) => s - 1);
  }

  // Final submission — called only from the last step
  async function handleSubmit() {
    setError(null);

    if (form.centerLat === null || form.centerLng === null) {
      setError('Please place a pin on the map to set the starting position');
      return;
    }

    // Build payload — always include required + select fields; conditionally add optionals
    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      description: form.description.trim(),
      city: form.city.trim(),
      difficulty: form.difficulty,
      theme: form.theme,
      huntType: form.huntType,
      teamMode: form.teamMode,
      centerLat: form.centerLat,
      centerLng: form.centerLng,
      zoomLevel: parseInt(form.zoomLevel, 10) || 14,
      startMode: form.startMode,
    };

    if (form.slug.trim()) payload.slug = form.slug.trim();
    if (form.region.trim()) payload.region = form.region.trim();
    if (form.maxTeamSize.trim()) payload.maxTeamSize = parseInt(form.maxTeamSize, 10);
    if (form.timeLimitMinutes.trim()) payload.timeLimitMinutes = parseInt(form.timeLimitMinutes, 10);
    if (form.maxPlayers.trim()) payload.maxPlayers = parseInt(form.maxPlayers, 10);
    if (form.startsAt) payload.startsAt = new Date(form.startsAt).toISOString();
    if (form.endsAt) payload.endsAt = new Date(form.endsAt).toISOString();
    if (form.thumbnailUrl.trim()) payload.thumbnailUrl = form.thumbnailUrl.trim();
    if (form.coverImageUrl.trim()) payload.coverImageUrl = form.coverImageUrl.trim();

    if (form.huntType === 'paid' && form.ticketPrice.trim()) {
      payload.ticketPriceCents = Math.round(parseFloat(form.ticketPrice) * 100);
      payload.currency = form.currency.trim() || 'USD';
    }

    if (form.whitelabelName.trim()) payload.whitelabelName = form.whitelabelName.trim();
    if (form.whitelabelLogoUrl.trim()) payload.whitelabelLogoUrl = form.whitelabelLogoUrl.trim();
    if (form.whitelabelColor) payload.whitelabelColor = form.whitelabelColor;
    if (form.metaTitle.trim()) payload.metaTitle = form.metaTitle.trim();
    if (form.metaDescription.trim()) payload.metaDescription = form.metaDescription.trim();

    try {
      setLoading(true);
      await clientFetch<Hunt>('/api/v1/admin/hunts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      router.refresh(); // invalidate server component cache so new hunt appears
      router.push('/hunts');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create hunt');
    } finally {
      setLoading(false);
    }
  }

  const isLastStep = step === STEPS.length - 1;

  return (
    <div className="p-8 max-w-3xl">

      {/* Breadcrumb + header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-text-muted mb-3">
          <Link href="/hunts" className="hover:text-white transition-colors">
            Hunts
          </Link>
          <span>/</span>
          <span className="text-white">New Hunt</span>
        </div>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Create Hunt</h1>
        <p className="text-sm text-text-muted mt-1">
          New hunts start as drafts — publish when ready
        </p>
      </div>

      {/* Step indicator */}
      <StepIndicator
        current={step}
        total={STEPS.length}
        labels={STEPS.map((s) => s.label)}
      />

      {/* Current step title */}
      <h2 className="text-base font-semibold text-white mb-6">
        {STEPS[step]!.label}
      </h2>

      {/* Error banner */}
      {error && (
        <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Step content */}
      <div>
        {step === 0 && <StepBasics form={form} update={update} />}
        {step === 1 && <StepSettings form={form} update={update} />}
        {step === 2 && <StepScheduleMap form={form} update={update} />}
        {step === 3 && <StepImages form={form} update={update} />}
        {step === 4 && <StepSeoWhitelabel form={form} update={update} />}
      </div>

      {/* Navigation bar */}
      <div className="flex items-center gap-4 mt-10 pt-8 border-t border-border">
        {isLastStep ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="
              bg-accent hover:bg-accent-hover text-black font-semibold text-sm
              px-8 py-3 rounded-lg transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {loading ? 'Creating…' : 'Create Hunt'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            className="
              bg-accent hover:bg-accent-hover text-black font-semibold text-sm
              px-8 py-3 rounded-lg transition-colors
            "
          >
            Next →
          </button>
        )}

        {step > 0 && (
          <button
            type="button"
            onClick={handleBack}
            className="text-sm text-text-muted hover:text-white transition-colors"
          >
            ← Back
          </button>
        )}

        {step === 0 && (
          <Link
            href="/hunts"
            className="text-sm text-text-muted hover:text-white transition-colors"
          >
            Cancel
          </Link>
        )}
      </div>
    </div>
  );
}
