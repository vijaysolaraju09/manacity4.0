import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { FaMicrophone } from 'react-icons/fa';
import { fetchShops } from '@/store/shops';
import { toErrorMessage } from '@/lib/response';
import type { RootState } from '../../store';
import ModalSheet from '../../components/base/ModalSheet';
import Loader from '../../components/Loader';
import showToast from '../../components/ui/Toast';
import { createOrder } from '@/api/orders';
import { formatINR } from '@/utils/currency';
import styles from './OrderNow.module.scss';

interface Product {
  _id: string;
  name: string;
  pricePaise: number;
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

  const totalPaise = matched.reduce(
    (sum, item) => sum + item.product.pricePaise * item.quantity,
    0
  );

  const placeOrder = async () => {
    try {
      setPlacing(true);
      await Promise.all(
        matched.map((m) =>
          createOrder({
            shopId: m.shop._id,
            items: [
              {
                productId: m.product._id,
                quantity: m.quantity,
              },
            ],
          }),
        ),
      );
      showToast('Order placed');
      setMatched([]);
      setTranscript('');
      setManual('');
      setConfirmOpen(false);
    } catch (err) {
      showToast(toErrorMessage(err), 'error');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className={styles.orderNow}>
      <h2>Order Now</h2>
      <p>Say or type your order (e.g., "2 chicken biryani")</p>
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className="mx-auto w-full max-w-xs rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 shadow-sm"
      >
        <option value="en-US">English</option>
        <option value="hi-IN">Hindi</option>
        <option value="te-IN">Telugu</option>
      </select>
      {hasSupport && (
        <motion.div
          className={`${styles.micWrapper} ${listening ? styles.listening : ''}`}
          whileTap={{ scale: 0.9 }}
          onClick={toggleListening}
        >
          <FaMicrophone />
        </motion.div>
      )}
      <div className={styles.transcript}>{transcript}</div>
      {!hasSupport && (
        <div className={styles.textInput}>
          <input
            type="text"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Type your order"
          />
          <button onClick={handleManual}>Parse</button>
        </div>
      )}
      <div className={styles.resultsGrid}>
        {matched.map((m) => (
          <motion.div
            key={m.product._id}
            className={`${styles.panel} text-left space-y-2`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h4 className="text-lg font-semibold text-gray-900">{m.product.name}</h4>
            <div className={styles.line}>
              <span className="text-sm text-gray-600">Quantity</span>
              <span className="font-medium text-gray-900">{m.quantity}</span>
            </div>
            <div className={styles.line}>
              <span className="text-sm text-gray-600">Price</span>
              <span className="font-medium text-gray-900">{formatINR(m.product.pricePaise)}</span>
            </div>
            <p className="text-sm text-gray-600">{m.shop.name}</p>
          </motion.div>
        ))}
      </div>
      {matched.length > 0 && (
        <button className={styles.reviewButton} onClick={() => setConfirmOpen(true)}>
          Review Order
        </button>
      )}
      <ModalSheet open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <div className={`${styles.panel} ${styles.sheetContent}`}>
          <h3 className="text-lg font-semibold text-gray-900">Confirm Order</h3>
          <div className="space-y-2">
            {matched.map((m) => (
              <div key={m.product._id} className={styles.line}>
                <span className="text-sm text-gray-600">{m.product.name}</span>
                <span className="font-medium text-gray-900">
                  {formatINR(m.product.pricePaise * m.quantity)}
                </span>
              </div>
            ))}
          </div>
          <div className={`${styles.line} font-semibold text-gray-900`}>
            <span>Total</span>
            <span>{formatINR(totalPaise)}</span>
          </div>
          <button
            onClick={placeOrder}
            disabled={placing}
            className="w-full rounded-xl bg-blue-500 px-4 py-2.5 text-white shadow-md transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {placing ? <Loader /> : 'Place Order'}
          </button>
        </div>
      </ModalSheet>
    </div>
  );
};

export default OrderNow;
