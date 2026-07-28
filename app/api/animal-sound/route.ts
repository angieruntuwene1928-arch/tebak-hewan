import { NextRequest, NextResponse } from "next/server";

const fallbackAnimalSounds: Record<string, string> = {
  cat: "https://upload.wikimedia.org/wikipedia/commons/0/0c/Meow_domestic_cat.ogg",
  dog: "https://upload.wikimedia.org/wikipedia/commons/6/66/Perro_ladrando.ogg",
  horse: "https://upload.wikimedia.org/wikipedia/commons/d/db/Wiehern.ogg",
  elephant: "https://upload.wikimedia.org/wikipedia/commons/4/40/Elephant_voice_-_trumpeting.ogg",
  singa: "https://upload.wikimedia.org/wikipedia/commons/d/d2/Lion_roar_-_01_-_SoundBible.com.ogg",
  lion: "https://upload.wikimedia.org/wikipedia/commons/d/d2/Lion_roar_-_01_-_SoundBible.com.ogg",
};

async function resolveAudioUrl(searchTerm: string): Promise<string | null> {
  const searchQueries = [
    searchTerm,
    `${searchTerm} call sound`,
    `${searchTerm} roar`,
    `${searchTerm} bark`,
    `${searchTerm} meow`,
    `${searchTerm} neigh`,
    `${searchTerm} moo`,
    `${searchTerm} trumpet`,
    `${searchTerm} sound`,
    `${searchTerm} audio`,
  ];

  for (const query of searchQueries) {
    try {
      const searchRes = await fetch(
        `https://commons.wikimedia.org/w/api.php?action=query&list=search&srnamespace=6&srlimit=20&format=json&srsearch=${encodeURIComponent(query)}`
      );
      const searchData = await searchRes.json();
      const results = searchData?.query?.search ?? [];
      const audioResults = results.filter((r: any) => /\.(ogg|mp3|wav|oga|opus)$/i.test(r.title));

      for (const audioResult of audioResults) {
        try {
          const infoRes = await fetch(
            `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(
              audioResult.title
            )}&prop=imageinfo&iiprop=url|duration&format=json`
          );
          const infoData = await infoRes.json();
          const pages = infoData?.query?.pages ?? {};
          const page: any = Object.values(pages)[0];
          const info = page?.imageinfo?.[0];
          const url = info?.url ?? null;
          const duration = info?.duration ?? null;

          // Prefer clips under 5 seconds, but accept longer ones if nothing else found
          if (url && (!duration || duration <= 5)) {
            return url;
          }
        } catch {
          // Continue to next result
        }
      }
    } catch {
      // Try the next search term if one lookup fails.
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  if (!q) return NextResponse.json({ url: null });

  const normalizedQuery = q.trim().toLowerCase();
  const fallbackUrl = fallbackAnimalSounds[normalizedQuery];
  if (fallbackUrl) return NextResponse.json({ url: fallbackUrl });

  try {
    const resolved = await resolveAudioUrl(normalizedQuery);
    return NextResponse.json({ url: resolved });
  } catch {
    return NextResponse.json({ url: null });
  }
}
