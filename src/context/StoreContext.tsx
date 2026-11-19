import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import {
  buildSeedPreviewCategories,
  buildSeedPreviewProducts,
  INITIAL_SEED_CATEGORIES,
  INITIAL_SEED_PRODUCTS,
} from '../data/seedCatalog';
import { auth } from '../lib/firebase';
import {
  checkAdminPrivilege,
  saveUserCart,
  seedInitialCatalog,
  subscribeToCategories,
  subscribeToProducts,
  subscribeToUserCart,
  subscribeToUserOrders,
  subscribeToUserProfile,
  upsertUserProfile,
} from '../services/storeService';
import {
  SCHEMA_LIMITS,
  type CartItem,
  type Category,
  type Order,
  type Product,
  type UserProfile,
} from '../types/store';

export type AppView =
  | 'home'
  | 'catalog'
  | 'product'
  | 'checkout'
  | 'orders'
  | 'account'
  | 'wishlist'
  | 'admin';

export type ProductSort = 'featured' | 'newest' | 'price_asc' | 'price_desc';
export type PriceBracket = 'all' | 'under_200' | '200_500' | 'over_500';

export interface DeliveryLocation {
  city: string;
  postalCode: string;
}

export interface ToastMessage {
  id: string;
  text: string;
  tone: 'neutral' | 'success' | 'error';
}

interface StoreContextValue {
  authReady: boolean;
  firebaseUser: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  catalogLoading: boolean;
  isUsingSeedPreview: boolean;
  hasMissingSeedItems: boolean;
  categories: Category[];
  products: Product[];
  cartItems: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  wishlistIds: string[];
  savedForLaterIds: string[];
  recentlyViewedIds: string[];
  deliveryLocation: DeliveryLocation;
  orders: Order[];
  activeView: AppView;
  selectedProductId: string | null;
  searchQuery: string;
  selectedCategoryId: string;
  sortBy: ProductSort;
  priceBracket: PriceBracket;
  onlyNewArrivals: boolean;
  onlyFeatured: boolean;
  onlyInStock: boolean;
  isCartOpen: boolean;
  isAuthModalOpen: boolean;
  authModalInitialMode: 'login' | 'register';
  lastPlacedOrder: Order | null;
  toasts: ToastMessage[];
  setActiveView: (view: AppView) => void;
  openProductDetail: (productId: string) => void;
  openCatalogFiltered: (opts?: {
    categoryId?: string;
    search?: string;
    onlyNewArrivals?: boolean;
    onlyFeatured?: boolean;
    priceBracket?: PriceBracket;
  }) => void;
  setSearchQuery: (q: string) => void;
  setSelectedCategoryId: (id: string) => void;
  setSortBy: (sort: ProductSort) => void;
  setPriceBracket: (bracket: PriceBracket) => void;
  setOnlyNewArrivals: (v: boolean) => void;
  setOnlyFeatured: (v: boolean) => void;
  setOnlyInStock: (v: boolean) => void;
  setIsCartOpen: (open: boolean) => void;
  openAuthModal: (mode?: 'login' | 'register', redirectTo?: AppView) => void;
  closeAuthModal: (completedAuth?: boolean) => void;
  setLastPlacedOrder: (order: Order | null) => void;
  addToCart: (product: Product, quantity?: number, openDrawer?: boolean) => void;
  buyNow: (product: Product, quantity?: number) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  toggleWishlist: (product: Product) => void;
  isWishlisted: (productId: string) => boolean;
  moveToSavedForLater: (productId: string) => void;
  moveSavedToCart: (productId: string) => void;
  removeSavedForLater: (productId: string) => void;
  updateDeliveryLocation: (loc: DeliveryLocation) => void;
  logout: () => Promise<void>;
  refreshAdminState: () => Promise<void>;
  triggerCatalogSeed: () => Promise<void>;
  pushToast: (text: string, tone?: ToastMessage['tone']) => void;
  dismissToast: (id: string) => void;
}

const GUEST_CART_KEY = 'kf_guest_cart_v1';
const WISHLIST_KEY_PREFIX = 'kf_wishlist_v1_';
const SAVED_LATER_KEY_PREFIX = 'kf_saved_later_v1_';
const RECENT_VIEWED_KEY = 'kf_recent_viewed_v1';
const LOCATION_KEY = 'kf_delivery_location_v1';

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

function readJsonArray(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function readGuestCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (i) =>
        i &&
        typeof i.productId === 'string' &&
        typeof i.quantity === 'number' &&
        Number.isInteger(i.quantity) &&
        i.quantity >= 1
    );
  } catch {
    return [];
  }
}

function readInitialLocation(): DeliveryLocation {
  try {
    const raw = localStorage.getItem(LOCATION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DeliveryLocation;
      if (parsed.city && parsed.postalCode) return parsed;
    }
  } catch {
    // ignore
  }
  return { city: 'New York', postalCode: '10001' };
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [firestoreCategories, setFirestoreCategories] = useState<Category[]>([]);
  const [firestoreProducts, setFirestoreProducts] = useState<Product[]>([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [productsLoaded, setProductsLoaded] = useState(false);

  const [cartItems, setCartItems] = useState<CartItem[]>(() => readGuestCart());
  const [wishlistIds, setWishlistIds] = useState<string[]>(() =>
    readJsonArray(`${WISHLIST_KEY_PREFIX}guest`)
  );
  const [savedForLaterIds, setSavedForLaterIds] = useState<string[]>(() =>
    readJsonArray(`${SAVED_LATER_KEY_PREFIX}guest`)
  );
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>(() =>
    readJsonArray(RECENT_VIEWED_KEY)
  );
  const [deliveryLocation, setDeliveryLocation] = useState<DeliveryLocation>(() =>
    readInitialLocation()
  );

  const [orders, setOrders] = useState<Order[]>([]);

  const [activeView, setActiveViewState] = useState<AppView>('home');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [sortBy, setSortBy] = useState<ProductSort>('featured');
  const [priceBracket, setPriceBracket] = useState<PriceBracket>('all');
  const [onlyNewArrivals, setOnlyNewArrivals] = useState(false);
  const [onlyFeatured, setOnlyFeatured] = useState(false);
  const [onlyInStock, setOnlyInStock] = useState(false);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalInitialMode, setAuthModalInitialMode] = useState<'login' | 'register'>('login');
  const [pendingAuthRedirect, setPendingAuthRedirect] = useState<AppView | null>(null);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<Order | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const autoSeedAttemptedRef = useRef(false);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (text: string, tone: ToastMessage['tone'] = 'neutral') => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, text, tone }]);
      setTimeout(() => {
        dismissToast(id);
      }, 4200);
    },
    [dismissToast]
  );

  useEffect(() => {
    const unsubCats = subscribeToCategories(
      (cats) => {
        setFirestoreCategories(cats);
        setCategoriesLoaded(true);
      },
      () => setCategoriesLoaded(true)
    );
    const unsubProds = subscribeToProducts(
      (prods) => {
        setFirestoreProducts(prods);
        setProductsLoaded(true);
      },
      () => setProductsLoaded(true)
    );
    return () => {
      unsubCats();
      unsubProds();
    };
  }, []);

  const refreshAdminState = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      setIsAdmin(false);
      return;
    }
    await upsertUserProfile(user).catch(() => {});
    const admin = await checkAdminPrivilege(user);
    setIsAdmin(admin);
  }, []);

  useEffect(() => {
    let unsubProfile: (() => void) | undefined;
    let unsubCart: (() => void) | undefined;
    let unsubOrders: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      unsubProfile?.();
      unsubCart?.();
      unsubOrders?.();

      setFirebaseUser(user);
      if (!user) {
        setUserProfile(null);
        setIsAdmin(false);
        setOrders([]);
        setCartItems(readGuestCart());
        setWishlistIds(readJsonArray(`${WISHLIST_KEY_PREFIX}guest`));
        setSavedForLaterIds(readJsonArray(`${SAVED_LATER_KEY_PREFIX}guest`));
        setAuthReady(true);
        return;
      }

      setWishlistIds(
        Array.from(
          new Set([
            ...readJsonArray(`${WISHLIST_KEY_PREFIX}${user.uid}`),
            ...readJsonArray(`${WISHLIST_KEY_PREFIX}guest`),
          ])
        )
      );
      setSavedForLaterIds(readJsonArray(`${SAVED_LATER_KEY_PREFIX}${user.uid}`));

      try {
        await upsertUserProfile(user);
        const admin = await checkAdminPrivilege(user);
        setIsAdmin(admin);
      } catch (err) {
        console.error('Failed to initialize user profile:', err);
      }

      unsubProfile = subscribeToUserProfile(user.uid, (profile) => {
        setUserProfile(profile);
        if (profile?.defaultAddress?.city && profile?.defaultAddress?.postalCode) {
          setDeliveryLocation({
            city: profile.defaultAddress.city,
            postalCode: profile.defaultAddress.postalCode,
          });
        }
      });

      unsubOrders = subscribeToUserOrders(user.uid, (userOrders) => {
        setOrders(userOrders);
      });

      let mergedGuestOnce = false;
      unsubCart = subscribeToUserCart(user.uid, async (remoteItems) => {
        if (!mergedGuestOnce) {
          mergedGuestOnce = true;
          const guestItems = readGuestCart();
          if (guestItems.length > 0) {
            const map = new Map<string, number>();
            for (const r of remoteItems) map.set(r.productId, r.quantity);
            for (const g of guestItems) {
              const current = map.get(g.productId) || 0;
              map.set(
                g.productId,
                Math.min(SCHEMA_LIMITS.MAX_ITEM_QTY, current + g.quantity)
              );
            }
            const merged: CartItem[] = Array.from(map.entries()).map(
              ([productId, quantity]) => ({ productId, quantity })
            );
            localStorage.removeItem(GUEST_CART_KEY);
            setCartItems(merged);
            await saveUserCart(user.uid, merged);
            return;
          }
        }
        setCartItems(remoteItems);
      });

      setAuthReady(true);
    });

    return () => {
      unsubAuth();
      unsubProfile?.();
      unsubCart?.();
      unsubOrders?.();
    };
  }, []);

  const catalogLoading = !categoriesLoaded || !productsLoaded;
  const isUsingSeedPreview = !catalogLoading && firestoreProducts.length === 0;

  const hasMissingSeedItems = useMemo(() => {
    if (catalogLoading) return false;
    const catIds = new Set(firestoreCategories.map((c) => c.id));
    const prodIds = new Set(firestoreProducts.map((p) => p.id));
    return (
      INITIAL_SEED_CATEGORIES.some((c) => !catIds.has(c.id)) ||
      INITIAL_SEED_PRODUCTS.some((p) => !prodIds.has(p.id))
    );
  }, [catalogLoading, firestoreCategories, firestoreProducts]);

  useEffect(() => {
    if (
      authReady &&
      isAdmin &&
      !catalogLoading &&
      hasMissingSeedItems &&
      !autoSeedAttemptedRef.current
    ) {
      autoSeedAttemptedRef.current = true;
      seedInitialCatalog()
        .then((res) => {
          if (res.addedProducts > 0) {
            pushToast(`Synced Cloud Firestore catalog (${res.addedProducts} products added).`, 'success');
          }
        })
        .catch((err) => {
          console.error('Auto-seed failed:', err);
        });
    }
  }, [authReady, isAdmin, catalogLoading, hasMissingSeedItems, pushToast]);

  const categories = useMemo(
    () =>
      firestoreCategories.length > 0
        ? firestoreCategories
        : isUsingSeedPreview
        ? buildSeedPreviewCategories()
        : [],
    [firestoreCategories, isUsingSeedPreview]
  );

  const products = useMemo(
    () =>
      firestoreProducts.length > 0
        ? firestoreProducts
        : isUsingSeedPreview
        ? buildSeedPreviewProducts()
        : [],
    [firestoreProducts, isUsingSeedPreview]
  );

  const triggerCatalogSeed = useCallback(async () => {
    const res = await seedInitialCatalog();
    if (res.addedCategories === 0 && res.addedProducts === 0) {
      pushToast('All starter marketplace items are already in Firestore.', 'neutral');
    } else {
      pushToast(
        `Seeded ${res.addedCategories} categories and ${res.addedProducts} products to Cloud Firestore.`,
        'success'
      );
    }
  }, [pushToast]);

  const persistCart = useCallback(
    (nextItems: CartItem[]) => {
      setCartItems(nextItems);
      if (firebaseUser) {
        saveUserCart(firebaseUser.uid, nextItems).catch((err) => {
          console.error('Cart sync error:', err);
          pushToast('Could not save cart changes to database.', 'error');
        });
      } else {
        localStorage.setItem(GUEST_CART_KEY, JSON.stringify(nextItems));
      }
    },
    [firebaseUser, pushToast]
  );

  const addToCart = useCallback(
    (product: Product, quantity = 1, openDrawer = true) => {
      if (product.stock <= 0) {
        pushToast(`${product.name} is currently out of stock.`, 'error');
        return;
      }
      const existing = cartItems.find((c) => c.productId === product.id);
      const currentQty = existing ? existing.quantity : 0;
      const desiredQty = currentQty + quantity;
      const maxAllowed = Math.min(product.stock, SCHEMA_LIMITS.MAX_ITEM_QTY);

      if (currentQty >= maxAllowed) {
        pushToast(
          `Maximum available stock (${maxAllowed}) already in your bag.`,
          'error'
        );
        if (openDrawer) setIsCartOpen(true);
        return;
      }

      const clampedQty = Math.min(desiredQty, maxAllowed);
      const nextItems = existing
        ? cartItems.map((c) =>
            c.productId === product.id ? { ...c, quantity: clampedQty } : c
          )
        : [...cartItems, { productId: product.id, quantity: clampedQty }];

      persistCart(nextItems);
      if (desiredQty > maxAllowed) {
        pushToast(
          `Added maximum available quantity (${maxAllowed}) for ${product.name}.`,
          'neutral'
        );
      } else {
        pushToast(`Added ${product.name} to bag.`, 'success');
      }
      if (openDrawer) setIsCartOpen(true);
    },
    [cartItems, persistCart, pushToast]
  );

  const openAuthModal = useCallback(
    (mode: 'login' | 'register' = 'login', redirectTo?: AppView) => {
      setAuthModalInitialMode(mode);
      setPendingAuthRedirect(redirectTo ?? null);
      setIsAuthModalOpen(true);
    },
    []
  );

  const closeAuthModal = useCallback(
    (completedAuth = false) => {
      setIsAuthModalOpen(false);
      if (completedAuth && pendingAuthRedirect) {
        const target = pendingAuthRedirect;
        setPendingAuthRedirect(null);
        setActiveViewState(target);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setPendingAuthRedirect(null);
      }
    },
    [pendingAuthRedirect]
  );

  const buyNow = useCallback(
    (product: Product, quantity = 1) => {
      if (isUsingSeedPreview) {
        pushToast(
          'Catalog is in Demo Preview mode. An administrator must initialize Firestore before checkout.',
          'error'
        );
        return;
      }
      if (product.stock <= 0) {
        pushToast(`${product.name} is currently out of stock.`, 'error');
        return;
      }
      const existing = cartItems.find((c) => c.productId === product.id);
      const maxAllowed = Math.min(product.stock, SCHEMA_LIMITS.MAX_ITEM_QTY);
      const clampedQty = Math.min(
        existing ? Math.max(existing.quantity, quantity) : quantity,
        maxAllowed
      );
      const nextItems = existing
        ? cartItems.map((c) =>
            c.productId === product.id ? { ...c, quantity: clampedQty } : c
          )
        : [...cartItems, { productId: product.id, quantity: clampedQty }];
      persistCart(nextItems);
      setIsCartOpen(false);
      if (!firebaseUser) {
        openAuthModal('login', 'checkout');
        pushToast('Please sign in to complete Express Checkout.', 'neutral');
        return;
      }
      setActiveViewState('checkout');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [cartItems, firebaseUser, isUsingSeedPreview, openAuthModal, persistCart, pushToast]
  );

  const updateCartQuantity = useCallback(
    (productId: string, quantity: number) => {
      if (quantity <= 0) {
        persistCart(cartItems.filter((c) => c.productId !== productId));
        return;
      }
      const product = products.find((p) => p.id === productId);
      const maxStock = product ? product.stock : SCHEMA_LIMITS.MAX_ITEM_QTY;
      if (maxStock <= 0) {
        persistCart(cartItems.filter((c) => c.productId !== productId));
        pushToast('This item is no longer in stock and was removed.', 'error');
        return;
      }
      const maxAllowed = Math.min(maxStock, SCHEMA_LIMITS.MAX_ITEM_QTY);
      if (quantity > maxAllowed) {
        pushToast(`Only ${maxAllowed} unit(s) available in stock.`, 'error');
      }
      const clamped = Math.min(quantity, maxAllowed);
      persistCart(
        cartItems.map((c) =>
          c.productId === productId ? { ...c, quantity: clamped } : c
        )
      );
    },
    [cartItems, products, persistCart, pushToast]
  );

  const removeFromCart = useCallback(
    (productId: string) => {
      persistCart(cartItems.filter((c) => c.productId !== productId));
    },
    [cartItems, persistCart]
  );

  const clearCart = useCallback(() => {
    persistCart([]);
  }, [persistCart]);

  const toggleWishlist = useCallback(
    (product: Product) => {
      const storageKey = `${WISHLIST_KEY_PREFIX}${firebaseUser?.uid || 'guest'}`;
      setWishlistIds((prev) => {
        const exists = prev.includes(product.id);
        const next = exists
          ? prev.filter((id) => id !== product.id)
          : [product.id, ...prev];
        localStorage.setItem(storageKey, JSON.stringify(next));
        pushToast(
          exists
            ? `Removed ${product.name} from Saved Items.`
            : `Saved ${product.name} to Wishlist.`,
          exists ? 'neutral' : 'success'
        );
        return next;
      });
    },
    [firebaseUser?.uid, pushToast]
  );

  const isWishlisted = useCallback(
    (productId: string) => wishlistIds.includes(productId),
    [wishlistIds]
  );

  const moveToSavedForLater = useCallback(
    (productId: string) => {
      const storageKey = `${SAVED_LATER_KEY_PREFIX}${firebaseUser?.uid || 'guest'}`;
      persistCart(cartItems.filter((c) => c.productId !== productId));
      setSavedForLaterIds((prev) => {
        const next = prev.includes(productId) ? prev : [productId, ...prev];
        localStorage.setItem(storageKey, JSON.stringify(next));
        return next;
      });
      pushToast('Moved item to Saved for Later.', 'neutral');
    },
    [cartItems, firebaseUser?.uid, persistCart, pushToast]
  );

  const moveSavedToCart = useCallback(
    (productId: string) => {
      const storageKey = `${SAVED_LATER_KEY_PREFIX}${firebaseUser?.uid || 'guest'}`;
      const product = products.find((p) => p.id === productId);
      if (!product) return;
      setSavedForLaterIds((prev) => {
        const next = prev.filter((id) => id !== productId);
        localStorage.setItem(storageKey, JSON.stringify(next));
        return next;
      });
      addToCart(product, 1, true);
    },
    [addToCart, firebaseUser?.uid, products]
  );

  const removeSavedForLater = useCallback(
    (productId: string) => {
      const storageKey = `${SAVED_LATER_KEY_PREFIX}${firebaseUser?.uid || 'guest'}`;
      setSavedForLaterIds((prev) => {
        const next = prev.filter((id) => id !== productId);
        localStorage.setItem(storageKey, JSON.stringify(next));
        return next;
      });
    },
    [firebaseUser?.uid]
  );

  const updateDeliveryLocation = useCallback(
    (loc: DeliveryLocation) => {
      const cleaned = {
        city: loc.city.trim() || 'New York',
        postalCode: loc.postalCode.trim() || '10001',
      };
      setDeliveryLocation(cleaned);
      localStorage.setItem(LOCATION_KEY, JSON.stringify(cleaned));
      pushToast(`Delivery location set to ${cleaned.city} ${cleaned.postalCode}.`, 'success');
    },
    [pushToast]
  );

  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const cartSubtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const prod = products.find((p) => p.id === item.productId);
      return sum + (prod ? prod.price * item.quantity : 0);
    }, 0);
  }, [cartItems, products]);

  const setActiveView = useCallback((view: AppView) => {
    setActiveViewState(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const openProductDetail = useCallback((productId: string) => {
    setSelectedProductId(productId);
    setActiveViewState('product');
    setRecentlyViewedIds((prev) => {
      const next = [productId, ...prev.filter((id) => id !== productId)].slice(0, 8);
      localStorage.setItem(RECENT_VIEWED_KEY, JSON.stringify(next));
      return next;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const openCatalogFiltered = useCallback(
    (opts?: {
      categoryId?: string;
      search?: string;
      onlyNewArrivals?: boolean;
      onlyFeatured?: boolean;
      priceBracket?: PriceBracket;
    }) => {
      if (opts?.categoryId !== undefined) setSelectedCategoryId(opts.categoryId);
      if (opts?.search !== undefined) setSearchQuery(opts.search);
      setOnlyNewArrivals(Boolean(opts?.onlyNewArrivals));
      setOnlyFeatured(Boolean(opts?.onlyFeatured));
      setPriceBracket(opts?.priceBracket ?? 'all');
      setActiveViewState('catalog');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    []
  );

  const logout = useCallback(async () => {
    await signOut(auth);
    setActiveViewState('home');
    pushToast('Signed out of your account.', 'neutral');
  }, [pushToast]);

  const value: StoreContextValue = {
    authReady,
    firebaseUser,
    userProfile,
    isAdmin,
    catalogLoading,
    isUsingSeedPreview,
    hasMissingSeedItems,
    categories,
    products,
    cartItems,
    cartCount,
    cartSubtotal,
    wishlistIds,
    savedForLaterIds,
    recentlyViewedIds,
    deliveryLocation,
    orders,
    activeView,
    selectedProductId,
    searchQuery,
    selectedCategoryId,
    sortBy,
    priceBracket,
    onlyNewArrivals,
    onlyFeatured,
    onlyInStock,
    isCartOpen,
    isAuthModalOpen,
    authModalInitialMode,
    lastPlacedOrder,
    toasts,
    setActiveView,
    openProductDetail,
    openCatalogFiltered,
    setSearchQuery,
    setSelectedCategoryId,
    setSortBy,
    setPriceBracket,
    setOnlyNewArrivals,
    setOnlyFeatured,
    setOnlyInStock,
    setIsCartOpen,
    openAuthModal,
    closeAuthModal,
    setLastPlacedOrder,
    addToCart,
    buyNow,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    toggleWishlist,
    isWishlisted,
    moveToSavedForLater,
    moveSavedToCart,
    removeSavedForLater,
    updateDeliveryLocation,
    logout,
    refreshAdminState,
    triggerCatalogSeed,
    pushToast,
    dismissToast,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return ctx;
}
