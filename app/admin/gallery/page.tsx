"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud, Image as ImageIcon, X, Trash2, Check,
  Loader2, RefreshCw, AlertTriangle, Eye, EyeOff, GripVertical, Pencil,
} from "lucide-react";
import { AdminSubHeader } from "@/components/admin/admin-sub-header";

type GalleryImage = {
  id: string;
  blobUrl: string;
  caption: string | null;
  displayOrder: number;
  active: number;
  createdAt: number;
};

type FilePreview = {
  file: File;
  previewUrl: string;
  caption: string;
  sizeStr: string;
};

export default function AdminGalleryPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<unknown | null>(null);
  const [loadingAdmin, setLoadingAdmin] = useState(true);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(true);

  const [previews, setPreviews] = useState<FilePreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [savingCaption, setSavingCaption] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const dragId = useRef<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => {
        if (data.user && data.user.role === "admin") {
          setAdmin(data.user);
          loadImages();
        } else {
          router.push("/admin/login");
        }
      })
      .catch(() => router.push("/admin/login"))
      .finally(() => setLoadingAdmin(false));
  }, [router]);

  function loadImages() {
    setLoadingImages(true);
    fetch("/api/admin/gallery")
      .then((res) => res.json())
      .then((data) => setImages(data.images ?? []))
      .catch((err) => console.error("Failed to load gallery images", err))
      .finally(() => setLoadingImages(false));
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    setSuccess(null);
    const newPreviews = acceptedFiles.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      caption: "",
      sizeStr: (file.size / (1024 * 1024)).toFixed(2) + " MB",
    }));
    setPreviews((prev) => [...prev, ...newPreviews]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxSize: 5 * 1024 * 1024,
  });

  const removePreview = (index: number) => {
    setPreviews((prev) => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[index].previewUrl);
      copy.splice(index, 1);
      return copy;
    });
  };

  const updatePreviewCaption = (index: number, text: string) => {
    setPreviews((prev) => {
      const copy = [...prev];
      copy[index].caption = text;
      return copy;
    });
  };

  const handleUpload = async () => {
    if (previews.length === 0) return;
    setUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const formData = new FormData();
      previews.forEach((p) => {
        formData.append("files", p.file);
        formData.append("captions", p.caption);
      });
      const res = await fetch("/api/admin/gallery", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to upload images");
      setSuccess(`Uploaded ${previews.length} image(s).`);
      previews.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setPreviews([]);
      loadImages();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/gallery", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deletingId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Deletion failed");
      setSuccess("Image removed.");
      setDeletingId(null);
      loadImages();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Deletion failed.");
    } finally {
      setDeleting(false);
    }
  };

  async function saveCaption(id: string) {
    setSavingCaption(true);
    try {
      const res = await fetch("/api/admin/gallery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, caption: editCaption }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Could not save caption.");
      }
      setEditingId(null);
      setEditCaption("");
      loadImages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save caption.");
    } finally {
      setSavingCaption(false);
    }
  }

  async function toggleActive(img: GalleryImage) {
    try {
      await fetch("/api/admin/gallery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: img.id, active: img.active !== 1 }),
      });
      loadImages();
    } catch (err) {
      console.error(err);
    }
  }

  function onDragStart(id: string) {
    dragId.current = id;
  }

  function onDragOver(e: React.DragEvent, overId: string) {
    e.preventDefault();
    if (!dragId.current || dragId.current === overId) return;
    setImages((prev) => {
      const fromIdx = prev.findIndex((i) => i.id === dragId.current);
      const toIdx = prev.findIndex((i) => i.id === overId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(fromIdx, 1);
      copy.splice(toIdx, 0, moved);
      return copy;
    });
  }

  async function onDragEnd() {
    if (!dragId.current) return;
    dragId.current = null;
    try {
      await fetch("/api/admin/gallery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: images.map((i) => ({ id: i.id })) }),
      });
      setSuccess("Order saved.");
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error(err);
    }
  }

  if (loadingAdmin || !admin) {
    return (
      <div className="app-surface flex min-h-screen-safe items-center justify-center bg-brand-50/30 dark:bg-ink">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand" />
          <p className="mt-4 text-sm text-ink/50 dark:text-white/60">Verifying session credentials…</p>
        </div>
      </div>
    );
  }

  return (
    <main className="app-surface min-h-screen-safe bg-brand-50/30 px-4 py-8 dark:bg-ink sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <AdminSubHeader
          title="Gallery manager"
          subtitle="Drag to reorder · click pencil to edit a caption · toggle the eye to hide/show on the public site."
          icon={<ImageIcon className="h-5 w-5 text-lime" />}
          actions={
            <button
              onClick={loadImages}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-white/20 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wide text-white transition hover:border-lime hover:text-lime"
              aria-label="Refresh gallery"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingImages ? "animate-spin" : ""}`} /> Refresh
            </button>
          }
        />

        {/* Alerts */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-3 rounded-2xl border-2 border-lime/40 bg-lime/10 p-4 text-sm font-semibold text-lime-dark">
            <Check className="h-5 w-5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Upload zone */}
        <section className="card-sport overflow-hidden p-0">
          <div className="border-b-2 border-ink/10 px-5 py-4 dark:border-white/10">
            <span className="eyebrow">Upload</span>
            <h3 className="mt-1 font-display text-base font-extrabold tracking-tight text-ink dark:text-white">Upload new photos</h3>
          </div>
          <div className="p-5">
            <div
              {...getRootProps()}
              className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition ${
                isDragActive
                  ? "border-lime bg-lime/5 dark:bg-lime/[0.07]"
                  : "border-ink/15 bg-ink/[0.01] hover:border-brand/40 dark:border-white/15 dark:bg-white/[0.01] dark:hover:border-brand-300/40"
              }`}
            >
              <input {...getInputProps()} />
              <UploadCloud className="mx-auto mb-3 h-12 w-12 text-brand" />
              <p className="text-sm font-bold text-ink dark:text-white">Drag and drop images here, or click to browse</p>
              <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/40 dark:text-white/40">
                JPG, PNG, WEBP · Max 5MB per file
              </p>
            </div>

            {previews.length > 0 && (
              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between border-b-2 border-ink/10 pb-2 dark:border-white/10">
                  <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-ink/50 dark:text-white/50">
                    {previews.length} file(s) in queue
                  </span>
                  <button
                    onClick={() => setPreviews([])}
                    className="text-xs font-bold text-red-600 hover:underline dark:text-red-400"
                    disabled={uploading}
                  >
                    Clear queue
                  </button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {previews.map((p, idx) => (
                    <div key={idx} className="relative flex gap-3 rounded-2xl border-2 border-ink/10 bg-ink/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.03]">
                      <button
                        onClick={() => removePreview(idx)}
                        disabled={uploading}
                        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                        aria-label="Remove preview"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <div className="relative aspect-square w-20 shrink-0 overflow-hidden rounded-xl border-2 border-ink/10 dark:border-white/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.previewUrl} alt="Preview" className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1 pr-6">
                        <p className="truncate text-[10px] font-bold uppercase text-ink/40 dark:text-white/40">{p.file.name}</p>
                        <p className="mt-0.5 text-[10px] font-extrabold text-brand dark:text-brand-300">{p.sizeStr}</p>
                        <input
                          type="text"
                          placeholder="Caption (optional)"
                          value={p.caption}
                          onChange={(e) => updatePreviewCaption(idx, e.target.value)}
                          disabled={uploading}
                          className="mt-2 w-full rounded-xl border-2 border-ink/10 bg-white px-2 py-1 text-xs text-ink outline-none focus:border-brand dark:border-white/10 dark:bg-[#111c38] dark:text-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="btn-primary mt-5 w-full justify-center disabled:opacity-60"
                >
                  {uploading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Uploading to Vercel Blob…</>
                  ) : (
                    <><Check className="h-4 w-4" /> Start uploading</>
                  )}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Gallery library */}
        <section className="card-sport overflow-hidden p-0">
          <div className="border-b-2 border-ink/10 px-5 py-4 dark:border-white/10">
            <span className="eyebrow">Library</span>
            <h3 className="mt-1 font-display text-base font-extrabold tracking-tight text-ink dark:text-white">Gallery library</h3>
          </div>
          <div className="p-5">
            {loadingImages ? (
              <div className="py-12 text-center text-ink/50 dark:text-white/50">
                <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-brand" />
                <span className="text-sm">Querying database records…</span>
              </div>
            ) : images.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-ink/10 py-12 text-center dark:border-white/10">
                <ImageIcon className="mx-auto mb-3 h-10 w-10 text-ink/20 dark:text-white/20" />
                <span className="text-sm text-ink/40 dark:text-white/40">No photos in the gallery yet.</span>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {images.map((img) => (
                  <div
                    key={img.id}
                    draggable
                    onDragStart={() => onDragStart(img.id)}
                    onDragOver={(e) => onDragOver(e, img.id)}
                    onDragEnd={onDragEnd}
                    className={`group relative cursor-move overflow-hidden rounded-2xl border-2 border-ink/10 bg-white dark:border-white/10 dark:bg-[#111c38] ${
                      img.active === 0 ? "opacity-50" : ""
                    }`}
                  >
                    <div className="relative aspect-[4/3] w-full border-b-2 border-ink/10 bg-ink/5 dark:border-white/10 dark:bg-black/45">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.blobUrl} alt={img.caption || ""} className="h-full w-full object-cover" />
                      <div className="absolute left-2 top-2 rounded-lg bg-black/60 p-1 text-white/70">
                        <GripVertical className="h-3.5 w-3.5" />
                      </div>
                      <div className="absolute right-2 top-2 flex gap-1">
                        <button
                          type="button"
                          onClick={() => toggleActive(img)}
                          title={img.active === 1 ? "Hide from public site" : "Show on public site"}
                          className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-white/10 bg-black/60 text-white transition hover:border-lime hover:text-lime"
                        >
                          {img.active === 1 ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(img.id);
                            setEditCaption(img.caption ?? "");
                          }}
                          title="Edit caption"
                          className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-white/10 bg-black/60 text-white transition hover:border-lime hover:text-lime"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(img.id)}
                          title="Delete"
                          className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-white/10 bg-black/60 text-white transition hover:border-red-500 hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="p-3">
                      {editingId === img.id ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editCaption}
                            onChange={(e) => setEditCaption(e.target.value)}
                            autoFocus
                            className="flex-1 rounded-xl border-2 border-ink/10 bg-white px-2 py-1 text-xs text-ink outline-none focus:border-brand dark:border-white/10 dark:bg-[#0d1426] dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => saveCaption(img.id)}
                            disabled={savingCaption}
                            className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-white disabled:opacity-60"
                          >
                            {savingCaption ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditingId(null); setEditCaption(""); }}
                            className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-ink/10 text-ink/60 dark:border-white/10 dark:text-white/60"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <p className="line-clamp-2 text-xs leading-relaxed text-ink/70 dark:text-white/70">
                          {img.caption || <span className="italic text-ink/30 dark:text-white/30">No caption</span>}
                        </p>
                      )}
                      <p className="mt-1.5 text-[9px] font-semibold uppercase tracking-wide text-ink/30 dark:text-white/30">
                        Added {new Date(img.createdAt).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Delete confirm modal */}
      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="w-full max-w-sm overflow-hidden rounded-3xl border-2 border-ink/10 bg-white p-6 text-center text-ink dark:border-white/10 dark:bg-[#0d1426] dark:text-white"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10">
                <Trash2 className="h-7 w-7 text-red-600 dark:text-red-400" />
              </div>
              <h4 className="font-display text-lg font-extrabold tracking-tight">Delete photo?</h4>
              <p className="mt-1.5 text-xs text-ink/50 dark:text-white/50">
                This permanently removes the image from Vercel Blob storage.
              </p>
              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  onClick={() => setDeletingId(null)}
                  disabled={deleting}
                  className="btn-outline flex-1 justify-center py-2.5 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-red-600 px-4 py-2.5 text-xs font-extrabold uppercase tracking-wide text-white transition hover:bg-red-700 disabled:opacity-60"
                >
                  {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirm delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
