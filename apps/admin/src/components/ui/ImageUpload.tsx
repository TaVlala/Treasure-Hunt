// Reusable image upload component — uploads file to R2 via presigned URL, returns public URL.
// Supports click-to-upload and drag & drop. Shows thumbnail preview when a URL is set.

'use client';

import { useRef, useState } from 'react';
import { clientFetch } from '@/lib/api';

interface ImageUploadProps {
  folder: 'clues' | 'sponsors' | 'hunts' | 'avatars';
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export default function ImageUpload({ folder, value, onChange, label }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Uploads file to R2 via presigned URL and calls onChange with the public URL
  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('File must be under 10MB'); return; }
    setError('');
    setLoading(true);
    try {
      const { uploadUrl, publicUrl } = await clientFetch<{ uploadUrl: string; publicUrl: string }>(
        '/api/v1/upload/presigned',
        { method: 'POST', body: JSON.stringify({ folder, mimeType: file.type }) },
      );
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      onChange(publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider">{label}</p>
      )}

      {value ? (
        // Preview with remove button
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Preview" className="h-20 w-auto max-w-xs rounded-lg border border-border object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full text-white text-xs flex items-center justify-center transition-colors"
          >
            ×
          </button>
        </div>
      ) : (
        // Drop zone
        <div
          onClick={() => !loading && inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) void handleFile(f);
          }}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center transition-colors
            ${loading ? 'opacity-50 cursor-not-allowed border-border' : 'cursor-pointer border-border hover:border-accent'}
          `}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2 text-text-muted text-sm">
              <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              Uploading…
            </div>
          ) : (
            <>
              <p className="text-sm text-text-muted">Click to upload or drag & drop</p>
              <p className="text-xs text-text-faint mt-1">PNG, JPG, WEBP · Max 10MB</p>
            </>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
      />
    </div>
  );
}
