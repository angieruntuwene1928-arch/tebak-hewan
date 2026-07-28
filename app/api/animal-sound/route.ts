import { NextRequest, NextResponse } from "next/server";

const fallbackAnimalSounds: Record<string, string> = {
  cat: "https://upload.wikimedia.org/wikipedia/commons/0/0c/Meow_domestic_cat.ogg",
  kucing: "https://upload.wikimedia.org/wikipedia/commons/0/0c/Meow_domestic_cat.ogg",
  dog: "https://upload.wikimedia.org/wikipedia/commons/6/66/Perro_ladrando.ogg",
  anjing: "https://upload.wikimedia.org/wikipedia/commons/6/66/Perro_ladrando.ogg",
  horse: "https://upload.wikimedia.org/wikipedia/commons/d/db/Wiehern.ogg",
  kuda: "https://upload.wikimedia.org/wikipedia/commons/d/db/Wiehern.ogg",
  elephant: "https://upload.wikimedia.org/wikipedia/commons/4/40/Elephant_voice_-_trumpeting.ogg",
  gajah: "https://upload.wikimedia.org/wikipedia/commons/4/40/Elephant_voice_-_trumpeting.ogg",
  singa: "https://upload.wikimedia.org/wikipedia/commons/d/d2/Lion_roar_-_01_-_SoundBible.com.ogg",
  lion: "https://upload.wikimedia.org/wikipedia/commons/d/d2/Lion_roar_-_01_-_SoundBible.com.ogg",
  cow: "https://upload.wikimedia.org/wikipedia/commons/e/ee/Cow_female_sound.ogg",
  sapi: "https://upload.wikimedia.org/wikipedia/commons/e/ee/Cow_female_sound.ogg",
  duck: "https://upload.wikimedia.org/wikipedia/commons/2/22/Anas_acuta%27s_quack.ogg",
  bebek: "https://upload.wikimedia.org/wikipedia/commons/2/22/Anas_acuta%27s_quack.ogg",
  tiger: "https://upload.wikimedia.org/wikipedia/commons/0/04/Tiger_Roar.ogg",
  harimau: "https://upload.wikimedia.org/wikipedia/commons/0/04/Tiger_Roar.ogg",
  monkey: "https://upload.wikimedia.org/wikipedia/commons/9/9d/Monkey_calls_0.ogg",
  monyet: "https://upload.wikimedia.org/wikipedia/commons/9/9d/Monkey_calls_0.ogg",
  sheep: "https://upload.wikimedia.org/wikipedia/commons/2/2c/Domestic_sheep_0.ogg",
  domba: "https://upload.wikimedia.org/wikipedia/commons/2/2c/Domestic_sheep_0.ogg",
  goat: "https://upload.wikimedia.org/wikipedia/commons/6/6c/Goat_bleating.ogg",
  kambing: "https://upload.wikimedia.org/wikipedia/commons/6/6c/Goat_bleating.ogg",
  chicken: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Domestic_Rooster_%28Gallus_gallus_domesticus%29_2.ogg",
  ayam: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Domestic_Rooster_%28Gallus_gallus_domesticus%29_2.ogg",
};

async function resolveAudioUrl(searchTerm: string): Promise<string | null> {
  const searchQueries = [
    `${searchTerm} call`,
    `${searchTerm} sound short`,
    `${searchTerm} roar`,
    `${searchTerm} bark`,
    `${searchTerm} cry`,
    `${searchTerm} meow`,
    `${searchTerm} moo`,
    `${searchTerm} quack`,
    `${searchTerm} chirp`,
    `${searchTerm} audio`,
    `${searchTerm} vocalization`,
    searchTerm,
  ];

  for (const query of searchQueries) {
    try {
      const searchRes = await fetch(
        `https://commons.wikimedia.org/w/api.php?action=query&list=search&srnamespace=6&srlimit=40&format=json&srsearch=${encodeURIComponent(query)}`
      );
      const searchData = await searchRes.json();
      const results = searchData?.query?.search ?? [];
      const audioResults = results.filter((r: any) => /\.(ogg|mp3|wav|oga|opus|webm)$/i.test(r.title));

      const shortClips: any[] = [];

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

          if (!url) continue;

          // Only accept clips up to 7 seconds
          if (!duration || (duration >= 0.5 && duration <= 7)) {
            shortClips.push({ url, duration });
          }
        } catch {
          // Continue to next result
        }
      }

      if (shortClips.length > 0) {
        return shortClips[0].url;
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
