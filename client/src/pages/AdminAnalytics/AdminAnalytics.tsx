import { lazy, Suspense, useEffect, useState } from 'react';
import { fetchMetrics, fetchMetricSeries, type MetricsSummary, type SeriesPoint } from '../../api/admin';
import Loader from '../../components/Loader';
import './AdminAnalytics.scss';

const Chart = lazy(() => import('../../components/SimpleChart'));

const AdminAnalytics = () => {
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [series, setSeries] = useState<Record<string, SeriesPoint[]>>({});
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchMetrics();
      setMetrics(data);
      const [orders, signups, gmv] = await Promise.all([
        fetchMetricSeries('orders', '30d'),
        fetchMetricSeries('signups', '30d'),
        fetchMetricSeries('gmv', '30d'),
      ]);
      setSeries({ orders, signups, gmv });
    } catch {
      setMetrics(null);
      setSeries({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="admin-analytics">
      <div className="analytics-header">
        <h1>Analytics</h1>
        <button type="button" onClick={load} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      {loading && !metrics ? <Loader /> : null}
      {!loading && !metrics ? <p>No data available.</p> : null}
      {metrics && (
        <>
          <section className="kpis">
            <div className="kpi"><h3>Users</h3><p>{metrics.users}</p></div>
            <div className="kpi"><h3>Shops</h3><p>{metrics.shops}</p></div>
            <div className="kpi"><h3>GMV</h3><p>{metrics.gmv}</p></div>
            <div className="kpi"><h3>Orders Today</h3><p>{metrics.ordersToday}</p></div>
            <div className="kpi"><h3>Orders 7d</h3><p>{metrics.orders7d}</p></div>
            <div className="kpi"><h3>Orders 30d</h3><p>{metrics.orders30d}</p></div>
            <div className="kpi"><h3>Active Events</h3><p>{metrics.activeEvents}</p></div>
            <div className="kpi"><h3>Conversions</h3><p>{metrics.conversions}</p></div>
          </section>
          <section className="charts">
            <Suspense fallback={<Loader />}>
              <div className="chart">
                <h3>Orders</h3>
                <Chart data={series.orders || []} />
              </div>
              <div className="chart">
                <h3>Signups</h3>
                <Chart data={series.signups || []} />
              </div>
              <div className="chart">
                <h3>GMV</h3>
                <Chart data={series.gmv || []} />
              </div>
            </Suspense>
          </section>
          <section className="tables">
            <div className="table">
              <h3>Top Shops</h3>
              {metrics.topShops && metrics.topShops.length ? (
                <table>
                  <thead><tr><th>Shop</th><th>Orders</th></tr></thead>
                  <tbody>
                    {metrics.topShops.map((s) => (
                      <tr key={s.id}><td>{s.name}</td><td>{s.orders}</td></tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No data</p>
              )}
            </div>
            <div className="table">
              <h3>Top Products</h3>
              {metrics.topProducts && metrics.topProducts.length ? (
                <table>
                  <thead><tr><th>Product</th><th>Orders</th></tr></thead>
                  <tbody>
                    {metrics.topProducts.map((p) => (
                      <tr key={p.id}><td>{p.name}</td><td>{p.orders}</td></tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No data</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default AdminAnalytics;
