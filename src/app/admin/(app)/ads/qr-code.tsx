"use client";

import { encode } from "uqr";
import { Icon } from "@/components/admin/icons";

// QR codes for tracking links, drawn from uqr's grid: on screen as SVG, and
// downloaded as SVG (for print shops) or PNG. Chocolate on white, with the
// four-module quiet zone scanners expect.

type Grid = { data: boolean[][]; size: number };

const grid = (value: string): Grid => encode(value, { ecc: "M", border: 4 });

/** One path for all dark modules. */
const pathOf = ({ data }: Grid) =>
  data.flatMap((row, y) => row.map((dark, x) => (dark ? `M${x} ${y}h1v1h-1z` : ""))).join("");

/** The brand's chocolate, read from its token so the file matches the site. */
const ink = () =>
  getComputedStyle(document.documentElement).getPropertyValue("--color-chocolate").trim() || "#000";

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadSvg(value: string, name: string) {
  const g = grid(value);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.size} ${g.size}" shape-rendering="crispEdges"><rect width="${g.size}" height="${g.size}" fill="#fff"/><path fill="${ink()}" d="${pathOf(g)}"/></svg>`;
  save(new Blob([svg], { type: "image/svg+xml" }), `${name}.svg`);
}

function downloadPng(value: string, name: string) {
  const g = grid(value);
  const scale = Math.max(8, Math.floor(1600 / g.size));
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = g.size * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = ink();
  g.data.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (dark) ctx.fillRect(x * scale, y * scale, scale, scale);
    }),
  );
  canvas.toBlob((blob) => blob && save(blob, `${name}.png`), "image/png");
}

export function QrCode({ value, name }: { value: string; name: string }) {
  const g = grid(value);
  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        viewBox={`0 0 ${g.size} ${g.size}`}
        shapeRendering="crispEdges"
        role="img"
        aria-label={`QR code for ${value}`}
        className="w-full max-w-[240px] rounded-[12px] border border-line text-chocolate"
      >
        <rect width={g.size} height={g.size} fill="#fff" />
        <path d={pathOf(g)} fill="currentColor" />
      </svg>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn btn-secondary btn-sm gap-1.5"
          onClick={() => downloadPng(value, name)}
        >
          <Icon name="download" className="size-4" />
          PNG
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm gap-1.5"
          onClick={() => downloadSvg(value, name)}
        >
          <Icon name="download" className="size-4" />
          SVG for print
        </button>
      </div>
    </div>
  );
}
