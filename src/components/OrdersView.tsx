import { useState } from 'react';
import { ChevronDown, ChevronUp, Download, Lock, PackageCheck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { downloadOrderReceiptHtml } from '../services/storeService';
import type { OrderStatus } from '../types/store';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { ProductImage } from './ProductImage';

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending Verification',
  processing: 'Preparing Shipment',
  shipped: 'In Transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export function OrdersView() {
  const { firebaseUser, orders, openAuthModal, setActiveView, pushToast } = useStore();
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  if (!firebaseUser) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="glass-panel rounded-3xl p-10">
          <Lock className="w-8 h-8 text-zinc-400 mx-auto mb-4" />
          <h1 className="font-display text-2xl font-semibold text-zinc-900 mb-2">
            Sign in to view your orders
          </h1>
          <p className="text-sm text-zinc-600 mb-6">
            Access order tracking, shipment status, and downloadable invoices.
          </p>
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="px-6 py-3 rounded-xl bg-zinc-900 text-white text-sm font-medium cursor-pointer"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-zinc-900/[0.08] mb-8">
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">
            Customer Records
          </p>
          <h1 className="font-display text-3xl font-semibold text-zinc-900 tracking-tight">
            Order History
          </h1>
        </div>
        <span className="font-mono text-xs text-zinc-500 tabular-nums">
          {orders.length} {orders.length === 1 ? 'order' : 'orders'}
        </span>
      </div>

      {orders.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center">
          <PackageCheck className="w-9 h-9 text-zinc-400 mx-auto mb-3" />
          <h2 className="font-display text-lg font-semibold text-zinc-900 mb-2">
            No orders placed yet
          </h2>
          <p className="text-sm text-zinc-600 mb-6">
            Your confirmed orders and downloadable receipts will appear here after checkout.
          </p>
          <button
            type="button"
            onClick={() => setActiveView('catalog')}
            className="px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-medium cursor-pointer"
          >
            Browse Catalog
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isOpen = expandedOrderId === order.orderId;
            return (
              <div
                key={order.orderId}
                className="glass-card rounded-2xl overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedOrderId(isOpen ? null : order.orderId)
                  }
                  className="w-full p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 text-left hover:bg-white/40 transition-colors cursor-pointer"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                      <span className="font-mono font-semibold text-zinc-900">
                        {order.orderId}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{formatDateTime(order.createdAt)}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {order.items.reduce((s, i) => s + i.quantity, 0)} item(s)
                      </span>
                    </div>
                    <p className="text-sm font-medium text-zinc-900">
                      Status:{' '}
                      <span
                        className={
                          order.status === 'cancelled'
                            ? 'text-red-700'
                            : 'text-zinc-900'
                        }
                      >
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-mono text-base font-semibold text-zinc-900 tabular-nums">
                      {formatCurrency(order.total)}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-zinc-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-zinc-500" />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-zinc-900/[0.08] p-5 sm:p-6 bg-white/40 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-zinc-500 mb-1.5">
                          Shipping Address
                        </p>
                        <p className="font-medium text-zinc-900">
                          {order.customerName}
                        </p>
                        <p className="text-zinc-600">{order.shippingAddress.line1}</p>
                        {order.shippingAddress.line2 && (
                          <p className="text-zinc-600">{order.shippingAddress.line2}</p>
                        )}
                        <p className="text-zinc-600">
                          {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                          {order.shippingAddress.postalCode}
                        </p>
                        <p className="text-zinc-600">{order.shippingAddress.country}</p>
                        <p className="text-zinc-500 text-xs mt-1">
                          Phone: {order.customerPhone}
                        </p>
                      </div>

                      <div className="flex flex-col justify-between items-start md:items-end">
                        <div className="text-left md:text-right text-xs text-zinc-600 space-y-1">
                          <p>
                            Payment:{' '}
                            <strong className="text-zinc-900">
                              {order.paymentMethod === 'cash_on_delivery'
                                ? 'Cash on Delivery'
                                : 'Standard Card'}
                            </strong>
                          </p>
                          <p className="tabular-nums">
                            Subtotal: {formatCurrency(order.subtotal)} · Shipping:{' '}
                            {order.shippingCost === 0
                              ? 'Free'
                              : formatCurrency(order.shippingCost)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await downloadOrderReceiptHtml(order);
                            } catch (err) {
                              pushToast(
                                err instanceof Error
                                  ? err.message
                                  : 'Unable to download receipt.',
                                'error'
                              );
                            }
                          }}
                          className="mt-4 px-4 py-2 rounded-xl glass-subtle text-xs font-medium text-zinc-900 inline-flex items-center gap-2 hover:bg-white/90 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Receipt</span>
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-zinc-900/[0.08] pt-4 space-y-3">
                      {order.items.map((item) => (
                        <div
                          key={item.productId}
                          className="flex items-center justify-between gap-4 text-sm"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-12 h-12 rounded-xl bg-white border border-zinc-200/70 shrink-0 overflow-hidden">
                              <ProductImage src={item.imageUrl} alt={item.name} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-zinc-900 truncate">
                                {item.name}
                              </p>
                              <p className="text-xs text-zinc-500 tabular-nums">
                                Qty {item.quantity} × {formatCurrency(item.price)}
                              </p>
                            </div>
                          </div>
                          <span className="font-mono text-sm font-medium text-zinc-900 tabular-nums">
                            {formatCurrency(item.lineTotal)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
