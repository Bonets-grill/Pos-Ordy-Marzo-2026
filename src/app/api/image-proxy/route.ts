import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTS = [
  "d2zzylcb0bgrlf.cloudfront.net",
  // Supabase storage
];

function isAllowed(url: string): boolean {
  try {
    const u = new URL(url);
    if (ALLOWED_HOSTS.includes(u.hostname)) return true;
    // allow any *.supabase.co storage URL
    if (u.hostname.endsWith(".supabase.co") || u.hostname.endsWith(".supabase.in")) return true;
    return false;
  } catch {
    return false;
  }
}

function detectContentType(buf: Uint8Array): string {
  if (buf.length >= 4) {
    // PNG: 89 50 4E 47
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
      return "image/png";
    }
    // JPEG: FF D8 FF
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
      return "image/jpeg";
    }
    // GIF: 47 49 46 38
    if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) {
      return "image/gif";
    }
    // WebP: RIFF....WEBP
    if (
      buf.length >= 12 &&
      buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
    ) {
      return "image/webp";
    }
    // AVIF / HEIF: ftyp box
    if (buf.length >= 12 && buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) {
      return "image/avif";
    }
    // SVG heuristic
    if (buf[0] === 0x3c) {
      const head = new TextDecoder().decode(buf.slice(0, 256)).toLowerCase();
      if (head.includes("<svg")) return "image/svg+xml";
    }
  }
  return "application/octet-stream";
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "missing url" }, { status: 400 });
  }
  if (!isAllowed(url)) {
    return NextResponse.json({ error: "domain not allowed" }, { status: 403 });
  }

  try {
    const upstream = await fetch(url, { next: { revalidate: 86400 } });
    if (!upstream.ok) {
      return new NextResponse(null, { status: upstream.status });
    }

    const body = await upstream.arrayBuffer();
    const bytes = new Uint8Array(body);

    // Prefer upstream content-type if it looks valid, otherwise detect from magic bytes
    let ct = upstream.headers.get("content-type") || "";
    if (!ct.startsWith("image/")) {
      ct = detectContentType(bytes);
    }

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": ct,
        "Cache-Control": "public, max-age=86400",
        "Content-Length": String(bytes.length),
      },
    });
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 502 });
  }
}
