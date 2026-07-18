import {
  AVATAR_DISPLAY_SIZE,
  AVATAR_MAX_BASE64_CHARS,
  AVATAR_MAX_FILE_BYTES,
  AVATAR_MIME_TYPES,
  type AvatarMimeType,
} from "@shared/profile";

export type PreparedAvatar = {
  contentType: AvatarMimeType;
  dataBase64: string;
  dataUrl: string;
  byteLength: number;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read image file"));
    };
    reader.onerror = () => reject(new Error("Could not read image file"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Invalid or corrupted image"));
    image.src = src;
  });
}

function canvasToJpegDataUrl(canvas: HTMLCanvasElement, quality: number): string {
  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * Validate and compress a user-selected image for use as a profile picture.
 * Resizes to a square crop (center) at AVATAR_DISPLAY_SIZE and encodes as JPEG.
 */
export async function prepareAvatarFile(file: File): Promise<PreparedAvatar> {
  if (!file) throw new Error("No file selected");
  if (!AVATAR_MIME_TYPES.includes(file.type as AvatarMimeType)) {
    throw new Error("Use a JPEG, PNG, or WebP image");
  }
  if (file.size > AVATAR_MAX_FILE_BYTES) {
    throw new Error("Image must be 2 MB or smaller");
  }

  const originalDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(originalDataUrl);

  if (image.naturalWidth < 48 || image.naturalHeight < 48) {
    throw new Error("Image is too small (minimum 48×48)");
  }
  if (image.naturalWidth > 8000 || image.naturalHeight > 8000) {
    throw new Error("Image dimensions are too large");
  }

  const side = Math.min(image.naturalWidth, image.naturalHeight);
  const sx = Math.floor((image.naturalWidth - side) / 2);
  const sy = Math.floor((image.naturalHeight - side) / 2);
  const size = Math.min(AVATAR_DISPLAY_SIZE, side);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process image");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, sx, sy, side, side, 0, 0, size, size);

  // Step quality down until under payload limit
  let quality = 0.88;
  let dataUrl = canvasToJpegDataUrl(canvas, quality);
  while (dataUrl.length > AVATAR_MAX_BASE64_CHARS + 30 && quality > 0.45) {
    quality -= 0.08;
    dataUrl = canvasToJpegDataUrl(canvas, quality);
  }

  const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, "");
  if (base64.length > AVATAR_MAX_BASE64_CHARS) {
    throw new Error("Could not compress image enough — try a simpler photo");
  }

  // approximate binary size
  const byteLength = Math.floor((base64.length * 3) / 4);

  return {
    contentType: "image/jpeg",
    dataBase64: base64,
    dataUrl: `data:image/jpeg;base64,${base64}`,
    byteLength,
  };
}
