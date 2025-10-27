import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Star, Truck } from 'lucide-react';

import OrderTimeline from '@/features/orders/components/OrderTimeline';
import OrderAddressCard from '@/features/orders/components/OrderAddressCard';
import OrderPaymentCard from '@/features/orders/components/OrderPaymentCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ErrorCard from '@/components/ui/ErrorCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import showToast from '@/components/ui/Toast';
import fallbackImage from '@/assets/no-image.svg';
import { http } from '@/lib/http';
import { toItem, toErrorMessage } from '@/lib/response';
import { formatINR } from '@/utils/currency';
import { cn } from '@/lib/utils';
import { paths } from '@/routes/paths';
import { normalizeOrder, cancelOrder, rateOrder, type Order } from '@/store/orders';
import type { RootState, AppDispatch } from '@/store';
import styles from '@/styles/PageShell.module.scss';

const cancellableStatuses = new Set(['pending', 'placed', 'confirmed', 'accepted', 'preparing']);

const sectionMotion = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.22, ease: 'easeOut' as const },
} as const;

const OrderDetail = () => {
  const { id } = useParams();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const authUserId = useSelector((state: RootState) => state.auth.user?.id || null);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ratingBusy, setRatingBusy] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const res = await http.get(`/api/orders/${id}`);
        const data = normalizeOrder(toItem(res));
        setOrder(data);
      } catch (err) {
        setError(toErrorMessage(err));
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleCancel = async () => {
    if (!order) return;
    const reason = window.prompt('Tell us why you are cancelling this order:', '');
    if (reason === null) return;
    try {
      const updated = await dispatch(cancelOrder({ id: order.id, reason: reason || undefined })).unwrap();
      setOrder(updated);
      showToast('Order cancelled', 'success');
    } catch (err) {
      showToast(toErrorMessage(err), 'error');
    }
  };

  const handleRate = async () => {
    if (!order) return;
    const ratingInput = window.prompt('Rate your order (1-5):', order.rating ? String(order.rating) : '5');
    if (!ratingInput) return;
    const rating = Number(ratingInput);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      showToast('Please enter a rating between 1 and 5.', 'error');
      return;
    }
    const review = window.prompt('Share more about your experience (optional):', order.review || '');
    try {
      setRatingBusy(true);
      const updated = await dispatch(
        rateOrder({ id: order.id, rating, review: review ? review.trim() : undefined }),
      ).unwrap();
      setOrder(updated);
      showToast('Thanks for your feedback!', 'success');
    } catch (err) {
      showToast(toErrorMessage(err), 'error');
    } finally {
      setRatingBusy(false);
    }
  };

  const sortedTimeline = useMemo(() => {
    if (!order) return [] as Order['timeline'];
    const timeline = order.timeline ?? [];
    return [...timeline].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }, [order]);

  if (loading) {
    return (
      <main className={cn(styles.pageShell, 'bg-transparent text-slate-900 dark:text-slate-100')}>
        <div className={cn(styles.pageShell__inner, 'mx-auto max-w-6xl px-4 py-16 sm:px-6')}>
          <div className="h-64 rounded-3xl border border-indigo-200/60 bg-white/90 shadow-2xl shadow-indigo-200/40 dark:border-indigo-500/30 dark:bg-slate-950/70 dark:shadow-indigo-900/40" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className={cn(styles.pageShell, 'bg-transparent text-slate-900 dark:text-slate-100')}>
        <div className={cn(styles.pageShell__inner, 'mx-auto max-w-6xl px-4 py-16 sm:px-6')}>
          <ErrorCard message={error} onRetry={() => window.location.reload()} />
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className={cn(styles.pageShell, 'bg-transparent text-slate-900 dark:text-slate-100')}>
        <div className={cn(styles.pageShell__inner, 'mx-auto max-w-6xl px-4 py-16 sm:px-6')}>
          <ErrorCard message="Order not found." />
        </div>
      </main>
    );
  }

  const orderItems = order.items ?? [];
  const totalItems = orderItems.reduce((sum, item) => sum + item.qty, 0);
  const grandTotalPaise = order.totals?.grandPaise ?? orderItems.reduce((sum, item) => sum + item.subtotalPaise, 0);
  const canCancel = authUserId && order.customer.id === authUserId && cancellableStatuses.has(order.status);
  const canRate = authUserId && order.customer.id === authUserId && order.status === 'delivered';

  return (
    <main className={cn(styles.pageShell, 'bg-transparent text-slate-900 dark:text-slate-100')}>
      <div className={cn(styles.pageShell__inner, 'mx-auto max-w-6xl px-4 pb-28 pt-12 sm:px-6')}>
        <motion.section
          initial={sectionMotion.initial}
          animate={sectionMotion.animate}
          transition={sectionMotion.transition}
          className="space-y-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="ghost"
              className="inline-flex items-center gap-2 rounded-full border border-indigo-200/60 bg-white/80 px-4 py-2 text-sm font-semibold text-indigo-600 shadow-sm hover:border-indigo-400 hover:text-indigo-700 dark:border-indigo-500/30 dark:bg-slate-900/70 dark:text-indigo-200"
              onClick={() => navigate(paths.orders.mine())}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to orders
            </Button>
            <div className="flex flex-wrap items-center gap-2 rounded-full bg-indigo-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-200">
              <Truck className="h-4 w-4" aria-hidden="true" />
              Order ID #{order.id.slice(-8)}
            </div>
          </div>
          <Card className="rounded-3xl border border-indigo-200/60 bg-gradient-to-br from-indigo-500/12 via-white/90 to-white/70 shadow-2xl shadow-indigo-200/40 backdrop-blur-xl dark:border-indigo-500/30 dark:bg-slate-950/70 dark:shadow-indigo-900/40">
            <CardHeader className="flex flex-col gap-6 border-none p-6 md:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white md:text-3xl">
                    Order summary
                  </CardTitle>
                  <p className="text-sm text-slate-600 dark:text-slate-300 md:text-base">
                    Placed on {new Date(order.createdAt).toLocaleString()} • {totalItems} item{totalItems === 1 ? '' : 's'} • {formatINR(grandTotalPaise)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-indigo-300/70 bg-indigo-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-indigo-600 dark:border-indigo-500/40 dark:bg-indigo-500/20 dark:text-indigo-200">
                      {order.status.replace(/_/g, ' ').toUpperCase()}
                    </span>
                    <span className="rounded-full border border-slate-200/70 bg-white/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-600 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-300">
                      {orderItems.length} products
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full px-4 py-2 text-sm font-semibold"
                    onClick={() => showToast('Invoice download coming soon.', 'info')}
                  >
                    <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                    Download invoice
                  </Button>
                  {canCancel ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="rounded-full px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-rose-400 dark:hover:bg-rose-500/20"
                      onClick={handleCancel}
                    >
                      Cancel order
                    </Button>
                  ) : null}
                  {canRate ? (
                    <Button
                      type="button"
                      className="rounded-full px-4 py-2 text-sm font-semibold"
                      onClick={handleRate}
                      disabled={ratingBusy}
                    >
                      <Star className="mr-2 h-4 w-4" aria-hidden="true" />
                      {ratingBusy ? 'Submitting…' : 'Rate order'}
                    </Button>
                  ) : null}
                </div>
              </div>
              <div className="grid gap-6 text-sm text-slate-600 dark:text-slate-300 md:grid-cols-2">
                <div className="rounded-2xl border border-indigo-200/60 bg-white/80 p-4 shadow-md shadow-indigo-200/40 dark:border-indigo-500/30 dark:bg-slate-900/70 dark:text-slate-200">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-500 dark:text-indigo-300">Delivery</p>
                  <p className="mt-2 font-semibold text-slate-900 dark:text-white">{order.fulfillment?.type ?? 'Standard delivery'}</p>
                  <p>{order.fulfillment?.eta ?? 'We will notify you with live updates.'}</p>
                </div>
                <div className="rounded-2xl border border-indigo-200/60 bg-white/80 p-4 shadow-md shadow-indigo-200/40 dark:border-indigo-500/30 dark:bg-slate-900/70 dark:text-slate-200">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-500 dark:text-indigo-300">Payment</p>
                  <p className="mt-2 font-semibold text-slate-900 dark:text-white">
                    {order.payment?.method ? order.payment.method.replace(/_/g, ' ') : 'Pending confirmation'}
                  </p>
                  <p>{order.payment?.status ? order.payment.status.replace(/_/g, ' ') : 'Awaiting payment status'}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-8 px-6 pb-8 pt-0 md:px-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-6 shadow-xl shadow-slate-200/60 dark:border-slate-800/70 dark:bg-slate-900/70">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Items</h3>
                  <Table className="mt-4">
                    <TableHeader>
                      <TableRow className="border-none">
                        <TableHead>Product</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderItems.map((item) => (
                        <TableRow key={item.id} className="border-none">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <img src={item.image || fallbackImage} alt={item.title} className="h-14 w-14 rounded-2xl border border-slate-200/70 object-cover shadow-md dark:border-slate-700/70" loading="lazy" />
                              <span className="text-sm font-semibold text-slate-900 dark:text-white">{item.title}</span>
                            </div>
                          </TableCell>
                          <TableCell>{item.qty}</TableCell>
                          <TableCell>{formatINR(item.unitPricePaise)}</TableCell>
                          <TableCell className="text-right font-semibold text-slate-900 dark:text-white">
                            {formatINR(item.subtotalPaise)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-6 shadow-xl shadow-slate-200/60 dark:border-slate-800/70 dark:bg-slate-900/70">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Timeline</h3>
                  <OrderTimeline status={order.status} timeline={sortedTimeline} />
                </div>
              </div>
              <div className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  <OrderPaymentCard
                    totals={order.totals}
                    paymentMethod={order.payment?.method}
                    paymentStatus={order.payment?.status}
                  />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut', delay: 0.05 }}
                >
                  <OrderAddressCard address={order.shippingAddress} fulfillment={order.fulfillment} />
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.section>
      </div>
    </main>
  );
};

export default OrderDetail;
