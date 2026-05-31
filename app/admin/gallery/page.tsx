"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud, Image as ImageIcon, X, Trash2, Check,
  Loader2, ArrowLeft, RefreshCw, AlertTriangle, Eye, EyeOff, GripVertical, Pencil,
} from "lucide-react";

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
      <div className="flex h-screen items-center justify-center bg-[#0B0F19] text-white">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#D4FC34]" />
          <p className="mt-4 text-sm text-white/60">Verifying session credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0B0F19] text-white py-8 px-4 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/admin")}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="font-display text-2xl font-extrabold tracking-wide text-white sm:text-3xl">Gallery Manager</h1>
              <p className="text-xs text-white/50">Drag to reorder · Click pencil to edit caption · Toggle eye to hide/show on public site.</p>
            </div>
          </div>
          <button
            onClick={loadImages}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:bg-white/10"
          >
            <RefreshCw className={`h-4 w-4 ${loadingImages ? "animate-spin" : ""}`} />
          </button>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">
            <Check className="h-5 w-5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 mb-8">
          <h3 className="font-display text-base font-extrabold tracking-wide mb-3">Upload new photos</h3>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition ${
              isDragActive ? "border-[#D4FC34] bg-[#D4FC34]/5" : "border-white/15 bg-white/[0.01] hover:border-white/30"
            }`}
          >
            <input {...getInputProps()} />
            <UploadCloud className="mx-auto h-12 w-12 text-[#D4FC34] mb-3" />
            <p className="font-bold text-sm">Drag and drop images here, or click to browse</p>
            <p className="text-[10px] text-white/40 mt-1 uppercase font-semibold">JPG, PNG, WEBP · Max 5MB per file</p>
          </div>

          {previews.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                <span className="text-xs text-white/60 font-bold uppercase tracking-wider">
                  {previews.length} file(s) in queue
                </span>
                <button
                  onClick={() => setPreviews([])}
                  className="text-xs text-red-400 font-bold hover:underline"
                  disabled={uploading}
                >
                  Clear queue
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {previews.map((p, idx) => (
                  <div key={idx} className="relative flex gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <button
                      onClick={() => removePreview(idx)}
                      disabled={uploading}
                      className="absolute top-2 right-2 h-6 w-6 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <div className="relative aspect-square w-20 shrink-0 rounded-lg overflow-hidden border border-white/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.previewUrl} alt="Preview" className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0 pr-6">
                      <p className="text-[10px] font-bold text-white/40 uppercase truncate">{p.file.name}</p>
                      <p className="text-[10px] text-[#D4FC34] font-bold mt-0.5">{p.sizeStr}</p>
                      <input
                        type="text"
                        placeholder="Caption (optional)"
                        value={p.caption}
                        onChange={(e) => updatePreviewCaption(idx, e.target.value)}
                        disabled={uploading}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white placeholder-white/30 mt-2 outline-none focus:border-[#D4FC34]"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[#D4FC34] hover:bg-[#c2e82b] text-gray-900 px-4 py-3 font-bold text-sm shadow-soft transition disabled:opacity-60"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Uploading to Vercel Blob...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" /> Start uploading
                  </>
                )}
              </button>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h3 className="font-display text-base font-extrabold tracking-wide mb-4">Gallery library</h3>

          {loadingImages ? (
            <div className="py-12 text-center text-white/55">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#D4FC34] mb-2" />
              <span>Querying database records...</span>
            </div>
          ) : images.length === 0 ? (
            <div className="py-12 text-center text-white/40 border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
              <ImageIcon className="mx-auto h-10 w-10 text-white/20 mb-2" />
              <span>No photos in the gallery yet.</span>
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
                  className={`group relative rounded-xl border border-white/10 bg-[#0B0F19] overflow-hidden shadow-soft cursor-move ${
                    img.active === 0 ? "opacity-50" : ""
                  }`}
                >
                  <div className="relative aspect-[4/3] w-full bg-black/45 border-b border-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.blobUrl} alt={img.caption || ""} className="h-full w-full object-cover" />
                    <div className="absolute top-2 left-2 rounded-md bg-black/60 px-1.5 py-1 text-white/60">
                      <GripVertical className="h-3.5 w-3.5" />
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button
                        type="button"
                        onClick={() => toggleActive(img)}
                        title={img.active === 1 ? "Hide from public site" : "Show on public site"}
                        className="h-8 w-8 flex items-center justify-center rounded-xl bg-black/60 border border-white/10 hover:bg-white/15 text-white"
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
                        className="h-8 w-8 flex items-center justify-center rounded-xl bg-black/60 border border-white/10 hover:bg-white/15 text-white"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(img.id)}
                        title="Delete"
                        className="h-8 w-8 flex items-center justify-center rounded-xl bg-black/60 border border-white/10 hover:bg-red-600/90 text-white"
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
                          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-[#D4FC34]"
                        />
                        <button
                          type="button"
                          onClick={() => saveCaption(img.id)}
                          disabled={savingCaption}
                          className="h-8 w-8 flex items-center justify-center rounded-lg bg-[#D4FC34] text-gray-900 disabled:opacity-60"
                        >
                          {savingCaption ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            setEditCaption("");
                          }}
                          className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-white/80 line-clamp-2 leading-relaxed">
                        {img.caption || <span className="text-white/30 italic">No caption</span>}
                      </p>
                    )}
                    <p className="text-[9px] text-white/30 mt-2">
                      Added {new Date(img.createdAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0B0F19] p-6 text-center text-white"
            >
              <Trash2 className="mx-auto h-12 w-12 text-red-400 mb-4 animate-bounce" />
              <h4 className="font-display text-lg font-extrabold mb-2">Delete photo?</h4>
              <p className="text-xs text-white/60 mb-6">
                This permanently removes the image from Vercel Blob storage.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDeletingId(null)}
                  disabled={deleting}
                  className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-xs font-bold hover:bg-white/10 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2.5 text-xs font-bold text-white flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirm"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
