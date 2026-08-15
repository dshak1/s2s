"use client";

// Shrink a canvas data URL before it goes into the profile.
//
// Artifacts live as base64 inside the single localStorage blob, which has a
// ~5-10MB per-origin budget for everything a kid ever makes. The runner canvas
// is 720x960 and PNG (it has to be PNG — the runner is cut out on transparency,
// which WebP-from-canvas does keep but PNG is what the board produces), so one
// drawing was landing in the hundreds of kilobytes. Enough of those and
// writeToStorage() starts failing, which is the documented way a save silently
// does not stick.
//
// The runner is drawn at 72px on screen. 360px on the long edge is 5x that,
// which is plenty for retina and for the gallery tile, and cuts the stored size
// by roughly an order of magnitude.
export async function shrinkDataUrl(dataUrl: string, maxDimension = 360): Promise<string> {
  if (typeof document === "undefined") return dataUrl;
  try {
    const image = new Image();
    image.src = dataUrl;
    await image.decode();
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    if (scale === 1) return dataUrl;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return dataUrl;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    // Keep PNG: the runner's transparency is what makes it a cut-out sprite
    // rather than a white rectangle walking across the steppe.
    return canvas.toDataURL("image/png");
  } catch {
    // A shrink that fails should never lose the drawing — save the original.
    return dataUrl;
  }
}

export async function resizeImageFile(file: File, maxDimension = 1600): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image editor is unavailable.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/webp", 0.86);
}
