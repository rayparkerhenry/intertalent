import fs from 'fs';
import path from 'path';

const MAX_BYTES = 5 * 1024 * 1024;
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

const EXT_TO_MIMES: Record<string, readonly string[]> = {
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.webp': ['image/webp'],
};

export class FileValidationError extends Error {
  constructor(
    public readonly statusCode: 413 | 415,
    public readonly code: 'FILE_TOO_LARGE' | 'UNSUPPORTED_FILE_TYPE'
  ) {
    super(code);
    this.name = 'FileValidationError';
  }
}

function extractExtension(filename: string): string {
  const match = filename.toLowerCase().match(/(\.[a-z0-9]+)$/);
  return match ? match[1] : '';
}

function sanitizeBaseSegment(fileNameWithoutExt: string): string {
  let segment = fileNameWithoutExt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
  segment = segment.replace(/-+/g, '-');
  segment = segment.replace(/^-+|-+$/g, '');
  return segment.length > 0 ? segment : 'file';
}

/**
 * Saves an uploaded image to /public/uploads and returns the public URL path (e.g. /api/uploads/name-123.png).
 */
export async function saveUploadedImage(file: File): Promise<string> {
  if (file.size > MAX_BYTES) {
    throw new FileValidationError(413, 'FILE_TOO_LARGE');
  }

  const ext = extractExtension(file.name);
  const allowedMimes = EXT_TO_MIMES[ext];
  if (!allowedMimes) {
    throw new FileValidationError(415, 'UNSUPPORTED_FILE_TYPE');
  }
  if (!file.type || !allowedMimes.includes(file.type)) {
    throw new FileValidationError(415, 'UNSUPPORTED_FILE_TYPE');
  }

  const parsed = path.parse(file.name);
  const baseSanitized = sanitizeBaseSegment(parsed.name);
  const timestamp = Date.now();
  const finalName = `${baseSanitized}-${timestamp}${ext}`;

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const outPath = path.join(UPLOAD_DIR, finalName);
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(outPath, buffer);

  return `/api/uploads/${finalName}`;
}

/**
 * Best-effort delete of a file under /public from a stored public path like /api/uploads/file.png or /uploads/file.png.
 * Does not throw; logs a warning if the file is missing or deletion fails.
 */
export function safeUnlinkPublicUpload(publicPath: string | null | undefined): void {
  if (publicPath === null || publicPath === undefined) return;
  const trimmed = publicPath.trim();
  if (trimmed === '') return;
  let relativeFromPublic: string;
  if (trimmed.startsWith('/api/uploads/')) {
    relativeFromPublic = path.join(
      'uploads',
      trimmed.slice('/api/uploads/'.length)
    );
  } else if (trimmed.startsWith('/uploads/')) {
    relativeFromPublic = trimmed.replace(/^\//, '');
  } else {
    console.warn('safeUnlinkPublicUpload: skipped non-upload path', trimmed);
    return;
  }
  const fullPath = path.join(process.cwd(), 'public', relativeFromPublic);
  try {
    fs.unlinkSync(fullPath);
  } catch (err) {
    console.warn(
      'safeUnlinkPublicUpload: could not delete file',
      fullPath,
      err
    );
  }
}
