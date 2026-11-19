import { Heart } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from './ProductCard';

export function WishlistView() {
  const { wishlistIds, products, setActiveView } = useStore();
  const savedProducts = wishlistIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="glass-panel rounded-3xl p-6 sm:p-8 flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">
            Personal Collection
          </p>
          <h1 className="font-display text-3xl font-semibold text-zinc-900 tracking-tight">
            Saved Items &amp; Wishlist
          </h1>
        </div>
        <span className="font-mono text-xs text-zinc-500 tabular-nums">
          {savedProducts.length} saved {savedProducts.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {savedProducts.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center">
          <Heart className="w-9 h-9 text-zinc-400 mx-auto mb-3" />
          <h2 className="font-display text-lg font-semibold text-zinc-900 mb-2">
            Your wishlist is empty
          </h2>
          <p className="text-sm text-zinc-600 mb-6">
            Tap the heart icon on any product card to bookmark items for quick checkout later.
          </p>
          <button
            type="button"
            onClick={() => setActiveView('catalog')}
            className="px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-medium cursor-pointer"
          >
            Explore Catalog
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {savedProducts.map((prod) => (
            <ProductCard key={prod.id} product={prod} />
          ))}
        </div>
      )}
    </div>
  );
}
