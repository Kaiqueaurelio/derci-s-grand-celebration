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

  // Sem botão visível: a música toca em loop a partir do primeiro toque.
  void playing;
  return null;
}
