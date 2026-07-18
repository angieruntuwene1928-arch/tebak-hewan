"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import confetti from "canvas-confetti";
import animalsData from "../data/data-hewan.json";

type Animal = {
  id: string;
  name: string;
  descriptions: string[];
};

const animals = animalsData.animals as Animal[];
const TOTAL_ROUNDS = 10;
const ROUND_TIME = 30;
const WRONG_FEEDBACK_DELAY = 1800;

const emojiMap: Record<string, string> = {
  singa: "🦁", gajah: "🐘", jerapah: "🦒", zebra: "🦓", harimau: "🐯",
  panda: "🐼", koala: "🐨", kanguru: "🦘", buaya: "🐊", gorila: "🦍",
  rusa: "🦌", kuda_nil: "🦛", badak: "🦏", unta: "🐪", rubah: "🦊",
  serigala: "🐺", beruang: "🐻", elang: "🦅", burung_unta: "🐦",
  penguin: "🐧", flamingo: "🦩", merak: "🦚", ular_kobra: "🐍",
  kura_kura: "🐢", kelinci: "🐰", tupai: "🐿️", landak: "🦔",
  kucing: "🐱", anjing: "🐶", lumba_lumba: "🐬",
};

// Query bahasa Inggris yang akurat buat tiap hewan, biar hasil gif Giphy tepat
const giphyQueryMap: Record<string, string> = {
  singa: "lion wild animal",
  gajah: "elephant wild animal",
  jerapah: "giraffe wild animal",
  zebra: "zebra wild animal",
  harimau: "tiger wild animal",
  panda: "panda bear",
  koala: "koala bear",
  kanguru: "kangaroo animal",
  buaya: "crocodile animal",
  gorila: "gorilla animal",
  rusa: "deer animal",
  kuda_nil: "hippopotamus animal",
  badak: "rhino rhinoceros animal",
  unta: "camel animal",
  rubah: "fox animal",
  serigala: "wolf animal",
  beruang: "bear animal",
  elang: "eagle bird",
  burung_unta: "ostrich bird",
  penguin: "penguin bird",
  flamingo: "flamingo bird",
  merak: "peacock bird",
  ular_kobra: "cobra snake",
  kura_kura: "turtle tortoise",
  kelinci: "rabbit bunny",
  tupai: "squirrel animal",
  landak: "hedgehog animal",
  kucing: "cat kitten",
  anjing: "dog puppy",
  lumba_lumba: "dolphin ocean",
};

type Screen = "menu" | "game" | "result" | "finished" | "settings";
type Choice = { id: string; name: string; emoji: string };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [prevScreen, setPrevScreen] = useState<Screen>("menu");
  const [volume, setVolume] = useState(0.8);
  const [answerCount, setAnswerCount] = useState(4);

  const [currentAnimal, setCurrentAnimal] = useState<Animal | null>(null);
  const [question, setQuestion] = useState("");
  const [choices, setChoices] = useState<Choice[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wrongId, setWrongId] = useState<string | null>(null);

  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [timedOut, setTimedOut] = useState(false);

  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [gifFailed, setGifFailed] = useState(false);
  const [audioFailed, setAudioFailed] = useState(false);

  const [roundNumber, setRoundNumber] = useState(1);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);

  const lastAnimalId = useRef<string | null>(null);
  const roundNumberRef = useRef(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rewardAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    roundNumberRef.current = roundNumber;
  }, [roundNumber]);

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
    setGifUrl(null);
    setGifFailed(false);
    setAudioFailed(false);

    setTimeout(() => speak(desc), 300);
  }, [answerCount, speak]);

  const goToNextOrFinish = useCallback(() => {
    rewardAudioRef.current?.pause();
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

  // Ambil gif dari Giphy otomatis begitu masuk layar result, pakai query bahasa Inggris
  useEffect(() => {
    if (screen !== "result" || !currentAnimal) return;

    const apiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY;
    if (!apiKey) {
      setGifFailed(true);
      return;
    }

    let cancelled = false;
    const query = giphyQueryMap[currentAnimal.id] ?? currentAnimal.name;

    fetch(
      `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(
        query
      )}&limit=5&rating=g&lang=en`
    )
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const results = data?.data ?? [];
        const first = results.find((r: any) => r?.images?.downsized?.url);
        if (first) setGifUrl(first.images.downsized.url);
        else setGifFailed(true);
      })
      .catch(() => {
        if (!cancelled) setGifFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [screen, currentAnimal]);

  const startGame = () => {
    setRoundNumber(1);
    setCorrectCount(0);
    setWrongCount(0);
    lastAnimalId.current = null;
    setScreen("game");
    generateRound();
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

  const scoreMessage = () => {
    const ratio = correctCount / TOTAL_ROUNDS;
    if (ratio === 1) return "Sempurna! Kamu Jagoan Hewan! 🏆";
    if (ratio >= 0.7) return "Keren banget! Hebat sekali! 🌟";
    if (ratio >= 0.4) return "Bagus! Ayo terus berlatih! 💪";
    return "Yuk coba lagi, kamu pasti bisa! 🐣";
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-gradient-to-b from-sky-300 via-sky-200 to-lime-200">
      <div className="pointer-events-none select-none absolute inset-0 text-6xl opacity-30 flex flex-wrap content-start gap-8 p-6">
        <span>🌳</span><span>🦁</span><span>🌴</span><span>🐘</span>
        <span>☁️</span><span>🦒</span><span>🌳</span><span>🐵</span>
        <span>🌿</span><span>🦓</span><span>☁️</span><span>🌳</span>
      </div>

      {screen !== "settings" && (
        <div className="absolute top-4 right-4 flex gap-3 z-20">
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
        </div>
      )}

      {screen === "game" && currentAnimal && (
        <div className="relative z-10 min-h-screen flex flex-col items-center px-4 py-8 gap-8">
          <div className="mt-4 flex items-center gap-3">
            <div className="px-5 py-2 bg-white/90 rounded-full text-lg font-bold shadow">
              🐾 Soal {roundNumber}/{TOTAL_ROUNDS}
            </div>
            <div
              className={`px-6 py-2 rounded-full text-2xl font-bold shadow ${
                timeLeft <= 10 ? "bg-red-400 text-white animate-pulse" : "bg-white/90"
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
              return (
                <button key={c.id} onClick={() => handleChoice(c.id)}
                  disabled={!!selectedId || timedOut}
                  className={`w-28 h-28 md:w-36 md:h-36 rounded-3xl bg-white shadow-lg flex flex-col items-center justify-center gap-1 text-5xl md:text-6xl transition
                    ${showWrongHighlight ? "animate-shake bg-red-200" : ""}
                    ${showCorrectHighlight ? "bg-green-200 scale-105 ring-4 ring-green-400" : ""}
                    ${!selectedId ? "hover:scale-105" : ""}`}>
                  <span>{c.emoji}</span>
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
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center gap-6 px-4">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white drop-shadow text-center">
            🎉 Hebat! Jawabanmu Benar! 🎉
          </h2>

          <div className="w-72 h-72 md:w-96 md:h-96 rounded-3xl overflow-hidden shadow-xl bg-white flex items-center justify-center">
            {gifUrl && !gifFailed ? (
              <img
                key={currentAnimal.id + "-gif"}
                src={gifUrl}
                alt={currentAnimal.name}
                onError={() => setGifFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-9xl animate-bounce">
                {emojiMap[currentAnimal.id] ?? "🐾"}
              </div>
            )}
          </div>

          {!audioFailed && (
            <audio
              key={currentAnimal.id + "-audio"}
              ref={rewardAudioRef}
              src={`/sounds/${currentAnimal.id}.mp3`}
              autoPlay
              onError={() => setAudioFailed(true)}
            />
          )}

          <p className="text-2xl font-bold text-white drop-shadow">Itu adalah {currentAnimal.name}!</p>
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => {
                rewardAudioRef.current?.pause();
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
                🔊 Volume Suara: {Math.round(volume * 100)}%
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