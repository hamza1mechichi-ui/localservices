"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Trash2, Loader2, Play, Pause } from "lucide-react";
import { useLang } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n";

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VoiceRecorder({
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
    streamRef.current?.getTracks().forEach((track) => track.stop());
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

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stopStream();
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const localUrl = URL.createObjectURL(blob);
        setLocalBlobUrl(localUrl);
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
      if (data.url) {
        setAudioUrl(data.url);
        onUploaded(data.url);
      } else {
        setError(data.error || t("comp.voiceUploadError", lang));
      }
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
    if (playing) {
      audioElRef.current.pause();
    } else {
      audioElRef.current.play();
    }
  }

  const playableUrl = localBlobUrl || audioUrl;

  return (
    <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-600">
      {!playableUrl ? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={recording ? stopRecording : startRecording}
            disabled={uploading}
            className={`relative flex size-11 shrink-0 items-center justify-center rounded-full text-white transition ${
              recording ? "bg-red-600" : "bg-blue-600 hover:bg-blue-700"
            } disabled:opacity-50`}
            aria-label={recording ? t("comp.stopRecording", lang) : t("comp.startRecording", lang)}
          >
            {recording && <span className="absolute inset-0 animate-ping rounded-full bg-red-600 opacity-75" />}
            {uploading ? (
              <Loader2 size={18} className="relative animate-spin" />
            ) : recording ? (
              <Square size={16} className="relative" />
            ) : (
              <Mic size={18} className="relative" />
            )}
          </button>

          <div className="text-start">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {uploading
                ? t("comp.voiceUploading", lang)
                : recording
                ? t("comp.recordingInProgress", lang)
                : t("comp.addVoiceNote", lang)}
            </p>
            {recording && <p className="text-xs text-red-600">{formatDuration(duration)}</p>}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700"
            aria-label={playing ? t("comp.pause", lang) : t("comp.play", lang)}
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <audio
            ref={audioElRef}
            src={playableUrl}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            className="hidden"
          />
          <p className="flex-1 text-start text-sm text-gray-600 dark:text-gray-300">{t("comp.voiceNoteReady", lang)}</p>
          <button
            type="button"
            onClick={handleDelete}
            className="p-1.5 text-red-500 transition hover:text-red-700"
            aria-label={t("comp.deleteVoiceNote", lang)}
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-start text-xs text-red-600">{error}</p>}
    </div>
  );
}
