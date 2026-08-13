"use client";

import { useEffect, useRef, useState } from "react";

// The Web Speech API isn't in TypeScript's standard DOM lib, and isn't
// implemented consistently across browsers (solid in Chrome/Edge/Safari,
// unsupported in Firefox) — hence the minimal hand-rolled types below.
interface SpeechRecognitionAlternative {
  transcript: string;
}

interface SpeechRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResultEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

type SpeechRecognitionWindow = typeof window & {
  SpeechRecognition?: new () => SpeechRecognitionInstance;
  webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
};

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionInstance) | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as SpeechRecognitionWindow;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function VoiceDictateButton({ onTranscript }: { onTranscript: (text: string) => void }) {
  // Assume support during the initial (SSR-matching) render, then correct
  // after mount — this is browser-only capability info, unknowable on the
  // server, so it can't be decided before the first client render.
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onTranscriptRef = useRef(onTranscript);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  });

  useEffect(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- browser capability check, unavoidable outside an effect
      setSupported(false);
      return;
    }

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript;
        }
      }
      if (transcript.trim()) onTranscriptRef.current(transcript.trim());
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;

    return () => recognition.stop();
  }, []);

  function toggle() {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      recognitionRef.current.start();
      setListening(true);
    }
  }

  if (!supported) {
    return (
      <span
        className="text-xs text-neutral-500"
        title="This browser doesn't support in-page dictation. Try your OS's built-in dictation shortcut instead (Win+H on Windows, Fn Fn on Mac)."
      >
        In-page dictation isn&apos;t supported in this browser &mdash; try your OS&apos;s dictation shortcut instead.
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
        listening
          ? "border-red-500/50 bg-red-500/10 text-red-300"
          : "border-neutral-700 bg-neutral-950 text-neutral-300 hover:border-amber-500 hover:text-amber-400"
      }`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5"
      >
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <path d="M12 19v4" />
        <path d="M8 23h8" />
      </svg>
      {listening ? "Listening… tap to stop" : "Dictate"}
    </button>
  );
}
