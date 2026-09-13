'use client';

import React, { useState, useRef } from 'react';
import { Camera, X, Check, Loader2, AlertCircle, AlertTriangle } from 'lucide-react';

interface PhotoUploadProps {
  currentPhotoUrl?: string;
  onPhotoUploaded: (url: string) => void;
  onUploadingChange?: (isUploading: boolean) => void;
  disabled?: boolean;
  label?: string;
  sublabel?: string;
}

export default function PhotoUpload({
  currentPhotoUrl,
  onPhotoUploaded,
  onUploadingChange,
  disabled = false,
  label,
  sublabel,
}: PhotoUploadProps) {
  const [tempPreview, setTempPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [sessionUploadedUrl, setSessionUploadedUrl] = useState<string | null>(null);
  const [sessionDeleteToken, setSessionDeleteToken] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bersihkan preview lokal & status upload saat currentPhotoUrl berubah dari luar
  const [prevPhotoUrl, setPrevPhotoUrl] = useState(currentPhotoUrl);
  if (prevPhotoUrl !== currentPhotoUrl) {
    setPrevPhotoUrl(currentPhotoUrl);
    setTempPreview(null);
    setSessionUploadedUrl(null);
    setSessionDeleteToken(null);
    setValidationError(null);
    setValidationWarning(null);
  }

  const displayUrl = tempPreview || currentPhotoUrl || '';

  const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB limit

  const proceedUpload = async (file: File) => {
    try {
      setIsUploading(true);
      onUploadingChange?.(true);
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
        setTempPreview(null);
        setValidationError(null);
        onPhotoUploaded(data.photoUrl);
      } else {
        setTempPreview(null);
        const errorMsg = data.error || 'Gagal mengunggah foto ke server.';
        setValidationError(errorMsg);
        alert(`⚠️ Gagal Mengunggah Foto!\n\n${errorMsg}`);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Error uploading photo:', err);
      setTempPreview(null);
      const errorMsg = 'Gagal mengunggah foto. Periksa koneksi internet Anda lalu coba lagi.';
      setValidationError(errorMsg);
      alert(`⚠️ Gangguan Koneksi!\n\n${errorMsg}`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setIsUploading(false);
      onUploadingChange?.(false);
    }
  };

  const handleFile = async (file: File) => {
    setValidationError(null);
    setValidationWarning(null);

    // 1. Validasi Ukuran File Kosong / Corrupt
    if (!file || file.size === 0) {
      const msg = 'File foto kosong atau rusak (ukuran 0 bytes). Silakan pilih file foto lain.';
      setValidationError(msg);
      alert(`⚠️ File Foto Tidak Valid!\n\n${msg}`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 2. Validasi Format / Ekstensi & MIME Type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';

    const isMimeValid = allowedMimeTypes.includes(file.type);
    const isExtValid = allowedExtensions.includes(fileExt);

    if (!isMimeValid && !isExtValid) {
      const detectedExt = fileExt ? `.${fileExt}` : file.type || 'tidak dikenal';
      const msg = `Format file "${detectedExt}" tidak didukung. Sistem hanya menerima file foto berformat JPG, JPEG, PNG, atau WebP.`;
      setValidationError(msg);
      alert(
        `⚠️ Format File Tidak Sesuai!\n\n${msg}\n\nKriteria Foto Resmi LVM:\n• Format wajib: JPG, PNG, atau WebP\n• Ukuran maksimal: 5 MB\n• Rasio yang direkomendasikan: 3:4 (tegak/potret) dengan jersey tim`
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 3. Validasi Ukuran Maksimal (5MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const actualSizeMb = (file.size / (1024 * 1024)).toFixed(2);
      const msg = `Ukuran foto terlalu besar (${actualSizeMb} MB). Batas maksimal yang diizinkan adalah 5.0 MB. Silakan perkecil resolusi atau kompres foto terlebih dahulu.`;
      setValidationError(msg);
      alert(
        `⚠️ Ukuran Foto Terlalu Besar!\n\n${msg}\n\nTips: Anda dapat memperkecil foto melalui menu edit di galeri HP atau menggunakan kompresor gambar online sebelum mengunggah.`
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 4. Baca file untuk pratinjau & validasi dimensi visual
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;

      const img = new Image();
      img.onload = () => {
        // Validasi resolusi minimal agar ID Card tidak pecah
        if (img.width < 120 || img.height < 120) {
          const msg = `Resolusi foto terlalu kecil (${img.width} x ${img.height} px). Minimal resolusi adalah 120 x 120 piksel agar kartu ID Card dan akreditasi tidak pecah saat dicetak.`;
          setValidationError(msg);
          alert(`⚠️ Resolusi Foto Terlalu Rendah!\n\n${msg}`);
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        // Peringatan foto lanskap (melebar)
        if (img.width > img.height) {
          setValidationWarning(
            'Catatan: Foto yang dipilih berorientasi lanskap (melebar). Disarankan menggunakan foto potret (tegak, rasio 3:4) agar pas dan proporsional pada kartu tanda pengenal (ID Card).'
          );
        }

        setTempPreview(dataUrl);
        proceedUpload(file);
      };

      img.onerror = () => {
        const msg = 'File yang dipilih bukan gambar yang valid atau file rusak.';
        setValidationError(msg);
        alert(`⚠️ File Gambar Rusak!\n\n${msg}`);
        if (fileInputRef.current) fileInputRef.current.value = '';
      };

      img.src = dataUrl;
    };

    reader.onerror = () => {
      const msg = 'Gagal membaca file foto dari perangkat Anda. Silakan coba kembali.';
      setValidationError(msg);
      alert(`⚠️ Gagal Membaca File!\n\n${msg}`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.readAsDataURL(file);
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
    setValidationError(null);
    setValidationWarning(null);
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
            : validationError
            ? 'border-rose-400 bg-rose-50/40 dark:bg-rose-950/20 hover:border-rose-500'
            : 'border-purple-200 dark:border-purple-900/60 bg-purple-50/30 dark:bg-[#1a0c36]/40 hover:border-pink-500 dark:hover:border-pink-500/80 hover:bg-purple-50/60 dark:hover:bg-[#1a0c36]/80'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        style={{ minHeight: '160px' }}
      >
        {displayUrl ? (
          <div className="relative w-full flex flex-col items-center">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={displayUrl}
                alt={label || 'Foto'}
                className={`w-24 h-32 object-cover rounded-xl shadow-md border-2 border-pink-500/60 transition-opacity ${
                  isUploading ? 'opacity-40' : 'opacity-100'
                }`}
              />
              {isUploading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-xl p-1">
                  <Loader2 className="w-7 h-7 text-pink-400 animate-spin mb-1" />
                  <span className="text-[10px] font-bold text-white tracking-tight">Mengunggah...</span>
                </div>
              )}
              {!disabled && !isUploading && (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="absolute top-0 right-0 p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow-md transition-all cursor-pointer"
                  title="Hapus foto"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {isUploading ? (
              <span className="text-[11px] text-amber-600 dark:text-amber-400 mt-2 font-bold flex items-center gap-1.5 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sedang mengunggah ke server...
              </span>
            ) : (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-2 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> {label ? 'Foto Terpasang' : 'Foto Jersey Terpasang'}
              </span>
            )}
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
              {label || 'Upload Photo dengan Jersey Voli'}
            </span>
            <span className="text-[11px] text-slate-400 dark:text-purple-400/60 mt-0.5">
              {sublabel || 'Format JPG / PNG (Rasio 3:4 Direkomendasikan)'}
            </span>
            <span className="text-[10px] px-2.5 py-0.5 mt-2 rounded-full font-semibold bg-purple-100/80 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50">
              Maks. 5 MB • Format JPG / PNG / WebP • Rasio 3:4
            </span>
          </div>
        )}
      </div>

      {/* Banner Peringatan Kriteria File (Inline Alert) */}
      {validationError && (
        <div className="mt-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/70 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2.5 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-rose-900 dark:text-rose-100">File Tidak Sesuai Kriteria</p>
            <p className="text-[11px] mt-0.5 leading-relaxed text-rose-700 dark:text-rose-300">{validationError}</p>
            <div className="mt-2 pt-1.5 border-t border-rose-200 dark:border-rose-900/50 text-[10px] text-rose-600 dark:text-rose-400">
              <span className="font-bold">Kriteria Foto Resmi LVM:</span>
              <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                <li>Format wajib: JPG, JPEG, PNG, atau WebP</li>
                <li>Ukuran maksimal: 5.0 MB (disarankan di bawah 2 MB)</li>
                <li>Orientasi tegak / vertikal (rasio 3:4) mengenakan jersey voli resmi</li>
              </ul>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setValidationError(null)}
            className="text-rose-400 hover:text-rose-600 dark:hover:text-rose-200 p-0.5 rounded cursor-pointer shrink-0"
            title="Tutup pesan"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Catatan Tambahan (Lanskap / Tips) */}
      {validationWarning && !validationError && (
        <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2 animate-in fade-in duration-200">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 text-[11px] leading-relaxed text-amber-900 dark:text-amber-200">
            {validationWarning}
          </div>
          <button
            type="button"
            onClick={() => setValidationWarning(null)}
            className="text-amber-400 hover:text-amber-600 dark:hover:text-amber-200 p-0.5 rounded cursor-pointer shrink-0"
            title="Tutup catatan"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
