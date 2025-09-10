import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { FaMicrophone } from 'react-icons/fa';
import { api } from '@/config/api';
import { fetchShops } from '@/store/shops';
import type { RootState } from '../../store';
import styles from './VoiceOrder.module.scss';
import showToast from '../../components/ui/Toast';
import VoiceConfirmSheet from '../../components/ui/ModalSheet/VoiceConfirmSheet';

interface Product {
  _id: string;
  name: string;
  price: number;
  image?: string;
}

interface Shop {
  _id: string;
  name: string;
  products?: Product[];
}

interface MatchedItem {
  product: Product;
  shop: Shop;
  quantity: number;
}

const VoiceOrder = () => {
  const user = useSelector((state: RootState) => state.user as any);
  const d = useDispatch<any>();
  const { items: shopItems, status } = useSelector((s: RootState) => s.shops);
  const shops = shopItems as Shop[];
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [matched, setMatched] = useState<MatchedItem[]>([]);
  const [language, setLanguage] = useState('en-US');
  const [confirmItem, setConfirmItem] = useState<MatchedItem | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const recognitionRef = useRef<any>(null);

  const hints: Record<string, string> = {
    'en-US': 'Say: "2 chicken biryani from Star Hotel"',
    'hi-IN': 'कहें: "स्टार होटल से दो चिकन बिरयानी"',
    'te-IN': 'చెప్పండి: "స్టార్ హోటల్ నుండి రెండు చికెన్ బిర్యానీ"',
  };

  useEffect(() => {
    if (status === 'idle') d(fetchShops(undefined));
  }, [status, d]);

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Speech recognition not supported', 'error');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.interimResults = true;
    recognition.onresult = (e: any) => {
      const text = Array.from(e.results)
        .map((r: any) => r[0].transcript)
        .join(' ');
      setTranscript(text);
    };
    recognition.onend = () => {
      setListening(false);
      if (transcript) processTranscript(transcript);
    };
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    setTranscript('');
    setMatched([]);
  };

  const processTranscript = (text: string) => {
    const items: MatchedItem[] = [];
    const lower = text.toLowerCase();
    shops.forEach((shop) => {
      shop.products?.forEach((product: Product) => {
        if (lower.includes(product.name.toLowerCase())) {
          const regex = new RegExp(`(\\d+)\\s*${product.name}`, 'i');
          const match = lower.match(regex);
          const quantity = match ? parseInt(match[1], 10) : 1;
          items.push({ product, shop, quantity });
        }
      });
    });
    setMatched(items);
  };

  const openConfirm = (item: MatchedItem) => {
    setConfirmItem(item);
    setConfirmOpen(true);
  };

  const confirmOrder = async () => {
    if (!confirmItem) return;
    try {
      setLoading(true);
      await api.post('/orders/place', {
        userId: user._id,
        productId: confirmItem.product._id,
        quantity: confirmItem.quantity,
        shopId: confirmItem.shop._id,
        source: 'voice-order',
      });
      showToast('Order placed');
      setConfirmOpen(false);
      setConfirmItem(null);
    } catch {
      showToast('Failed to place order', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.voiceOrder}>
      <h2>Voice Order</h2>
      <p>Tap to speak your order (e.g., "2 chicken biryani from Star Hotel")</p>
      <select value={language} onChange={(e) => setLanguage(e.target.value)}>
        <option value="en-US">English</option>
        <option value="hi-IN">Hindi</option>
        <option value="te-IN">Telugu</option>
      </select>
      <p className={styles.hint}>{hints[language]}</p>
      <motion.div
        className={`${styles['mic-wrapper']} ${listening ? styles.listening : ''}`}
        whileTap={{ scale: 0.9 }}
        onClick={startListening}
      >
        <FaMicrophone />
      </motion.div>
      <textarea
        className={styles.transcript}
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        placeholder="Type your order if needed"
      />
      <button
        className={styles.process}
        onClick={() => processTranscript(transcript)}
        disabled={!transcript}
      >
        Process Text
      </button>
      <div className={styles.chips}>
        {matched.map((m) => (
          <span key={m.product._id} className={styles.chip}>
            {m.product.name} × {m.quantity}
          </span>
        ))}
      </div>
      <div className={styles.results}>
        {matched.map((m) => (
          <motion.div key={m.product._id} className={styles['product-card']} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h4>{m.product.name}</h4>
            <p>Qty: {m.quantity}</p>
            <p>₹{m.product.price}</p>
            <p>{m.shop.name}</p>
            <button onClick={() => openConfirm(m)}>Order</button>
          </motion.div>
        ))}
      </div>
      <VoiceConfirmSheet
        open={confirmOpen}
        item={confirmItem}
        loading={loading}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmOrder}
      />
    </div>
  );
};

export default VoiceOrder;
