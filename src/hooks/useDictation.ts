import { useCallback, useEffect, useRef, useState } from 'react';

// The Web Speech API has no entry in TypeScript's DOM lib; declare the
// minimal surface this hook actually uses.
interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: { transcript: string };
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

function getRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}

export function isDictationSupported(): boolean {
  return !!getRecognitionConstructor();
}

interface UseDictationOptions {
  /** Called with each recognized segment. isFinal segments should be appended; interim ones are a live preview only. */
  onResult: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

/** Wraps the browser's built-in speech recognition for dictating short work descriptions. No audio or transcript leaves the device. */
export function useDictation({ onResult, onError }: UseDictationOptions) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  const interimRef = useRef('');
  onResultRef.current = onResult;
  onErrorRef.current = onError;

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionConstructor();
    if (!Ctor) {
      onErrorRef.current?.('not-supported');
      return;
    }

    // Starting again while a session is active would leak the old listener.
    recognitionRef.current?.stop();

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript.trim();
        if (!transcript) continue;
        if (result.isFinal) finalText += (finalText ? ' ' : '') + transcript;
        else interimText += (interimText ? ' ' : '') + transcript;
      }
      if (finalText) onResultRef.current(finalText, true);
      interimRef.current = interimText;
      onResultRef.current(interimText, false);
    };

    recognition.onerror = (event) => {
      onErrorRef.current?.(event.error);
    };

    recognition.onend = () => {
      // Chrome can discard the last partial phrase when Stop is pressed.
      // Preserve it so every recording reaches the editable transcript.
      if (interimRef.current) {
        onResultRef.current(interimRef.current, true);
        interimRef.current = '';
      }
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    interimRef.current = '';
    recognition.start();
  }, []);

  // Stop on unmount so a left-open mic doesn't keep listening after the editor closes.
  useEffect(() => stop, [stop]);

  return { isListening, start, stop };
}
