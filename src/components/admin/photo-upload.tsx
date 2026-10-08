"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { storageUrl } from "@/lib/supabase/env";
import { browserClient } from "@/lib/supabase/browser";
import { Icon } from "./icons";

// Menu photos: the browser crops the picked image to a centred square,
// scales it to 1200 px and uploads it to the "menu" bucket. The form then
// saves the path (the hidden input), so nothing changes until Save.

const SIZE = 1200;

async function squareImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = Math.min(SIZE, side);
  canvas
    .getContext("2d")!
    .drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      canvas.width,
      canvas.height,
    );
  bitmap.close();
  const encode = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
  // Older Safari can't write WebP and quietly returns PNG: use JPEG there.
  const webp = await encode("image/webp");
  if (webp?.type === "image/webp") return webp;
  const jpeg = await encode("image/jpeg");
  if (!jpeg) throw new Error("This photo couldn’t be read.");
  return jpeg;
}

type Props = {
  /** The hidden input's name: the form saves the stored path. */
  name: string;
  /** The stored path now (a bundled file name or an upload), and how to show it. */
  path: string | null;
  src: string | null;
  /** Folder in the bucket, e.g. "items". */
  folder: string;
  label?: string;
};

export function PhotoUpload({ name, path: initialPath, src: initialSrc, folder, label }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [path, setPath] = useState(initialPath);
  const [src, setSrc] = useState(initialSrc);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const blob = await squareImage(file);
      const ext = blob.type === "image/webp" ? "webp" : "jpg";
      const newPath = `${folder}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await browserClient()
        .storage.from("menu")
        .upload(newPath, blob, { contentType: blob.type, cacheControl: "31536000" });
      if (uploadError) throw uploadError;
      setPath(newPath);
      setSrc(storageUrl("menu", newPath));
    } catch {
      setError("The photo didn’t upload. Try a JPEG or PNG under 20 MB.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      {label && <span className="label">{label}</span>}
      <div className="flex items-center gap-4">
        <div className="relative size-28 flex-none overflow-hidden rounded-[12px] bg-cotton-candy">
          {src ? (
            <Image src={src} alt="" fill sizes="112px" className="object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-[12px] text-muted">
              No photo
            </span>
          )}
          {busy && (
            <span className="absolute inset-0 flex items-center justify-center bg-surface/70 text-[12px] font-semibold">
              Uploading…
            </span>
          )}
        </div>
        <div className="flex flex-col items-start gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="btn btn-secondary btn-sm"
          >
            <Icon name="upload" className="size-4" />
            {src ? "Replace photo" : "Upload a photo"}
          </button>
          {src && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setPath(null);
                setSrc(null);
              }}
              className="btn btn-ghost btn-sm text-bad"
            >
              Remove photo
            </button>
          )}
          <p className="hint mt-0">Cropped to a square from the centre.</p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/avif"
        hidden
        onChange={(e) => void pick(e.target.files?.[0])}
      />
      <input type="hidden" name={name} value={path ?? ""} />
      {error && <p className="mt-2 text-[13px] text-bad">{error}</p>}
    </div>
  );
}
