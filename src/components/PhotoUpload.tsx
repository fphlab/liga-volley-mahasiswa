'use client';

import React, { useState, useRef } from 'react';
import { Camera, X, Check, Loader2 } from 'lucide-react';

interface PhotoUploadProps {
  currentPhotoUrl?: string;
  onPhotoUploaded: (url: string) => void;
  disabled?: boolean;
}

export default function PhotoUpload({ currentPhotoUrl, onPhotoUploaded, disabled = false }: PhotoUploadProps) {
  const [tempPreview, setTempPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [sessionUploadedUrl, setSessionUploadedUrl] = useState<string | null>(null);
  const [sessionDeleteToken, setSessionDeleteToken] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayUrl = tempPreview || currentPhotoUrl || '';

  const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB limit

  const handleFile = async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Hanya file gambar JPG, PNG, atau WebP yang diperbolehkan.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      alert('Ukuran foto terlalu besar. Maksimal 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setTempPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.photoUrl) {
        // Hapus file upload sebelumnya di sesi yang sama bila belum tersimpan ke DB
        if (sessionUploadedUrl && sessionUploadedUrl !== data.photoUrl) {
          fetch('/api/upload', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'x-delete-token': sessionDeleteToken || '',
            },
            body: JSON.stringify({ photoUrl: sessionUploadedUrl, deleteToken: sessionDeleteToken }),
          }).catch(() => {});
        }
        setSessionUploadedUrl(data.photoUrl);
        setSessionDeleteToken(data.deleteToken || null);
        onPhotoUploaded(data.photoUrl);
      } else {
        setTempPreview(null);
        alert(data.error || 'Gagal mengunggah foto.');
      }
    } catch (err) {
      console.error('Error uploading photo:', err);
      setTempPreview(null);
      alert('Gagal mengunggah foto. Periksa koneksi Anda lalu coba lagi.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessionUploadedUrl) {
      fetch('/api/upload', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-delete-token': sessionDeleteToken || '',
        },
        body: JSON.stringify({ photoUrl: sessionUploadedUrl, deleteToken: sessionDeleteToken }),
      }).catch(() => {});
      setSessionUploadedUrl(null);
      setSessionDeleteToken(null);
    }
    setTempPreview(null);
    onPhotoUploaded('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
          }
        }}
      />

      <div
        onClick={() => !disabled && fileInputRef.current?.click()}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative group border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
          dragActive
            ? 'border-pink-500 bg-pink-50/60 dark:bg-pink-500/10 shadow-neon-pink'
            : 'border-purple-200 dark:border-purple-900/60 bg-purple-50/30 dark:bg-[#1a0c36]/40 hover:border-pink-500 dark:hover:border-pink-500/80 hover:bg-purple-50/60 dark:hover:bg-[#1a0c36]/80'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        style={{ minHeight: '160px' }}
      >
        {displayUrl ? (
          <div className="relative w-full flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayUrl}
              alt="Foto Jersey"
              className="w-24 h-32 object-cover rounded-xl shadow-md border-2 border-pink-500/60"
            />
            {!disabled && (
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-0 right-0 p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow-md transition-all cursor-pointer"
                title="Hapus foto"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-2 font-bold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Foto Jersey Terpasang
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center py-2 text-slate-500 dark:text-purple-300/70">
            {isUploading ? (
              <Loader2 className="w-8 h-8 text-pink-500 animate-spin mb-1.5" />
            ) : (
              <div className="w-11 h-11 rounded-2xl bg-white dark:bg-[#1f0e3f] border border-purple-200 dark:border-purple-800 flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 group-hover:border-pink-500 transition-all">
                <Camera className="w-5 h-5 text-pink-600 dark:text-pink-400" />
              </div>
            )}
            <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
              Upload Photo dengan Jersey Voli
            </span>
            <span className="text-[11px] text-slate-400 dark:text-purple-400/60 mt-0.5">
              Format JPG / PNG (Rasio 3:4 Direkomendasikan)
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
