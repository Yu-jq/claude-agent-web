import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface SpeechWindow extends Window {
  webkitSpeechRecognition?: typeof SpeechRecognition;
  SpeechRecognition?: typeof SpeechRecognition;
}

const getRecognitionLanguage = (language: string) => {
  const normalized = language.toLowerCase();
  if (normalized.startsWith('en')) return 'en-US';
  if (normalized.startsWith('ja')) return 'ja-JP';
  if (normalized.startsWith('ko')) return 'ko-KR';
  return 'zh-CN';
};

export function useSpeechRecognition() {
  const { t, i18n } = useTranslation();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const win = window as SpeechWindow;
    const SpeechRecognitionAPI =
      win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      return;
    }

    setIsSupported(true);
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = getRecognitionLanguage(i18n.language);

    recognition.onresult = (event) => {
      const current = event.resultIndex;
      const transcriptText = event.results[current][0].transcript;
      setTranscript(transcriptText);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);

      if (event.error === 'not-allowed') {
        toast.error(t('speech.notAllowed'));
      } else if (event.error === 'no-speech') {
        toast.error(t('speech.noSpeech'));
      } else if (event.error === 'network') {
        toast.error(t('speech.network'));
      } else {
        toast.error(t('speech.error', { error: event.error }));
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [i18n.language, t]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      try {
        recognitionRef.current.start();
        setIsListening(true);
        toast.info(t('speech.start'));
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        toast.error(t('speech.startFailed'));
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const resetTranscript = () => {
    setTranscript('');
  };

  return {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  };
}
