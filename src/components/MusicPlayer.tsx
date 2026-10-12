import { useEffect, useRef, useState } from "react";
import { Music, Pause } from "lucide-react";
import musicAsset from "@/assets/parabens-xuxa.mp3.asset.json";

export function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = new Audio(musicAsset.url);
    audio.loop = true;
    audio.volume = 0.5;
    audioRef.current = audio;

    // Navegadores bloqueiam autoplay com som: tenta tocar na primeira interação.
    const tryPlay = () => {
      audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => {});
    };
    tryPlay();
    const events = ["click", "touchstart", "keydown"] as const;
    events.forEach((e) => window.addEventListener(e, tryPlay, { once: true }));

    return () => {
      events.forEach((e) => window.removeEventListener(e, tryPlay));
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={playing ? "Pausar música" : "Tocar música"}
      title={playing ? "Pausar música" : "Tocar música"}
      className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-[#B28A42]/60 bg-[#FFFDF8] text-[#79551F] shadow-lg transition hover:scale-105"
    >
      {playing ? <Pause className="h-5 w-5" /> : <Music className="h-5 w-5" />}
    </button>
  );
}
