import { Bookmark, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { SCHEMA_LIMITS } from '../types/store';
import { formatCurrency } from '../utils/formatters';
import { ProductImage } from './ProductImage';

export function CartDrawer() {
  const {
    isCartOpen,
    setIsCartOpen,
    cartItems,
    savedForLaterIds,
    products,
    cartSubtotal,
    updateCartQuantity,
    removeFromCart,
    moveToSavedForLater,
    moveSavedToCart,
    removeSavedForLater,
    firebaseUser,
    openAuthModal,
    setActiveView,
    openProductDetail,
    isUsingSeedPreview,
    pushToast,
  } = useStore();

  if (!isCartOpen) return null;

  const savedForLaterProducts = savedForLaterIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const freeShippingRemaining = Math.max(
    0,
    SCHEMA_LIMITS.FREE_SHIPPING_THRESHOLD - cartSubtotal
  );
  const shippingEstimate =
    cartSubtotal === 0
      ? 0
      : cartSubtotal >= SCHEMA_LIMITS.FREE_SHIPPING_THRESHOLD
      ? 0
      : SCHEMA_LIMITS.STANDARD_SHIPPING_COST;

  const handleCheckout = () => {
    if (isUsingSeedPreview) {
      pushToast(
        'Catalog is in Demo Preview mode. An administrator must initialize Firestore before checkout.',
        'error'
      );
      return;
    }
    setIsCartOpen(false);
    if (!firebaseUser) {
      openAuthModal('login', 'checkout');
      pushToast('Please sign in or create an account to complete checkout.', 'neutral');
      return;
    }
    setActiveView('checkout');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        onClick={() => setIsCartOpen(false)}
        className="fixed inset-0 bg-zinc-950/35 backdrop-blur-sm transition-opacity"
        aria-hidden="true"
      />

      <aside
        aria-label="Shopping Bag"
        className="relative w-full max-w-md bg-white/85 backdrop-blur-2xl h-full flex flex-col border-l border-white/80 shadow-[-12px_0_40px_-10px_rgba(24,24,27,0.18)]"
      >
        <div className="px-6 py-5 border-b border-zinc-900/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-4 h-4 text-zinc-900" />
            <h2 className="font-display text-base font-semibold text-zinc-900">
              Shopping Bag
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setIsCartOpen(false)}
            aria-label="Close shopping bag"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-white/70 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free shipping indicator */}
        {cartItems.length > 0 && (
          <div className="px-6 py-3 bg-zinc-900/[0.04] border-b border-zinc-900/[0.06] text-xs text-zinc-700">
            {freeShippingRemaining === 0 ? (
              <span>Your order qualifies for complimentary studio shipping.</span>
            ) : (
              <span>
                Add <strong className="font-mono">{formatCurrency(freeShippingRemaining)}</strong> more for complimentary shipping.
              </span>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12">
              <ShoppingBag className="w-10 h-10 text-zinc-300 stroke-[1.25] mb-4" />
              <p className="font-display text-base font-semibold text-zinc-900 mb-1">
                Your bag is empty
              </p>
              <p className="text-sm text-zinc-500 mb-6 max-w-xs">
                Explore lighting, studio audio, workspace gear, kitchen appliances, and furniture.
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsCartOpen(false);
                  setActiveView('catalog');
                }}
                className="px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-medium cursor-pointer"
              >
                Browse Catalog
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {cartItems.map((item) => {
                const product = products.find((p) => p.id === item.productId);
                if (!product) return null;
                const maxAllowed = Math.min(product.stock, SCHEMA_LIMITS.MAX_ITEM_QTY);
                return (
                  <div
                    key={item.productId}
                    className="glass-card rounded-2xl p-3.5 flex gap-3.5"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setIsCartOpen(false);
                        openProductDetail(product.id);
                      }}
                      className="w-20 h-20 rounded-xl bg-zinc-100 shrink-0 overflow-hidden cursor-pointer"
                    >
                      <ProductImage src={product.imageUrl} alt={product.name} />
                    </button>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => {
                              setIsCartOpen(false);
                              openProductDetail(product.id);
                            }}
                            className="text-sm font-medium text-zinc-900 truncate block hover:underline text-left w-full cursor-pointer"
                          >
                            {product.name}
                          </button>
                          <p className="text-xs text-zinc-500 mt-0.5 tabular-nums">
                            {formatCurrency(product.price)} each · {product.stock} left
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.productId)}
                          aria-label={`Remove ${product.name}`}
                          className="text-zinc-400 hover:text-zinc-900 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <div className="inline-flex items-center glass-subtle rounded-lg overflow-hidden">
                          <button
                            type="button"
                            aria-label="Decrease item quantity"
                            onClick={() =>
                              updateCartQuantity(item.productId, item.quantity - 1)
                            }
                            className="w-7 h-7 flex items-center justify-center text-zinc-700 hover:bg-white/70 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center font-mono text-xs tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            aria-label="Increase item quantity"
                            disabled={item.quantity >= maxAllowed}
                            onClick={() =>
                              updateCartQuantity(item.productId, item.quantity + 1)
                            }
                            className="w-7 h-7 flex items-center justify-center text-zinc-700 hover:bg-white/70 disabled:opacity-40 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="font-mono text-sm font-medium text-zinc-900 tabular-nums">
                          {formatCurrency(product.price * item.quantity)}
                        </span>
                      </div>

                      <div className="mt-2 pt-2 border-t border-zinc-900/[0.06] flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => moveToSavedForLater(item.productId)}
                          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-600 hover:text-zinc-900 cursor-pointer"
                        >
                          <Bookmark className="w-3 h-3" />
                          <span>Save for later</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Saved for Later Section */}
          {savedForLaterProducts.length > 0 && (
            <div className="pt-4 border-t border-zinc-900/[0.08]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
                  Saved for Later ({savedForLaterProducts.length})
                </h3>
              </div>
              <div className="space-y-2.5">
                {savedForLaterProducts.map((product) => (
                  <div
                    key={product.id}
                    className="glass-subtle rounded-2xl p-3 flex items-center gap-3"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setIsCartOpen(false);
                        openProductDetail(product.id);
                      }}
                      className="w-14 h-14 rounded-xl bg-zinc-100 shrink-0 overflow-hidden cursor-pointer"
                    >
                      <ProductImage src={product.imageUrl} alt={product.name} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-zinc-900 truncate">
                        {product.name}
                      </p>
                      <p className="font-mono text-xs text-zinc-700 mt-0.5 tabular-nums">
                        {formatCurrency(product.price)}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <button
                          type="button"
                          disabled={product.stock <= 0}
                          onClick={() => moveSavedToCart(product.id)}
                          className="text-[11px] font-medium text-zinc-900 underline underline-offset-4 disabled:opacity-40 cursor-pointer"
                        >
                          {product.stock > 0 ? 'Move to Bag' : 'Out of Stock'}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSavedForLater(product.id)}
                          className="text-[11px] text-zinc-500 hover:text-zinc-900 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="p-6 border-t border-zinc-900/[0.08] bg-white/75 backdrop-blur-xl space-y-3">
            <div className="flex justify-between text-xs text-zinc-600">
              <span>Subtotal</span>
              <span className="font-mono tabular-nums">{formatCurrency(cartSubtotal)}</span>
            </div>
            <div className="flex justify-between text-xs text-zinc-600">
              <span>Estimated Shipping</span>
              <span className="font-mono tabular-nums">
                {shippingEstimate === 0 ? 'Free' : formatCurrency(shippingEstimate)}
              </span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-zinc-900 pt-2 border-t border-zinc-900/[0.08]">
              <span>Estimated Total</span>
              <span className="font-mono tabular-nums">
                {formatCurrency(cartSubtotal + shippingEstimate)}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCheckout}
              className="w-full py-3.5 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 shadow-[0_10px_24px_-8px_rgba(24,24,27,0.45)] transition-all cursor-pointer"
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
