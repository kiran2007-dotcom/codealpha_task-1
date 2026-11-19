import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Download,
  Edit3,
  FolderPlus,
  PackagePlus,
  Search,
  ShieldAlert,
  Trash2,
  Upload,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { STUDIO_PRESET_IMAGES } from '../data/seedCatalog';
import {
  downloadOrderReceiptHtml,
  removeCategory,
  removeProduct,
  saveCategory,
  saveProduct,
  setCustomerAdminRole,
  subscribeToAllOrders,
  subscribeToAllUsers,
  updateOrderStatusAdmin,
  uploadProductImage,
} from '../services/storeService';
import type {
  Category,
  Order,
  OrderStatus,
  Product,
  UserProfile,
} from '../types/store';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  makeSafeDocId,
} from '../utils/formatters';
import { ProductImage } from './ProductImage';

type AdminTab = 'overview' | 'products' | 'categories' | 'orders' | 'customers';

const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

export function AdminDashboard() {
  const {
    firebaseUser,
    isAdmin,
    products,
    categories,
    isUsingSeedPreview,
    hasMissingSeedItems,
    triggerCatalogSeed,
    pushToast,
    setActiveView,
  } = useStore();

  const [tab, setTab] = useState<AdminTab>('overview');
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [prodName, setProdName] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [prodCategoryId, setProdCategoryId] = useState('');
  const [prodImageUrl, setProdImageUrl] = useState(STUDIO_PRESET_IMAGES[0].url);
  const [prodDesc, setProdDesc] = useState('');
  const [prodSpecs, setProdSpecs] = useState('');
  const [prodFeatured, setProdFeatured] = useState(false);
  const [prodNewArrival, setProdNewArrival] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catOrder, setCatOrder] = useState('1');
  const [savingCategory, setSavingCategory] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<{
    type: 'product' | 'category';
    id: string;
    label: string;
  } | null>(null);

  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [adminProdSearch, setAdminProdSearch] = useState('');
  const [adminOrderSearch, setAdminOrderSearch] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    const unsubOrders = subscribeToAllOrders(setAllOrders);
    const unsubUsers = subscribeToAllUsers(setAllUsers);
    return () => {
      unsubOrders();
      unsubUsers();
    };
  }, [isAdmin]);

  const metrics = useMemo(() => {
    const validOrders = allOrders.filter((o) => o.status !== 'cancelled');
    const revenue = validOrders.reduce((s, o) => s + Number(o.total || 0), 0);
    const pendingCount = allOrders.filter(
      (o) => o.status === 'pending' || o.status === 'processing'
    ).length;
    const totalUnits = products.reduce((s, p) => s + Number(p.stock || 0), 0);
    const lowStock = products.filter((p) => p.stock <= 5);
    return {
      revenue,
      orderCount: allOrders.length,
      pendingCount,
      totalUnits,
      lowStock,
      customerCount: allUsers.length,
    };
  }, [allOrders, products, allUsers]);

  const filteredAdminProducts = useMemo(() => {
    const q = adminProdSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      `${p.name} ${p.sku} ${p.categoryName}`.toLowerCase().includes(q)
    );
  }, [products, adminProdSearch]);

  const filteredAdminOrders = useMemo(() => {
    const q = adminOrderSearch.trim().toLowerCase();
    if (!q) return allOrders;
    return allOrders.filter((o) =>
      `${o.orderId} ${o.customerName} ${o.customerEmail} ${o.status}`.toLowerCase().includes(q)
    );
  }, [allOrders, adminOrderSearch]);

  if (!firebaseUser || !isAdmin) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="glass-panel rounded-3xl p-10">
          <ShieldAlert className="w-9 h-9 text-zinc-400 mx-auto mb-4" />
          <h1 className="font-display text-2xl font-semibold text-zinc-900 mb-2">
            Administrator Access Restricted
          </h1>
          <p className="text-sm text-zinc-600 mb-6">
            This area requires verified administrator permissions enforced by Firestore Security Rules.
          </p>
          <button
            type="button"
            onClick={() => setActiveView('home')}
            className="px-6 py-3 rounded-xl bg-zinc-900 text-white text-sm font-medium cursor-pointer"
          >
            Return to Storefront
          </button>
        </div>
      </div>
    );
  }

  const openNewProductForm = () => {
    setEditingProduct(null);
    setProdName('');
    setProdSku(`KF-${Math.random().toString(36).slice(2, 6).toUpperCase()}`);
    setProdPrice('180');
    setProdStock('10');
    setProdCategoryId(categories[0]?.id || '');
    setProdImageUrl(STUDIO_PRESET_IMAGES[0].url);
    setProdDesc('');
    setProdSpecs('');
    setProdFeatured(false);
    setProdNewArrival(true);
    setShowProductForm(true);
  };

  const openEditProductForm = (p: Product) => {
    setEditingProduct(p);
    setProdName(p.name);
    setProdSku(p.sku);
    setProdPrice(String(p.price));
    setProdStock(String(p.stock));
    setProdCategoryId(p.categoryId);
    setProdImageUrl(p.imageUrl);
    setProdDesc(p.description);
    setProdSpecs(p.specs);
    setProdFeatured(p.featured);
    setProdNewArrival(p.isNewArrival);
    setShowProductForm(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const tempId = editingProduct?.id || makeSafeDocId('prod', prodName || 'upload');
    setUploadProgress(0);
    try {
      const url = await uploadProductImage(tempId, file, setUploadProgress);
      setProdImageUrl(url);
      pushToast('Image uploaded to Firebase Storage.', 'success');
    } catch (err) {
      pushToast(
        err instanceof Error ? err.message : 'Firebase Storage upload failed.',
        'error'
      );
    } finally {
      setUploadProgress(null);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const cat = categories.find((c) => c.id === prodCategoryId);
    if (!cat) {
      pushToast('Please select or create a category first.', 'error');
      return;
    }
    if (!prodName.trim() || !prodSku.trim() || !prodDesc.trim() || !prodImageUrl.trim()) {
      pushToast('Please complete product name, SKU, image URL, and description.', 'error');
      return;
    }
    const priceNum = Number(prodPrice);
    const stockNum = Number(prodStock);
    if (Number.isNaN(priceNum) || priceNum < 0.01 || priceNum > 1000000) {
      pushToast('Price must be between $0.01 and $1,000,000.', 'error');
      return;
    }
    if (Number.isNaN(stockNum) || stockNum < 0 || stockNum > 100000) {
      pushToast('Stock must be between 0 and 100,000.', 'error');
      return;
    }

    setSavingProduct(true);
    try {
      const id = editingProduct?.id || makeSafeDocId('prod', prodName);
      await saveProduct(
        {
          id,
          name: prodName,
          description: prodDesc,
          price: priceNum,
          stock: stockNum,
          categoryId: cat.id,
          categoryName: cat.name,
          imageUrl: prodImageUrl,
          featured: prodFeatured,
          isNewArrival: prodNewArrival,
          sku: prodSku,
          specs: prodSpecs,
        },
        !editingProduct
      );
      pushToast(
        editingProduct ? 'Product updated.' : 'Product added to catalog.',
        'success'
      );
      setShowProductForm(false);
    } catch (err) {
      pushToast(
        err instanceof Error ? err.message : 'Unable to save product.',
        'error'
      );
    } finally {
      setSavingProduct(false);
    }
  };

  const handleQuickStockDelta = async (p: Product, delta: number) => {
    const nextStock = Math.max(0, p.stock + delta);
    try {
      await saveProduct(
        {
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          stock: nextStock,
          categoryId: p.categoryId,
          categoryName: p.categoryName,
          imageUrl: p.imageUrl,
          featured: p.featured,
          isNewArrival: p.isNewArrival,
          sku: p.sku,
          specs: p.specs,
        },
        false
      );
    } catch (err) {
      pushToast(
        err instanceof Error ? err.message : 'Stock update failed.',
        'error'
      );
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      pushToast('Category name cannot be empty.', 'error');
      return;
    }
    setSavingCategory(true);
    try {
      const id = editingCategory?.id || makeSafeDocId('cat', catName);
      await saveCategory(
        {
          id,
          name: catName,
          description: catDesc,
          displayOrder: Number(catOrder) || 0,
        },
        !editingCategory
      );
      pushToast(
        editingCategory ? 'Category updated.' : 'Category created.',
        'success'
      );
      setEditingCategory(null);
      setCatName('');
      setCatDesc('');
      setCatOrder(String(categories.length + 1));
    } catch (err) {
      pushToast(
        err instanceof Error ? err.message : 'Unable to save category.',
        'error'
      );
    } finally {
      setSavingCategory(false);
    }
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    try {
      if (confirmDelete.type === 'product') {
        await removeProduct(confirmDelete.id);
        pushToast(`Deleted product "${confirmDelete.label}".`, 'neutral');
      } else {
        await removeCategory(confirmDelete.id);
        pushToast(`Deleted category "${confirmDelete.label}".`, 'neutral');
      }
    } catch (err) {
      pushToast(
        err instanceof Error ? err.message : 'Delete operation failed.',
        'error'
      );
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="glass-panel rounded-3xl p-6 sm:p-8 flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">
            Operations Console
          </p>
          <h1 className="font-display text-3xl font-semibold text-zinc-900 tracking-tight">
            Admin Dashboard
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {(isUsingSeedPreview || hasMissingSeedItems) && (
            <button
              type="button"
              onClick={() => triggerCatalogSeed()}
              className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 cursor-pointer"
            >
              {isUsingSeedPreview
                ? 'Seed Demo Catalog to Firestore'
                : 'Sync Starter Marketplace Items'}
            </button>
          )}
          <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-zinc-900/[0.06]">
            {(
              [
                ['overview', 'Overview'],
                ['products', `Products (${products.length})`],
                ['categories', `Categories (${categories.length})`],
                ['orders', `Orders (${allOrders.length})`],
                ['customers', `Customers (${allUsers.length})`],
              ] as Array<[AdminTab, string]>
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-all ${
                  tab === key
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="glass-card rounded-2xl p-6">
              <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
                Net Sales Revenue
              </p>
              <p className="font-mono text-2xl font-semibold text-zinc-900 tabular-nums">
                {formatCurrency(metrics.revenue)}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Excludes cancelled orders
              </p>
            </div>
            <div className="glass-card rounded-2xl p-6">
              <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
                Total Orders
              </p>
              <p className="font-mono text-2xl font-semibold text-zinc-900 tabular-nums">
                {metrics.orderCount}
              </p>
              <p className="text-xs text-zinc-500 mt-1 tabular-nums">
                {metrics.pendingCount} awaiting fulfillment
              </p>
            </div>
            <div className="glass-card rounded-2xl p-6">
              <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
                Inventory Units
              </p>
              <p className="font-mono text-2xl font-semibold text-zinc-900 tabular-nums">
                {metrics.totalUnits}
              </p>
              <p className="text-xs text-zinc-500 mt-1 tabular-nums">
                Across {products.length} catalog SKUs
              </p>
            </div>
            <div className="glass-card rounded-2xl p-6">
              <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
                Registered Users
              </p>
              <p className="font-mono text-2xl font-semibold text-zinc-900 tabular-nums">
                {metrics.customerCount}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Verified Firestore accounts
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Low Stock Alert */}
            <div className="glass-panel rounded-3xl p-6">
              <h2 className="font-display text-base font-semibold text-zinc-900 mb-4">
                Low Stock Alerts (&le; 5 units)
              </h2>
              {metrics.lowStock.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  All active catalog items have healthy stock levels.
                </p>
              ) : (
                <div className="divide-y divide-zinc-900/[0.06]">
                  {metrics.lowStock.map((p) => (
                    <div
                      key={p.id}
                      className="py-3 flex items-center justify-between gap-4 text-sm"
                    >
                      <div>
                        <p className="font-medium text-zinc-900">{p.name}</p>
                        <p className="text-xs text-zinc-500 font-mono">{p.sku}</p>
                      </div>
                      <span className="font-mono text-xs font-semibold text-red-700 tabular-nums">
                        {p.stock} left
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Orders */}
            <div className="glass-panel rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-base font-semibold text-zinc-900">
                  Latest Orders
                </h2>
                <button
                  type="button"
                  onClick={() => setTab('orders')}
                  className="text-xs font-medium text-zinc-900 underline underline-offset-4 cursor-pointer"
                >
                  View All
                </button>
              </div>
              {allOrders.length === 0 ? (
                <p className="text-sm text-zinc-500">No orders recorded yet.</p>
              ) : (
                <div className="divide-y divide-zinc-900/[0.06]">
                  {allOrders.slice(0, 5).map((o) => (
                    <div
                      key={o.orderId}
                      className="py-3 flex items-center justify-between gap-4 text-sm"
                    >
                      <div>
                        <p className="font-mono text-xs font-semibold text-zinc-900">
                          {o.orderId}
                        </p>
                        <p className="text-xs text-zinc-500">{o.customerName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm font-medium text-zinc-900 tabular-nums">
                          {formatCurrency(o.total)}
                        </p>
                        <p className="text-xs uppercase text-zinc-500">{o.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Products Tab */}
      {tab === 'products' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={adminProdSearch}
                onChange={(e) => setAdminProdSearch(e.target.value)}
                placeholder="Filter products by name, SKU..."
                className="w-full pl-9 pr-3 py-2 rounded-xl glass-input text-xs sm:text-sm"
              />
            </div>
            <button
              type="button"
              onClick={openNewProductForm}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-medium inline-flex items-center gap-2 hover:bg-zinc-800 cursor-pointer"
            >
              <PackagePlus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
          </div>

          {showProductForm && (
            <form
              onSubmit={handleSaveProduct}
              className="glass-panel-strong rounded-3xl p-6 space-y-5"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-zinc-900">
                  {editingProduct ? `Edit: ${editingProduct.name}` : 'New Product'}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowProductForm(false)}
                  className="text-xs text-zinc-600 hover:text-zinc-900 cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Product Name
                  </label>
                  <input
                    type="text"
                    required
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    SKU
                  </label>
                  <input
                    type="text"
                    required
                    value={prodSku}
                    onChange={(e) => setProdSku(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Category
                  </label>
                  <select
                    required
                    value={prodCategoryId}
                    onChange={(e) => setProdCategoryId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-sm"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Price (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Inventory Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={prodStock}
                    onChange={(e) => setProdStock(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Studio Preset Image
                  </label>
                  <select
                    value={
                      STUDIO_PRESET_IMAGES.some((i) => i.url === prodImageUrl)
                        ? prodImageUrl
                        : ''
                    }
                    onChange={(e) => e.target.value && setProdImageUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-sm"
                  >
                    <option value="">Custom / Uploaded Image</option>
                    {STUDIO_PRESET_IMAGES.map((preset) => (
                      <option key={preset.url} value={preset.url}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Image URL or Firebase Storage Upload
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={prodImageUrl}
                      onChange={(e) => setProdImageUrl(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl glass-input text-sm"
                    />
                    <label className="px-3 py-2 rounded-xl glass-subtle text-xs font-medium text-zinc-900 inline-flex items-center gap-1.5 hover:bg-white/90 cursor-pointer shrink-0">
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {uploadProgress !== null ? `${uploadProgress}%` : 'Upload'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Specifications Summary
                  </label>
                  <input
                    type="text"
                    value={prodSpecs}
                    onChange={(e) => setProdSpecs(e.target.value)}
                    placeholder="Material · Dimensions · Power"
                    className="w-full px-3 py-2 rounded-xl glass-input text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  required
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-sm"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-6 text-xs">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prodFeatured}
                      onChange={(e) => setProdFeatured(e.target.checked)}
                      className="accent-zinc-900"
                    />
                    <span>Featured on Homepage</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prodNewArrival}
                      onChange={(e) => setProdNewArrival(e.target.checked)}
                      className="accent-zinc-900"
                    />
                    <span>New Arrival</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={savingProduct}
                  className="px-6 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 disabled:opacity-50 cursor-pointer"
                >
                  {savingProduct
                    ? 'Saving...'
                    : editingProduct
                    ? 'Update Product'
                    : 'Create Product'}
                </button>
              </div>
            </form>
          )}

          <div className="glass-panel rounded-3xl overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-900/[0.08] text-xs uppercase text-zinc-500 bg-white/40">
                  <th className="py-3.5 px-4 font-medium">Product</th>
                  <th className="py-3.5 px-4 font-medium">Category</th>
                  <th className="py-3.5 px-4 font-medium text-right">Price</th>
                  <th className="py-3.5 px-4 font-medium text-center">Stock</th>
                  <th className="py-3.5 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/[0.05]">
                {filteredAdminProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-white/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-zinc-100 shrink-0 overflow-hidden">
                          <ProductImage src={p.imageUrl} alt={p.name} />
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900">{p.name}</p>
                          <p className="text-xs font-mono text-zinc-500">{p.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-zinc-600">{p.categoryName}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {formatCurrency(p.price)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleQuickStockDelta(p, -1)}
                          disabled={isUsingSeedPreview || p.stock <= 0}
                          className="w-6 h-6 rounded-md glass-subtle text-xs hover:bg-white/90 disabled:opacity-40 cursor-pointer"
                        >
                          -
                        </button>
                        <span className="font-mono text-xs w-8 text-center tabular-nums">
                          {p.stock}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQuickStockDelta(p, 1)}
                          disabled={isUsingSeedPreview}
                          className="w-6 h-6 rounded-md glass-subtle text-xs hover:bg-white/90 disabled:opacity-40 cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isUsingSeedPreview}
                          onClick={() => openEditProductForm(p)}
                          aria-label={`Edit ${p.name}`}
                          className="p-1.5 text-zinc-600 hover:text-zinc-900 disabled:opacity-40 cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={isUsingSeedPreview}
                          onClick={() =>
                            setConfirmDelete({
                              type: 'product',
                              id: p.id,
                              label: p.name,
                            })
                          }
                          aria-label={`Delete ${p.name}`}
                          className="p-1.5 text-zinc-500 hover:text-red-700 disabled:opacity-40 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Categories Tab */}
      {tab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <form
            onSubmit={handleSaveCategory}
            className="lg:col-span-4 glass-panel rounded-3xl p-6 space-y-4"
          >
            <div className="flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-zinc-900" />
              <h2 className="font-display text-base font-semibold text-zinc-900">
                {editingCategory ? `Edit ${editingCategory.name}` : 'Add Category'}
              </h2>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Category Name
              </label>
              <input
                type="text"
                required
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Tableware"
                className="w-full px-3 py-2 rounded-xl glass-input text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                className="w-full px-3 py-2 rounded-xl glass-input text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Display Order
              </label>
              <input
                type="number"
                min="0"
                value={catOrder}
                onChange={(e) => setCatOrder(e.target.value)}
                className="w-full px-3 py-2 rounded-xl glass-input text-sm font-mono"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={savingCategory}
                className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 cursor-pointer"
              >
                {savingCategory
                  ? 'Saving...'
                  : editingCategory
                  ? 'Update Category'
                  : 'Create Category'}
              </button>
              {editingCategory && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCategory(null);
                    setCatName('');
                    setCatDesc('');
                  }}
                  className="px-4 py-2.5 rounded-xl glass-subtle text-xs cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="lg:col-span-8 glass-panel rounded-3xl divide-y divide-zinc-900/[0.06]">
            {categories.map((cat) => {
              const count = products.filter((p) => p.categoryId === cat.id).length;
              return (
                <div
                  key={cat.id}
                  className="p-5 flex items-start justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-zinc-400">
                        #{cat.displayOrder}
                      </span>
                      <h3 className="font-display text-base font-semibold text-zinc-900">
                        {cat.name}
                      </h3>
                      <span className="text-xs text-zinc-500">
                        ({count} {count === 1 ? 'product' : 'products'})
                      </span>
                    </div>
                    <p className="text-sm text-zinc-600 mt-1">{cat.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={isUsingSeedPreview}
                      onClick={() => {
                        setEditingCategory(cat);
                        setCatName(cat.name);
                        setCatDesc(cat.description);
                        setCatOrder(String(cat.displayOrder));
                      }}
                      className="p-1.5 text-zinc-600 hover:text-zinc-900 disabled:opacity-40 cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={isUsingSeedPreview}
                      onClick={() =>
                        setConfirmDelete({
                          type: 'category',
                          id: cat.id,
                          label: cat.name,
                        })
                      }
                      className="p-1.5 text-zinc-500 hover:text-red-700 disabled:opacity-40 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {tab === 'orders' && (
        <div className="space-y-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={adminOrderSearch}
              onChange={(e) => setAdminOrderSearch(e.target.value)}
              placeholder="Search by Order ID, customer, status..."
              className="w-full pl-9 pr-3 py-2 rounded-xl glass-input text-xs sm:text-sm"
            />
          </div>

          <div className="glass-panel rounded-3xl divide-y divide-zinc-900/[0.06]">
            {filteredAdminOrders.length === 0 ? (
              <div className="p-12 text-center text-sm text-zinc-500">
                {allOrders.length === 0
                  ? 'No customer orders have been placed yet.'
                  : 'No orders match your search.'}
              </div>
            ) : (
              filteredAdminOrders.map((order) => {
                const isExpanded = expandedOrder === order.orderId;
                return (
                <div key={order.orderId} className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                        <span className="font-mono font-semibold text-zinc-900">
                          {order.orderId}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{formatDateTime(order.createdAt)}</span>
                      </div>
                      <p className="text-sm font-medium text-zinc-900 mt-1">
                        {order.customerName}{' '}
                        <span className="text-zinc-500 font-normal">
                          ({order.customerEmail})
                        </span>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono text-sm font-semibold text-zinc-900 tabular-nums">
                        {formatCurrency(order.total)}
                      </span>
                      <select
                        aria-label={`Order status for ${order.orderId}`}
                        value={order.status}
                        onChange={async (e) => {
                          try {
                            await updateOrderStatusAdmin(
                              order.orderId,
                              e.target.value as OrderStatus
                            );
                            pushToast(
                              `Order ${order.orderId} marked as ${e.target.value}.`,
                              'success'
                            );
                          } catch (err) {
                            pushToast(
                              err instanceof Error
                                ? err.message
                                : 'Status update failed.',
                              'error'
                            );
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl glass-input text-xs font-medium cursor-pointer"
                      >
                        {ORDER_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st.toUpperCase()}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedOrder(isExpanded ? null : order.orderId)
                        }
                        className="text-xs underline underline-offset-4 text-zinc-700 hover:text-zinc-900 cursor-pointer"
                      >
                        {isExpanded ? 'Hide Items' : 'Details'}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-zinc-900/[0.06] text-xs text-zinc-600 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p>
                          Ship to: {order.shippingAddress.line1},{' '}
                          {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                          {order.shippingAddress.postalCode},{' '}
                          {order.shippingAddress.country} · Phone: {order.customerPhone}
                        </p>
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
                          className="px-3 py-1.5 rounded-lg glass-subtle text-zinc-900 font-medium inline-flex items-center gap-1.5 hover:bg-white cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {order.items.map((item) => (
                          <div
                            key={item.productId}
                            className="p-2.5 rounded-xl glass-subtle flex justify-between"
                          >
                            <span>
                              {item.name} × {item.quantity}
                            </span>
                            <span className="font-mono tabular-nums">
                              {formatCurrency(item.lineTotal)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
          </div>
        </div>
      )}

      {/* Customers Tab */}
      {tab === 'customers' && (
        <div className="glass-panel rounded-3xl overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-900/[0.08] text-xs uppercase text-zinc-500 bg-white/40">
                <th className="py-3.5 px-4 font-medium">Customer</th>
                <th className="py-3.5 px-4 font-medium">Joined</th>
                <th className="py-3.5 px-4 font-medium text-right">Orders</th>
                <th className="py-3.5 px-4 font-medium text-right">Total Spend</th>
                <th className="py-3.5 px-4 font-medium text-right">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/[0.05]">
              {allUsers.map((u) => {
                const userOrders = allOrders.filter((o) => o.userId === u.uid);
                const spend = userOrders
                  .filter((o) => o.status !== 'cancelled')
                  .reduce((s, o) => s + o.total, 0);
                const isSelf = u.uid === firebaseUser.uid;
                return (
                  <tr key={u.uid} className="hover:bg-white/40 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-medium text-zinc-900">{u.name}</p>
                      <p className="text-xs text-zinc-500">{u.email}</p>
                    </td>
                    <td className="py-3 px-4 text-xs text-zinc-600">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {userOrders.length}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {formatCurrency(spend)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <span className="text-xs uppercase font-medium text-zinc-700">
                          {u.role}
                        </span>
                        {!isSelf && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await setCustomerAdminRole(
                                  u,
                                  u.role !== 'admin'
                                );
                                pushToast(
                                  `${u.name} role updated.`,
                                  'success'
                                );
                              } catch (err) {
                                pushToast(
                                  err instanceof Error
                                    ? err.message
                                    : 'Role change failed.',
                                  'error'
                                );
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg glass-subtle text-xs hover:bg-white/90 cursor-pointer"
                          >
                            {u.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                          </button>
                        )}
                        {isSelf && (
                          <span className="text-xs text-zinc-400 inline-flex items-center gap-1">
                            <Check className="w-3 h-3" /> You
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setConfirmDelete(null)}
            className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm"
          />
          <div className="relative glass-panel-strong rounded-3xl p-6 max-w-sm w-full">
            <h3 className="font-display text-lg font-semibold text-zinc-900 mb-2">
              Confirm Deletion
            </h3>
            <p className="text-sm text-zinc-600 mb-6">
              Are you sure you want to permanently remove &ldquo;{confirmDelete.label}&rdquo;?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-xl glass-subtle text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDelete}
                className="px-4 py-2 rounded-xl bg-red-700 text-white text-xs font-medium hover:bg-red-800 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
