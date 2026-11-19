import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Download, Lock } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import {
  downloadOrderReceiptHtml,
  placeOrderTransaction,
  updateCustomerProfile,
} from '../services/storeService';
import {
  SCHEMA_LIMITS,
  type Order,
  type PaymentMethod,
} from '../types/store';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { ProductImage } from './ProductImage';

function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `idem_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function CheckoutView() {
  const {
    firebaseUser,
    userProfile,
    cartItems,
    products,
    setActiveView,
    openAuthModal,
    lastPlacedOrder,
    setLastPlacedOrder,
    pushToast,
  } = useStore();

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [stateRegion, setStateRegion] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('United States');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card_standard');
  const [saveAddress, setSaveAddress] = useState(true);

  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => createIdempotencyKey());
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (userProfile) {
      setCustomerName((prev) => prev || userProfile.name || '');
      setCustomerEmail((prev) => prev || userProfile.email || '');
      setCustomerPhone((prev) => prev || userProfile.phone || '');
      if (userProfile.defaultAddress) {
        setLine1((prev) => prev || userProfile.defaultAddress?.line1 || '');
        setLine2((prev) => prev || userProfile.defaultAddress?.line2 || '');
        setCity((prev) => prev || userProfile.defaultAddress?.city || '');
        setStateRegion((prev) => prev || userProfile.defaultAddress?.state || '');
        setPostalCode((prev) => prev || userProfile.defaultAddress?.postalCode || '');
        setCountry((prev) => prev || userProfile.defaultAddress?.country || 'United States');
      }
    } else if (firebaseUser) {
      setCustomerName((prev) => prev || firebaseUser.displayName || '');
      setCustomerEmail((prev) => prev || firebaseUser.email || '');
    }
  }, [userProfile, firebaseUser]);

  useEffect(() => {
    if (lastPlacedOrder) {
      setConfirmedOrder(lastPlacedOrder);
      setLastPlacedOrder(null);
    }
  }, [lastPlacedOrder, setLastPlacedOrder]);

  const enrichedCart = useMemo(() => {
    return cartItems
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        return product ? { item, product } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [cartItems, products]);

  const subtotal = useMemo(
    () =>
      Number(
        enrichedCart
          .reduce((sum, entry) => sum + entry.product.price * entry.item.quantity, 0)
          .toFixed(2)
      ),
    [enrichedCart]
  );

  const shippingCost =
    subtotal === 0
      ? 0
      : subtotal >= SCHEMA_LIMITS.FREE_SHIPPING_THRESHOLD
      ? 0
      : SCHEMA_LIMITS.STANDARD_SHIPPING_COST;
  const total = Number((subtotal + shippingCost).toFixed(2));

  if (!firebaseUser) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="glass-panel rounded-3xl p-10">
          <Lock className="w-8 h-8 text-zinc-400 mx-auto mb-4" />
          <h1 className="font-display text-2xl font-semibold text-zinc-900 mb-2">
            Sign in required for checkout
          </h1>
          <p className="text-sm text-zinc-600 mb-6">
            Your order history, shipping address, and real-time inventory reservations are protected by your account.
          </p>
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="px-6 py-3 rounded-xl bg-zinc-900 text-white text-sm font-medium cursor-pointer"
          >
            Sign In / Create Account
          </button>
        </div>
      </div>
    );
  }

  if (confirmedOrder) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="glass-panel-strong rounded-3xl p-6 sm:p-10">
          <div className="flex items-start gap-4 pb-6 border-b border-zinc-900/[0.08]">
            <CheckCircle2 className="w-7 h-7 text-zinc-900 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">
                Order Confirmed
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-semibold text-zinc-900">
                Thank you, {confirmedOrder.customerName}
              </h1>
              <p className="text-sm text-zinc-600 mt-1">
                Order <span className="font-mono font-medium text-zinc-900">{confirmedOrder.orderId}</span> has been placed and stock has been reserved.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-zinc-900/[0.08] text-sm">
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-500 mb-1.5">
                Shipping Destination
              </p>
              <p className="font-medium text-zinc-900">{confirmedOrder.customerName}</p>
              <p className="text-zinc-600">{confirmedOrder.shippingAddress.line1}</p>
              {confirmedOrder.shippingAddress.line2 && (
                <p className="text-zinc-600">{confirmedOrder.shippingAddress.line2}</p>
              )}
              <p className="text-zinc-600">
                {confirmedOrder.shippingAddress.city}, {confirmedOrder.shippingAddress.state}{' '}
                {confirmedOrder.shippingAddress.postalCode}
              </p>
              <p className="text-zinc-600">{confirmedOrder.shippingAddress.country}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-500 mb-1.5">
                Order Metadata
              </p>
              <p className="text-zinc-700">
                Status: <strong className="uppercase">{confirmedOrder.status}</strong>
              </p>
              <p className="text-zinc-700">
                Payment:{' '}
                {confirmedOrder.paymentMethod === 'cash_on_delivery'
                  ? 'Cash on Delivery'
                  : 'Standard Card Settlement'}
              </p>
              <p className="text-zinc-700">
                Placed: {formatDateTime(confirmedOrder.createdAt)}
              </p>
            </div>
          </div>

          <div className="py-6 border-b border-zinc-900/[0.08] space-y-3">
            {confirmedOrder.items.map((item) => (
              <div
                key={item.productId}
                className="flex items-center justify-between gap-4 text-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-zinc-100 shrink-0 overflow-hidden">
                    <ProductImage src={item.imageUrl} alt={item.name} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-900 truncate">{item.name}</p>
                    <p className="text-xs text-zinc-500 tabular-nums">
                      Qty {item.quantity} × {formatCurrency(item.price)}
                    </p>
                  </div>
                </div>
                <span className="font-mono font-medium text-zinc-900 tabular-nums">
                  {formatCurrency(item.lineTotal)}
                </span>
              </div>
            ))}
          </div>

          <div className="py-6 space-y-2 text-sm max-w-xs ml-auto">
            <div className="flex justify-between text-zinc-600">
              <span>Subtotal</span>
              <span className="font-mono tabular-nums">
                {formatCurrency(confirmedOrder.subtotal)}
              </span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>Shipping</span>
              <span className="font-mono tabular-nums">
                {confirmedOrder.shippingCost === 0
                  ? 'Free'
                  : formatCurrency(confirmedOrder.shippingCost)}
              </span>
            </div>
            <div className="flex justify-between font-semibold text-zinc-900 pt-2 border-t border-zinc-900/[0.08] text-base">
              <span>Total</span>
              <span className="font-mono tabular-nums">
                {formatCurrency(confirmedOrder.total)}
              </span>
            </div>
          </div>

          <div className="pt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={async () => {
                try {
                  await downloadOrderReceiptHtml(confirmedOrder);
                } catch (err) {
                  pushToast(
                    err instanceof Error ? err.message : 'Unable to download receipt.',
                    'error'
                  );
                }
              }}
              className="px-5 py-2.5 rounded-xl glass-subtle text-zinc-900 text-xs font-medium inline-flex items-center gap-2 hover:bg-white/90 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Receipt</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('orders')}
              className="px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 cursor-pointer"
            >
              View Order History
            </button>
            <button
              type="button"
              onClick={() => setActiveView('catalog')}
              className="px-5 py-2.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 cursor-pointer"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (enrichedCart.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="glass-panel rounded-3xl p-10">
          <h1 className="font-display text-2xl font-semibold text-zinc-900 mb-2">
            Your shopping bag is empty
          </h1>
          <p className="text-sm text-zinc-600 mb-6">
            Add items from the catalog before proceeding to checkout.
          </p>
          <button
            type="button"
            onClick={() => setActiveView('catalog')}
            className="px-6 py-3 rounded-xl bg-zinc-900 text-white text-sm font-medium cursor-pointer"
          >
            Browse Catalog
          </button>
        </div>
      </div>
    );
  }

  const hasStockConflict = enrichedCart.some(
    ({ item, product }) => product.stock < item.quantity || product.stock === 0
  );

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg('');

    if (hasStockConflict) {
      setErrorMsg('One or more items in your bag exceed available inventory. Please adjust quantities.');
      return;
    }

    if (customerName.trim().length < 2) {
      setErrorMsg('Please enter your full name (at least 2 characters).');
      return;
    }
    if (customerPhone.trim().length < 5) {
      setErrorMsg('Please enter a valid contact phone number (at least 5 characters).');
      return;
    }
    if (
      line1.trim().length < 2 ||
      city.trim().length < 1 ||
      stateRegion.trim().length < 1 ||
      postalCode.trim().length < 2 ||
      country.trim().length < 2
    ) {
      setErrorMsg('Please complete all required shipping address fields.');
      return;
    }

    setSubmitting(true);
    try {
      const shippingAddress = {
        line1: line1.trim(),
        ...(line2.trim() ? { line2: line2.trim() } : {}),
        city: city.trim(),
        state: stateRegion.trim(),
        postalCode: postalCode.trim(),
        country: country.trim(),
      };

      const order = await placeOrderTransaction({
        idempotencyKey,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),
        shippingAddress,
        paymentMethod,
        items: enrichedCart.map(({ item }) => item),
      });

      if (saveAddress && firebaseUser) {
        updateCustomerProfile(firebaseUser.uid, {
          name: customerName.trim(),
          phone: customerPhone.trim(),
          defaultAddress: shippingAddress,
        }).catch(() => {});
      }

      setConfirmedOrder(order);
      setIdempotencyKey(createIdempotencyKey());
      pushToast(`Order ${order.orderId} confirmed.`, 'success');
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to place order. Please review your details.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <button
        type="button"
        onClick={() => setActiveView('catalog')}
        className="inline-flex items-center gap-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 mb-8 cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Store</span>
      </button>

      <h1 className="font-display text-3xl font-semibold text-zinc-900 tracking-tight mb-8">
        Checkout
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <form onSubmit={handlePlaceOrder} className="lg:col-span-7 space-y-6">
          {errorMsg && (
            <div className="p-4 rounded-2xl border border-red-200/80 bg-red-50/85 backdrop-blur-sm text-xs text-red-800">
              {errorMsg}
            </div>
          )}

          {/* Customer Contact */}
          <div className="glass-panel rounded-3xl p-6 sm:p-7 space-y-4">
            <h2 className="font-display text-base font-semibold text-zinc-900">
              01. Customer Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+1 (555) 234-5678"
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="glass-panel rounded-3xl p-6 sm:p-7 space-y-4">
            <h2 className="font-display text-base font-semibold text-zinc-900">
              02. Shipping Address
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                  Street Address
                </label>
                <input
                  type="text"
                  required
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  placeholder="420 Mercer Street"
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                  Apartment, Suite, Unit (Optional)
                </label>
                <input
                  type="text"
                  value={line2}
                  onChange={(e) => setLine2(e.target.value)}
                  placeholder="Suite 4B"
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                  State / Province
                </label>
                <input
                  type="text"
                  required
                  value={stateRegion}
                  onChange={(e) => setStateRegion(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                  Postal Code
                </label>
                <input
                  type="text"
                  required
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                  Country
                </label>
                <input
                  type="text"
                  required
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>
            </div>
            <label className="inline-flex items-center gap-2 text-xs text-zinc-700 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={saveAddress}
                onChange={(e) => setSaveAddress(e.target.checked)}
                className="accent-zinc-900"
              />
              <span>Save shipping details to my account profile</span>
            </label>
          </div>

          {/* Payment Method */}
          <div className="glass-panel rounded-3xl p-6 sm:p-7 space-y-4">
            <h2 className="font-display text-base font-semibold text-zinc-900">
              03. Settlement Method
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('card_standard')}
                className={`p-4 rounded-2xl text-left transition-all cursor-pointer ${
                  paymentMethod === 'card_standard'
                    ? 'bg-white/95 border-2 border-zinc-900 shadow-sm'
                    : 'glass-subtle hover:bg-white/80'
                }`}
              >
                <p className="text-sm font-semibold text-zinc-900">Standard Invoice / Card</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Verified checkout authorization with instant stock lock.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('cash_on_delivery')}
                className={`p-4 rounded-2xl text-left transition-all cursor-pointer ${
                  paymentMethod === 'cash_on_delivery'
                    ? 'bg-white/95 border-2 border-zinc-900 shadow-sm'
                    : 'glass-subtle hover:bg-white/80'
                }`}
              >
                <p className="text-sm font-semibold text-zinc-900">Cash on Delivery</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Pay courier upon verified parcel inspection at delivery.
                </p>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || hasStockConflict}
            className="w-full py-4 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 shadow-[0_12px_28px_-8px_rgba(24,24,27,0.45)] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting
              ? 'Verifying Inventory & Placing Order...'
              : `Place Order — ${formatCurrency(total)}`}
          </button>
        </form>

        {/* Order Summary Sidebar */}
        <aside className="lg:col-span-5 glass-panel-strong rounded-3xl p-6 sm:p-7 sticky top-24">
          <h2 className="font-display text-base font-semibold text-zinc-900 pb-4 border-b border-zinc-900/[0.08] mb-4">
            Order Summary
          </h2>

          <div className="space-y-4 pb-5 border-b border-zinc-900/[0.08]">
            {enrichedCart.map(({ item, product }) => {
              const insufficient = product.stock < item.quantity;
              return (
                <div key={product.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-14 h-14 rounded-xl bg-white border border-zinc-200/70 shrink-0 overflow-hidden">
                      <ProductImage src={product.imageUrl} alt={product.name} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-900 truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-zinc-500 tabular-nums">
                        Qty {item.quantity} × {formatCurrency(product.price)}
                      </p>
                      {insufficient && (
                        <p className="text-xs text-red-700 font-medium">
                          Only {product.stock} left in stock
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="font-mono text-sm font-medium text-zinc-900 tabular-nums">
                    {formatCurrency(product.price * item.quantity)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="pt-5 space-y-2.5 text-sm">
            <div className="flex justify-between text-zinc-600">
              <span>Subtotal</span>
              <span className="font-mono tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>Courier Shipping</span>
              <span className="font-mono tabular-nums">
                {shippingCost === 0 ? 'Free' : formatCurrency(shippingCost)}
              </span>
            </div>
            <div className="flex justify-between text-base font-semibold text-zinc-900 pt-3 border-t border-zinc-900/[0.08]">
              <span>Total</span>
              <span className="font-mono tabular-nums">{formatCurrency(total)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
