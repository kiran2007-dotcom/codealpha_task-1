import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Lock,
  RotateCcw,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { STORE_MEDIA } from '../data/seedCatalog';
import { ProductCard } from './ProductCard';
import { ProductImage } from './ProductImage';

interface HeroSlide {
  id: string;
  eyebrow: string;
  headline: string;
  subcopy: string;
  ctaLabel: string;
  categoryId: string;
  image: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'slide_studio',
    eyebrow: 'Studio Collection · 2026',
    headline: 'Architectural hardware & lighting built for daily craft.',
    subcopy:
      'Explore CNC-milled audio systems, task luminaires, ergonomic oak workspace furniture, and barista instruments with real-time stock.',
    ctaLabel: 'Shop All Departments',
    categoryId: 'all',
    image: STORE_MEDIA.heroStudio,
  },
  {
    id: 'slide_living',
    eyebrow: 'Living & Furniture',
    headline: 'Smoked timber, virgin bouclé, and sculptural calm.',
    subcopy:
      'Heirloom seating and architectural pendants curated for studios, offices, and contemporary living spaces.',
    ctaLabel: 'Explore Furniture',
    categoryId: 'cat_furniture',
    image: STORE_MEDIA.livingBanner,
  },
  {
    id: 'slide_audio',
    eyebrow: 'Electronics & Workspace',
    headline: 'Lossless acoustics and precision tactile instruments.',
    subcopy:
      'Discover wireless anodized speakers, beryllium ANC studio headphones, and gasket-mounted aluminum mechanical keyboards.',
    ctaLabel: 'Shop Electronics & Audio',
    categoryId: 'cat_audio',
    image: STORE_MEDIA.monolithSpeaker,
  },
];

export function HomeView() {
  const {
    categories,
    products,
    catalogLoading,
    isUsingSeedPreview,
    hasMissingSeedItems,
    isAdmin,
    triggerCatalogSeed,
    openCatalogFiltered,
    openProductDetail,
    openAuthModal,
    recentlyViewedIds,
  } = useStore();

  const [slideIdx, setSlideIdx] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const [activeDeptTab, setActiveDeptTab] = useState<string>('featured');
  const railRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (heroPaused) return;
    const timer = window.setInterval(() => {
      setSlideIdx((idx) => (idx + 1) % HERO_SLIDES.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [heroPaused]);

  const currentSlide = HERO_SLIDES[slideIdx];
  const newArrivals = products.filter((p) => p.isNewArrival);
  const recentlyViewed = useMemo(
    () =>
      recentlyViewedIds
        .map((id) => products.find((p) => p.id === id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p)),
    [recentlyViewedIds, products]
  );

  // 4-Column Amazon-Style Bento Department Quad Cards
  const bentoDepartments = useMemo(() => {
    const groups = [
      {
        title: 'Electronics & Workspace',
        categoryId: 'cat_audio',
        cta: 'Shop tech & desk',
        items: products.filter(
          (p) => p.categoryId === 'cat_audio' || p.categoryId === 'cat_workspace'
        ),
      },
      {
        title: 'Coffee & Kitchen Craft',
        categoryId: 'cat_kitchen',
        cta: 'Explore kitchenware',
        items: products.filter((p) => p.categoryId === 'cat_kitchen'),
      },
      {
        title: 'Architectural Lighting',
        categoryId: 'cat_lighting',
        cta: 'Shop lighting',
        items: products.filter((p) => p.categoryId === 'cat_lighting'),
      },
      {
        title: 'Furniture & Carry',
        categoryId: 'cat_furniture',
        cta: 'Discover living & travel',
        items: products.filter(
          (p) => p.categoryId === 'cat_furniture' || p.categoryId === 'cat_objects'
        ),
      },
    ];
    return groups.map((g) => ({
      ...g,
      thumbnails: (g.items.length >= 2 ? g.items : products).slice(0, 4),
    }));
  }, [products]);

  const showcaseProducts = useMemo(() => {
    if (activeDeptTab === 'featured') {
      const feat = products.filter((p) => p.featured);
      return feat.length > 0 ? feat : products.slice(0, 6);
    }
    return products.filter((p) => p.categoryId === activeDeptTab);
  }, [activeDeptTab, products]);

  const scrollRail = (direction: 'left' | 'right') => {
    if (!railRef.current) return;
    const offset = direction === 'left' ? -340 : 340;
    railRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  return (
    <div className="pb-16">
      {(isUsingSeedPreview || (isAdmin && hasMissingSeedItems)) && (
        <div className="px-4 sm:px-6 lg:px-8 pt-4">
          <div className="max-w-7xl mx-auto glass-panel rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-700">
            <p>
              {isUsingSeedPreview
                ? 'Viewing Initial Demo Catalog. Sign in as Administrator to seed Firestore.'
                : 'New marketplace items are available in the starter catalog.'}
            </p>
            {isAdmin ? (
              <button
                type="button"
                onClick={() => triggerCatalogSeed()}
                className="px-3.5 py-1.5 rounded-lg bg-zinc-900 text-white font-medium hover:bg-zinc-800 transition-colors whitespace-nowrap cursor-pointer"
              >
                {isUsingSeedPreview ? 'Initialize 12-Item Catalog' : 'Sync Full 12-Item Catalog'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="underline underline-offset-4 font-medium text-zinc-900 whitespace-nowrap cursor-pointer"
              >
                Admin Sign In to Seed Database
              </button>
            )}
          </div>
        </div>
      )}

      {/* 1. Interactive Marketplace Hero Carousel */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
        <div
          onMouseEnter={() => setHeroPaused(true)}
          onMouseLeave={() => setHeroPaused(false)}
          className="glass-panel rounded-3xl p-2.5 sm:p-3"
        >
          <div className="relative rounded-2xl overflow-hidden bg-zinc-900 min-h-[340px] sm:min-h-[420px] lg:min-h-[460px] flex items-end">
            <ProductImage
              src={currentSlide.image}
              alt={currentSlide.headline}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/15" />

            {/* Slide Navigation Arrows */}
            <button
              type="button"
              aria-label="Previous campaign slide"
              onClick={() =>
                setSlideIdx((idx) => (idx - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)
              }
              className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl glass-dark text-white flex items-center justify-center hover:bg-zinc-900 cursor-pointer z-10"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              aria-label="Next campaign slide"
              onClick={() => setSlideIdx((idx) => (idx + 1) % HERO_SLIDES.length)}
              className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl glass-dark text-white flex items-center justify-center hover:bg-zinc-900 cursor-pointer z-10"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <div className="relative z-10 w-full p-6 sm:p-10 lg:p-14 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="glass-dark rounded-2xl p-6 sm:p-8 max-w-xl text-white">
                <p className="text-[11px] uppercase tracking-widest text-zinc-300 mb-2">
                  {currentSlide.eyebrow}
                </p>
                <h1
                  className="font-display font-semibold tracking-tight text-balance leading-[1.1] mb-3"
                  style={{ fontSize: 'clamp(1.75rem, 3.2vw, 2.75rem)' }}
                >
                  {currentSlide.headline}
                </h1>
                <p className="text-sm text-zinc-200 leading-relaxed mb-6">
                  {currentSlide.subcopy}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      openCatalogFiltered({
                        categoryId: currentSlide.categoryId,
                        search: '',
                        onlyNewArrivals: false,
                      })
                    }
                    className="px-5 py-2.5 rounded-xl bg-white text-zinc-900 text-xs font-semibold inline-flex items-center gap-2 hover:bg-zinc-100 transition-colors cursor-pointer"
                  >
                    <span>{currentSlide.ctaLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      openCatalogFiltered({ categoryId: 'all', search: '', onlyNewArrivals: true })
                    }
                    className="px-5 py-2.5 rounded-xl border border-white/30 text-white text-xs font-medium hover:bg-white/15 transition-colors cursor-pointer"
                  >
                    New Releases
                  </button>
                </div>
              </div>

              {/* Slide Indicators */}
              <div className="flex items-center gap-2 self-start lg:self-end">
                {HERO_SLIDES.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-label={`View slide ${idx + 1}`}
                    onClick={() => setSlideIdx(idx)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      idx === slideIdx ? 'w-8 bg-white' : 'w-2 bg-white/45 hover:bg-white/70'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Amazon-Style 4-Column Bento Department Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {bentoDepartments.map((dept) => (
            <div
              key={dept.title}
              className="glass-card rounded-2xl p-5 flex flex-col justify-between gap-4"
            >
              <div>
                <h2 className="font-display text-base font-semibold text-zinc-900 mb-3.5">
                  {dept.title}
                </h2>
                <div className="grid grid-cols-2 gap-2.5">
                  {catalogLoading
                    ? [1, 2, 3, 4].map((n) => (
                        <div
                          key={n}
                          className="aspect-[4/3] rounded-lg bg-zinc-200/70 animate-pulse"
                        />
                      ))
                    : dept.thumbnails.map((prod) => (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => openProductDetail(prod.id)}
                          className="text-left group cursor-pointer"
                        >
                          <div className="aspect-[4/3] rounded-lg bg-zinc-100 overflow-hidden mb-1">
                            <ProductImage
                              src={prod.imageUrl}
                              alt={prod.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                          </div>
                          <p className="text-[11px] text-zinc-700 truncate group-hover:text-zinc-900">
                            {prod.name}
                          </p>
                        </button>
                      ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => openCatalogFiltered({ categoryId: dept.categoryId, search: '' })}
                className="text-xs font-semibold text-zinc-900 inline-flex items-center gap-1 hover:underline underline-offset-4 cursor-pointer self-start"
              >
                <span>{dept.cta}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Flipkart / Amazon Horizontal Scrollable New Arrivals Rail */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        <div className="glass-panel rounded-3xl p-5 sm:p-7">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <p className="text-xs uppercase tracking-widest text-zinc-500 mb-0.5">
                Fresh Studio Releases
              </p>
              <h2 className="font-display text-xl sm:text-2xl font-semibold text-zinc-900">
                New Arrivals &amp; Trending Drops
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Scroll left"
                onClick={() => scrollRail('left')}
                className="w-9 h-9 rounded-xl glass-subtle flex items-center justify-center text-zinc-800 hover:bg-white cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Scroll right"
                onClick={() => scrollRail('right')}
                className="w-9 h-9 rounded-xl glass-subtle flex items-center justify-center text-zinc-800 hover:bg-white cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {catalogLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="glass-subtle rounded-2xl h-72 animate-pulse" />
              ))}
            </div>
          ) : (
            <div
              ref={railRef}
              className="flex gap-5 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth"
            >
              {(newArrivals.length > 0 ? newArrivals : products).map((prod) => (
                <div
                  key={prod.id}
                  className="min-w-[260px] sm:min-w-[280px] max-w-[280px] snap-start shrink-0"
                >
                  <ProductCard product={prod} compact />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. Interactive Department Showcase (Flipkart-Style Tabbed Catalog Section) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-0.5">
              Browse by Department
            </p>
            <h2 className="font-display text-2xl font-semibold text-zinc-900">
              Curated Marketplace Catalog
            </h2>
          </div>
          <button
            type="button"
            onClick={() => openCatalogFiltered({ categoryId: 'all', search: '' })}
            className="text-xs font-semibold text-zinc-900 hover:underline underline-offset-4 cursor-pointer"
          >
            View All {products.length} Products &rarr;
          </button>
        </div>

        <div className="flex items-center gap-1.5 p-1.5 glass-panel rounded-2xl overflow-x-auto mb-6">
          <button
            type="button"
            onClick={() => setActiveDeptTab('featured')}
            className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              activeDeptTab === 'featured'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-white/60'
            }`}
          >
            Featured Picks
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveDeptTab(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeDeptTab === cat.id
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-white/60'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {showcaseProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* 5. Recently Viewed Strip */}
      {recentlyViewed.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
          <div className="glass-panel rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-zinc-900">
                Your Recently Viewed Items
              </h2>
              <span className="text-xs text-zinc-500 tabular-nums">
                {recentlyViewed.length} viewed
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
              {recentlyViewed.slice(0, 6).map((prod) => (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => openProductDetail(prod.id)}
                  className="text-left glass-card rounded-xl p-2.5 hover:-translate-y-0.5 cursor-pointer"
                >
                  <div className="aspect-[4/3] rounded-lg bg-zinc-100 overflow-hidden mb-2">
                    <ProductImage src={prod.imageUrl} alt={prod.name} />
                  </div>
                  <p className="text-xs font-medium text-zinc-900 truncate">
                    {prod.name}
                  </p>
                  <p className="font-mono text-xs text-zinc-600 mt-0.5 tabular-nums">
                    ${prod.price}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 6. Marketplace Guarantees Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: Truck,
              title: 'Free Courier Delivery',
              desc: 'Complimentary tracked shipping on all orders over $250.',
            },
            {
              icon: Lock,
              title: 'Atomic Inventory Lock',
              desc: 'Real-time stock validation prevents overselling at checkout.',
            },
            {
              icon: ShieldCheck,
              title: '2-Year Studio Warranty',
              desc: 'Full structural and hardware coverage across all categories.',
            },
            {
              icon: RotateCcw,
              title: '30-Day Hassle-Free Returns',
              desc: 'Downloadable invoices and instant order tracking history.',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="glass-panel rounded-2xl p-5 flex items-start gap-3.5"
            >
              <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center shrink-0">
                <item.icon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display text-sm font-semibold text-zinc-900">
                  {item.title}
                </h3>
                <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
