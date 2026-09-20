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

/** Wraps the browser's built-in speech recognition for dictating short work descriptions. The browser's speech service may process audio remotely, depending on browser settings. */
export function useDictation({ onResult, onError }: UseDictationOptions) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  const interimRef = useRef('');
  onResultRef.current = onResult;
  onErrorRef.current = onError;

  const stop = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch { /* Already stopped by the browser. */ }
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionConstructor();
    if (!Ctor) {
      onErrorRef.current?.('not-supported');
      return;
    }

    // onstart is asynchronous: a second tap must not create a competing session.
    if (recognitionRef.current) return;

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => { if (recognitionRef.current === recognition) setIsListening(true); };

    recognition.onresult = (event) => {
      if (recognitionRef.current !== recognition) return;
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
      if (recognitionRef.current !== recognition) return;
      interimRef.current = '';
      setIsListening(false);
      onErrorRef.current?.(event.error);
    };

    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return;
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
    try { recognition.start(); } catch (error) {
      recognitionRef.current = null;
      setIsListening(false);
      onErrorRef.current?.(error instanceof DOMException && error.name === 'NotAllowedError' ? 'not-allowed' : 'start-failed');
    }
  }, []);

  // Stop on unmount so a left-open mic doesn't keep listening after the editor closes.
  useEffect(() => () => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    interimRef.current = '';
    if (recognition) {
      recognition.onstart = recognition.onresult = recognition.onerror = recognition.onend = null;
      try { recognition.stop(); } catch { /* Browser already stopped. */ }
    }
  }, []);

  return { isListening, start, stop };
}
