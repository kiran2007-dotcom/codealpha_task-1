import {
  Heart,
  LayoutGrid,
  List,
  Plus,
  Search,
  SlidersHorizontal,
  Truck,
  X,
  Zap,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  useStore,
  type PriceBracket,
  type ProductSort,
} from '../context/StoreContext';
import { SCHEMA_LIMITS } from '../types/store';
import { formatCurrency, toIsoString } from '../utils/formatters';
import { ProductCard } from './ProductCard';
import { ProductImage } from './ProductImage';

type ViewMode = 'grid' | 'list';

export function CatalogView() {
  const {
    products,
    categories,
    catalogLoading,
    searchQuery,
    setSearchQuery,
    selectedCategoryId,
    setSelectedCategoryId,
    sortBy,
    setSortBy,
    priceBracket,
    setPriceBracket,
    onlyNewArrivals,
    setOnlyNewArrivals,
    onlyFeatured,
    setOnlyFeatured,
    onlyInStock,
    setOnlyInStock,
    openProductDetail,
    addToCart,
    buyNow,
    toggleWishlist,
    isWishlisted,
  } = useStore();

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [customMin, setCustomMin] = useState('');
  const [customMax, setCustomMax] = useState('');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const filteredProducts = useMemo(() => {
    const queryLower = searchQuery.trim().toLowerCase();
    const minNum = customMin !== '' ? Number(customMin) : null;
    const maxNum = customMax !== '' ? Number(customMax) : null;

    const list = products.filter((p) => {
      if (selectedCategoryId !== 'all' && p.categoryId !== selectedCategoryId) {
        return false;
      }
      if (onlyNewArrivals && !p.isNewArrival) {
        return false;
      }
      if (onlyFeatured && !p.featured) {
        return false;
      }
      if (onlyInStock && p.stock <= 0) {
        return false;
      }
      if (priceBracket === 'under_200' && p.price >= 200) {
        return false;
      }
      if (priceBracket === '200_500' && (p.price < 200 || p.price > 500)) {
        return false;
      }
      if (priceBracket === 'over_500' && p.price <= 500) {
        return false;
      }
      if (minNum !== null && !Number.isNaN(minNum) && p.price < minNum) {
        return false;
      }
      if (maxNum !== null && !Number.isNaN(maxNum) && p.price > maxNum) {
        return false;
      }
      if (queryLower) {
        const haystack =
          `${p.name} ${p.description} ${p.categoryName} ${p.sku} ${p.specs}`.toLowerCase();
        if (!haystack.includes(queryLower)) {
          return false;
        }
      }
      return true;
    });

    const sorted = [...list];
    if (sortBy === 'price_asc') {
      sorted.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_desc') {
      sorted.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'newest') {
      sorted.sort((a, b) => {
        const ta = new Date(toIsoString(a.createdAt) || 0).getTime();
        const tb = new Date(toIsoString(b.createdAt) || 0).getTime();
        return tb - ta;
      });
    } else {
      sorted.sort((a, b) => {
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        const ta = new Date(toIsoString(a.createdAt) || 0).getTime();
        const tb = new Date(toIsoString(b.createdAt) || 0).getTime();
        return tb - ta;
      });
    }
    return sorted;
  }, [
    products,
    searchQuery,
    selectedCategoryId,
    onlyNewArrivals,
    onlyFeatured,
    onlyInStock,
    priceBracket,
    customMin,
    customMax,
    sortBy,
  ]);

  const hasActiveFilters =
    Boolean(searchQuery) ||
    selectedCategoryId !== 'all' ||
    onlyNewArrivals ||
    onlyFeatured ||
    onlyInStock ||
    priceBracket !== 'all' ||
    customMin !== '' ||
    customMax !== '';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategoryId('all');
    setPriceBracket('all');
    setCustomMin('');
    setCustomMax('');
    setOnlyNewArrivals(false);
    setOnlyFeatured(false);
    setOnlyInStock(false);
    setSortBy('featured');
  };

  const activeCategoryName =
    selectedCategoryId === 'all'
      ? 'All Departments'
      : categories.find((c) => c.id === selectedCategoryId)?.name || 'Department';

  const filterSidebarContent = (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-900/[0.08]">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-900">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Refine Results</span>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs font-medium text-zinc-600 hover:text-zinc-900 underline underline-offset-4 cursor-pointer"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Department Filter */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
          Department
        </h2>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setSelectedCategoryId('all')}
            className={`w-full px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
              selectedCategoryId === 'all'
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-700 hover:bg-white/75'
            }`}
          >
            <span>All Departments</span>
            <span className="font-mono opacity-75 tabular-nums">{products.length}</span>
          </button>
          {categories.map((cat) => {
            const count = products.filter((p) => p.categoryId === cat.id).length;
            const active = selectedCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`w-full px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                  active
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-700 hover:bg-white/75'
                }`}
              >
                <span className="truncate">{cat.name}</span>
                <span className="font-mono opacity-75 tabular-nums">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Bracket */}
      <div className="pt-4 border-t border-zinc-900/[0.08]">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
          Price Range
        </h2>
        <div className="space-y-2 text-xs text-zinc-700">
          {(
            [
              ['all', 'Any Price'],
              ['under_200', 'Under $200'],
              ['200_500', '$200 to $500'],
              ['over_500', 'Over $500'],
            ] as Array<[PriceBracket, string]>
          ).map(([val, label]) => (
            <label
              key={val}
              className="flex items-center gap-2.5 cursor-pointer select-none py-0.5"
            >
              <input
                type="radio"
                name="price_bracket"
                checked={priceBracket === val}
                onChange={() => {
                  setPriceBracket(val);
                  setCustomMin('');
                  setCustomMax('');
                }}
                className="accent-zinc-900"
              />
              <span>{label}</span>
            </label>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <input
            type="number"
            min="0"
            placeholder="Min $"
            aria-label="Minimum price"
            value={customMin}
            onChange={(e) => {
              setPriceBracket('all');
              setCustomMin(e.target.value);
            }}
            className="w-full px-2.5 py-1.5 rounded-lg glass-input text-xs font-mono"
          />
          <input
            type="number"
            min="0"
            placeholder="Max $"
            aria-label="Maximum price"
            value={customMax}
            onChange={(e) => {
              setPriceBracket('all');
              setCustomMax(e.target.value);
            }}
            className="w-full px-2.5 py-1.5 rounded-lg glass-input text-xs font-mono"
          />
        </div>
      </div>

      {/* Availability & Collection */}
      <div className="pt-4 border-t border-zinc-900/[0.08]">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
          Availability &amp; Editions
        </h2>
        <div className="space-y-2.5 text-xs text-zinc-700">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyInStock}
              onChange={(e) => setOnlyInStock(e.target.checked)}
              className="accent-zinc-900 w-3.5 h-3.5"
            />
            <span>In Stock Only</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyNewArrivals}
              onChange={(e) => setOnlyNewArrivals(e.target.checked)}
              className="accent-zinc-900 w-3.5 h-3.5"
            />
            <span>New Arrivals</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyFeatured}
              onChange={(e) => setOnlyFeatured(e.target.checked)}
              className="accent-zinc-900 w-3.5 h-3.5"
            />
            <span>Featured Objects</span>
          </label>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Department & Results Toolbar */}
      <div className="glass-panel rounded-3xl p-5 sm:p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">
              Studio Marketplace · {activeCategoryName}
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-zinc-900 tracking-tight">
              {searchQuery ? `Results for "${searchQuery}"` : activeCategoryName}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Inline Search */}
            <div className="relative flex-1 sm:w-60">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by keyword or SKU..."
                className="w-full pl-9 pr-8 py-2 rounded-xl glass-input text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Mobile Filters Button */}
            <button
              type="button"
              onClick={() => setMobileFiltersOpen((v) => !v)}
              className="lg:hidden px-3 py-2 rounded-xl glass-subtle text-xs font-medium text-zinc-900 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
            </button>

            {/* Sort Selector */}
            <select
              aria-label="Sort products"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as ProductSort)}
              className="px-3 py-2 rounded-xl glass-input text-xs sm:text-sm text-zinc-900 cursor-pointer"
            >
              <option value="featured">Sort: Featured</option>
              <option value="newest">Sort: Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>

            {/* Grid / List View Switcher */}
            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-zinc-900/[0.06]">
              <button
                type="button"
                aria-label="Grid view"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="List view"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Expandable Filter Panel */}
        {mobileFiltersOpen && (
          <div className="lg:hidden mt-5 pt-5 border-t border-zinc-900/[0.08]">
            {filterSidebarContent}
          </div>
        )}
      </div>

      {/* Main 2-Column Marketplace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Desktop Frosted Filter Sidebar */}
        <aside className="hidden lg:block lg:col-span-3 glass-panel rounded-3xl p-5 sticky top-32">
          {filterSidebarContent}
        </aside>

        {/* Results Column */}
        <div className="lg:col-span-9">
          <div className="pb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
            <span className="tabular-nums">
              Showing <strong className="text-zinc-900">{filteredProducts.length}</strong>{' '}
              {filteredProducts.length === 1 ? 'result' : 'results'} in {activeCategoryName}
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-zinc-900 font-medium underline underline-offset-4 cursor-pointer"
              >
                Reset All Filters
              </button>
            )}
          </div>

          {catalogLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="glass-panel rounded-2xl h-80 animate-pulse" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center">
              <h2 className="font-display text-lg font-semibold text-zinc-900 mb-2">
                No matching objects found
              </h2>
              <p className="text-sm text-zinc-600 mb-6">
                Adjust your department, price bracket, or search keywords to see all studio inventory.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                View All Products
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProducts.map((product) => {
                const inStock = product.stock > 0;
                const saved = isWishlisted(product.id);
                const freeShipping =
                  product.price >= SCHEMA_LIMITS.FREE_SHIPPING_THRESHOLD;
                return (
                  <article
                    key={product.id}
                    className="glass-card rounded-2xl p-4 flex flex-col sm:flex-row gap-5"
                  >
                    <button
                      type="button"
                      onClick={() => openProductDetail(product.id)}
                      className="sm:w-52 aspect-[4/3] sm:aspect-square rounded-xl bg-zinc-100 overflow-hidden shrink-0 cursor-pointer"
                    >
                      <ProductImage
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </button>

                    <div className="flex-1 min-w-0 flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 mb-1">
                          <span>
                            {product.categoryName} ·{' '}
                            <span className="font-mono">{product.sku}</span>
                          </span>
                          <span
                            className={
                              inStock ? 'text-zinc-700 font-medium' : 'text-red-700 font-medium'
                            }
                          >
                            {inStock ? `${product.stock} in stock` : 'Out of stock'}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => openProductDetail(product.id)}
                          className="text-left cursor-pointer"
                        >
                          <h2 className="font-display text-lg font-semibold text-zinc-900 hover:underline underline-offset-4">
                            {product.name}
                          </h2>
                        </button>

                        <p className="text-xs sm:text-sm text-zinc-600 mt-1.5 line-clamp-2">
                          {product.description}
                        </p>

                        {product.specs && (
                          <p className="text-xs text-zinc-500 mt-2 font-mono">
                            {product.specs}
                          </p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-zinc-900/[0.06] flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <span className="font-mono text-xl font-semibold text-zinc-900 tabular-nums">
                            {formatCurrency(product.price)}
                          </span>
                          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mt-0.5">
                            <Truck className="w-3.5 h-3.5 text-zinc-700" />
                            <span>
                              {freeShipping
                                ? 'Free studio delivery'
                                : 'Standard studio dispatch'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleWishlist(product)}
                            aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
                            className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                              saved
                                ? 'bg-zinc-900 text-white'
                                : 'glass-subtle text-zinc-700 hover:text-zinc-900'
                            }`}
                          >
                            <Heart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
                          </button>
                          <button
                            type="button"
                            disabled={!inStock}
                            onClick={() => addToCart(product, 1)}
                            className="px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-medium inline-flex items-center gap-1.5 hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-500 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add to Bag</span>
                          </button>
                          <button
                            type="button"
                            disabled={!inStock}
                            onClick={() => buyNow(product, 1)}
                            className="px-4 py-2.5 rounded-xl glass-subtle text-zinc-900 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-white/95 disabled:opacity-40 cursor-pointer"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>Buy Now</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
