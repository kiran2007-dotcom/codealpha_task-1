import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Heart,
  MapPin,
  Menu,
  Package,
  Search,
  ShoppingBag,
  User,
  X,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { SCHEMA_LIMITS } from '../types/store';
import { formatCurrency } from '../utils/formatters';
import { ProductImage } from './ProductImage';

export function Header() {
  const {
    activeView,
    setActiveView,
    openCatalogFiltered,
    openProductDetail,
    categories,
    products,
    cartCount,
    wishlistIds,
    setIsCartOpen,
    firebaseUser,
    userProfile,
    isAdmin,
    openAuthModal,
    searchQuery,
    setSearchQuery,
    selectedCategoryId,
    deliveryLocation,
    updateDeliveryLocation,
  } = useStore();

  const [promoDismissed, setPromoDismissed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [searchDept, setSearchDept] = useState('all');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [cityInput, setCityInput] = useState(deliveryLocation.city);
  const [zipInput, setZipInput] = useState(deliveryLocation.postalCode);

  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const locationContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (!locationModalOpen) return;
    const handleOutside = (ev: MouseEvent) => {
      if (
        locationContainerRef.current &&
        !locationContainerRef.current.contains(ev.target as Node)
      ) {
        setLocationModalOpen(false);
      }
    };
    const handleEsc = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setLocationModalOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [locationModalOpen]);

  const suggestions = useMemo(() => {
    const q = localSearch.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => {
        if (searchDept !== 'all' && p.categoryId !== searchDept) return false;
        return `${p.name} ${p.categoryName} ${p.sku} ${p.specs}`
          .toLowerCase()
          .includes(q);
      })
      .slice(0, 5);
  }, [localSearch, products, searchDept]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    openCatalogFiltered({
      search: localSearch.trim(),
      categoryId: searchDept,
      onlyNewArrivals: false,
    });
    setMobileMenuOpen(false);
  };

  const navigateProtected = (target: 'orders' | 'account') => {
    setMobileMenuOpen(false);
    if (!firebaseUser) {
      openAuthModal('login', target);
      return;
    }
    setActiveView(target);
  };

  const firstName =
    userProfile?.name?.split(' ')[0] ||
    firebaseUser?.displayName?.split(' ')[0] ||
    'Account';

  const handleSaveLocation = (e: React.FormEvent) => {
    e.preventDefault();
    updateDeliveryLocation({ city: cityInput, postalCode: zipInput });
    setLocationModalOpen(false);
  };

  return (
    <div className="sticky top-0 z-40">
      {!promoDismissed && (
        <div className="bg-zinc-900/92 backdrop-blur-md text-zinc-100 h-8 px-4 flex items-center justify-between text-xs border-b border-white/10">
          <div className="w-6 shrink-0" />
          <p className="truncate text-center">
            Free studio courier shipping on orders over ${SCHEMA_LIMITS.FREE_SHIPPING_THRESHOLD} · Verified live inventory
          </p>
          <button
            type="button"
            onClick={() => setPromoDismissed(true)}
            aria-label="Dismiss announcement"
            className="w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-white transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <header className="bg-white/75 backdrop-blur-2xl border-b border-white/85 shadow-[0_6px_28px_-8px_rgba(24,24,27,0.08)]">
        {/* Main Marketplace Row */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4 lg:gap-6">
          {/* Left: Brand & Delivery Location */}
          <div className="flex items-center gap-4 shrink-0">
            <button
              type="button"
              onClick={() => setActiveView('home')}
              className="font-display text-lg font-bold tracking-tight text-zinc-900 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-zinc-900 focus-visible:outline-offset-4"
            >
              KASTLE &amp; FORM
            </button>

            <div ref={locationContainerRef} className="relative hidden lg:block">
              <button
                type="button"
                onClick={() => {
                  setCityInput(deliveryLocation.city);
                  setZipInput(deliveryLocation.postalCode);
                  setLocationModalOpen((prev) => !prev);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-white/75 transition-colors text-left cursor-pointer"
              >
                <MapPin className="w-4 h-4 text-zinc-700 shrink-0" />
                <div className="leading-tight">
                  <span className="block text-[10px] text-zinc-500 whitespace-nowrap">
                    Deliver to
                  </span>
                  <span className="block text-xs font-semibold text-zinc-900 whitespace-nowrap max-w-[140px] truncate">
                    {deliveryLocation.city} {deliveryLocation.postalCode}
                  </span>
                </div>
              </button>

              {locationModalOpen && (
                <form
                  onSubmit={handleSaveLocation}
                  className="absolute left-0 top-full mt-2 w-72 glass-panel-strong rounded-2xl p-4 z-50 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-display text-xs font-semibold text-zinc-900">
                      Delivery Location
                    </p>
                    <button
                      type="button"
                      onClick={() => setLocationModalOpen(false)}
                      className="text-zinc-400 hover:text-zinc-900 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      value={cityInput}
                      onChange={(e) => setCityInput(e.target.value)}
                      placeholder="City"
                      className="px-2.5 py-1.5 rounded-lg glass-input text-xs"
                    />
                    <input
                      type="text"
                      required
                      value={zipInput}
                      onChange={(e) => setZipInput(e.target.value)}
                      placeholder="Postal Code"
                      className="px-2.5 py-1.5 rounded-lg glass-input text-xs font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 rounded-lg bg-zinc-900 text-white text-xs font-medium cursor-pointer"
                  >
                    Update Location
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Center: Amazon / Flipkart Style Department-Scoped Search Bar */}
          <div
            ref={searchContainerRef}
            className="hidden md:block flex-1 max-w-2xl relative"
          >
            <form
              onSubmit={handleSearchSubmit}
              className="flex items-center glass-input rounded-2xl overflow-hidden shadow-xs"
            >
              <select
                aria-label="Search department"
                value={searchDept}
                onChange={(e) => setSearchDept(e.target.value)}
                className="h-10 pl-3 pr-2 bg-zinc-900/[0.04] border-r border-zinc-900/[0.08] text-xs font-medium text-zinc-700 focus:outline-none cursor-pointer max-w-[140px] truncate"
              >
                <option value="all">All</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={localSearch}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
                onChange={(e) => {
                  setLocalSearch(e.target.value);
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                placeholder="Search studio lamps, audio, keyboards, espresso..."
                className="flex-1 h-10 px-3.5 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
              />

              {localSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setLocalSearch('');
                    setSearchQuery('');
                  }}
                  aria-label="Clear search"
                  className="px-2 text-zinc-400 hover:text-zinc-900 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="submit"
                aria-label="Submit search"
                className="h-10 px-4 bg-zinc-900 text-white hover:bg-zinc-800 transition-colors flex items-center justify-center cursor-pointer"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            {/* Instant Search Autocomplete Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 glass-panel-strong rounded-2xl overflow-hidden z-50 divide-y divide-zinc-900/[0.06]">
                {suggestions.map((prod) => (
                  <button
                    key={prod.id}
                    type="button"
                    onMouseDown={() => {
                      setShowSuggestions(false);
                      openProductDetail(prod.id);
                    }}
                    className="w-full px-4 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-white/70 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-zinc-100 shrink-0 overflow-hidden">
                        <ProductImage src={prod.imageUrl} alt={prod.name} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-900 truncate">
                          {prod.name}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {prod.categoryName} · {prod.stock > 0 ? `${prod.stock} in stock` : 'Out of stock'}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-semibold text-zinc-900 tabular-nums shrink-0">
                      {formatCurrency(prod.price)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Account, Orders, Wishlist, Cart */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => navigateProtected('account')}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/75 transition-colors text-left cursor-pointer"
            >
              <User className="w-4 h-4 text-zinc-700 shrink-0" />
              <div className="leading-tight">
                <span className="block text-[10px] text-zinc-500 whitespace-nowrap">
                  {firebaseUser ? 'Signed in' : 'Hello, Guest'}
                </span>
                <span className="block text-xs font-semibold text-zinc-900 whitespace-nowrap max-w-[96px] truncate">
                  {firebaseUser ? firstName : 'Sign In'}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigateProtected('orders')}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-white/75 transition-colors text-left cursor-pointer"
            >
              <Package className="w-4 h-4 text-zinc-700 shrink-0" />
              <div className="leading-tight">
                <span className="block text-[10px] text-zinc-500 whitespace-nowrap">
                  Returns &amp;
                </span>
                <span className="block text-xs font-semibold text-zinc-900 whitespace-nowrap">
                  Orders
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('wishlist')}
              aria-label={`Saved items (${wishlistIds.length})`}
              className={`relative px-2.5 py-2 rounded-xl flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer ${
                activeView === 'wishlist'
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-800 hover:bg-white/75'
              }`}
            >
              <Heart className="w-4 h-4" />
              <span className="hidden sm:inline whitespace-nowrap">Saved</span>
              {wishlistIds.length > 0 && (
                <span className="font-mono text-[11px] tabular-nums opacity-85">
                  ({wishlistIds.length})
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              aria-label={`Open shopping bag with ${cartCount} items`}
              className="px-3.5 py-2 rounded-xl glass-dark text-white text-xs font-medium flex items-center gap-2 hover:bg-zinc-900/90 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span className="tabular-nums">Cart ({cartCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle mobile menu"
              className="md:hidden w-10 h-10 rounded-xl flex items-center justify-center text-zinc-800 hover:bg-white/60"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Row */}
        <div className="md:hidden px-4 pb-2.5">
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center glass-input rounded-xl overflow-hidden"
          >
            <input
              type="text"
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value);
                setSearchQuery(e.target.value);
              }}
              placeholder="Search products, categories, SKU..."
              className="flex-1 h-9 px-3 bg-transparent text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
            />
            <button
              type="submit"
              aria-label="Search"
              className="h-9 px-3 bg-zinc-900 text-white flex items-center justify-center"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Marketplace Category Strip (Second Tier) */}
        <div className="border-t border-zinc-900/[0.06] bg-white/45 backdrop-blur-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center gap-5 overflow-x-auto text-xs font-medium text-zinc-700 no-scrollbar">
            <button
              type="button"
              onClick={() =>
                openCatalogFiltered({ categoryId: 'all', search: '', onlyNewArrivals: false })
              }
              className={`whitespace-nowrap shrink-0 py-1 hover:text-zinc-900 transition-colors cursor-pointer ${
                activeView === 'catalog' && selectedCategoryId === 'all'
                  ? 'text-zinc-900 font-semibold underline underline-offset-4'
                  : ''
              }`}
            >
              All Departments
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() =>
                  openCatalogFiltered({ categoryId: cat.id, search: '', onlyNewArrivals: false })
                }
                className={`whitespace-nowrap shrink-0 py-1 hover:text-zinc-900 transition-colors cursor-pointer ${
                  activeView === 'catalog' && selectedCategoryId === cat.id
                    ? 'text-zinc-900 font-semibold underline underline-offset-4'
                    : ''
                }`}
              >
                {cat.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() =>
                openCatalogFiltered({ categoryId: 'all', search: '', onlyNewArrivals: true })
              }
              className="whitespace-nowrap shrink-0 py-1 hover:text-zinc-900 transition-colors cursor-pointer"
            >
              New Releases
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setActiveView('admin')}
                className={`whitespace-nowrap shrink-0 py-1 ml-auto font-semibold hover:text-zinc-900 transition-colors cursor-pointer ${
                  activeView === 'admin' ? 'text-zinc-900 underline underline-offset-4' : 'text-zinc-800'
                }`}
              >
                Admin Console
              </button>
            )}
          </div>
        </div>

        {/* Mobile Drawer Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-zinc-900/[0.06] bg-white/90 backdrop-blur-2xl px-4 py-3 space-y-1">
            <button
              type="button"
              onClick={() => {
                openCatalogFiltered({ categoryId: 'all', search: '', onlyNewArrivals: false });
                setMobileMenuOpen(false);
              }}
              className="w-full text-left py-2.5 px-3 rounded-xl text-sm font-medium text-zinc-900 hover:bg-white/70"
            >
              All Products
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveView('wishlist');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left py-2.5 px-3 rounded-xl text-sm font-medium text-zinc-900 hover:bg-white/70"
            >
              Saved Items ({wishlistIds.length})
            </button>
            <button
              type="button"
              onClick={() => navigateProtected('orders')}
              className="w-full text-left py-2.5 px-3 rounded-xl text-sm font-medium text-zinc-900 hover:bg-white/70"
            >
              Order History
            </button>
            <button
              type="button"
              onClick={() => navigateProtected('account')}
              className="w-full text-left py-2.5 px-3 rounded-xl text-sm font-medium text-zinc-900 hover:bg-white/70"
            >
              {firebaseUser ? 'Account Settings' : 'Sign In / Register'}
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setActiveView('admin');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left py-2.5 px-3 rounded-xl text-sm font-medium text-zinc-900 hover:bg-white/70"
              >
                Admin Console
              </button>
            )}
          </div>
        )}
      </header>
    </div>
  );
}
