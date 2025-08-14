import "./Home.scss";
import { motion } from "framer-motion";
import Slider from "react-slick";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import Shimmer from "../../components/Shimmer";
import ProductCard from "../../components/ui/ProductCard";
import {
  sampleOffers,
  sampleVerifiedUsers,
  sampleEvents,
  sampleSpecialProducts,
  banner,
} from "../../data/sampleHomeData";
import fallbackImage from "../../assets/no-image.svg";

const Home = () => {
  const navigate = useNavigate();

  const [offers, setOffers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [specialProducts, setSpecialProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/home/offers"),
      api.get("/home/verified-users"),
      api.get("/home/events"),
      api.get("/home/special-products"),
    ])
      .then(([offRes, userRes, evRes, spRes]) => {
        setOffers(
          Array.isArray(offRes.data) && offRes.data.length > 0
            ? offRes.data
            : sampleOffers
        );
        setUsers(
          Array.isArray(userRes.data) && userRes.data.length > 0
            ? userRes.data
            : sampleVerifiedUsers
        );
        setEvents(
          Array.isArray(evRes.data) && evRes.data.length > 0
            ? evRes.data
            : sampleEvents
        );
        setSpecialProducts(
          Array.isArray(spRes.data) && spRes.data.length > 0
            ? spRes.data
            : sampleSpecialProducts
        );
      })
      .catch(() => {
        setOffers(sampleOffers);
        setUsers(sampleVerifiedUsers);
        setEvents(sampleEvents);
        setSpecialProducts(sampleSpecialProducts);
      })
      .finally(() => setLoading(false));
  }, []);

  const settings = {
    dots: false,
    infinite: false,
    speed: 600,
    slidesToShow: 2,
    slidesToScroll: 1,
    responsive: [
      { breakpoint: 1024, settings: { slidesToShow: 3 } },
      { breakpoint: 768, settings: { slidesToShow: 2 } },
      { breakpoint: 480, settings: { slidesToShow: 1 } },
    ],
  };

  return (
    <div className="home">
      {/* Admin Banner */}
      <motion.div
        className="banner"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        onClick={() => banner.link && navigate(banner.link)}
      >
        <img src={banner.image} alt="Admin Update" onError={(e) => (e.currentTarget.src = fallbackImage)} />
        <div className="banner-text">
          <h3>{banner.title}</h3>
          <p>{banner.subtitle}</p>
        </div>
      </motion.div>

      {/* Sections */}
      <Section
        title="Shop Offers"
        data={offers}
        type="product"
        navigate={navigate}
        settings={settings}
        loading={loading}
      />
      <Section
        title="Verified Users"
        data={users}
        type="user"
        navigate={navigate}
        settings={settings}
        loading={loading}
      />
      <Section
        title="Events"
        data={events}
        type="event"
        navigate={navigate}
        settings={settings}
        loading={loading}
      />
      <Section
        title="Special Shop Products"
        data={specialProducts}
        type="product"
        navigate={navigate}
        settings={settings}
        loading={loading}
      />
    </div>
  );
};

interface SectionProps {
  title: string;
  data: any[];
  type: string;
  navigate: any;
  settings: any;
  loading: boolean;
}

const Section = ({ title, data, type, navigate, settings, loading }: SectionProps) => (
  <div className="section">
    <h2>{title}</h2>
    <Slider {...settings}>
      {(loading ? Array.from({ length: 3 }) : data).map((item: any, idx: number) => (
        <motion.div
          key={item?._id || idx}
          className="card"
          whileHover={{ scale: 1.03 }}
        >
          {loading ? (
            <>
              <Shimmer className="rounded" style={{ height: 150 }} />
              <div className="card-info">
                <Shimmer style={{ height: 16, marginTop: 8, width: '60%' }} />
                {type === 'event' && (
                  <Shimmer style={{ height: 14, marginTop: 4, width: '40%' }} />
                )}
              </div>
            </>
          ) : type === 'product' ? (
            <ProductCard
              product={item}
              showActions={false}
              onClick={() => navigate(`/product/${item._id}`)}
            />
          ) : (
            <>
              <img
                src={item.image}
                alt={item.name || item.title}
                onError={(e) => (e.currentTarget.src = fallbackImage)}
                onClick={() =>
                  navigate(
                    type === 'user'
                      ? `/verified-users/${item._id}`
                      : `/events/${item._id}`
                  )
                }
              />
              <div className="card-info">
                <h4>{item.name || item.title}</h4>
                {type === 'event' && (
                  <p>
                    Ends in {Math.ceil(
                      (new Date(item.startDate || item.date).getTime() -
                        Date.now()) /
                        (1000 * 60 * 60 * 24)
                    )}{' '}
                    days
                  </p>
                )}
              </div>
            </>
          )}
        </motion.div>
      ))}
    </Slider>
  </div>
);

export default Home;
