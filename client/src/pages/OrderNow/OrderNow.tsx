import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { FaMicrophone } from 'react-icons/fa';
import { fetchShops } from '@/store/shops';
import { api } from '@/config/api';
import type { RootState } from '../../store';
import ModalSheet from '../../components/base/ModalSheet';
import Loader from '../../components/Loader';
import showToast from '../../components/ui/Toast';
import styles from './OrderNow.module.scss';

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

const OrderNow = () => {
  const user = useSelector((state: RootState) => state.user as any);
  const d = useDispatch<any>();
  const { items: shopItems, status } = useSelector((s: RootState) => s.shops);
  const shops = shopItems as Shop[];
  const [transcript, setTranscript] = useState('');
  const [manual, setManual] = useState('');
  const [listening, setListening] = useState(false);
  const [matched, setMatched] = useState<MatchedItem[]>([]);
  const [language, setLanguage] = useState('en-US');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [hasSupport, setHasSupport] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (status === 'idle') d(fetchShops(undefined));
  }, [status, d]);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setHasSupport(!!SpeechRecognition);
  }, []);

  const toggleListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
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
      shop.products?.forEach((product) => {
        if (lower.includes(product.name.toLowerCase())) {
          const regex = new RegExp(`(\\d+)\\s*${product.name.toLowerCase()}`);
          const match = lower.match(regex);
          const quantity = match ? parseInt(match[1], 10) : 1;
          items.push({ product, shop, quantity });
        }
      });
    });
    setMatched(items);
  };

  const handleManual = () => {
    if (manual.trim()) {
      setTranscript(manual);
      processTranscript(manual);
    }
  };

  const total = matched.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const placeOrder = async () => {
    try {
      setPlacing(true);
      await Promise.all(
        matched.map((m) =>
          api.post(`/orders/place/${m.product._id}`, {
            quantity: m.quantity,
            userId: user?._id,
            shopId: m.shop._id,
            source: 'voice-order',
          })
        )
      );
      showToast('Order placed');
      setMatched([]);
      setTranscript('');
      setManual('');
      setConfirmOpen(false);
    } catch {
      showToast('Failed to place order', 'error');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className={styles.orderNow}>
      <h2>Order Now</h2>
      <p>Say or type your order (e.g., "2 chicken biryani")</p>
      <select value={language} onChange={(e) => setLanguage(e.target.value)}>
        <option value="en-US">English</option>
        <option value="hi-IN">Hindi</option>
        <option value="te-IN">Telugu</option>
      </select>
      {hasSupport && (
        <motion.div
          className={`${styles['mic-wrapper']} ${listening ? styles.listening : ''}`}
          whileTap={{ scale: 0.9 }}
          onClick={toggleListening}
        >
          <FaMicrophone />
        </motion.div>
      )}
      <div className={styles.transcript}>{transcript}</div>
      {!hasSupport && (
        <div className={styles['text-input']}>
          <input
            type="text"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Type your order"
          />
          <button onClick={handleManual}>Parse</button>
        </div>
      )}
      <div className={styles.results}>
        {matched.map((m) => (
          <motion.div
            key={m.product._id}
            className={styles['product-card']}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h4>{m.product.name}</h4>
            <p>Qty: {m.quantity}</p>
            <p>₹{m.product.price}</p>
            <p>{m.shop.name}</p>
          </motion.div>
        ))}
      </div>
      {matched.length > 0 && (
        <button className={styles['review-btn']} onClick={() => setConfirmOpen(true)}>
          Review Order
        </button>
      )}
      <ModalSheet open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <h3>Confirm Order</h3>
        {matched.map((m) => (
          <div key={m.product._id} className={styles['product-card']}>
            <h4>{m.product.name}</h4>
            <p>Qty: {m.quantity}</p>
            <p>₹{m.product.price * m.quantity}</p>
          </div>
        ))}
        <p>Total: ₹{total}</p>
        <button onClick={placeOrder} disabled={placing}>
          {placing ? <Loader /> : 'Place Order'}
        </button>
      </ModalSheet>
    </div>
  );
};

export default OrderNow;
