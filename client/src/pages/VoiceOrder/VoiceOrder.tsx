import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import type { ChangeEvent } from 'react';
import {
  AudioLines,
  Check,
  ChevronRight,
  Circle,
  Headphones,
  History,
  Loader2,
  Mic,
  MicOff,
  RefreshCcw,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Wand2,
  X,
  XCircle,
} from 'lucide-react';
import Button from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Textarea from '@/components/ui/textarea';
import Input from '@/components/ui/input';
import QuantityStepper from '@/components/ui/QuantityStepper/QuantityStepper';
import Badge from '@/components/ui/badge';
import showToast from '@/components/ui/Toast';
import { addItem, selectSubtotalPaise } from '@/store/slices/cartSlice';
import { selectItemCount } from '@/store/slices/cartSlice';
import { formatINR } from '@/utils/currency';
import { createOrder } from '@/api/orders';
import { parseUtterance } from '@/features/voice-order/parser';
import { searchProducts } from '@/features/voice-order/api';
import type { ParsedItem, ParseResult, VoiceProductHit } from '@/features/voice-order/types';
import { paths } from '@/routes/paths';

const ENABLE_STT_UPLOAD = import.meta.env.VITE_ENABLE_STT_UPLOAD === 'true';

interface UtteranceEntry {
  id: string;
  transcript: string;
  source: 'speech' | 'manual' | 'recording';
  createdAt: number;
  result: ParseResult;
  feedback?: 'positive' | 'negative';
}

interface ItemSearchEntry {
  item: ParsedItem;
  hits: VoiceProductHit[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error?: string;
}

const createId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

const listeningMotion = {
  animate: {
    scale: [1, 1.05, 0.95, 1],
    boxShadow: [
      '0 0 0 0 rgba(59,130,246,0.4)',
      '0 0 0 12px rgba(59,130,246,0)',
      '0 0 0 0 rgba(59,130,246,0.35)',
      '0 0 0 0 rgba(59,130,246,0)',
    ],
  },
  transition: { duration: 2.2, repeat: Infinity, ease: [0.42, 0, 0.58, 1] as const },
};

const VoiceOrder = () => {
  const dispatch = useDispatch();
  const subtotalPaise = useSelector(selectSubtotalPaise);
  const cartItemCount = useSelector(selectItemCount);
  const [transcript, setTranscript] = useState('');
  const [manualTranscript, setManualTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [supportsSpeechRecognition, setSupportsSpeechRecognition] = useState(false);
  const [supportsRecording, setSupportsRecording] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [entries, setEntries] = useState<UtteranceEntry[]>([]);
  const [searchEntries, setSearchEntries] = useState<ItemSearchEntry[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [manualQuery, setManualQuery] = useState('');
  const [activeShopFilter, setActiveShopFilter] = useState<'all' | string>('all');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [placingOrder, setPlacingOrder] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const searchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupportsSpeechRecognition(Boolean(SpeechRecognition));
  }, []);

  useEffect(() => {
    setSupportsRecording(Boolean(navigator.mediaDevices?.getUserMedia));
  }, []);

  useEffect(() => () => {
    recognitionRef.current?.stop();
    searchAbortRef.current?.abort();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const resetListeningState = useCallback(() => {
    setIsListening(false);
    setInterimTranscript('');
    finalTranscriptRef.current = '';
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    resetListeningState();
  }, [resetListeningState]);

  const handleRecognitionResult = useCallback((event: any) => {
    let interim = '';
    let final = '';

    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      const transcriptValue = result[0]?.transcript ?? '';
      if (result.isFinal) {
        final += `${transcriptValue} `;
      } else {
        interim += `${transcriptValue} `;
      }
    }

    setInterimTranscript(interim.trim());
    if (final) {
      finalTranscriptRef.current = `${finalTranscriptRef.current} ${final}`.trim();
      setTranscript(finalTranscriptRef.current);
    }
  }, []);

  const processTranscript = useCallback(
    async (text: string, source: UtteranceEntry['source']) => {
      const cleaned = text.trim();
      if (!cleaned) {
        showToast('We could not hear anything. Try again?', 'info');
        return;
      }

      setProcessing(true);
      setSearchError(null);
      const result = parseUtterance(cleaned);

      console.info('voice-order:parse', {
        transcript: cleaned,
        items: result.items,
        guesses: result.guesses,
        language: result.languageHint,
      });

      const entry: UtteranceEntry = {
        id: createId(),
        transcript: cleaned,
        source,
        createdAt: Date.now(),
        result,
      };

      setEntries((prev) => [entry, ...prev].slice(0, 25));
      setSearchEntries(result.items.map((item) => ({ item, hits: [], status: 'loading' })));
      setActiveShopFilter('all');

      if (result.items.length === 0) {
        setProcessing(false);
        setSearchEntries([]);
        return;
      }

      searchAbortRef.current?.abort();
      const controller = new AbortController();
      searchAbortRef.current = controller;

      await Promise.all(
        result.items.map(async (item) => {
          try {
            const hits = await searchProducts(item.name, { signal: controller.signal });
            console.info('voice-order:search', {
              name: item.name,
              requestedQuantity: item.quantity,
              unit: item.unit,
              hitCount: hits.length,
            });
            setSearchEntries((prev) =>
              prev.map((entryState) =>
                entryState.item.name === item.name
                  ? { ...entryState, status: 'succeeded', hits }
                  : entryState,
              ),
            );
            setQuantities((prev) => {
              const next = { ...prev };
              const defaultQty = Math.max(1, Math.round(item.quantity || 1));
              hits.forEach((hit) => {
                if (!next[hit.id]) {
                  next[hit.id] = defaultQty || 1;
                }
              });
              return next;
            });
            if (hits.length === 0) {
              setSearchError((prevError) =>
                prevError ? prevError : `No matches yet for ${item.name}.`,
              );
            }
          } catch (error) {
            if ((error as any)?.name === 'CanceledError' || (error as any)?.name === 'AbortError') {
              return;
            }
            console.error('voice-order:search-error', error);
            setSearchEntries((prev) =>
              prev.map((entryState) =>
                entryState.item.name === item.name
                  ? {
                      ...entryState,
                      status: 'failed',
                      error: 'We could not reach the marketplace. Please retry.',
                    }
                  : entryState,
              ),
            );
            setSearchError('Network issue while fetching products. Please try again.');
          }
        }),
      );

      setProcessing(false);
    },
    [],
  );

  const handleRecognitionEnd = useCallback(() => {
    setIsListening(false);
    setInterimTranscript('');
    const finalValue = finalTranscriptRef.current.trim();
    finalTranscriptRef.current = '';
    if (finalValue) {
      void processTranscript(finalValue, 'speech');
    }
  }, [processTranscript]);

  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Speech recognition is not supported on this browser yet.', 'error');
      return;
    }

    try {
      const recognition: any = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;
      recognition.onstart = () => {
        setIsListening(true);
        setIsTranscribing(true);
        setTranscript('');
        setInterimTranscript('');
        finalTranscriptRef.current = '';
      };
      recognition.onresult = (event) => {
        handleRecognitionResult(event);
      };
      recognition.onerror = (event) => {
        console.error('voice-order:recognition-error', event);
        showToast('We lost the mic for a bit. Try again?', 'error');
        resetListeningState();
      };
      recognition.onend = () => {
        setIsTranscribing(false);
        handleRecognitionEnd();
      };
      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      console.error('voice-order:start-error', error);
      showToast('Microphone could not start. Check permissions and retry.', 'error');
      resetListeningState();
    }
  }, [handleRecognitionEnd, handleRecognitionResult, resetListeningState]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const handleManualTranscriptChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setManualTranscript(event.target.value);
    },
    [],
  );

  const handleManualProcess = useCallback(() => {
    if (!manualTranscript.trim()) {
      showToast('Type something to parse first.', 'info');
      return;
    }
    void processTranscript(manualTranscript, 'manual');
  }, [manualTranscript, processTranscript]);

  const handleManualQueryChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setManualQuery(event.target.value);
  }, []);

  const handleManualSearch = useCallback(async () => {
    const query = manualQuery.trim();
    if (!query) {
      showToast('Type a product to search for.', 'info');
      return;
    }

    setProcessing(true);
    setSearchEntries([
      {
        item: { name: query, quantity: 1, unit: 'piece', raw: query },
        hits: [],
        status: 'loading',
      },
    ]);
    setSearchError(null);
    setActiveShopFilter('all');

    try {
      const hits = await searchProducts(query, {});
      setSearchEntries([
        {
          item: { name: query, quantity: 1, unit: 'piece', raw: query },
          hits,
          status: 'succeeded',
        },
      ]);
      setQuantities((prev) => {
        const next = { ...prev };
        hits.forEach((hit) => {
          if (!next[hit.id]) {
            next[hit.id] = 1;
          }
        });
        return next;
      });
      if (hits.length === 0) {
        setSearchError('No matches yet. Try a different keyword?');
      }
    } catch (error) {
      console.error('voice-order:manual-search-error', error);
      setSearchEntries([
        {
          item: { name: query, quantity: 1, unit: 'piece', raw: query },
          hits: [],
          status: 'failed',
          error: 'Could not reach the marketplace. Retry in a moment.',
        },
      ]);
      setSearchError('Network issue while searching. Please retry.');
    } finally {
      setProcessing(false);
    }
  }, [manualQuery]);

  const handleAddToCart = useCallback(
    (hit: VoiceProductHit, item: ParsedItem) => {
      const rawQty = quantities[hit.id] ?? Math.max(1, Math.round(item.quantity || 1));
      const qty = Number.isFinite(rawQty) && rawQty > 0 ? Math.round(rawQty) : 1;
      dispatch(
        addItem({
          productId: hit.id,
          shopId: hit.shopId,
          name: hit.name,
          image: hit.image,
          pricePaise: hit.pricePaise,
          qty,
        }),
      );
      showToast(`${hit.name} added to cart`, 'success');
    },
    [dispatch, quantities],
  );

  const handleBuyNow = useCallback(
    async (hit: VoiceProductHit, item: ParsedItem) => {
      const qty = Math.max(1, Math.round(quantities[hit.id] ?? item.quantity ?? 1));
      setPlacingOrder(hit.id);
      try {
        const order = await createOrder({
          shopId: hit.shopId,
          items: [
            {
              productId: hit.id,
              quantity: qty,
            },
          ],
        });
        showToast('Order placed successfully');
        window.location.assign(paths.orders.detail(order.id));
      } catch (error) {
        console.error('voice-order:buy-now-error', error);
        showToast('Unable to place the order right now. Please try again.', 'error');
      } finally {
        setPlacingOrder(null);
      }
    },
    [quantities],
  );

  const handleFeedback = useCallback((entryId: string, value: 'positive' | 'negative') => {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              feedback: value,
            }
          : entry,
      ),
    );
    console.info('voice-order:feedback', { entryId, value });
  }, []);

  const handleRecordingToggle = useCallback(async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      return;
    }

    if (!supportsRecording) {
      showToast('Recording is not supported on this device yet.', 'error');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        setIsRecording(false);
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordingUrl(url);
        if (ENABLE_STT_UPLOAD) {
          console.info('voice-order:upload-stt', { size: blob.size });
          // Placeholder: integrate server STT endpoint when available.
        }
      };

      recorder.start();
      setIsRecording(true);
      showToast('Recording... tap again to stop', 'info');
    } catch (error) {
      console.error('voice-order:recording-error', error);
      showToast('Microphone access denied. Please allow audio permissions.', 'error');
    }
  }, [isRecording, supportsRecording]);

  const uniqueShops = useMemo(() => {
    const map = new Map<string, { shopId: string; shopName: string }>();
    searchEntries.forEach((entry) => {
      entry.hits.forEach((hit) => {
        if (!map.has(hit.shopId)) {
          map.set(hit.shopId, { shopId: hit.shopId, shopName: hit.shopName });
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => a.shopName.localeCompare(b.shopName));
  }, [searchEntries]);

  const flattenedHits = useMemo(() => {
    return searchEntries.flatMap((entry) =>
      entry.hits
        .filter((hit) => activeShopFilter === 'all' || hit.shopId === activeShopFilter)
        .map((hit) => ({ hit, item: entry.item })),
    );
  }, [activeShopFilter, searchEntries]);

  const isLoadingResults = processing || searchEntries.some((entry) => entry.status === 'loading');

  const subtotalDisplay = formatINR(subtotalPaise);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-50/70 to-slate-100 py-6 dark:from-slate-950 dark:via-slate-950/80 dark:to-slate-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 rounded-3xl bg-white/80 p-6 shadow-sm backdrop-blur dark:bg-slate-900/70">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-100">New</Badge>
              <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Voice Order</h1>
              <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
                Speak in Telugu, Hindi, English or mix them freely. Manacity listens, understands and lines up fresh produce across shops so you can add items to cart or order instantly from one place.
              </p>
            </div>
            <div className="flex flex-col items-end gap-3 text-right">
              <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Cart summary
              </span>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
                <ShoppingCart className="h-4 w-4 text-blue-500" aria-hidden="true" />
                <span>{cartItemCount} items</span>
                <span className="text-slate-400">•</span>
                <span>{subtotalDisplay}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr] xl:grid-cols-[420px_1fr]">
          <Card className="h-full border border-slate-200/80 bg-white/90 shadow-sm backdrop-blur dark:border-slate-800/60 dark:bg-slate-900/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                <Mic className="h-5 w-5 text-blue-500" aria-hidden="true" /> Voice console
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                Tap the mic, speak your order, review the transcript and send it for understanding.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <motion.button
                  type="button"
                  aria-label={isListening ? 'Stop listening' : 'Start listening'}
                  aria-pressed={isListening}
                  className="relative inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                  onClick={toggleListening}
                  {...(isListening ? listeningMotion : {})}
                >
                  {isListening ? <MicOff className="h-7 w-7" aria-hidden="true" /> : <Mic className="h-7 w-7" aria-hidden="true" />}
                  <span className="sr-only">{isListening ? 'Stop listening' : 'Start listening'}</span>
                </motion.button>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {isListening ? 'Listening…' : isTranscribing ? 'Transcribing…' : 'Ready when you are'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {supportsSpeechRecognition
                      ? 'Auto-stops on silence. You can also edit the transcript below.'
                      : 'Browser speech recognition unavailable. Use recording or manual entry.'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="voice-transcript" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Transcript preview
                </label>
                <div
                  id="voice-transcript"
                  aria-live="polite"
                  className="min-h-[96px] rounded-2xl border border-slate-200 bg-white/90 p-4 text-sm text-slate-800 shadow-inner dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100"
                >
                  {interimTranscript ? (
                    <span className="text-slate-500 dark:text-slate-400">{interimTranscript}</span>
                  ) : transcript ? (
                    <span>{transcript}</span>
                  ) : (
                    <span className="text-slate-400">Tap the mic or type your order.</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setTranscript('');
                      setInterimTranscript('');
                      finalTranscriptRef.current = '';
                    }}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                    Clear
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void processTranscript(transcript || interimTranscript, 'manual')}
                    className="gap-2"
                    disabled={processing || !(transcript || interimTranscript)}
                  >
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    Understand this
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="voice-manual" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Prefer typing?
                </label>
                <Textarea
                  id="voice-manual"
                  value={manualTranscript}
                  onChange={handleManualTranscriptChange}
                  placeholder="Example: oka kilo tomatolu"
                  aria-label="Manual order input"
                  className="rounded-2xl"
                />
                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={handleManualProcess} disabled={processing} className="gap-2">
                    <Wand2 className="h-4 w-4" aria-hidden="true" /> Parse text
                  </Button>
                  {supportsSpeechRecognition ? null : (
                    <div className="inline-flex items-center gap-2 rounded-2xl border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      <Headphones className="h-4 w-4" aria-hidden="true" />
                      Speech recognition coming soon for this browser
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white/70 p-4 dark:border-slate-800/60 dark:bg-slate-950/40">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Fallback recording</p>
                  <Badge variant="outline" className="text-xs">Beta</Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Record audio to send later for transcription. Perfect for unsupported browsers or very long orders.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    onClick={handleRecordingToggle}
                    variant={isRecording ? 'destructive' : 'secondary'}
                    className="gap-2"
                  >
                    {isRecording ? (
                      <>
                        <XCircle className="h-4 w-4" aria-hidden="true" /> Stop recording
                      </>
                    ) : (
                      <>
                        <AudioLines className="h-4 w-4" aria-hidden="true" /> Record audio
                      </>
                    )}
                  </Button>
                  {recordingUrl ? (
                    <a
                      className="flex items-center gap-2 text-xs font-medium text-blue-600 underline-offset-4 hover:underline dark:text-blue-300"
                      href={recordingUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <History className="h-3.5 w-3.5" aria-hidden="true" /> Listen to last clip
                    </a>
                  ) : null}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-200">
                  <span>Recent attempts</span>
                </div>
                <div className="space-y-2">
                  {entries.length === 0 ? (
                    <p className="text-xs text-slate-400">We will keep the last few transcripts you submit here.</p>
                  ) : (
                    entries.slice(0, 5).map((entry) => (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl border border-slate-200 bg-white/80 p-3 text-xs text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                              <History className="h-3 w-3" aria-hidden="true" />
                              {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <p className="text-slate-600 dark:text-slate-200">{entry.transcript}</p>
                            <div className="flex flex-wrap gap-2">
                              {entry.result.items.map((item) => (
                                <Badge key={`${entry.id}-${item.name}`} variant="outline">
                                  {item.quantity} {item.unit} • {item.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge variant="outline" className="text-[10px] uppercase">
                              {entry.result.languageHint === 'mixed'
                                ? 'Mixed'
                                : entry.result.languageHint === 'te'
                                ? 'Telugu'
                                : entry.result.languageHint === 'hi'
                                ? 'Hindi'
                                : 'English'}
                            </Badge>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${
                                  entry.feedback === 'positive'
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-100'
                                    : 'border-transparent text-slate-400 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-100'
                                }`}
                                onClick={() => handleFeedback(entry.id, 'positive')}
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${
                                  entry.feedback === 'negative'
                                    ? 'border-rose-300 bg-rose-50 text-rose-600 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-100'
                                    : 'border-transparent text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:hover:border-rose-500/40 dark:hover:bg-rose-500/10 dark:hover:text-rose-100'
                                }`}
                                onClick={() => handleFeedback(entry.id, 'negative')}
                              >
                                No
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-6">
            <Card className="border border-slate-200/80 bg-white/90 shadow-sm backdrop-blur dark:border-slate-800/60 dark:bg-slate-900/80">
              <CardHeader className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                    <ShoppingBag className="h-5 w-5 text-blue-500" aria-hidden="true" /> Matches across shops
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                    We fetch live products from every shop for each parsed item. Adjust quantities and add directly to cart.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={manualQuery}
                    onChange={handleManualQueryChange}
                    placeholder="Search manually"
                    className="h-9 w-48"
                  />
                  <Button onClick={handleManualSearch} variant="secondary" className="h-9 px-3 text-sm" disabled={processing}>
                    <RefreshCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                    Search
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {searchEntries.length === 0 && !processing ? (
                  <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50/60 p-8 text-center dark:border-slate-700 dark:bg-slate-950/30">
                    <Sparkles className="h-10 w-10 text-blue-500" aria-hidden="true" />
                    <div className="space-y-2">
                      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Say it in your style</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Try phrases like “oka kilo tomatolu”, “2 kg bendakayalu” or “one kilo tomato and half kilo onion”.
                      </p>
                    </div>
                  </div>
                ) : null}

                {entries[0]?.result.items.length === 0 && entries[0]?.result.guesses.length > 0 ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                    <p className="font-semibold">Did you mean:</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {entries[0]?.result.guesses.map((guess) => (
                        <Button
                          key={guess.name}
                          variant="outline"
                          size="sm"
                          className="h-8 gap-2 text-xs"
                          onClick={() => {
                            setManualQuery(guess.name);
                            void handleManualSearch();
                          }}
                        >
                          {guess.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {searchError ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
                    <XCircle className="h-5 w-5" aria-hidden="true" />
                    <div className="flex-1">{searchError}</div>
                    <Button variant="ghost" size="sm" onClick={() => setSearchError(null)} className="text-xs">
                      Dismiss
                    </Button>
                  </div>
                ) : null}

                {uniqueShops.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveShopFilter('all')}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition ${
                        activeShopFilter === 'all'
                          ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm dark:border-blue-400 dark:bg-blue-500/15 dark:text-blue-100'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-400/40 dark:hover:text-blue-200'
                      }`}
                    >
                      All shops
                    </button>
                    {uniqueShops.map((shop) => (
                      <button
                        key={shop.shopId}
                        type="button"
                        onClick={() => setActiveShopFilter(shop.shopId)}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition ${
                          activeShopFilter === shop.shopId
                            ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm dark:border-blue-400 dark:bg-blue-500/15 dark:text-blue-100'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-400/40 dark:hover:text-blue-200'
                        }`}
                      >
                        {shop.shopName}
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="space-y-4">
                  {searchEntries.map((entry) => (
                    <div key={entry.item.name} className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {entry.item.quantity} {entry.item.unit}
                          </Badge>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{entry.item.name}</p>
                        </div>
                        {entry.status === 'loading' ? (
                          <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                            Searching…
                          </span>
                        ) : entry.status === 'failed' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => void processTranscript(entry.item.raw, 'manual')}
                          >
                            Retry
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>

                <AnimatePresence mode="popLayout">
                  {isLoadingResults ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-slate-50/80 p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300"
                    >
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Gathering products…
                    </motion.div>
                  ) : flattenedHits.length === 0 && searchEntries.length > 0 ? (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300"
                    >
                      <p>No matches yet. Try rephrasing or manual search.</p>
                    </motion.div>
                  ) : (
                    flattenedHits.map(({ hit, item }) => (
                      <motion.div
                        key={`${hit.id}-${item.name}`}
                        layout
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-950/60"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{hit.name}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{hit.shopName}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatINR(hit.pricePaise)}</span>
                            <QuantityStepper
                              value={quantities[hit.id] ?? Math.max(1, Math.round(item.quantity || 1))}
                              onChange={(value) =>
                                setQuantities((prev) => ({
                                  ...prev,
                                  [hit.id]: value,
                                }))
                              }
                              ariaLabel={`Quantity for ${hit.name}`}
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <Circle className={`h-2 w-2 ${hit.available ? 'text-emerald-500' : 'text-amber-500'}`} aria-hidden="true" />
                            {hit.available ? 'In stock' : 'Check availability'}
                            <span className="mx-1 text-slate-300">•</span>
                            Requested {item.quantity} {item.unit}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="gap-2"
                              onClick={() => handleAddToCart(hit, item)}
                            >
                              <ShoppingCart className="h-4 w-4" aria-hidden="true" /> Add to cart
                            </Button>
                            <Button
                              size="sm"
                              className="gap-2"
                              onClick={() => void handleBuyNow(hit, item)}
                              disabled={placingOrder === hit.id}
                            >
                              {placingOrder === hit.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                              ) : (
                                <Check className="h-4 w-4" aria-hidden="true" />
                              )}
                              Buy now
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>

            <Card className="border border-slate-200/80 bg-white/90 shadow-sm backdrop-blur dark:border-slate-800/60 dark:bg-slate-900/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <ShoppingCart className="h-5 w-5 text-blue-500" aria-hidden="true" /> Summary
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                  Cart items persist across sessions. Proceed to checkout when ready.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                  <span>Cart subtotal</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{subtotalDisplay}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Voice orders respect the single-shop rule. If your cart has items from multiple shops, we’ll help you split them on checkout.
                </p>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button
                  className="w-full gap-2"
                  size="lg"
                  onClick={() => window.location.assign(paths.checkout())}
                >
                  Proceed to checkout <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  onClick={() => window.location.assign(paths.cart())}
                >
                  Review cart
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceOrder;
