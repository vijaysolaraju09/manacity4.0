import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AudioLines,
  Check,
  ChevronRight,
  Headphones,
  History,
  Loader2,
  Mic,
  MicOff,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Wand2,
  X,
  XCircle,
} from 'lucide-react';
import Button from '@/components/ui/button';
import Textarea from '@/components/ui/textarea';
import Input from '@/components/ui/input';
import QuantityStepper from '@/components/ui/QuantityStepper/QuantityStepper';
import Badge from '@/components/ui/badge';
import showToast from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { addItem, selectSubtotalPaise } from '@/store/slices/cartSlice';
import { selectItemCount } from '@/store/slices/cartSlice';
import { formatINR } from '@/utils/currency';
import { createOrder } from '@/api/orders';
import { parseUtterance } from '@/features/voice-order/parser';
import { searchProducts } from '@/features/voice-order/api';
import type { ParsedItem, ParseResult, VoiceProductHit } from '@/features/voice-order/types';
import { paths } from '@/routes/paths';

import styles from '@/styles/PageShell.module.scss';
import voiceStyles from '../VoiceOrder.module.scss';

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

type SpeechRecognitionAlternativeLike = {
  transcript?: string;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0?: SpeechRecognitionAlternativeLike;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionErrorEventLike = {
  error?: string;
  message?: string;
};

const createId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

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

  const handleRecognitionResult = useCallback((event: SpeechRecognitionEventLike) => {
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
      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        handleRecognitionResult(event);
      };
      recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
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

      recorder.ondataavailable = (event: BlobEvent) => {
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

  const examplePhrases = useMemo(
    () => [
      'oka kilo tomatolu',
      '3 dozen eggs from Sri Fresh',
      'send 2 litres milk and 1 bread',
      'half kilo onions and coriander',
    ],
    [],
  );

  const handleExampleInsert = useCallback(
    (example: string) => {
      setManualTranscript(example);
      setManualQuery(example);
      setTranscript(example);
      setInterimTranscript('');
      finalTranscriptRef.current = example;
    },
    [],
  );

  return (
    <motion.main
      className={cn(styles.pageShell, 'bg-white text-slate-900')}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div
        className={cn(
          styles.pageShell__inner,
          'mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-32 sm:px-6 lg:px-8',
        )}
      >
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut', delay: 0.05 }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <Badge variant="secondary" className="px-3 py-1 text-xs">
                Flagship
              </Badge>
              <h1 className="text-3xl font-semibold tracking-tight">Voice order</h1>
              <p className="max-w-2xl text-sm text-slate-600">
                Speak naturally and we line up matching inventory across Manacity. Mix languages, refine the transcript and push matches directly to your cart.
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-white/70 p-4 text-right shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-600">Cart snapshot</p>
              <p className="mt-1 text-lg font-semibold">{subtotalDisplay}</p>
              <p className="text-xs text-slate-600">
                {cartItemCount} {cartItemCount === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>
        </motion.header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
          <div>
            <motion.section
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut', delay: 0.1 }}
              className={voiceStyles.consoleCard}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Voice console</h2>
                  <p className="text-sm text-slate-600">
                    Tap the mic, speak freely and watch Manacity transcribe in real time.
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  Live
                </Badge>
              </div>
              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                <motion.button
                  type="button"
                  aria-label={isListening ? 'Stop listening' : 'Start listening'}
                  aria-pressed={isListening}
                  className={cn(voiceStyles.micButton, isListening && 'listening')}
                  onClick={toggleListening}
                  whileTap={{ scale: 0.94 }}
                  animate={isListening ? { scale: [1, 1.08, 0.96, 1] } : { scale: 1 }}
                  transition={
                    isListening
                      ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
                      : { type: 'spring', stiffness: 340, damping: 20 }
                  }
                >
                  {isListening ? (
                    <MicOff className="h-7 w-7" aria-hidden="true" />
                  ) : (
                    <Mic className="h-7 w-7" aria-hidden="true" />
                  )}
                </motion.button>
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {isListening ? 'Listening…' : isTranscribing ? 'Transcribing…' : 'Ready when you are'}
                  </p>
                  <p className="text-xs text-slate-600">
                    {supportsSpeechRecognition
                      ? 'Auto-stops on silence. You can edit the transcript before asking us to understand it.'
                      : 'Browser speech recognition unavailable. Use recording or manual entry instead.'}
                  </p>
                </div>
              </div>
              <div className={voiceStyles.transcript} aria-live="polite">
                {interimTranscript ? (
                  <span className="text-slate-600">{interimTranscript}</span>
                ) : transcript ? (
                  <span>{transcript}</span>
                ) : (
                  <span className="text-slate-600">Tap the mic or try one of the sample prompts below.</span>
                )}
              </div>
              <div className={voiceStyles.examples}>
                {examplePhrases.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => handleExampleInsert(example)}
                    className={cn(
                      'transition-colors hover:bg-slate-500/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-500)]',
                      voiceStyles.chip,
                    )}
                  >
                    {example}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
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
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut', delay: 0.15 }}
              className={voiceStyles.consoleCard}
            >
              <div className="flex flex-col gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Fine tune</h2>
                  <p className="text-sm text-slate-600">
                    Type, correct or manually search for products to add alongside voice results.
                  </p>
                </div>
                <Textarea
                  value={manualTranscript}
                  onChange={handleManualTranscriptChange}
                  placeholder="Example: oka kilo tomatolu"
                  aria-label="Manual order input"
                />
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleManualProcess} disabled={processing} className="gap-2">
                    <Wand2 className="h-4 w-4" aria-hidden="true" /> Parse text
                  </Button>
                  {!supportsSpeechRecognition ? (
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                      <Headphones className="h-4 w-4" aria-hidden="true" />
                      Speech recognition coming soon
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="mt-5 space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Manual marketplace search
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={manualQuery}
                    onChange={handleManualQueryChange}
                    placeholder="Search for a product"
                    className="sm:flex-1"
                  />
                  <Button onClick={handleManualSearch} variant="secondary" disabled={processing} className="gap-2">
                    <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                    Search shops
                  </Button>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <Button onClick={handleRecordingToggle} variant={isRecording ? 'destructive' : 'ghost'} className="gap-2">
                  {isRecording ? (
                    <>
                      <XCircle className="h-4 w-4" aria-hidden="true" />
                      Stop recording
                    </>
                  ) : (
                    <>
                      <AudioLines className="h-4 w-4" aria-hidden="true" />
                      Record audio
                    </>
                  )}
                </Button>
                {recordingUrl ? (
                  <a
                    className="inline-flex items-center gap-2 text-xs font-medium text-[color:var(--brand-600)] underline-offset-4 hover:underline"
                    href={recordingUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <History className="h-3.5 w-3.5" aria-hidden="true" />
                    Listen to last clip
                  </a>
                ) : null}
                {ENABLE_STT_UPLOAD ? (
                  <span className="text-xs text-slate-600">Upload support enabled for long orders.</span>
                ) : null}
              </div>
            </motion.section>
            <motion.section
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut', delay: 0.2 }}
              className={voiceStyles.consoleCard}
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Recent attempts</h2>
                  <p className="text-sm text-slate-600">
                    We keep a short trail so you can retry or give quick feedback.
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {entries.length === 0 ? (
                  <p className="text-sm text-slate-600">Speak or type to see recent transcripts here.</p>
                ) : (
                  entries.slice(0, 5).map((entry) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-[rgba(var(--color-border-rgb),0.7)] bg-slate-500/20 p-4 text-sm shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-600">
                            <History className="h-3 w-3" aria-hidden="true" />
                            {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <p>{entry.transcript}</p>
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
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="text-slate-600">Helpful?</span>
                            <button
                              type="button"
                              className={cn(
                                'rounded-full border px-2 py-1 font-semibold transition-colors',
                                entry.feedback === 'positive'
                                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-100'
                                  : 'border-transparent text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700',
                              )}
                              onClick={() => handleFeedback(entry.id, 'positive')}
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              className={cn(
                                'rounded-full border px-2 py-1 font-semibold transition-colors',
                                entry.feedback === 'negative'
                                  ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-100'
                                  : 'border-transparent text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700',
                              )}
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
            </motion.section>
          </div>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut', delay: 0.12 }}
            className={cn(voiceStyles.consoleCard, voiceStyles.results)}
          >
            <div className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold">Smart results</h2>
              <p className="text-sm text-slate-600">
                Organised matches from every shop you unlocked with your voice.
              </p>
            </div>

            {searchEntries.length === 0 && !processing ? (
              <div className="mt-4 rounded-2xl border border-dashed border-[rgba(var(--color-border-rgb),0.6)] bg-slate-500/20 p-6 text-sm text-slate-600">
                <p>Start speaking or try a sample prompt to see matches roll in.</p>
              </div>
            ) : null}

            {entries[0]?.result.items.length === 0 && entries[0]?.result.guesses.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                <p className="font-semibold">Did you mean</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {entries[0]?.result.guesses.map((guess) => (
                    <Button key={guess.name} variant="outline" size="sm" onClick={() => void processTranscript(guess.raw, 'manual')}>
                      {guess.name}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}

            {searchError ? (
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                <XCircle className="h-5 w-5" aria-hidden="true" />
                <div className="flex-1">{searchError}</div>
                <Button variant="ghost" size="sm" onClick={() => setSearchError(null)}>
                  Dismiss
                </Button>
              </div>
            ) : null}

            {uniqueShops.length > 0 ? (
              <div className={cn(voiceStyles.tabs, 'mt-6')}>
                <button
                  type="button"
                  onClick={() => setActiveShopFilter('all')}
                  className={cn('text-sm font-medium text-slate-600 transition-colors', activeShopFilter === 'all' && 'active')}
                >
                  All
                </button>
                {uniqueShops.map((shop) => (
                  <button
                    key={shop.shopId}
                    type="button"
                    onClick={() => setActiveShopFilter(shop.shopId)}
                    className={cn('text-sm font-medium text-slate-600 transition-colors', activeShopFilter === shop.shopId && 'active')}
                  >
                    {shop.shopName}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="mt-6 space-y-3">
              {searchEntries.map((entry) => (
                <div key={entry.item.name} className="rounded-2xl border border-[rgba(var(--color-border-rgb),0.6)] bg-slate-500/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">{entry.item.quantity} {entry.item.unit}</Badge>
                      <span className="font-semibold">{entry.item.name}</span>
                    </div>
                    {entry.status === 'loading' ? (
                      <span className="inline-flex items-center gap-2 text-xs text-slate-600">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                        Searching…
                      </span>
                    ) : entry.status === 'failed' ? (
                      <Button size="sm" variant="outline" onClick={() => void processTranscript(entry.item.raw, 'manual')}>
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
                  className="mt-6 flex items-center justify-center gap-3 rounded-2xl border border-[var(--border)] bg-slate-500/20 p-6 text-sm text-slate-600"
                >
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Gathering products…
                </motion.div>
              ) : flattenedHits.length === 0 && searchEntries.length > 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-6 rounded-2xl border border-dashed border-[rgba(var(--color-border-rgb),0.7)] bg-slate-500/20 p-6 text-center text-sm text-slate-600"
                >
                  No matches yet. Try refining the transcript or manual search.
                </motion.div>
              ) : (
                flattenedHits.map(({ hit, item }) => (
                  <motion.div
                    key={`${hit.id}-${item.name}`}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    className={voiceStyles.productRow}
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold">{hit.name}</h3>
                        <Badge variant="secondary" className="text-xs">{hit.shopName}</Badge>
                      </div>
                      <div className="text-xs text-slate-600">
                        Requested {item.quantity} {item.unit} • {formatINR(hit.pricePaise)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
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
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleAddToCart(hit, item)}
                          className="gap-2"
                        >
                          <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                          Add
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => void handleBuyNow(hit, item)}
                          disabled={placingOrder === hit.id}
                          className="gap-2"
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
          </motion.section>
        </div>

        <motion.aside
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut', delay: 0.25 }}
          className={cn(voiceStyles.summary, 'gap-4 flex-wrap sm:flex-nowrap')}
        >
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-600">Subtotal</p>
            <p className="text-lg font-semibold">{subtotalDisplay}</p>
            <p className="text-xs text-slate-600">
              {cartItemCount} {cartItemCount === 1 ? 'item' : 'items'} in cart
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button size="lg" onClick={() => window.location.assign(paths.checkout())} className="gap-2">
              Proceed to checkout
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button variant="ghost" onClick={() => window.location.assign(paths.cart())}>
              Review cart
            </Button>
          </div>
        </motion.aside>
      </div>
    </motion.main>
  );

};

export default VoiceOrder;
