import {
  ArrowLeft,
  Check,
  Heart,
  Lock,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  Truck,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { SCHEMA_LIMITS } from '../types/store';
import { formatCurrency } from '../utils/formatters';
import { ProductCard } from './ProductCard';
import { ProductImage } from './ProductImage';

export function ProductDetailView() {
  const {
    products,
    selectedProductId,
    setActiveView,
    openCatalogFiltered,
    openProductDetail,
    addToCart,
    buyNow,
    toggleWishlist,
    isWishlisted,
    recentlyViewedIds,
    deliveryLocation,
    cartItems,
    pushToast,
  } = useStore();

  const product = products.find((p) => p.id === selectedProductId);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setQuantity(1);
  }, [selectedProductId]);

  const specBullets = useMemo(() => {
    if (!product?.specs) return [];
    return product.specs
      .split('·')
      .map((s) => s.trim())
      .filter(Boolean);
  }, [product?.specs]);

  // Build "Frequently Bought Together" 2-3 item studio bundle
  const bundleItems = useMemo(() => {
    if (!product || product.stock <= 0) return [];
    const companions = products
      .filter((p) => p.id !== product.id && p.stock > 0)
      .sort((a, b) => {
        const aDiff = a.categoryId !== product.categoryId ? 0 : 1;
        const bDiff = b.categoryId !== product.categoryId ? 0 : 1;
        return aDiff - bDiff;
      })
      .slice(0, 2);
    return companions.length > 0 ? [product, ...companions] : [];
  }, [product, products]);

  const bundleTotal = useMemo(
    () => bundleItems.reduce((sum, item) => sum + item.price, 0),
    [bundleItems]
  );

  const recentlyViewed = useMemo(() => {
    return recentlyViewedIds
      .filter((id) => id !== selectedProductId)
      .map((id) => products.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .slice(0, 4);
  }, [recentlyViewedIds, selectedProductId, products]);

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="glass-panel rounded-3xl p-10 max-w-lg mx-auto">
          <h1 className="font-display text-2xl font-semibold text-zinc-900 mb-3">
            Product not found
          </h1>
          <p className="text-sm text-zinc-600 mb-6">
            This item may have been removed or is unavailable.
          </p>
          <button
            type="button"
            onClick={() => setActiveView('catalog')}
            className="px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-medium cursor-pointer"
          >
            Return to Catalog
          </button>
        </div>
      </div>
    );
  }

  const inBagQty =
    cartItems.find((item) => item.productId === product.id)?.quantity || 0;
  const remainingAddable = Math.max(
    0,
    Math.min(product.stock, SCHEMA_LIMITS.MAX_ITEM_QTY) - inBagQty
  );
  const inStock = product.stock > 0;
  const saved = isWishlisted(product.id);
  const qualifiesFreeShipping =
    product.price * quantity >= SCHEMA_LIMITS.FREE_SHIPPING_THRESHOLD;

  const related = products
    .filter((p) => p.id !== product.id && p.categoryId === product.categoryId)
    .slice(0, 4);

  const handleAddBundle = () => {
    bundleItems.forEach((item, index) => {
      addToCart(item, 1, index === bundleItems.length - 1);
    });
    pushToast(`Added ${bundleItems.length} bundled objects to bag.`, 'success');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
      {/* Breadcrumb Bar */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 mb-6">
        <button
          type="button"
          onClick={() => setActiveView('catalog')}
          className="inline-flex items-center gap-1.5 font-medium text-zinc-700 hover:text-zinc-900 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Catalog</span>
        </button>
        <span aria-hidden="true">/</span>
        <button
          type="button"
          onClick={() => openCatalogFiltered({ categoryId: product.categoryId })}
          className="hover:text-zinc-900 underline underline-offset-4 cursor-pointer"
        >
          {product.categoryName}
        </button>
        <span aria-hidden="true">/</span>
        <span className="text-zinc-900 font-medium truncate max-w-xs">{product.name}</span>
      </div>

      {/* Classic 3-Column Amazon/Flipkart Product Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
        {/* Column 1: Product Media & Studio Highlights (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-panel rounded-3xl p-3">
            <div className="aspect-[4/3] rounded-2xl bg-zinc-100 overflow-hidden">
              <ProductImage
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="glass-subtle rounded-2xl p-4 grid grid-cols-3 gap-3 text-center text-xs">
            <div>
              <p className="text-zinc-500">Edition</p>
              <p className="font-medium text-zinc-900 mt-0.5">Studio Original</p>
            </div>
            <div className="border-x border-zinc-900/[0.08]">
              <p className="text-zinc-500">Dispatch</p>
              <p className="font-medium text-zinc-900 mt-0.5">24–48 Hours</p>
            </div>
            <div>
              <p className="text-zinc-500">Warranty</p>
              <p className="font-medium text-zinc-900 mt-0.5">2-Year Studio</p>
            </div>
          </div>
        </div>

        {/* Column 2: Product Narrative & Technical Specs (4 cols) */}
        <div className="lg:col-span-4 glass-panel rounded-3xl p-6 space-y-5">
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
              <span className="uppercase tracking-wider">{product.categoryName}</span>
              <span className="font-mono">SKU: {product.sku}</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-zinc-900 tracking-tight leading-snug">
              {product.name}
            </h1>
          </div>

          <div className="pb-4 border-b border-zinc-900/[0.08] flex items-baseline justify-between gap-4">
            <div>
              <span className="font-mono text-3xl font-semibold text-zinc-900 tabular-nums">
                {formatCurrency(product.price)}
              </span>
              <p className="text-xs text-zinc-500 mt-1">
                {product.price >= SCHEMA_LIMITS.FREE_SHIPPING_THRESHOLD
                  ? 'Qualifies for Free Studio Shipping'
                  : `Add ${formatCurrency(
                      SCHEMA_LIMITS.FREE_SHIPPING_THRESHOLD - product.price
                    )} for Free Shipping`}
              </p>
            </div>
            <span
              className={`text-xs font-semibold ${
                inStock ? 'text-zinc-900' : 'text-red-700'
              }`}
            >
              {inStock ? `In Stock (${product.stock})` : 'Out of Stock'}
            </span>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
              About This Object
            </h2>
            <p className="text-sm text-zinc-700 leading-relaxed">{product.description}</p>
          </div>

          {specBullets.length > 0 && (
            <div className="pt-4 border-t border-zinc-900/[0.08]">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
                Technical Specifications
              </h2>
              <ul className="space-y-2">
                {specBullets.map((spec) => (
                  <li
                    key={spec}
                    className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-700"
                  >
                    <Check className="w-4 h-4 text-zinc-900 shrink-0 mt-0.5" />
                    <span>{spec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Column 3: Sticky Frosted Buy Box (3 cols) */}
        <aside className="lg:col-span-3 lg:sticky lg:top-32 glass-panel-strong rounded-3xl p-5 sm:p-6 space-y-5">
          <div>
            <p className="font-mono text-2xl font-semibold text-zinc-900 tabular-nums">
              {formatCurrency(product.price)}
            </p>
            <div className="mt-2 flex items-start gap-2 text-xs text-zinc-600">
              <Truck className="w-4 h-4 text-zinc-900 shrink-0 mt-0.5" />
              <span>
                {qualifiesFreeShipping
                  ? 'FREE insured studio delivery'
                  : `$${SCHEMA_LIMITS.STANDARD_SHIPPING_COST} flat-rate studio delivery`}
              </span>
            </div>
            <div className="mt-2 flex items-start gap-2 text-xs text-zinc-600">
              <MapPin className="w-4 h-4 text-zinc-900 shrink-0 mt-0.5" />
              <span>
                Deliver to{' '}
                <strong className="text-zinc-900">
                  {deliveryLocation.city} {deliveryLocation.postalCode}
                </strong>
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-900/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-700">Quantity</span>
              <div className="inline-flex items-center glass-subtle rounded-xl overflow-hidden">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  disabled={!inStock || quantity <= 1}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-9 h-9 flex items-center justify-center text-zinc-700 hover:bg-white/70 disabled:opacity-40 cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-10 text-center font-mono text-sm tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  disabled={!inStock || quantity >= remainingAddable}
                  onClick={() =>
                    setQuantity((q) => Math.min(remainingAddable, q + 1))
                  }
                  className="w-9 h-9 flex items-center justify-center text-zinc-700 hover:bg-white/70 disabled:opacity-40 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {inBagQty > 0 && (
              <p className="text-[11px] text-zinc-500 tabular-nums">
                {inBagQty} already in bag ({remainingAddable} more available).
              </p>
            )}

            <button
              type="button"
              disabled={!inStock || remainingAddable === 0}
              onClick={() => {
                addToCart(product, quantity);
                setQuantity(1);
              }}
              className="w-full py-3 rounded-xl bg-zinc-900 text-white text-xs sm:text-sm font-medium hover:bg-zinc-800 shadow-[0_10px_24px_-8px_rgba(24,24,27,0.45)] transition-all disabled:bg-zinc-200 disabled:text-zinc-500 disabled:shadow-none disabled:cursor-not-allowed cursor-pointer"
            >
              {!inStock
                ? 'Out of Stock'
                : remainingAddable === 0
                ? 'Max Stock in Bag'
                : 'Add to Bag'}
            </button>

            <button
              type="button"
              disabled={!inStock}
              onClick={() => buyNow(product, quantity)}
              className="w-full py-3 rounded-xl glass-subtle text-zinc-900 text-xs sm:text-sm font-medium hover:bg-white/95 inline-flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              <span>Buy Now</span>
            </button>

            <button
              type="button"
              onClick={() => toggleWishlist(product)}
              className={`w-full py-2.5 rounded-xl text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                saved
                  ? 'bg-zinc-900 text-white'
                  : 'border border-zinc-900/12 bg-white/60 text-zinc-800 hover:bg-white'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${saved ? 'fill-current' : ''}`} />
              <span>{saved ? 'Saved in Wishlist' : 'Save to Wishlist'}</span>
            </button>
          </div>

          <div className="pt-4 border-t border-zinc-900/[0.08] space-y-2 text-[11px] text-zinc-600">
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-zinc-800 shrink-0" />
              <span>Verified atomic inventory checkout</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-800 shrink-0" />
              <span>Two-year warranty · 30-day returns</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Frequently Bought Together Bundle Card */}
      {bundleItems.length >= 2 && (
        <section className="mt-12 glass-panel rounded-3xl p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-zinc-500">
                  Studio Pairing
                </p>
                <h2 className="font-display text-xl font-semibold text-zinc-900">
                  Frequently Bought Together
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {bundleItems.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => openProductDetail(item.id)}
                      className="glass-card rounded-2xl p-2.5 w-36 text-left cursor-pointer"
                    >
                      <div className="aspect-[4/3] rounded-xl bg-zinc-100 overflow-hidden mb-2">
                        <ProductImage src={item.imageUrl} alt={item.name} />
                      </div>
                      <p className="text-xs font-medium text-zinc-900 line-clamp-1">
                        {item.name}
                      </p>
                      <p className="font-mono text-xs text-zinc-600 mt-0.5 tabular-nums">
                        {formatCurrency(item.price)}
                      </p>
                    </button>
                    {idx < bundleItems.length - 1 && (
                      <span className="text-lg font-light text-zinc-400">+</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-subtle rounded-2xl p-5 lg:w-72 shrink-0 space-y-3">
              <p className="text-xs text-zinc-500">
                Bundle Total ({bundleItems.length} items)
              </p>
              <p className="font-mono text-2xl font-semibold text-zinc-900 tabular-nums">
                {formatCurrency(bundleTotal)}
              </p>
              <button
                type="button"
                onClick={handleAddBundle}
                className="w-full py-3 rounded-xl bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 cursor-pointer"
              >
                Add All {bundleItems.length} to Bag
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Related Objects */}
      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-xl font-semibold text-zinc-900 mb-6">
            More from {product.categoryName}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}

      {/* Recently Viewed Strip */}
      {recentlyViewed.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-xl font-semibold text-zinc-900 mb-6">
            Recently Viewed Objects
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {recentlyViewed.map((item) => (
              <ProductCard key={item.id} product={item} compact />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
