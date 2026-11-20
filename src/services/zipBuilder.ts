export interface UploadedAsset {
  path: string;
  dataUrl: string;
  name: string;
  size: number;
  mimeType: string;
}

export type UploadedAssetFile = UploadedAsset;

export interface StaticFileInput {
  filename: string;
  content: string;
}

// Precompute standard IEEE 802.3 CRC-32 lookup table
const CRC32_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) !== 0 ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC32_TABLE[i] = c >>> 0;
}

/**
 * Computes the standard CRC-32 checksum for a Uint8Array buffer.
 */
export function computeCrc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const KNOWN_ASSET_SUBDIRS = new Set([
  'images',
  'favicons',
  'css',
  'files',
  'newsletters',
  'sponsors',
  'leaders',
  'outreach',
  'resources',
  'robots',
  'uploads'
]);

/**
 * Normalizes a file or folder relative path into a clean ZIP entry path
 * using forward slashes, no leading slash, and ensuring asset subdirectories
 * live under `assets/...` when uploaded from a local `assets/` directory.
 */
export function normalizeZipPath(rawPath: string): string {
  let cleaned = String(rawPath ?? '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^([a-zA-Z]:)?\/+/, '')
    .replace(/^(\.\/)+/, '');

  // Collapse duplicate slashes
  cleaned = cleaned.replace(/\/+/g, '/');

  // If the path came from a full URL like https://mvrt.com/assets/images/foo.png, extract from assets/
  const assetsMatch = cleaned.match(/(?:^|\/)(assets\/.+)$/i);
  if (assetsMatch) {
    return assetsMatch[1];
  }

  // If uploaded via webkitdirectory from inside `assets` (e.g. `images/home-page-slides/im1.webp`)
  const firstSegment = cleaned.split('/')[0]?.toLowerCase() ?? '';
  if (KNOWN_ASSET_SUBDIRS.has(firstSegment)) {
    return `assets/${cleaned}`;
  }

  return cleaned || 'unnamed-file';
}

/**
 * Decodes a base64 or URI-encoded data URL (or raw string) into a Uint8Array.
 */
export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const trimmed = String(dataUrl ?? '').trim();

  if (trimmed.startsWith('data:')) {
    const commaIdx = trimmed.indexOf(',');
    if (commaIdx === -1) {
      return new Uint8Array(0);
    }
    const header = trimmed.slice(0, commaIdx).toLowerCase();
    const payload = trimmed.slice(commaIdx + 1);

    if (header.includes(';base64')) {
      const cleanBase64 = payload.replace(/\s+/g, '');
      if (typeof atob === 'function') {
        const binaryStr = atob(cleanBase64);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i) & 0xff;
        }
        return bytes;
      }
    } else {
      const decodedText = decodeURIComponent(payload);
      return new TextEncoder().encode(decodedText);
    }
  }

  return new TextEncoder().encode(trimmed);
}

/**
 * Helper to read a browser File into an UploadedAsset record.
 */
export function fileToUploadedAsset(file: File, explicitTargetPath?: string): Promise<UploadedAsset> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const rawRelPath =
      explicitTargetPath ||
      (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
      `assets/uploads/${file.name}`;
    const normalizedPath = normalizeZipPath(rawRelPath);

    reader.onload = () => {
      resolve({
        path: normalizedPath,
        dataUrl: typeof reader.result === 'string' ? reader.result : '',
        name: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream'
      });
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error(`Failed to read file: ${file.name}`));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Resolves an image/PDF URL against the user's uploaded local assets for live previewing.
 */
export function resolveUploadedAssetUrl(url: string, uploadedAssets?: UploadedAsset[]): string {
  if (!url || !uploadedAssets || uploadedAssets.length === 0) {
    return url;
  }
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  const normalizedTarget = normalizeZipPath(url).toLowerCase();
  const matched = uploadedAssets.find((asset) => {
    const normalizedAsset = normalizeZipPath(asset.path).toLowerCase();
    return (
      normalizedAsset === normalizedTarget ||
      normalizedTarget.endsWith(`/${normalizedAsset}`) ||
      normalizedAsset.endsWith(`/${normalizedTarget}`)
    );
  });
  return matched ? matched.dataUrl : url;
}

interface ZipEntryRecord {
  path: string;
  nameBytes: Uint8Array;
  dataBytes: Uint8Array;
  crc32: number;
  dosTime: number;
  dosDate: number;
}

function getDosDateTime(date = new Date()): { dosTime: number; dosDate: number } {
  const year = Math.max(1980, date.getFullYear());
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  const dosTime = ((hours & 0x1f) << 11) | ((minutes & 0x3f) << 5) | ((seconds >> 1) & 0x1f);
  const dosDate = (((year - 1980) & 0x7f) << 9) | ((month & 0x0f) << 5) | (day & 0x1f);

  return { dosTime, dosDate };
}

/**
 * Builds a standard PKZIP archive bytes buffer (Uint8Array) containing all static files
 * and any uploaded local assets.
 */
export function buildMvrtSiteZipBytes(
  staticFiles: Array<{ filename: string; content: string }>,
  uploadedAssets: UploadedAsset[] = []
): Uint8Array {
  const encoder = new TextEncoder();
  const { dosTime, dosDate } = getDosDateTime();
  const entryMap = new Map<string, ZipEntryRecord>();

  // 1. Add generated text files (HTML, CSS, JSON, README)
  for (const file of staticFiles) {
    if (!file || !file.filename) continue;
    const normalizedPath = normalizeZipPath(file.filename);
    const nameBytes = encoder.encode(normalizedPath);
    const dataBytes = encoder.encode(file.content ?? '');
    const crc = computeCrc32(dataBytes);

    entryMap.set(normalizedPath, {
      path: normalizedPath,
      nameBytes,
      dataBytes,
      crc32: crc,
      dosTime,
      dosDate
    });
  }

  // 2. Add binary/local uploaded asset files (e.g. images, PDFs, favicons from assets/)
  for (const asset of uploadedAssets) {
    if (!asset || !asset.path || !asset.dataUrl) continue;
    const normalizedPath = normalizeZipPath(asset.path);
    const nameBytes = encoder.encode(normalizedPath);
    const dataBytes = dataUrlToUint8Array(asset.dataUrl);
    const crc = computeCrc32(dataBytes);

    entryMap.set(normalizedPath, {
      path: normalizedPath,
      nameBytes,
      dataBytes,
      crc32: crc,
      dosTime,
      dosDate
    });
  }

  const entries = Array.from(entryMap.values());

  // Calculate total byte size for Local File Headers + File Data + Central Directory + EOCD
  let localSectionSize = 0;
  let centralDirSize = 0;

  for (const entry of entries) {
    localSectionSize += 30 + entry.nameBytes.length + entry.dataBytes.length;
    centralDirSize += 46 + entry.nameBytes.length;
  }

  const eocdSize = 22;
  const totalSize = localSectionSize + centralDirSize + eocdSize;

  const zipBuffer = new ArrayBuffer(totalSize);
  const zipBytes = new Uint8Array(zipBuffer);
  const view = new DataView(zipBuffer);

  const localHeaderOffsets: number[] = [];
  let offset = 0;

  // Write Local File Headers + Data
  for (const entry of entries) {
    localHeaderOffsets.push(offset);

    const size = entry.dataBytes.length;
    const nameLen = entry.nameBytes.length;

    view.setUint32(offset + 0, 0x04034b50, true); // Local file header signature
    view.setUint16(offset + 4, 20, true); // Version needed to extract (2.0)
    view.setUint16(offset + 6, 0x0800, true); // General purpose bit flag (Bit 11: UTF-8 filename)
    view.setUint16(offset + 8, 0, true); // Compression method (0 = Store)
    view.setUint16(offset + 10, entry.dosTime, true); // Last mod file time
    view.setUint16(offset + 12, entry.dosDate, true); // Last mod file date
    view.setUint32(offset + 14, entry.crc32, true); // CRC-32
    view.setUint32(offset + 18, size, true); // Compressed size
    view.setUint32(offset + 22, size, true); // Uncompressed size
    view.setUint16(offset + 26, nameLen, true); // File name length
    view.setUint16(offset + 28, 0, true); // Extra field length

    zipBytes.set(entry.nameBytes, offset + 30);
    zipBytes.set(entry.dataBytes, offset + 30 + nameLen);

    offset += 30 + nameLen + size;
  }

  const centralDirOffset = offset;

  // Write Central Directory File Headers
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const localOffset = localHeaderOffsets[i];
    const size = entry.dataBytes.length;
    const nameLen = entry.nameBytes.length;

    view.setUint32(offset + 0, 0x02014b50, true); // Central file header signature
    view.setUint16(offset + 4, 20, true); // Version made by (2.0)
    view.setUint16(offset + 6, 20, true); // Version needed to extract (2.0)
    view.setUint16(offset + 8, 0x0800, true); // General purpose bit flag (Bit 11: UTF-8)
    view.setUint16(offset + 10, 0, true); // Compression method (0 = Store)
    view.setUint16(offset + 12, entry.dosTime, true); // Last mod file time
    view.setUint16(offset + 14, entry.dosDate, true); // Last mod file date
    view.setUint32(offset + 16, entry.crc32, true); // CRC-32
    view.setUint32(offset + 20, size, true); // Compressed size
    view.setUint32(offset + 24, size, true); // Uncompressed size
    view.setUint16(offset + 28, nameLen, true); // File name length
    view.setUint16(offset + 30, 0, true); // Extra field length
    view.setUint16(offset + 32, 0, true); // File comment length
    view.setUint16(offset + 34, 0, true); // Disk number start
    view.setUint16(offset + 36, 0, true); // Internal file attributes
    view.setUint32(offset + 38, 0, true); // External file attributes
    view.setUint32(offset + 42, localOffset, true); // Relative offset of local header

    zipBytes.set(entry.nameBytes, offset + 46);
    offset += 46 + nameLen;
  }

  // Write End of Central Directory Record (EOCD)
  view.setUint32(offset + 0, 0x06054b50, true); // EOCD signature
  view.setUint16(offset + 4, 0, true); // Number of this disk
  view.setUint16(offset + 6, 0, true); // Disk where central directory starts
  view.setUint16(offset + 8, entries.length, true); // Number of central directory records on this disk
  view.setUint16(offset + 10, entries.length, true); // Total number of central directory records
  view.setUint32(offset + 12, centralDirSize, true); // Size of central directory (bytes)
  view.setUint32(offset + 16, centralDirOffset, true); // Offset of start of central directory
  view.setUint16(offset + 20, 0, true); // Comment length

  return zipBytes;
}

/**
 * Packages static HTML/CSS/JSON files and uploaded local binary assets into a standard
 * PKZIP Blob (`application/zip`).
 */
export async function buildMvrtSiteZip(
  staticFiles: Array<{ filename: string; content: string }>,
  uploadedAssets: UploadedAsset[] = []
): Promise<Blob> {
  const zipBytes = buildMvrtSiteZipBytes(staticFiles, uploadedAssets);
  return new Blob([zipBytes.buffer as ArrayBuffer], { type: 'application/zip' });
}

/**
 * Builds the complete MVRT website `.zip` archive and triggers a download in the browser
 * (or Electron desktop app).
 */
export async function downloadMvrtSiteZip(
  staticFiles: Array<{ filename: string; content: string }>,
  uploadedAssets: UploadedAsset[] = [],
  zipFilename = 'mvrt-website.zip'
): Promise<void> {
  const blob = await buildMvrtSiteZip(staticFiles, uploadedAssets);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = zipFilename || 'mvrt-website.zip';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
