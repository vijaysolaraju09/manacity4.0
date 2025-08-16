import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { FaMicrophone } from 'react-icons/fa';
import api from '../../api/client';
import { sampleShops } from '../../data/sampleData';
import type { RootState } from '../../store';
import styles from './VoiceOrder.module.scss';
import Loader from '../../components/Loader';
import showToast from '../../components/ui/Toast';

interface Product {
  _id: string;
  name: string;
  price: number;
  image?: string;
}

interface Shop {
  _id: string;
  name: string;
  products: Product[];
}

interface MatchedItem {
  product: Product;
  shop: Shop;
  quantity: number;
}

const VoiceOrder = () => {
  const user = useSelector((state: RootState) => state.user as any);
  const [shops, setShops] = useState<Shop[]>([]);
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [matched, setMatched] = useState<MatchedItem[]>([]);
  const [orderingId, setOrderingId] = useState<string>('');
  const [language, setLanguage] = useState('en-US');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    api
      .get('/shops')
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setShops(res.data);
        } else {
          setShops(sampleShops as unknown as Shop[]);
        }
      })
      .catch(() => setShops(sampleShops as unknown as Shop[]));
  }, []);

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
      shop.products.forEach((product) => {
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

  const handleOrder = async (item: MatchedItem) => {
    try {
      setOrderingId(item.product._id);
      await api.post('/orders/place', {
        userId: user._id,
        productId: item.product._id,
        quantity: item.quantity,
        shopId: item.shop._id,
        source: 'voice-order',
      });
      showToast('Order placed');
    } catch {
      showToast('Failed to place order', 'error');
    } finally {
      setOrderingId('');
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
      <motion.div
        className={`${styles['mic-wrapper']} ${listening ? styles.listening : ''}`}
        whileTap={{ scale: 0.9 }}
        onClick={startListening}
      >
        <FaMicrophone />
      </motion.div>
      <div className={styles.transcript}>{transcript}</div>
      <div className={styles.results}>
        {matched.map((m) => (
          <motion.div key={m.product._id} className={styles['product-card']} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h4>{m.product.name}</h4>
            <p>Qty: {m.quantity}</p>
            <p>₹{m.product.price}</p>
            <p>{m.shop.name}</p>
            <button
              onClick={() => handleOrder(m)}
              disabled={orderingId === m.product._id}
            >
              {orderingId === m.product._id ? <Loader /> : 'Order'}
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default VoiceOrder;
