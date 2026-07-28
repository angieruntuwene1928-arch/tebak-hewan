import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  if (!q) return NextResponse.json({ url: null });

  try {
    const searchRes = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&list=search&srnamespace=6&srlimit=8&format=json&srsearch=${encodeURIComponent(
        q + " sound call"
      )}`
    );
    const searchData = await searchRes.json();
    const results = searchData?.query?.search ?? [];
    const audioResult = results.find((r: any) => /\.(ogg|mp3|wav)$/i.test(r.title));
    if (!audioResult) return NextResponse.json({ url: null });

    const infoRes = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(
        audioResult.title
      )}&prop=imageinfo&iiprop=url&format=json`
    );
    const infoData = await infoRes.json();
    const pages = infoData?.query?.pages ?? {};
    const page: any = Object.values(pages)[0];
    const url = page?.imageinfo?.[0]?.url ?? null;

    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ url: null });
  }
}
