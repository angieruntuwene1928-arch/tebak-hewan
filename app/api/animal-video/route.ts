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
      `https://pixabay.com/api/videos/?key=${apiKey}&q=${encodeURIComponent(
        q
      )}&per_page=5&safesearch=true`
    );
    const data = await res.json();
    const hits = data?.hits ?? [];

    const goodHit =
      hits.find((h: any) => h.duration >= 4 && h.duration <= 12) ?? hits[0];

    const url = goodHit?.videos?.small?.url ?? goodHit?.videos?.tiny?.url ?? null;

    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ url: null });
  }
}
