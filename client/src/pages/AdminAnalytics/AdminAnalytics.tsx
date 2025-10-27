import { lazy, Suspense, useEffect, useState } from 'react';
import {
  fetchMetrics,
  fetchMetricSeries,
  fetchAdminAnalytics,
  type MetricsSummary,
  type SeriesPoint,
  type AnalyticsResponse,
} from '../../api/admin';
import DataTable, { type Column } from '../../components/admin/DataTable';
import Loader from '../../components/Loader';
import './AdminAnalytics.scss';

const Chart = lazy(() => import('../../components/SimpleChart'));

const AdminAnalytics = () => {
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [series, setSeries] = useState<Record<string, SeriesPoint[]>>({});
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const shopColumns: Column<{ name: string; orders: number; id: string }>[] = [
    { key: 'name', label: 'Shop' },
    { key: 'orders', label: 'Orders' },
  ];

  const productColumns: Column<{ name: string; orders: number; id: string }>[] = [
    { key: 'name', label: 'Product' },
    { key: 'orders', label: 'Orders' },
  ];

  const load = async () => {
    setLoading(true);
    try {
      const [analyticsData, metricsData] = await Promise.all([
        fetchAdminAnalytics(lastUpdated ?? undefined),
        fetchMetrics(),
      ]);

      setAnalytics(analyticsData);
      setLastUpdated(analyticsData.generatedAt);
      setMetrics(metricsData);

      const ordersPromise = analyticsData.trends?.orders?.length
        ? Promise.resolve(analyticsData.trends.orders)
        : fetchMetricSeries('orders', '30d');
      const gmvPromise = analyticsData.trends?.gmv?.length
        ? Promise.resolve(analyticsData.trends.gmv)
        : fetchMetricSeries('gmv', '30d');

      const [orders, signups, gmv] = await Promise.all([
        ordersPromise,
        fetchMetricSeries('signups', '30d'),
        gmvPromise,
      ]);

      setSeries({ orders, signups, gmv });
    } catch {
      setSeries((prev) => prev);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const lastUpdatedLabel = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const totals = analytics?.totals;

  return (
    <div className="admin-analytics">
      <div className="analytics-header">
        <h1>Analytics</h1>
        <div className="analytics-actions">
          {lastUpdatedLabel ? (
            <span className="last-updated">Last updated at {lastUpdatedLabel}</span>
          ) : null}
          <button type="button" onClick={load} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
      {loading && !metrics ? <Loader /> : null}
      {!loading && !metrics ? <p>No data available.</p> : null}
      {metrics && (
        <>
          <section className="kpis">
            <div className="kpi">
              <h3>Users</h3>
              <p>{totals ? totals.users : metrics.users}</p>
            </div>
            <div className="kpi">
              <h3>Shops</h3>
              <p>{totals ? totals.shops : metrics.shops}</p>
            </div>
            <div className="kpi">
              <h3>Products</h3>
              <p>{totals ? totals.products : '-'}</p>
            </div>
            <div className="kpi">
              <h3>Orders</h3>
              <p>{totals ? totals.orders : metrics.orders30d}</p>
            </div>
            <div className="kpi">
              <h3>GMV</h3>
              <p>{totals ? totals.gmv.toLocaleString() : metrics.gmv}</p>
            </div>
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
                <Chart data={series.orders || []} height={80} />
              </div>
              <div className="chart">
                <h3>Signups</h3>
                <Chart data={series.signups || []} height={80} />
              </div>
              <div className="chart">
                <h3>GMV</h3>
                <Chart data={series.gmv || []} height={80} />
              </div>
            </Suspense>
          </section>
          <section className="tables">
            <div className="table">
              <h3>Top Shops</h3>
              {metrics.topShops && metrics.topShops.length ? (
                <DataTable<{ name: string; orders: number; id: string }>
                  columns={shopColumns}
                  rows={metrics.topShops}
                  page={1}
                  pageSize={metrics.topShops.length}
                  total={metrics.topShops.length}
                  onPageChange={() => {}}
                  rowKey={(r) => r.id}
                />
              ) : (
                <p>No data</p>
              )}
            </div>
            <div className="table">
              <h3>Top Products</h3>
              {metrics.topProducts && metrics.topProducts.length ? (
                <DataTable<{ name: string; orders: number; id: string }>
                  columns={productColumns}
                  rows={metrics.topProducts}
                  page={1}
                  pageSize={metrics.topProducts.length}
                  total={metrics.topProducts.length}
                  onPageChange={() => {}}
                  rowKey={(r) => r.id}
                />
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
