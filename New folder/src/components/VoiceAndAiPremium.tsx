"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Trash2, Loader2, Play, Pause, Wand2 } from "lucide-react";
import { useLang } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n";
import { generateRequestText } from "@/lib/actions/ai";

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ============================================================
   AiScanOverlay — enveloppe n'importe quel bloc de champs et y
   projette le balayage lumineux violet/bleu pendant la réécriture IA.
   ============================================================ */
export function AiScanOverlay({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      {active && <div className="animate-ai-scan" aria-hidden />}
    </div>
  );
}

/* ============================================================
   AiMagicSwitch — interrupteur "magique" : un clic déclenche la
   réécriture IA et pilote le scanner via onScanChange.
   ============================================================ */
export function AiMagicSwitch({
  getKeywords,
  onGenerated,
  onScanChange,
}: {
  getKeywords: () => string;
  onGenerated: (result: { title: string; description: string }) => void;
  onScanChange?: (scanning: boolean) => void;
}) {
  const { lang } = useLang();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    const keywords = getKeywords().trim();
    if (keywords.length < 3) {
      setError(t("comp.aiNeedKeywords", lang));
      return;
    }
    setError("");
    setLoading(true);
    onScanChange?.(true);

    const result = await generateRequestText(keywords, lang);

    setLoading(false);
    onScanChange?.(false);

    if (!result.success) {
      setError(result.error);
      return;
    }
    onGenerated(result.data);
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        aria-pressed={loading}
        className={`tactile group relative inline-flex items-center gap-2.5 rounded-full p-1 pe-4 shadow-lg transition-all duration-300 ${
          loading
            ? "bg-gradient-to-r from-violet-600 to-neo-blue shadow-violet-500/30"
            : "bg-zinc-900 shadow-black/10 hover:shadow-violet-500/20 dark:bg-neo-obsidian"
        }`}
      >
        {/* Halo derrière le rond (comme un interrupteur physique) */}
        <span
          className={`relative flex size-8 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
            loading ? "translate-x-0 bg-white text-violet-600" : "bg-gradient-to-br from-violet-500 to-neo-blue text-white"
          }`}
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={14} />}
        </span>
        <span className="text-sm font-medium text-white">
          {loading ? t("comp.aiGenerating", lang) : t("comp.aiAssist", lang)}
        </span>
      </button>
      {error && <p className="mt-1.5 text-start text-xs text-red-500">{error}</p>}
    </div>
  );
}

/* ============================================================
   MysticVoiceRecorder — cercle mystique qui se transforme en onde
   sinusoïdale dansante (CSS pur) pendant l'enregistrement.
   ============================================================ */
const WAVE_BARS = 16;

export function MysticVoiceRecorder({
  onUploaded,
  onRemove,
  initialUrl,
}: {
  onUploaded: (url: string) => void;
  onRemove?: () => void;
  initialUrl?: string | null;
}) {
  const { lang } = useLang();
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(initialUrl ?? null);
  const [localBlobUrl, setLocalBlobUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => stopStream, [stopStream]);

  async function startRecording() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError(t("comp.voiceNotSupported", lang));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stopStream();
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setLocalBlobUrl(URL.createObjectURL(blob));
        await uploadBlob(blob);
      };

      recorder.start();
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      setError(t("comp.voicePermissionDenied", lang));
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function uploadBlob(blob: Blob) {
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.set("file", blob, `note-vocale-${Date.now()}.webm`);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) { setAudioUrl(data.url); onUploaded(data.url); }
      else setError(data.error || t("comp.voiceUploadError", lang));
    } catch {
      setError(t("comp.voiceUploadError", lang));
    } finally {
      setUploading(false);
    }
  }

  function handleDelete() {
    setAudioUrl(null);
    setLocalBlobUrl(null);
    setDuration(0);
    setPlaying(false);
    onRemove?.();
  }

  function togglePlay() {
    if (!audioElRef.current) return;
    if (playing) audioElRef.current.pause();
    else audioElRef.current.play();
  }

  const playableUrl = localBlobUrl || audioUrl;

  // --- État "prêt" : pastille de lecture premium ---
  if (playableUrl) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-violet-200/60 bg-gradient-to-r from-violet-50 to-blue-50 p-3 dark:border-violet-500/20 dark:from-violet-500/10 dark:to-blue-500/10">
        <button
          type="button"
          onClick={togglePlay}
          className="tactile flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-neo-blue text-white shadow-md"
          aria-label={playing ? t("comp.pause", lang) : t("comp.play", lang)}
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <audio ref={audioElRef} src={playableUrl} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} className="hidden" />
        <p className="flex-1 text-start text-sm font-medium text-zinc-700 dark:text-zinc-200">{t("comp.voiceNoteReady", lang)}</p>
        <button type="button" onClick={handleDelete} className="tactile p-1.5 text-red-500 transition hover:text-red-700" aria-label={t("comp.deleteVoiceNote", lang)}>
          <Trash2 size={16} />
        </button>
      </div>
    );
  }

  // --- État "enregistrement" : le cercle devient une onde dansante ---
  if (recording || uploading) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50/60 p-3 dark:border-red-500/20 dark:bg-red-500/5">
        <button
          type="button"
          onClick={stopRecording}
          disabled={uploading}
          className="tactile relative flex size-11 shrink-0 items-center justify-center rounded-full bg-red-600 text-white shadow-md disabled:opacity-60"
          aria-label={t("comp.stopRecording", lang)}
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Square size={14} />}
        </button>

        <div className="flex h-8 flex-1 items-center justify-center gap-[3px] overflow-hidden">
          {Array.from({ length: WAVE_BARS }).map((_, i) => (
            <span
              key={i}
              className="animate-voice-wave w-[3px] rounded-full bg-gradient-to-t from-neo-blue to-violet-500"
              style={{
                height: "100%",
                animationDelay: `${(i % 8) * 0.08}s`,
                animationDuration: `${0.8 + (i % 5) * 0.12}s`,
              }}
            />
          ))}
        </div>

        <span className="shrink-0 text-xs font-medium tabular-nums text-red-600">{formatDuration(duration)}</span>
      </div>
    );
  }

  // --- État "repos" : cercle mystique avec halo respirant ---
  return (
    <div>
      <button
        type="button"
        onClick={startRecording}
        aria-label={t("comp.startRecording", lang)}
        className="tactile group relative flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3 transition hover:border-violet-300 dark:border-white/10 dark:bg-neo-obsidian dark:hover:border-violet-500/40"
      >
        <span className="relative flex size-11 shrink-0 items-center justify-center">
          <span className="animate-mystic-breathe absolute inset-0 rounded-full bg-gradient-to-br from-violet-500 to-neo-blue blur-md" aria-hidden />
          <span className="relative flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-neo-blue text-white shadow-lg">
            <Mic size={17} />
          </span>
        </span>
        <span className="text-start text-sm font-medium text-zinc-600 dark:text-zinc-300">{t("comp.addVoiceNote", lang)}</span>
      </button>
      {error && <p className="mt-1.5 text-start text-xs text-red-500">{error}</p>}
    </div>
  );
}
