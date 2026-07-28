"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import confetti from "canvas-confetti";
import animalsData from "../data/data-hewan.json";

type Animal = {
  id: string;
  name: string;
  funFact: string;
  descriptions: string[];
};

const animals = animalsData.animals as Animal[];
const TOTAL_ROUNDS = 10;
const ROUND_TIME = 30;
const WRONG_FEEDBACK_DELAY = 1800;
const NARRATION_DELAY = 3200;

const emojiMap: Record<string, string> = {
  singa: "🦁", gajah: "🐘", jerapah: "🦒", zebra: "🦓", harimau: "🐯",
  panda: "🐼", koala: "🐨", kanguru: "🦘", buaya: "🐊", gorila: "🦍",
  rusa: "🦌", kuda_nil: "🦛", badak: "🦏", unta: "🐪", rubah: "🦊",
  serigala: "🐺", beruang: "🐻", elang: "🦅", burung_unta: "🐦",
  penguin: "🐧", flamingo: "🦩", merak: "🦚", ular_kobra: "🐍",
  kura_kura: "🐢", kelinci: "🐰", tupai: "🐿️", landak: "🦔",
  kucing: "🐱", anjing: "🐶", lumba_lumba: "🐬",
  kuda: "🐴", sapi: "🐄", kambing: "🐐", domba: "🐑", ayam: "🐔",
  bebek: "🦆", monyet: "🐒", paus: "🐋", hiu: "🦈", kupu_kupu: "🦋",
};

const animalQueryMap: Record<string, string> = {
  singa: "lion", gajah: "elephant", jerapah: "giraffe", zebra: "zebra",
  harimau: "tiger", panda: "panda", koala: "koala bear", kanguru: "kangaroo",
  buaya: "crocodile", gorila: "gorilla", rusa: "deer", kuda_nil: "hippo",
  badak: "rhino", unta: "camel", rubah: "fox", serigala: "wolf",
  beruang: "bear", elang: "eagle", burung_unta: "ostrich", penguin: "penguin",
  flamingo: "flamingo", merak: "peacock", ular_kobra: "king cobra",
  kura_kura: "turtle", kelinci: "rabbit", tupai: "squirrel", landak: "hedgehog",
  kucing: "cat", anjing: "dog", lumba_lumba: "dolphin",
  kuda: "horse", sapi: "cow", kambing: "goat", domba: "sheep", ayam: "chicken",
  bebek: "duck", monyet: "monkey", paus: "whale", hiu: "shark", kupu_kupu: "butterfly",
};

const funFactMap: Record<string, string> = Object.fromEntries(
  animals.map((a) => [a.id, a.funFact])
);

const KOALA_IMAGE_ID = 9960;

type Screen = "menu" | "game" | "result" | "finished" | "settings" | "manual";
type Choice = { id: string; name: string; emoji: string };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function fetchAnimalVideo(query: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/animal-video?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    return data?.url ?? null;
  } catch {
    return null;
  }
}

async function fetchAnimalImage(query: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/animal-image?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    return data?.url ?? null;
  } catch {
    return null;
  }
}

async function fetchAnimalImageById(id: number): Promise<string | null> {
  try {
    const res = await fetch(`/api/animal-image?id=${id}`);
    const data = await res.json();
    return data?.url ?? null;
  } catch {
    return null;
  }
}

const sideEmojis = Object.values(emojiMap);

export default function Home() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [prevScreen, setPrevScreen] = useState<Screen>("menu");
  const [volume, setVolume] = useState(0.8);
  const [musicVolume, setMusicVolume] = useState(0.4);
  const [answerCount, setAnswerCount] = useState(4);

  const [currentAnimal, setCurrentAnimal] = useState<Animal | null>(null);
  const [question, setQuestion] = useState("");
  const [choices, setChoices] = useState<Choice[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wrongId, setWrongId] = useState<string | null>(null);

  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [timedOut, setTimedOut] = useState(false);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);

  const [roundNumber, setRoundNumber] = useState(1);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);

  const lastAnimalId = useRef<string | null>(null);
  const roundNumberRef = useRef(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const narrationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rewardVideoRef = useRef<HTMLVideoElement | null>(null);
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const photoCacheRef = useRef<Record<string, string>>({});
  const photoFetchingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    roundNumberRef.current = roundNumber;
  }, [roundNumber]);

  useEffect(() => {
    if (!bgmRef.current) return;
    if (screen === "result") {
      bgmRef.current.volume = Math.min(musicVolume, 0.08);
    } else {
      bgmRef.current.volume = musicVolume;
      bgmRef.current.muted = musicVolume === 0;
    }
  }, [screen, musicVolume]);

  useEffect(() => {
    if (!photoUrls["koala"]) {
      fetchAnimalImageById(KOALA_IMAGE_ID).then((url) => {
        if (url) {
          photoCacheRef.current["koala"] = url;
          setPhotoUrls((prev) => ({ ...prev, koala: url }));
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined") return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "id-ID";
      utter.volume = volume;
      utter.rate = 0.95;
      window.speechSynthesis.speak(utter);
    },
    [volume]
  );

  const generateRound = useCallback(() => {
    let pool = animals;
    if (animals.length > 1 && lastAnimalId.current) {
      pool = animals.filter((a) => a.id !== lastAnimalId.current);
    }
    const animal = pool[Math.floor(Math.random() * pool.length)];
    lastAnimalId.current = animal.id;

    const desc =
      animal.descriptions[Math.floor(Math.random() * animal.descriptions.length)];

    const others = shuffle(animals.filter((a) => a.id !== animal.id)).slice(
      0,
      answerCount - 1
    );

    const roundChoices: Choice[] = shuffle([
      { id: animal.id, name: animal.name, emoji: emojiMap[animal.id] ?? "🐾" },
      ...others.map((a) => ({
        id: a.id,
        name: a.name,
        emoji: emojiMap[a.id] ?? "🐾",
      })),
    ]);

    setCurrentAnimal(animal);
    setQuestion(desc);
    setChoices(roundChoices);
    setSelectedId(null);
    setWrongId(null);
    setTimeLeft(ROUND_TIME);
    setTimedOut(false);
    setVideoUrl(null);
    setVideoFailed(false);

    setTimeout(() => speak(desc), 300);
  }, [answerCount, speak]);

  useEffect(() => {
    choices.forEach((c) => {
      if (c.id === "koala") return;
      if (photoCacheRef.current[c.id] || photoFetchingRef.current.has(c.id)) return;
      photoFetchingRef.current.add(c.id);
      const query = animalQueryMap[c.id] ?? c.name;
      fetchAnimalImage(query).then((url) => {
        photoFetchingRef.current.delete(c.id);
        if (url) {
          photoCacheRef.current[c.id] = url;
          setPhotoUrls((prev) => ({ ...prev, [c.id]: url }));
        }
      });
    });
  }, [choices]);

  const goToNextOrFinish = useCallback(() => {
    rewardVideoRef.current?.pause();
    if (narrationTimeoutRef.current) clearTimeout(narrationTimeoutRef.current);
    window.speechSynthesis.cancel();
    if (roundNumberRef.current >= TOTAL_ROUNDS) {
      setScreen("finished");
    } else {
      setRoundNumber((r) => r + 1);
      generateRound();
      setScreen("game");
    }
  }, [generateRound]);

  const handleTimeout = useCallback(() => {
    setTimedOut(true);
    setWrongCount((w) => w + 1);
    window.speechSynthesis.cancel();
    setTimeout(() => {
      goToNextOrFinish();
    }, WRONG_FEEDBACK_DELAY);
  }, [goToNextOrFinish]);

  useEffect(() => {
    if (screen !== "game" || selectedId || timedOut) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [screen, selectedId, timedOut, handleTimeout]);

  useEffect(() => {
    if (screen !== "result" || !currentAnimal) return;
    if (currentAnimal.id === "koala") return;

    let cancelled = false;
    const query = animalQueryMap[currentAnimal.id] ?? currentAnimal.name;
    setVideoLoading(true);

    fetchAnimalVideo(query).then((url) => {
      if (cancelled) return;
      setVideoLoading(false);
      if (url) setVideoUrl(url);
      else setVideoFailed(true);
    });

    return () => {
      cancelled = true;
    };
  }, [screen, currentAnimal]);

  useEffect(() => {
    if (screen !== "result" || !currentAnimal) return;
    if (narrationTimeoutRef.current) clearTimeout(narrationTimeoutRef.current);

    const fact = funFactMap[currentAnimal.id];
    if (fact) {
      narrationTimeoutRef.current = setTimeout(() => {
        speak(fact);
      }, NARRATION_DELAY);
    }
    return () => {
      if (narrationTimeoutRef.current) clearTimeout(narrationTimeoutRef.current);
    };
  }, [screen, currentAnimal, speak]);

  useEffect(() => {
    if (screen !== "finished") return;
    const end = Date.now() + 3000;
    let frameId: number;
    const frame = () => {
      confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0, y: 0.6 } });
      confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1, y: 0.6 } });
      if (Date.now() < end) {
        frameId = requestAnimationFrame(frame);
      }
    };
    frame();
    return () => cancelAnimationFrame(frameId);
  }, [screen]);

  const startGame = () => {
    setRoundNumber(1);
    setCorrectCount(0);
    setWrongCount(0);
    lastAnimalId.current = null;
    setScreen("game");
    generateRound();
    bgmRef.current?.play().catch(() => {});
  };

  const fireConfetti = () => {
    confetti({ particleCount: 80, angle: 60, spread: 70, origin: { x: 0, y: 0 } });
    confetti({ particleCount: 80, angle: 120, spread: 70, origin: { x: 1, y: 0 } });
  };

  const handleChoice = (choiceId: string) => {
    if (selectedId || timedOut) return;
    setSelectedId(choiceId);

    if (currentAnimal && choiceId === currentAnimal.id) {
      setCorrectCount((c) => c + 1);
      window.speechSynthesis.cancel();
      fireConfetti();
      setTimeout(() => setScreen("result"), 600);
    } else {
      setWrongId(choiceId);
      setWrongCount((w) => w + 1);
      window.speechSynthesis.cancel();
      setTimeout(() => {
        goToNextOrFinish();
      }, WRONG_FEEDBACK_DELAY);
    }
  };

  const openSettings = () => {
    setPrevScreen(screen);
    setScreen("settings");
  };
  const closeSettings = () => setScreen(prevScreen);

  const openManual = () => {
    setPrevScreen(screen);
    setScreen("manual");
  };
  const closeManual = () => setScreen(prevScreen);

  const scoreMessage = () => {
    const ratio = correctCount / TOTAL_ROUNDS;
    if (ratio === 1) return "Sempurna! Kamu Jagoan Hewan! 🏆";
    if (ratio >= 0.7) return "Keren banget! Hebat sekali! 🌟";
    if (ratio >= 0.4) return "Bagus! Ayo terus berlatih! 💪";
    return "Yuk coba lagi, kamu pasti bisa! 🐣";
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-gradient-to-b from-sky-300 via-sky-200 to-lime-200">
      <audio ref={bgmRef} src="/music/bgm.mp3" loop preload="auto" />

      <div className="hidden lg:flex fixed left-0 top-0 h-screen w-24 overflow-hidden opacity-15 pointer-events-none z-0 justify-center">
        <div className="flex flex-col gap-10 text-5xl animate-scroll-up">
          {[...sideEmojis, ...sideEmojis].map((e, i) => (
            <span key={`l-${i}`}>{e}</span>
          ))}
        </div>
      </div>
      <div className="hidden lg:flex fixed right-0 top-0 h-screen w-24 overflow-hidden opacity-15 pointer-events-none z-0 justify-center">
        <div className="flex flex-col gap-10 text-5xl animate-scroll-down">
          {[...sideEmojis, ...sideEmojis].map((e, i) => (
            <span key={`r-${i}`}>{e}</span>
          ))}
        </div>
      </div>

      <div className="pointer-events-none select-none absolute inset-0 text-6xl opacity-30 flex flex-wrap content-start gap-8 p-6">
        <span>🌳</span><span>🦁</span><span>🌴</span><span>🐘</span>
        <span>☁️</span><span>🦒</span><span>🌳</span><span>🐵</span>
        <span>🌿</span><span>🦓</span><span>☁️</span><span>🌳</span>
      </div>

      {screen !== "settings" && screen !== "manual" && (
        <div className="absolute top-4 right-4 flex gap-3 z-20">
          <button onClick={openManual} aria-label="Cara Bermain"
            className="w-12 h-12 rounded-full bg-white/90 shadow-lg text-2xl flex items-center justify-center hover:scale-110 transition">
            ❓
          </button>
          <button onClick={openSettings} aria-label="Pengaturan"
            className="w-12 h-12 rounded-full bg-white/90 shadow-lg text-2xl flex items-center justify-center hover:scale-110 transition">
            ⚙️
          </button>
          <button onClick={() => setScreen("menu")} aria-label="Keluar"
            className="w-12 h-12 rounded-full bg-white/90 shadow-lg text-2xl flex items-center justify-center hover:scale-110 transition">
            ⏻
          </button>
        </div>
      )}

      {screen === "menu" && (
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center gap-10 px-4">
          <h1 className="text-5xl md:text-6xl font-extrabold text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.2)] text-center">
            🦁 Tebak Hewan 🐘
          </h1>
          <button onClick={startGame}
            className="px-12 py-5 rounded-full bg-orange-400 hover:bg-orange-500 active:scale-95 transition text-white text-3xl font-bold shadow-xl">
            ▶️ Main
          </button>
          <button
            onClick={openManual}
            className="px-8 py-3 rounded-full bg-white/90 hover:bg-white transition text-slate-700 text-lg font-bold shadow-lg"
          >
            📖 Cara Bermain
          </button>
        </div>
      )}

      {screen === "manual" && (
        <div className="relative z-10 min-h-screen flex flex-col items-center px-4 py-10 gap-6">
          <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-10 w-full max-w-2xl flex flex-col gap-6">
            <h2 className="text-3xl md:text-4xl font-extrabold text-center text-slate-700">
              📖 Cara Bermain Tebak Hewan
            </h2>

            <div className="flex flex-col gap-4 text-slate-700">
              <div>
                <h3 className="text-xl font-bold text-orange-500 mb-1">🎯 Tujuan Permainan</h3>
                <p>
                  Tebak nama hewan yang benar berdasarkan deskripsi/petunjuk yang muncul di layar.
                  Setiap permainan terdiri dari 10 soal.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-orange-500 mb-1">▶️ Cara Mulai</h3>
                <p>
                  Tekan tombol <strong>"Main"</strong> di menu utama untuk memulai. Kamu bisa
                  mengatur volume musik latar dan narasi lewat menu Pengaturan (⚙️).
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-orange-500 mb-1">🐾 Saat Bermain</h3>
                <ul className="list-disc list-inside flex flex-col gap-1">
                  <li>Deskripsi hewan akan muncul di tengah layar, dan dibacakan otomatis.</li>
                  <li>Tekan tombol <strong>"🔊 Baca Ulang"</strong> kalau ingin mendengar deskripsinya lagi.</li>
                  <li>Pilih salah satu dari beberapa gambar hewan di bawah sebagai jawabanmu.</li>
                  <li>Kamu punya waktu 30 detik untuk menjawab setiap soal — perhatikan timer di atas!</li>
                  <li>Jawaban benar akan langsung ditandai hijau, jawaban salah ditandai merah.</li>
                  <li>Kalau jawaban salah atau waktu habis, permainan otomatis lanjut ke soal berikutnya.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-bold text-orange-500 mb-1">🎉 Saat Jawaban Benar</h3>
                <p>
                  Kamu akan melihat video/gambar asli hewan tersebut lengkap dengan suara aslinya,
                  disusul dengan fakta menarik (fun fact) tentang hewan itu yang akan dibacakan.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-orange-500 mb-1">⚙️ Pengaturan</h3>
                <p>
                  Tekan ikon gear (⚙️) di pojok kanan atas untuk mengatur volume musik latar,
                  volume suara/narasi, dan jumlah pilihan jawaban (2, 3, atau 4 pilihan).
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-orange-500 mb-1">🏆 Skor Akhir</h3>
                <p>
                  Setelah 10 soal selesai, kamu akan melihat jumlah jawaban benar dan salah.
                  Tekan <strong>"Main Lagi"</strong> untuk mencoba lagi dengan soal yang diacak ulang!
                </p>
              </div>
            </div>

            <button
              onClick={closeManual}
              className="mt-2 px-6 py-3 rounded-full bg-orange-400 hover:bg-orange-500 text-white font-bold text-lg shadow self-center"
            >
              ✅ Mengerti, Ayo Main!
            </button>
          </div>
        </div>
      )}

      {screen === "game" && currentAnimal && (
        <div className="relative z-10 min-h-screen flex flex-col items-center px-4 py-8 gap-8">
          <div className="mt-4 flex items-center gap-3">
            <div className="px-5 py-2 bg-white/90 rounded-full text-lg font-bold shadow text-slate-800">
              🐾 Soal {roundNumber}/{TOTAL_ROUNDS}
            </div>
            <div
              className={`px-6 py-2 rounded-full text-2xl font-bold shadow ${
                timeLeft <= 10 ? "bg-red-400 text-white animate-pulse" : "bg-white/90 text-slate-800"
              }`}
            >
              ⏱️ {timeLeft}s
            </div>
          </div>

          <div className="max-w-2xl w-full bg-white/95 rounded-3xl shadow-xl p-6 md:p-8 flex flex-col items-center gap-4">
            <p className="text-xl md:text-2xl text-center font-semibold text-slate-700">
              {question}
            </p>
            <button onClick={() => speak(question)}
              className="px-5 py-2 rounded-full bg-sky-400 hover:bg-sky-500 text-white font-bold shadow">
              🔊 Baca Ulang
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-4 md:gap-6 mt-4">
            {choices.map((c) => {
              const isCorrectChoice = currentAnimal.id === c.id;
              const showCorrectHighlight = !!selectedId && isCorrectChoice;
              const showWrongHighlight = wrongId === c.id;
              const photoUrl = photoUrls[c.id];
              return (
                <button key={c.id} onClick={() => handleChoice(c.id)}
                  disabled={!!selectedId || timedOut}
                  className={`w-28 h-28 md:w-36 md:h-36 rounded-3xl bg-white shadow-lg flex flex-col items-center justify-center gap-1 text-5xl md:text-6xl transition overflow-hidden
                    ${showWrongHighlight ? "animate-shake bg-red-200" : ""}
                    ${showCorrectHighlight ? "bg-green-200 scale-105 ring-4 ring-green-400" : ""}
                    ${!selectedId ? "hover:scale-105" : ""}`}>
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={c.name}
                      className="w-16 h-16 md:w-20 md:h-20 object-cover rounded-2xl"
                    />
                  ) : (
                    <span>{c.emoji}</span>
                  )}
                  <span className="text-xs md:text-sm font-bold text-slate-600">{c.name}</span>
                </button>
              );
            })}
          </div>

          {timedOut && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-30 px-4">
              <div className="bg-white rounded-3xl p-8 text-center shadow-2xl">
                <p className="text-4xl mb-2">⏰</p>
                <p className="text-2xl font-bold text-slate-700">Waktu Habis!</p>
                <p className="text-lg text-slate-500 mt-2">
                  Itu tadi {currentAnimal.name} {emojiMap[currentAnimal.id] ?? "🐾"}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {screen === "result" && currentAnimal && (
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center gap-5 px-4 py-8">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white drop-shadow text-center">
            🎉 Hebat! Jawabanmu Benar! 🎉
          </h2>

          <div className="w-72 h-72 md:w-96 md:h-96 rounded-3xl overflow-hidden shadow-xl bg-white flex items-center justify-center">
            {currentAnimal.id === "koala" ? (
              photoUrls["koala"] ? (
                <img
                  src={photoUrls["koala"]}
                  alt="Koala"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-6xl animate-pulse">⏳</div>
              )
            ) : videoUrl && !videoFailed ? (
              <video
                key={currentAnimal.id}
                ref={rewardVideoRef}
                src={videoUrl}
                autoPlay
                loop
                playsInline
                onError={() => setVideoFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : videoLoading ? (
              <div className="text-6xl animate-pulse">⏳</div>
            ) : (
              <div className="text-9xl animate-bounce">
                {emojiMap[currentAnimal.id] ?? "🐾"}
              </div>
            )}
          </div>

          <p className="text-2xl font-bold text-white drop-shadow">Itu adalah {currentAnimal.name}!</p>

          {funFactMap[currentAnimal.id] && (
            <p className="max-w-md text-center text-white/90 text-base md:text-lg italic px-4">
              💡 {funFactMap[currentAnimal.id]}
            </p>
          )}

          <div className="flex gap-4 mt-2">
            <button
              onClick={() => {
                rewardVideoRef.current?.pause();
                if (narrationTimeoutRef.current) clearTimeout(narrationTimeoutRef.current);
                window.speechSynthesis.cancel();
                setScreen("menu");
              }}
              className="px-8 py-4 rounded-full bg-white text-slate-700 font-bold text-xl shadow-lg hover:scale-105 transition">
              🏠 Menu
            </button>
            <button onClick={goToNextOrFinish}
              className="px-8 py-4 rounded-full bg-orange-400 hover:bg-orange-500 text-white font-bold text-xl shadow-lg hover:scale-105 transition">
              ➡️ {roundNumber >= TOTAL_ROUNDS ? "Lihat Hasil" : "Soal Berikutnya"}
            </button>
          </div>
        </div>
      )}

      {screen === "finished" && (
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center gap-6 px-4">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white drop-shadow text-center">
            🎊 Permainan Selesai! 🎊
          </h2>

          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm flex flex-col items-center gap-4">
            <div className="text-7xl">
              {correctCount / TOTAL_ROUNDS === 1 ? "🏆" : "🐾"}
            </div>
            <p className="text-xl font-bold text-slate-700 text-center">{scoreMessage()}</p>

            <div className="w-full flex gap-3 mt-2">
              <div className="flex-1 bg-green-100 rounded-2xl py-4 text-center">
                <p className="text-3xl font-extrabold text-green-600">{correctCount}</p>
                <p className="text-sm font-semibold text-green-700">✅ Benar</p>
              </div>
              <div className="flex-1 bg-red-100 rounded-2xl py-4 text-center">
                <p className="text-3xl font-extrabold text-red-500">{wrongCount}</p>
                <p className="text-sm font-semibold text-red-600">❌ Salah</p>
              </div>
            </div>
          </div>

          <div className="flex gap-4 mt-2">
            <button onClick={() => setScreen("menu")}
              className="px-8 py-4 rounded-full bg-white text-slate-700 font-bold text-xl shadow-lg hover:scale-105 transition">
              🏠 Menu
            </button>
            <button onClick={startGame}
              className="px-8 py-4 rounded-full bg-orange-400 hover:bg-orange-500 text-white font-bold text-xl shadow-lg hover:scale-105 transition">
              🔄 Main Lagi
            </button>
          </div>
        </div>
      )}

      {screen === "settings" && (
        <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md flex flex-col gap-6">
            <h2 className="text-3xl font-bold text-center text-slate-700">⚙️ Pengaturan</h2>

            <div className="flex flex-col gap-2">
              <label className="font-semibold text-slate-600">
                🎵 Volume Musik Latar: {Math.round(musicVolume * 100)}%
              </label>
              <input type="range" min={0} max={1} step={0.05} value={musicVolume}
                onChange={(e) => setMusicVolume(parseFloat(e.target.value))} />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-semibold text-slate-600">
                🔊 Volume Suara/Narasi: {Math.round(volume * 100)}%
              </label>
              <input type="range" min={0} max={1} step={0.05} value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))} />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-semibold text-slate-600">🔢 Jumlah Pilihan Jawaban</label>
              <div className="flex gap-3">
                {[2, 3, 4].map((n) => (
                  <button key={n} onClick={() => setAnswerCount(n)}
                    className={`flex-1 py-3 rounded-xl font-bold text-lg border-2 transition
                      ${answerCount === n ? "bg-orange-400 text-white border-orange-400" : "bg-white text-slate-600 border-slate-200 hover:border-orange-300"}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={closeSettings}
              className="mt-2 px-6 py-3 rounded-full bg-sky-400 hover:bg-sky-500 text-white font-bold text-lg shadow">
              ✅ Selesai
            </button>
          </div>
        </div>
      )}
    </div>
  );
}