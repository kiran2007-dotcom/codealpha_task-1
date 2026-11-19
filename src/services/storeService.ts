import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import {
  INITIAL_SEED_CATEGORIES,
  INITIAL_SEED_PRODUCTS,
} from '../data/seedCatalog';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
  storage,
} from '../lib/firebase';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  SCHEMA_LIMITS,
  type CartItem,
  type Category,
  type Order,
  type OrderItem,
  type OrderStatus,
  type PaymentMethod,
  type Product,
  type ShippingAddress,
  type UserProfile,
} from '../types/store';
import { slugify, toIsoString } from '../utils/formatters';

function isPermissionError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.toLowerCase().includes('permission') || msg.includes('PERMISSION_DENIED');
}

function sanitizeAddress(addr?: ShippingAddress): ShippingAddress | undefined {
  if (!addr) return undefined;
  const line1 = addr.line1.trim().slice(0, 200);
  const city = addr.city.trim().slice(0, 100);
  const state = addr.state.trim().slice(0, 100);
  const postalCode = addr.postalCode.trim().slice(0, 24);
  const country = addr.country.trim().slice(0, 80);
  if (!line1 || !city || !state || !postalCode || !country) return undefined;
  const sanitized: ShippingAddress = { line1, city, state, postalCode, country };
  if (addr.line2 && addr.line2.trim().length > 0) {
    sanitized.line2 = addr.line2.trim().slice(0, 200);
  }
  return sanitized;
}

export async function checkAdminPrivilege(user: User | null): Promise<boolean> {
  if (!user) return false;
  if (user.email === BOOTSTRAPPED_ADMIN_EMAIL && user.emailVerified) {
    return true;
  }
  try {
    const adminSnap = await getDoc(doc(db, 'admins', user.uid));
    return adminSnap.exists();
  } catch (error) {
    if (isPermissionError(error)) {
      return false;
    }
    return false;
  }
}

export async function upsertUserProfile(user: User, displayNameOverride?: string): Promise<void> {
  const path = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(userRef);
    const isBootstrap = user.email === BOOTSTRAPPED_ADMIN_EMAIL && user.emailVerified;
    if (!snap.exists()) {
      const cleanName = (displayNameOverride || user.displayName || user.email?.split('@')[0] || 'Customer')
        .trim()
        .slice(0, SCHEMA_LIMITS.MAX_NAME_LEN);
      await setDoc(userRef, {
        uid: user.uid,
        name: cleanName || 'Customer',
        email: (user.email || '').slice(0, SCHEMA_LIMITS.MAX_EMAIL_LEN),
        role: isBootstrap ? 'admin' : 'customer',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else if (isBootstrap && snap.data().role !== 'admin') {
      await updateDoc(userRef, {
        role: 'admin',
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
    throw error;
  }
}

export async function updateCustomerProfile(
  uid: string,
  payload: { name: string; phone?: string; defaultAddress?: ShippingAddress }
): Promise<void> {
  const path = `users/${uid}`;
  const userRef = doc(db, 'users', uid);
  const cleanName = payload.name.trim().slice(0, SCHEMA_LIMITS.MAX_NAME_LEN);
  if (!cleanName) {
    throw new Error('Name cannot be empty.');
  }
  const updateBody: Record<string, unknown> = {
    name: cleanName,
    updatedAt: serverTimestamp(),
  };
  if (payload.phone && payload.phone.trim().length > 0) {
    updateBody.phone = payload.phone.trim().slice(0, SCHEMA_LIMITS.MAX_PHONE_LEN);
  }
  if (payload.defaultAddress) {
    const cleanAddr = sanitizeAddress(payload.defaultAddress);
    if (!cleanAddr || cleanAddr.line1.length < 2 || cleanAddr.postalCode.length < 2 || cleanAddr.country.length < 2) {
      throw new Error('Please provide a complete shipping address (street, city, state, postal code, and country).');
    }
    updateBody.defaultAddress = cleanAddr;
  }

  try {
    await updateDoc(userRef, updateBody);
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
    throw error;
  }
}

export function subscribeToCategories(
  onData: (categories: Category[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const q = query(collection(db, 'categories'), orderBy('displayOrder', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => d.data() as Category);
      onData(list);
    },
    (error) => {
      if (isPermissionError(error)) {
        handleFirestoreError(error, OperationType.LIST, 'categories');
      }
      onError?.(error);
    }
  );
}

export function subscribeToProducts(
  onData: (products: Product[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => d.data() as Product);
      onData(list);
    },
    (error) => {
      if (isPermissionError(error)) {
        handleFirestoreError(error, OperationType.LIST, 'products');
      }
      onError?.(error);
    }
  );
}

export function subscribeToUserProfile(
  uid: string,
  onData: (profile: UserProfile | null) => void
): Unsubscribe {
  const path = `users/${uid}`;
  return onSnapshot(
    doc(db, 'users', uid),
    (snapshot) => {
      onData(snapshot.exists() ? (snapshot.data() as UserProfile) : null);
    },
    (error) => {
      if (isPermissionError(error)) {
        handleFirestoreError(error, OperationType.GET, path);
      }
    }
  );
}

export function subscribeToUserCart(
  uid: string,
  onData: (items: CartItem[]) => void
): Unsubscribe {
  const path = `carts/${uid}`;
  return onSnapshot(
    doc(db, 'carts', uid),
    (snapshot) => {
      if (!snapshot.exists()) {
        onData([]);
        return;
      }
      const data = snapshot.data();
      onData(Array.isArray(data.items) ? (data.items as CartItem[]) : []);
    },
    (error) => {
      if (isPermissionError(error)) {
        handleFirestoreError(error, OperationType.GET, path);
      }
    }
  );
}

export async function saveUserCart(uid: string, items: CartItem[]): Promise<void> {
  const path = `carts/${uid}`;
  const cleaned = items
    .filter(
      (i) =>
        SCHEMA_LIMITS.ID_REGEX.test(i.productId) &&
        Number.isInteger(i.quantity) &&
        i.quantity >= 1
    )
    .slice(0, SCHEMA_LIMITS.MAX_CART_ITEMS)
    .map((i) => ({
      productId: i.productId,
      quantity: Math.min(SCHEMA_LIMITS.MAX_ITEM_QTY, i.quantity),
    }));

  try {
    await setDoc(doc(db, 'carts', uid), {
      userId: uid,
      items: cleaned,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
    throw error;
  }
}

export function subscribeToUserOrders(
  uid: string,
  onData: (orders: Order[]) => void
): Unsubscribe {
  // Single-field where query avoids requiring a manual composite index in Firestore;
  // results are sorted newest-first on the client.
  const q = query(collection(db, 'orders'), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const orders = snapshot.docs.map((d) => d.data() as Order);
      orders.sort((a, b) => {
        const ta = new Date(toIsoString(a.createdAt) || 0).getTime();
        const tb = new Date(toIsoString(b.createdAt) || 0).getTime();
        return tb - ta;
      });
      onData(orders);
    },
    (error) => {
      console.error('Failed to subscribe to user orders:', error);
      if (isPermissionError(error)) {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      }
    }
  );
}

export function subscribeToAllOrders(onData: (orders: Order[]) => void): Unsubscribe {
  const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      onData(snapshot.docs.map((d) => d.data() as Order));
    },
    (error) => {
      if (isPermissionError(error)) {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      }
    }
  );
}

export function subscribeToAllUsers(onData: (users: UserProfile[]) => void): Unsubscribe {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      onData(snapshot.docs.map((d) => d.data() as UserProfile));
    },
    (error) => {
      if (isPermissionError(error)) {
        handleFirestoreError(error, OperationType.LIST, 'users');
      }
    }
  );
}

export interface PlaceOrderInput {
  idempotencyKey: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: ShippingAddress;
  paymentMethod: PaymentMethod;
  items: CartItem[];
}

export async function placeOrderTransaction(input: PlaceOrderInput): Promise<Order> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Please sign in to place an order.');
  }

  const cleanAddress = sanitizeAddress(input.shippingAddress);
  if (!cleanAddress) {
    throw new Error('Please complete all required shipping address fields.');
  }

  const idToken = await user.getIdToken();
  const prepareRes = await fetch('/api/checkout/prepare', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      idempotencyKey: input.idempotencyKey,
      customerName: input.customerName.trim(),
      customerEmail: input.customerEmail.trim(),
      customerPhone: input.customerPhone.trim(),
      shippingAddress: cleanAddress,
      paymentMethod: input.paymentMethod,
      items: input.items,
    }),
  });

  if (!prepareRes.ok) {
    const errJson = (await prepareRes.json().catch(() => ({}))) as { error?: string };
    throw new Error(errJson.error || 'Checkout verification failed on the server.');
  }

  const prepared = (await prepareRes.json()) as {
    orderId: string;
    freeShippingThreshold: number;
    standardShippingCost: number;
  };

  const orderId = prepared.orderId;
  const orderRef = doc(db, 'orders', orderId);
  const cartRef = doc(db, 'carts', user.uid);

  try {
    const createdOrder = await runTransaction(db, async (tx) => {
      // Phase 1: All reads first
      const existingOrderSnap = await tx.get(orderRef);
      if (existingOrderSnap.exists()) {
        return existingOrderSnap.data() as Order;
      }

      const productSnaps = await Promise.all(
        input.items.map((item) => tx.get(doc(db, 'products', item.productId)))
      );

      // Phase 2: Validate stock and compute authoritative totals from database prices
      const orderItems: OrderItem[] = [];
      const stockUpdates: Array<{ ref: ReturnType<typeof doc>; newStock: number }> = [];

      for (let idx = 0; idx < input.items.length; idx++) {
        const cartItem = input.items[idx];
        const snap = productSnaps[idx];
        if (!snap.exists()) {
          throw new Error(`Product "${cartItem.productId}" is no longer available.`);
        }
        const product = snap.data() as Product;
        if (cartItem.quantity < 1 || !Number.isInteger(cartItem.quantity)) {
          throw new Error(`Invalid quantity requested for "${product.name}".`);
        }
        if (product.stock < cartItem.quantity) {
          throw new Error(
            product.stock === 0
              ? `"${product.name}" is currently out of stock.`
              : `Only ${product.stock} unit(s) of "${product.name}" remain in stock.`
          );
        }

        const lineTotal = Number((product.price * cartItem.quantity).toFixed(2));
        orderItems.push({
          productId: product.id,
          name: product.name.slice(0, SCHEMA_LIMITS.MAX_PRODUCT_NAME_LEN),
          price: product.price,
          quantity: cartItem.quantity,
          imageUrl: product.imageUrl.slice(0, SCHEMA_LIMITS.MAX_IMAGE_URL_LEN),
          lineTotal,
        });

        stockUpdates.push({
          ref: doc(db, 'products', product.id),
          newStock: product.stock - cartItem.quantity,
        });
      }

      const subtotal = Number(
        orderItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2)
      );
      const shippingCost =
        subtotal >= prepared.freeShippingThreshold ? 0 : prepared.standardShippingCost;
      const total = Number((subtotal + shippingCost).toFixed(2));

      const orderPayload: Omit<Order, 'createdAt' | 'updatedAt'> & {
        createdAt: ReturnType<typeof serverTimestamp>;
        updatedAt: ReturnType<typeof serverTimestamp>;
      } = {
        orderId,
        userId: user.uid,
        customerName: input.customerName.trim().slice(0, SCHEMA_LIMITS.MAX_NAME_LEN),
        customerEmail: input.customerEmail.trim().slice(0, SCHEMA_LIMITS.MAX_EMAIL_LEN),
        customerPhone: input.customerPhone.trim().slice(0, SCHEMA_LIMITS.MAX_PHONE_LEN),
        shippingAddress: cleanAddress,
        items: orderItems,
        subtotal,
        shippingCost,
        total,
        status: 'pending',
        paymentMethod: input.paymentMethod,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Phase 3: Atomic writes (order creation + stock deduction + cart clear)
      tx.set(orderRef, orderPayload);

      for (const update of stockUpdates) {
        tx.update(update.ref, {
          stock: update.newStock,
          lastOrderId: orderId,
          updatedAt: serverTimestamp(),
        });
      }

      tx.set(cartRef, {
        userId: user.uid,
        items: [],
        updatedAt: serverTimestamp(),
      });

      return {
        ...orderPayload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Order;
    });

    return createdOrder;
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.WRITE, `orders/${orderId}`);
    }
    throw error;
  }
}

export async function downloadOrderReceiptHtml(order: Order): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in required to view receipt.');
  const token = await user.getIdToken();
  const res = await fetch('/api/orders/receipt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      order: {
        ...order,
        createdAtIso: toIsoString(order.createdAt),
      },
    }),
  });
  if (!res.ok) {
    throw new Error('Unable to generate receipt.');
  }
  const { html, filename } = (await res.json()) as { html: string; filename: string };
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Admin Operations (Protected by Firestore Security Rules)
// ---------------------------------------------------------------------------

export async function seedInitialCatalog(): Promise<{ addedCategories: number; addedProducts: number }> {
  const batch = writeBatch(db);
  let addedCategories = 0;
  let addedProducts = 0;

  for (const cat of INITIAL_SEED_CATEGORIES) {
    const refDoc = doc(db, 'categories', cat.id);
    const snap = await getDoc(refDoc);
    if (!snap.exists()) {
      batch.set(refDoc, {
        ...cat,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      addedCategories++;
    }
  }
  for (const prod of INITIAL_SEED_PRODUCTS) {
    const refDoc = doc(db, 'products', prod.id);
    const snap = await getDoc(refDoc);
    if (!snap.exists()) {
      batch.set(refDoc, {
        ...prod,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      addedProducts++;
    }
  }

  if (addedCategories === 0 && addedProducts === 0) {
    return { addedCategories: 0, addedProducts: 0 };
  }

  try {
    await batch.commit();
    return { addedCategories, addedProducts };
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.WRITE, 'products');
    }
    throw error;
  }
}

export async function uploadProductImage(
  productId: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are supported.');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image size must be 5 MB or smaller.');
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storageRef = ref(storage, `products/${productId}/${Date.now()}_${safeName}`);

  return new Promise<string>((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file);
    task.on(
      'state_changed',
      (snap) => {
        if (onProgress && snap.totalBytes > 0) {
          onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
        }
      },
      (error) => {
        reject(
          new Error(
            error.code === 'storage/unauthorized'
              ? 'Firebase Storage upload denied. Ensure Firebase Storage is enabled and rules allow admin uploads, or use a Studio Preset / URL.'
              : error.message
          )
        );
      },
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve(url);
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

export interface ProductMutationInput {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  categoryId: string;
  categoryName: string;
  imageUrl: string;
  featured: boolean;
  isNewArrival: boolean;
  sku: string;
  specs: string;
}

export async function saveProduct(input: ProductMutationInput, isNew: boolean): Promise<void> {
  const path = `products/${input.id}`;
  const cleanName = input.name.trim().slice(0, SCHEMA_LIMITS.MAX_PRODUCT_NAME_LEN);
  const cleanDesc = input.description.trim().slice(0, SCHEMA_LIMITS.MAX_PRODUCT_DESC_LEN);
  const cleanSku = input.sku.trim().slice(0, SCHEMA_LIMITS.MAX_SKU_LEN);
  const cleanImg = input.imageUrl.trim().slice(0, SCHEMA_LIMITS.MAX_IMAGE_URL_LEN);

  if (!cleanName || !cleanDesc || !cleanSku || !cleanImg) {
    throw new Error('Product name, SKU, image URL, and description are required.');
  }

  const payload = {
    id: input.id,
    name: cleanName,
    slug: slugify(cleanName).slice(0, 160),
    description: cleanDesc,
    price: Number(Number(input.price).toFixed(2)),
    stock: Math.min(100000, Math.max(0, Math.floor(Number(input.stock)))),
    categoryId: input.categoryId,
    categoryName: input.categoryName.trim().slice(0, SCHEMA_LIMITS.MAX_CATEGORY_NAME_LEN),
    imageUrl: cleanImg,
    featured: Boolean(input.featured),
    isNewArrival: Boolean(input.isNewArrival),
    sku: cleanSku,
    specs: input.specs.trim().slice(0, SCHEMA_LIMITS.MAX_SPECS_LEN),
  };

  try {
    if (isNew) {
      await setDoc(doc(db, 'products', input.id), {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, 'products', input.id), {
        name: payload.name,
        slug: payload.slug,
        description: payload.description,
        price: payload.price,
        stock: payload.stock,
        categoryId: payload.categoryId,
        categoryName: payload.categoryName,
        imageUrl: payload.imageUrl,
        featured: payload.featured,
        isNewArrival: payload.isNewArrival,
        sku: payload.sku,
        specs: payload.specs,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
    }
    throw error;
  }
}

export async function removeProduct(productId: string): Promise<void> {
  const path = `products/${productId}`;
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
    throw error;
  }
}

export async function saveCategory(
  input: { id: string; name: string; description: string; displayOrder: number },
  isNew: boolean
): Promise<void> {
  const path = `categories/${input.id}`;
  const cleanName = input.name.trim().slice(0, SCHEMA_LIMITS.MAX_CATEGORY_NAME_LEN);
  if (!cleanName) {
    throw new Error('Category name cannot be empty.');
  }
  const payload = {
    id: input.id,
    name: cleanName,
    slug: slugify(cleanName).slice(0, SCHEMA_LIMITS.MAX_CATEGORY_NAME_LEN),
    description: input.description.trim().slice(0, SCHEMA_LIMITS.MAX_CATEGORY_DESC_LEN),
    displayOrder: Math.min(1000, Math.max(0, Math.floor(Number(input.displayOrder) || 0))),
  };
  try {
    if (isNew) {
      await setDoc(doc(db, 'categories', input.id), {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, 'categories', input.id), {
        name: payload.name,
        slug: payload.slug,
        description: payload.description,
        displayOrder: payload.displayOrder,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
    }
    throw error;
  }
}

export async function removeCategory(categoryId: string): Promise<void> {
  const path = `categories/${categoryId}`;
  try {
    await deleteDoc(doc(db, 'categories', categoryId));
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
    throw error;
  }
}

export async function updateOrderStatusAdmin(
  orderId: string,
  status: OrderStatus
): Promise<void> {
  const path = `orders/${orderId}`;
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
    throw error;
  }
}

export async function setCustomerAdminRole(
  targetUser: UserProfile,
  makeAdmin: boolean
): Promise<void> {
  const currentUid = auth.currentUser?.uid;
  if (!currentUid) throw new Error('Authentication required.');
  if (targetUser.uid === currentUid && !makeAdmin) {
    throw new Error('You cannot revoke your own administrator access.');
  }

  const batch = writeBatch(db);
  const userRef = doc(db, 'users', targetUser.uid);
  const adminRef = doc(db, 'admins', targetUser.uid);

  if (makeAdmin) {
    batch.set(adminRef, {
      uid: targetUser.uid,
      email: targetUser.email,
      grantedBy: currentUid,
      createdAt: serverTimestamp(),
    });
    batch.update(userRef, {
      role: 'admin',
      updatedAt: serverTimestamp(),
    });
  } else {
    batch.delete(adminRef);
    batch.update(userRef, {
      role: 'customer',
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.WRITE, `admins/${targetUser.uid}`);
    }
    throw error;
  }
}
