import { NextRequest, NextResponse } from "next/server";

const BAD_WORDS = ["cartoon", "illustration", "clipart", "clip art", "vector", "drawing", "animation", "3d render", "toy"];

function isRealPhoto(tags: string) {
  const t = tags.toLowerCase();
  return !BAD_WORDS.some((w) => t.includes(w));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const id = searchParams.get("id") || "";
  const apiKey = process.env.PIXABAY_API_KEY;

  if (!apiKey || (!q && !id)) {
    return NextResponse.json({ url: null });
  }

  try {
    if (id) {
      const res = await fetch(`https://pixabay.com/api/?key=${apiKey}&id=${id}`);
      const data = await res.json();
      const hit = data?.hits?.[0];
      const url = hit?.webformatURL ?? hit?.largeImageURL ?? null;
      return NextResponse.json({ url });
    }

    const keyword = q.split(" ")[0].toLowerCase();
    const res = await fetch(
      `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(
        q
      )}&image_type=photo&safesearch=true&per_page=20&order=popular`
    );
    const data = await res.json();
    const hits = (data?.hits ?? []).filter((h: any) => isRealPhoto(h.tags || ""));

    const taggedMatch = hits.filter((h: any) =>
      (h.tags || "").toLowerCase().includes(keyword)
    );

    const best = taggedMatch[0] ?? hits[0] ?? null;
    const url = best?.webformatURL ?? best?.largeImageURL ?? null;

    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ url: null });
  }
}