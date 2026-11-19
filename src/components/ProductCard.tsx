import { Heart, Plus, Truck, Zap } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { SCHEMA_LIMITS, type Product } from '../types/store';
import { formatCurrency } from '../utils/formatters';
import { ProductImage } from './ProductImage';

interface ProductCardProps {
  product: Product;
  compact?: boolean;
}

export function ProductCard({ product, compact = false }: ProductCardProps) {
  const { openProductDetail, addToCart, buyNow, toggleWishlist, isWishlisted } =
    useStore();
  const inStock = product.stock > 0;
  const saved = isWishlisted(product.id);
  const freeShipping = product.price >= SCHEMA_LIMITS.FREE_SHIPPING_THRESHOLD;

  return (
    <article className="group flex flex-col glass-card rounded-2xl p-3 hover:-translate-y-1">
      <div className="relative aspect-[4/3] w-full rounded-xl bg-zinc-100 overflow-hidden">
        <button
          type="button"
          onClick={() => openProductDetail(product.id)}
          className="w-full h-full block text-left cursor-pointer"
        >
          <ProductImage
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </button>

        {/* Wishlist Heart Glass Button */}
        <button
          type="button"
          onClick={() => toggleWishlist(product)}
          aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
            saved
              ? 'bg-zinc-900 text-white shadow-md'
              : 'glass-panel-strong text-zinc-700 hover:text-zinc-900'
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${saved ? 'fill-current' : ''}`} />
        </button>
      </div>

      <div className="px-1.5 pt-3.5 pb-1 flex-1 flex flex-col justify-between gap-3">
        <div>
          <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-500 mb-1">
            <span className="truncate">
              {product.categoryName}
              <span aria-hidden="true" className="mx-1">·</span>
              {inStock
                ? product.stock <= 5
                  ? `Only ${product.stock} left`
                  : `${product.stock} in stock`
                : 'Out of stock'}
            </span>
            {product.isNewArrival && inStock && (
              <span className="text-zinc-900 font-semibold shrink-0">New</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => openProductDetail(product.id)}
            className="text-left w-full cursor-pointer"
          >
            <h3 className="font-display text-sm sm:text-[15px] font-semibold text-zinc-900 leading-snug line-clamp-2 group-hover:underline underline-offset-4">
              {product.name}
            </h3>
          </button>

          {!compact && (
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mt-1.5">
              <Truck className="w-3 h-3 text-zinc-700 shrink-0" />
              <span>
                {freeShipping ? 'Free studio delivery' : 'Standard studio dispatch'}
              </span>
            </div>
          )}
        </div>

        <div className="pt-2.5 border-t border-zinc-900/[0.06] space-y-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono text-base font-semibold text-zinc-900 tabular-nums">
              {formatCurrency(product.price)}
            </span>
            <span className="font-mono text-[11px] text-zinc-400">
              {product.sku}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!inStock}
              onClick={() => addToCart(product, 1)}
              className={`py-2 px-2.5 rounded-xl text-xs font-medium inline-flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
                inStock
                  ? 'bg-zinc-900 text-white hover:bg-zinc-800 cursor-pointer'
                  : 'bg-zinc-200/70 text-zinc-400 cursor-not-allowed'
              }`}
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>{inStock ? 'Add' : 'Sold Out'}</span>
            </button>

            <button
              type="button"
              disabled={!inStock}
              onClick={() => buyNow(product, 1)}
              className={`py-2 px-2.5 rounded-xl text-xs font-medium inline-flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
                inStock
                  ? 'glass-subtle text-zinc-900 hover:bg-white/95 cursor-pointer'
                  : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
              }`}
            >
              <Zap className="w-3 h-3 shrink-0" />
              <span>Buy Now</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
