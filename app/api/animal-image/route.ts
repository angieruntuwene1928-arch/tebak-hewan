import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const apiKey = process.env.PIXABAY_API_KEY;

  if (!apiKey || !q) {
    return NextResponse.json({ url: null });
  }

  try {
    const res = await fetch(
      `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(
        q
      )}&per_page=10&safesearch=true&image_type=photo`
    );
    const data = await res.json();
    const hits = data?.hits ?? [];

    // Prefer images that are reasonably sized
    const goodHit =
      hits.find((h: any) => h.webformatWidth >= 300) ?? hits[0];

    const url = goodHit?.webformatURL ?? null;

    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ url: null });
  }
}
