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
const COLLECTION_STORAGE_KEY = "tebak-hewan-collection";
const BEST_SCORE_STORAGE_KEY = "tebak-hewan-best-score";
const BEST_STREAK_STORAGE_KEY = "tebak-hewan-best-streak";
const PLAYER_NAME_KEY = "tebak-hewan-player-name";

const emojiMap: Record<string, string> = {
  singa: "🦁", gajah: "🐘", jerapah: "🦒", zebra: "🦓", harimau: "🐯",
  panda: "🐼", koala: "🐨", kanguru: "🦘", buaya: "🐊", gorila: "🦍",
  rusa: "🦌", kuda_nil: "🦛", badak: "🦏", unta: "🐪", rubah: "🦊",
  serigala: "🐺", beruang: "🐻", elang: "🦅", burung_unta: "🐦",
  penguin: "🐧", flamingo: "🦩", merak: "🦚", ular_kobra: "🐍",
  kura_kura: "🐢", kelinci: "🐰", tupai: "🐿️", landak: "🦔",
  kucing: "🐱", anjing: "🐶", lumba_lumba: "🐬",
};

const videoQueryMap: Record<string, string> = {
  singa: "lion", gajah: "elephant", jerapah: "giraffe", zebra: "zebra",
  harimau: "tiger", panda: "panda", koala: "koala eucalyptus wildlife", kanguru: "kangaroo",
  buaya: "crocodile", gorila: "gorilla", rusa: "deer", kuda_nil: "hippo",
  badak: "rhino", unta: "camel", rubah: "fox", serigala: "wolf",
  beruang: "bear", elang: "eagle", burung_unta: "ostrich", penguin: "penguin",
  flamingo: "flamingo", merak: "peacock", ular_kobra: "king cobra",
  kura_kura: "turtle", kelinci: "rabbit", tupai: "squirrel", landak: "hedgehog",
  kucing: "cat", anjing: "dog", lumba_lumba: "dolphin",
};

const REAL_PHOTO_IDS = ["koala", "ular_kobra"];

const categoryMap: Record<string, string> = {
  singa: "savana", gajah: "savana", jerapah: "savana", zebra: "savana", badak: "savana", unta: "savana",
  harimau: "hutan", panda: "hutan", koala: "hutan", gorila: "hutan", rusa: "hutan", rubah: "hutan",
  serigala: "hutan", beruang: "hutan", landak: "hutan", tupai: "hutan", ular_kobra: "hutan",
  buaya: "air", kuda_nil: "air", kura_kura: "air", lumba_lumba: "air", flamingo: "air",
  elang: "burung", burung_unta: "burung", penguin: "burung", merak: "burung",
  kucing: "lainnya", anjing: "lainnya", kelinci: "lainnya", kanguru: "lainnya",
};

const categoryLabels: Record<string, string> = {
  semua: "🌍 Semua Hewan",
  savana: "🦁 Savana Afrika",
  hutan: "🌳 Hutan",
  air: "🌊 Air & Rawa",
  burung: "🦅 Burung",
  lainnya: "🐾 Lainnya",
};

type Screen = "menu" | "game" | "result" | "finished" | "settings" | "collection";
type Choice = { id: string; name: string; emoji: string };
type GameMode = "normal" | "endless";

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

function playTone(freq: number, duration: number, type: OscillatorType = "sine") {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

function playCorrectSound() {
  playTone(523.25, 0.15);
  setTimeout(() => playTone(659.25, 0.15), 100);
  setTimeout(() => playTone(783.99, 0.2), 200);
}

function playWrongSound() {
  playTone(200, 0.3, "sawtooth");
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [prevScreen, setPrevScreen] = useState<Screen>("menu");
  const [volume, setVolume] = useState(0.8);
  const [answerCount, setAnswerCount] = useState(4);
  const [bgmEnabled, setBgmEnabled] = useState(true);

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

  const [collectedIds, setCollectedIds] = useState<string[]>([]);
  const [newlyCollected, setNewlyCollected] = useState(false);

  const [streak, setStreak] = useState(0);
  const [bestStreakEver, setBestStreakEver] = useState(0);
  const [bestScoreEver, setBestScoreEver] = useState(0);
  const [newHighScore, setNewHighScore] = useState(false);

  const [gameMode, setGameMode] = useState<GameMode>("normal");
  const [selectedCategory, setSelectedCategory] = useState("semua");

  const [hintUsed, setHintUsed] = useState(false);
  const [eliminatedChoiceId, setEliminatedChoiceId] = useState<string | null>(null);

  const [playerName, setPlayerName] = useState("");
  const [nameInput, setNameInput] = useState("");

  const lastAnimalId = useRef<string | null>(null);
  const roundNumberRef = useRef(1);
  const gameModeRef = useRef<GameMode>("normal");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rewardVideoRef = useRef<HTMLVideoElement | null>(null);
  const bgmRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    roundNumberRef.current = roundNumber;
  }, [roundNumber]);

  useEffect(() => {
    gameModeRef.current = gameMode;
  }, [gameMode]);

  useEffect(() => {
    if (bgmRef.current) {
      bgmRef.current.muted = !bgmEnabled;
    }
  }, [bgmEnabled]);

  useEffect(() => {
    try {
      const savedCollection = localStorage.getItem(COLLECTION_STORAGE_KEY);
      if (savedCollection) setCollectedIds(JSON.parse(savedCollection));

      const savedScore = localStorage.getItem(BEST_SCORE_STORAGE_KEY);
      if (savedScore) setBestScoreEver(parseInt(savedScore, 10) || 0);

      const savedStreak = localStorage.getItem(BEST_STREAK_STORAGE_KEY);
      if (savedStreak) setBestStreakEver(parseInt(savedStreak, 10) || 0);

      const savedName = localStorage.getItem(PLAYER_NAME_KEY);
      if (savedName) setPlayerName(savedName);
    } catch {}
  }, []);

  const savePlayerName = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setPlayerName(trimmed);
    try {
      localStorage.setItem(PLAYER_NAME_KEY, trimmed);
    } catch {}
  };

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

  const getAnimalPool = useCallback(() => {
    if (selectedCategory === "semua") return animals;
    return animals.filter((a) => categoryMap[a.id] === selectedCategory);
  }, [selectedCategory]);

  const generateRound = useCallback(() => {
    const basePool = getAnimalPool();
    let pool = basePool;
    if (basePool.length > 1 && lastAnimalId.current) {
      pool = basePool.filter((a) => a.id !== lastAnimalId.current);
    }
    if (pool.length === 0) pool = basePool;

    const animal = pool[Math.floor(Math.random() * pool.length)];
    lastAnimalId.current = animal.id;

    const desc =
      animal.descriptions[Math.floor(Math.random() * animal.descriptions.length)];

    const otherPool = basePool.filter((a) => a.id !== animal.id);
    const others = shuffle(otherPool).slice(0, Math.min(answerCount - 1, otherPool.length));

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
    setNewlyCollected(false);
    setHintUsed(false);
    setEliminatedChoiceId(null);

    setTimeout(() => speak(desc), 300);
  }, [answerCount, speak, getAnimalPool]);

  useEffect(() => {
    choices.forEach((c) => {
      if (REAL_PHOTO_IDS.includes(c.id) && !photoUrls[c.id]) {
        const query = videoQueryMap[c.id] ?? c.name;
        fetchAnimalImage(query).then((url) => {
          if (url) {
            setPhotoUrls((prev) => ({ ...prev, [c.id]: url }));
          }
        });
      }
    });
  }, [choices, photoUrls]);

  const goToNextOrFinish = useCallback(() => {
    rewardVideoRef.current?.pause();
    if (gameModeRef.current === "normal" && roundNumberRef.current >= TOTAL_ROUNDS) {
      setScreen("finished");
    } else {
      setRoundNumber((r) => r + 1);
      generateRound();
      setScreen("game");
    }
  }, [generateRound]);

  const endRoundAsWrong = useCallback(() => {
    setWrongCount((w) => w + 1);
    setStreak(0);
    window.speechSynthesis.cancel();

    if (gameModeRef.current === "endless") {
      setTimeout(() => {
        rewardVideoRef.current?.pause();
        setScreen("finished");
      }, WRONG_FEEDBACK_DELAY);
    } else {
      setTimeout(() => {
        goToNextOrFinish();
      }, WRONG_FEEDBACK_DELAY);
    }
  }, [goToNextOrFinish]);

  const handleTimeout = useCallback(() => {
    setTimedOut(true);
    playWrongSound();
    endRoundAsWrong();
  }, [endRoundAsWrong]);

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

    let cancelled = false;
    const query = videoQueryMap[currentAnimal.id] ?? currentAnimal.name;
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
    if (screen !== "finished") return;

    if (gameMode === "normal" && correctCount > bestScoreEver) {
      setBestScoreEver(correctCount);
      setNewHighScore(true);
      try {
        localStorage.setItem(BEST_SCORE_STORAGE_KEY, String(correctCount));
      } catch {}
    } else {
      setNewHighScore(false);
    }

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
  }, [screen, correctCount, bestScoreEver, gameMode]);

  const startGame = () => {
    setRoundNumber(1);
    setCorrectCount(0);
    setWrongCount(0);
    setStreak(0);
    setNewHighScore(false);
    setHintUsed(false);
    setEliminatedChoiceId(null);
    lastAnimalId.current = null;
    setScreen("game");
    generateRound();
    bgmRef.current?.play().catch(() => {});
  };

  const fireConfetti = () => {
    confetti({ particleCount: 80, angle: 60, spread: 70, origin: { x: 0, y: 0 } });
    confetti({ particleCount: 80, angle: 120, spread: 70, origin: { x: 1, y: 0 } });
  };

  const useHint = () => {
    if (hintUsed || selectedId || !currentAnimal) return;
    const wrongChoices = choices.filter((c) => c.id !== currentAnimal.id);
    if (wrongChoices.length === 0) return;
    const toEliminate = wrongChoices[Math.floor(Math.random() * wrongChoices.length)];
    setEliminatedChoiceId(toEliminate.id);
    setHintUsed(true);
  };

  const handleChoice = (choiceId: string) => {
    if (selectedId || timedOut) return;
    setSelectedId(choiceId);

    if (currentAnimal && choiceId === currentAnimal.id) {
      setCorrectCount((c) => c + 1);
      window.speechSynthesis.cancel();
      fireConfetti();
      playCorrectSound();

      setStreak((s) => {
        const newStreak = s + 1;
        if (newStreak > bestStreakEver) {
          setBestStreakEver(newStreak);
          try {
            localStorage.setItem(BEST_STREAK_STORAGE_KEY, String(newStreak));
          } catch {}
        }
        return newStreak;
      });

      if (!collectedIds.includes(currentAnimal.id)) {
        const updated = [...collectedIds, currentAnimal.id];
        setCollectedIds(updated);
        setNewlyCollected(true);
        try {
          localStorage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify(updated));
        } catch {}
      }

      setTimeout(() => setScreen("result"), 600);
    } else {
      setWrongId(choiceId);
      playWrongSound();
      endRoundAsWrong();
    }
  };

  const openSettings = () => {
    setPrevScreen(screen);
    setNameInput(playerName);
    setScreen("settings");
  };
  const closeSettings = () => setScreen(prevScreen);

  const scoreMessage = () => {
    if (gameMode === "endless") {
      if (correctCount >= 15) return "Luar Biasa! Kamu Legenda Hewan! 🏆";
      if (correctCount >= 8) return "Keren banget! Hebat sekali! 🌟";
      if (correctCount >= 4) return "Bagus! Ayo terus berlatih! 💪";
      return "Yuk coba lagi, kamu pasti bisa! 🐣";
    }
    const ratio = correctCount / TOTAL_ROUNDS;
    if (ratio === 1) return "Sempurna! Kamu Jagoan Hewan! 🏆";
    if (ratio >= 0.7) return "Keren banget! Hebat sekali! 🌟";
    if (ratio >= 0.4) return "Bagus! Ayo terus berlatih! 💪";
    return "Yuk coba lagi, kamu pasti bisa! 🐣";
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-gradient-to-b from-sky-300 via-sky-200 to-lime-200">
      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadein {
          animation: fadeInUp 0.4s ease-out;
        }
      `}</style>

      <audio ref={bgmRef} src="/music/bgm.mp3" loop muted={!bgmEnabled} preload="auto" />

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
        <div className="animate-fadein relative z-10 min-h-screen flex flex-col items-center justify-center gap-5 px-4 py-10">
          {playerName && (
            <p className="text-white font-bold text-lg drop-shadow">Halo, {playerName}! 👋</p>
          )}

          <h1 className="text-5xl md:text-6xl font-extrabold text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.2)] text-center">
            🦁 Tebak Hewan 🐘
          </h1>

          {(bestScoreEver > 0 || bestStreakEver > 0) && (
            <div className="flex gap-3 flex-wrap justify-center">
              <div className="px-5 py-2 bg-white/90 rounded-full text-sm md:text-base font-bold shadow text-slate-700">
                🏆 Skor Terbaik: {bestScoreEver}/{TOTAL_ROUNDS}
              </div>
              <div className="px-5 py-2 bg-white/90 rounded-full text-sm md:text-base font-bold shadow text-slate-700">
                🔥 Streak Terbaik: {bestStreakEver}
              </div>
            </div>
          )}

          <div className="bg-white/90 rounded-3xl shadow-xl p-4 flex flex-col gap-3 max-w-md w-full">
            <p className="text-center font-bold text-slate-600 text-sm">Pilih Kategori</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {Object.entries(categoryLabels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition ${
                    selectedCategory === key
                      ? "bg-orange-400 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <p className="text-center font-bold text-slate-600 text-sm mt-2">Pilih Mode</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setGameMode("normal")}
                className={`flex-1 px-4 py-2 rounded-full text-sm font-bold transition ${
                  gameMode === "normal"
                    ? "bg-sky-400 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                🎯 Normal (10 Soal)
              </button>
              <button
                onClick={() => setGameMode("endless")}
                className={`flex-1 px-4 py-2 rounded-full text-sm font-bold transition ${
                  gameMode === "endless"
                    ? "bg-purple-400 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                ♾️ Endless
              </button>
            </div>
          </div>

          <button onClick={startGame}
            className="px-12 py-5 rounded-full bg-orange-400 hover:bg-orange-500 active:scale-95 transition text-white text-3xl font-bold shadow-xl">
            ▶️ Main
          </button>
          <button
            onClick={() => setScreen("collection")}
            className="px-8 py-3 rounded-full bg-white/90 hover:bg-white transition text-slate-700 text-lg font-bold shadow-lg flex items-center gap-2"
          >
            📖 Koleksi Hewan
            <span className="px-2 py-0.5 rounded-full bg-orange-400 text-white text-sm">
              {collectedIds.length}/{animals.length}
            </span>
          </button>
        </div>
      )}

      {screen === "collection" && (
        <div className="animate-fadein relative z-10 min-h-screen flex flex-col items-center px-4 py-8 gap-6">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white drop-shadow text-center mt-4">
            📖 Koleksi Hewan
          </h2>
          <p className="text-white/90 font-semibold drop-shadow">
            Kamu sudah mengumpulkan {collectedIds.length} dari {animals.length} hewan!
          </p>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 max-w-3xl w-full">
            {animals.map((a) => {
              const isCollected = collectedIds.includes(a.id);
              return (
                <div
                  key={a.id}
                  className={`aspect-square rounded-2xl shadow-lg flex flex-col items-center justify-center gap-1 p-2 transition ${
                    isCollected ? "bg-white" : "bg-white/40"
                  }`}
                >
                  <span className={`text-4xl md:text-5xl ${isCollected ? "" : "grayscale opacity-40"}`}>
                    {isCollected ? emojiMap[a.id] ?? "🐾" : "❓"}
                  </span>
                  <span
                    className={`text-xs md:text-sm font-bold text-center ${
                      isCollected ? "text-slate-700" : "text-slate-400"
                    }`}
                  >
                    {isCollected ? a.name : "???"}
                  </span>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setScreen("menu")}
            className="mt-4 px-8 py-4 rounded-full bg-white text-slate-700 font-bold text-xl shadow-lg hover:scale-105 transition"
          >
            🏠 Kembali ke Menu
          </button>
        </div>
      )}

      {screen === "game" && currentAnimal && (
        <div className="animate-fadein relative z-10 min-h-screen flex flex-col items-center px-4 py-8 gap-6">
          <div className="mt-4 flex items-center gap-3 flex-wrap justify-center">
            <div className="px-5 py-2 bg-white/90 rounded-full text-lg font-bold shadow text-slate-800">
              {gameMode === "endless"
                ? `🐾 Soal ke-${roundNumber}`
                : `🐾 Soal ${roundNumber}/${TOTAL_ROUNDS}`}
            </div>
            <div
              className={`px-6 py-2 rounded-full text-2xl font-bold shadow ${
                timeLeft <= 10 ? "bg-red-400 text-white animate-pulse" : "bg-white/90 text-slate-800"
              }`}
            >
              ⏱️ {timeLeft}s
            </div>
            {streak >= 2 && (
              <div className="px-5 py-2 bg-yellow-300 rounded-full text-lg font-bold shadow text-slate-800 animate-pulse">
                🔥 {streak} Streak!
              </div>
            )}
          </div>

          <div className="w-full max-w-md h-3 bg-white/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-400 to-red-400 transition-all duration-1000 ease-linear"
              style={{ width: `${(timeLeft / ROUND_TIME) * 100}%` }}
            />
          </div>

          <div className="max-w-2xl w-full bg-white/95 rounded-3xl shadow-xl p-6 md:p-8 flex flex-col items-center gap-4">
            <p className="text-xl md:text-2xl text-center font-semibold text-slate-700">
              {question}
            </p>
            <div className="flex gap-3">
              <button onClick={() => speak(question)}
                className="px-5 py-2 rounded-full bg-sky-400 hover:bg-sky-500 text-white font-bold shadow">
                🔊 Baca Ulang
              </button>
              <button
                onClick={useHint}
                disabled={hintUsed || !!selectedId}
                className={`px-5 py-2 rounded-full font-bold shadow text-white transition ${
                  hintUsed ? "bg-slate-300 cursor-not-allowed" : "bg-purple-400 hover:bg-purple-500"
                }`}
              >
                💡 Petunjuk
              </button>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-4 md:gap-6 mt-2">
            {choices.map((c) => {
              const isCorrectChoice = currentAnimal.id === c.id;
              const showCorrectHighlight = !!selectedId && isCorrectChoice;
              const showWrongHighlight = wrongId === c.id;
              const isEliminated = eliminatedChoiceId === c.id;
              const hasRealPhoto = REAL_PHOTO_IDS.includes(c.id) && photoUrls[c.id];

              if (isEliminated) {
                return (
                  <div
                    key={c.id}
                    className="w-28 h-28 md:w-36 md:h-36 rounded-3xl bg-slate-300/50 shadow-lg flex items-center justify-center text-4xl opacity-50"
                  >
                    ❌
                  </div>
                );
              }

              return (
                <button key={c.id} onClick={() => handleChoice(c.id)}
                  disabled={!!selectedId || timedOut}
                  className={`w-28 h-28 md:w-36 md:h-36 rounded-3xl bg-white shadow-lg flex flex-col items-center justify-center gap-1 text-5xl md:text-6xl transition overflow-hidden
                    ${showWrongHighlight ? "animate-shake bg-red-200" : ""}
                    ${showCorrectHighlight ? "bg-green-200 scale-105 ring-4 ring-green-400" : ""}
                    ${!selectedId ? "hover:scale-105" : ""}`}>
                  {hasRealPhoto ? (
                    <img
                      src={photoUrls[c.id]}
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
        <div className="animate-fadein relative z-10 min-h-screen flex flex-col items-center justify-center gap-6 px-4">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white drop-shadow text-center">
            🎉 Hebat! Jawabanmu Benar! 🎉
          </h2>

          <div className="flex gap-3 flex-wrap justify-center">
            {newlyCollected && (
              <div className="px-5 py-2 rounded-full bg-yellow-300 text-slate-800 font-bold shadow-lg animate-bounce">
                ✨ Hewan Baru Terkoleksi! ✨
              </div>
            )}
            {streak >= 2 && (
              <div className="px-5 py-2 rounded-full bg-orange-400 text-white font-bold shadow-lg">
                🔥 {streak} Streak!
              </div>
            )}
          </div>

          <div className="w-72 h-72 md:w-96 md:h-96 rounded-3xl overflow-hidden shadow-xl bg-white flex items-center justify-center">
            {videoUrl && !videoFailed ? (
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
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => {
                rewardVideoRef.current?.pause();
                setScreen("menu");
              }}
              className="px-8 py-4 rounded-full bg-white text-slate-700 font-bold text-xl shadow-lg hover:scale-105 transition">
              🏠 Menu
            </button>
            <button onClick={goToNextOrFinish}
              className="px-8 py-4 rounded-full bg-orange-400 hover:bg-orange-500 text-white font-bold text-xl shadow-lg hover:scale-105 transition">
              ➡️{" "}
              {gameMode === "endless"
                ? "Soal Berikutnya"
                : roundNumber >= TOTAL_ROUNDS
                ? "Lihat Hasil"
                : "Soal Berikutnya"}
            </button>
          </div>
        </div>
      )}

      {screen === "finished" && (
        <div className="animate-fadein relative z-10 min-h-screen flex flex-col items-center justify-center gap-6 px-4">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white drop-shadow text-center">
            🎊 Permainan Selesai! 🎊
          </h2>

          {newHighScore && (
            <div className="px-6 py-3 rounded-full bg-yellow-300 text-slate-800 font-bold shadow-lg animate-bounce text-lg">
              🏆 Rekor Baru! 🏆
            </div>
          )}

          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm flex flex-col items-center gap-4">
            <div className="text-7xl">
              {gameMode === "normal" && correctCount / TOTAL_ROUNDS === 1 ? "🏆" : "🐾"}
            </div>
            <p className="text-xl font-bold text-slate-700 text-center">{scoreMessage()}</p>

            {gameMode === "endless" && (
              <p className="text-slate-500 font-semibold text-center">
                Kamu bertahan sampai soal ke-{roundNumber}
              </p>
            )}

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

            <div className="w-full flex gap-3">
              <div className="flex-1 bg-orange-100 rounded-2xl py-3 text-center">
                <p className="text-lg font-extrabold text-orange-600">🏆 {bestScoreEver}/{TOTAL_ROUNDS}</p>
                <p className="text-xs font-semibold text-orange-700">Skor Terbaik Normal</p>
              </div>
              <div className="flex-1 bg-yellow-100 rounded-2xl py-3 text-center">
                <p className="text-lg font-extrabold text-yellow-600">🔥 {bestStreakEver}</p>
                <p className="text-xs font-semibold text-yellow-700">Streak Terbaik</p>
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
        <div className="animate-fadein relative z-10 min-h-screen flex items-center justify-center px-4 py-8">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md flex flex-col gap-6">
            <h2 className="text-3xl font-bold text-center text-slate-700">⚙️ Pengaturan</h2>

            <div className="flex flex-col gap-2">
              <label className="font-semibold text-slate-600">🙋 Nama Kamu</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Masukkan namamu"
                  className="flex-1 px-4 py-2 rounded-xl border-2 border-slate-200 focus:border-orange-400 outline-none text-slate-700"
                />
                <button
                  onClick={savePlayerName}
                  className="px-4 py-2 rounded-xl bg-orange-400 hover:bg-orange-500 text-white font-bold"
                >
                  Simpan
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-semibold text-slate-600">
                🔊 Volume Suara: {Math.round(volume * 100)}%
              </label>
              <input type="range" min={0} max={1} step={0.05} value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))} />
            </div>

            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-600">🎵 Musik Latar</label>
              <button
                onClick={() => setBgmEnabled((b) => !b)}
                className={`px-5 py-2 rounded-full font-bold text-white transition ${
                  bgmEnabled ? "bg-green-400" : "bg-slate-300"
                }`}
              >
                {bgmEnabled ? "Nyala" : "Mati"}
              </button>
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