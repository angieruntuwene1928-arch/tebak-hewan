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
      )}&image_type=photo&per_page=6&safesearch=true&order=popular`
    );
    const data = await res.json();
    const hits = data?.hits ?? [];
    const best = hits[0] ?? null;
    const url = best?.webformatURL ?? best?.largeImageURL ?? null;

    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ url: null });
  }
}
