import "server-only";

import dns from "node:dns";
import net, { BlockList, type LookupFunction } from "node:net";

import sharp from "sharp";
import { Agent, fetch } from "undici";

// Downloads an image from an arbitrary URL chosen in the browser. Because the URL is
// user-controlled, every step guards against SSRF (reaching internal services through
// our server): private/loopback/link-local addresses are blocked at connection time,
// redirects are followed manually and re-checked, and size and time are capped.

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 10_000;
const MAX_DIMENSION = 1600;
// Formats we decode; notably excludes SVG (scriptable, and sharp would rasterize it).
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "gif", "heif"]);

export class RemoteImageError extends Error {}

const blockedRanges = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16], // includes the cloud metadata endpoint 169.254.169.254
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blockedRanges.addSubnet(address, prefix, "ipv4");
}
for (const [address, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["64:ff9b::", 96], // NAT64
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  blockedRanges.addSubnet(address, prefix, "ipv6");
}

// "::ffff:127.0.0.1" or "::ffff:7f00:1" -> "127.0.0.1". (Not done with a ::ffff:0:0/96
// BlockList rule: BlockList also matches plain IPv4 against it, which would block everything.)
function mappedIPv4(address: string) {
  const match = address.toLowerCase().match(/^::ffff:(?:(\d+\.\d+\.\d+\.\d+)|([0-9a-f]{1,4}):([0-9a-f]{1,4}))$/);
  if (!match) return null;
  if (match[1]) return match[1];
  const high = parseInt(match[2], 16);
  const low = parseInt(match[3], 16);
  return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
}

function isBlockedAddress(address: string): boolean {
  const family = net.isIP(address);
  if (family === 0) return true;
  if (family === 6) {
    const ipv4 = mappedIPv4(address);
    if (ipv4) return isBlockedAddress(ipv4);
  }
  return blockedRanges.check(address, family === 4 ? "ipv4" : "ipv6");
}

// Validates the addresses a hostname resolves to at the moment of connecting, so a DNS
// answer can't change between our check and the connection (DNS rebinding).
const safeLookup: LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error, "", 0);
    if (addresses.length === 0 || addresses.some((a) => isBlockedAddress(a.address))) {
      return callback(new RemoteImageError(`Blocked address for ${hostname}`), "", 0);
    }
    if (options.all) {
      (callback as unknown as (err: null, all: dns.LookupAddress[]) => void)(null, addresses);
    } else {
      callback(null, addresses[0].address, addresses[0].family);
    }
  });
};

const agent = new Agent({ connect: { lookup: safeLookup } });

function assertFetchable(url: URL) {
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new RemoteImageError("Only http(s) URLs are allowed");
  }
  if (url.username || url.password) throw new RemoteImageError("Credentials in URLs are not allowed");
  if (url.port && url.port !== "80" && url.port !== "443") {
    throw new RemoteImageError("Non-standard ports are not allowed");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  // IP literals skip DNS lookup entirely, so check them here.
  if (net.isIP(host) && isBlockedAddress(host)) throw new RemoteImageError("Blocked address");
  if (host === "localhost" || /\.(localhost|local|internal)$/.test(host)) {
    throw new RemoteImageError("Blocked host");
  }
}

async function readLimited(body: AsyncIterable<Uint8Array>, declaredLength: string | null) {
  if (declaredLength && Number(declaredLength) > MAX_BYTES) {
    throw new RemoteImageError("Image is too large");
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  for await (const chunk of body) {
    total += chunk.byteLength;
    if (total > MAX_BYTES) throw new RemoteImageError("Image is too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// Fetches the image and re-encodes it as WebP (max 1600px, EXIF rotation applied),
// matching what the browser upload path produces.
export async function fetchRemoteImage(rawUrl: string): Promise<{ data: Buffer; mediaType: "image/webp" }> {
  let url = new URL(rawUrl);
  const signal = AbortSignal.timeout(TIMEOUT_MS);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    assertFetchable(url);
    const response = await fetch(url, {
      dispatcher: agent,
      redirect: "manual",
      signal,
      headers: {
        accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8",
        "user-agent": "Mozilla/5.0 (compatible; FitCheckAI/1.0)",
      },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) throw new RemoteImageError("Redirect without a location");
      url = new URL(location, url);
      continue;
    }
    if (!response.ok || !response.body) {
      await response.body?.cancel();
      throw new RemoteImageError(`Image request failed (${response.status})`);
    }

    const bytes = await readLimited(response.body, response.headers.get("content-length"));
    const image = sharp(bytes, { limitInputPixels: 40_000_000 });
    const { format } = await image.metadata().catch(() => ({ format: undefined }));
    if (!format || !ALLOWED_FORMATS.has(format)) {
      throw new RemoteImageError("That link isn't a supported image");
    }

    const data = await image
      .rotate()
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 90 })
      .toBuffer();
    return { data, mediaType: "image/webp" };
  }

  throw new RemoteImageError("Too many redirects");
}
