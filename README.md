# Kastle & Form — Full-Stack E-Commerce Store

A full-stack e-commerce web application built for the **CodeAlpha Software Development Internship** using **React + TypeScript**, **Tailwind CSS**, **Node.js + Express**, **Firebase Authentication**, **Cloud Firestore**, and **Firebase Storage**.

---

## Project Structure

```text
├── firebase-applet-config.json   # Provisioned Firebase client configuration
├── firebase-blueprint.json       # Firestore entity & collection schema blueprint
├── firestore.rules               # Hardened Zero-Trust Firestore security rules
├── firestore.rules.test.ts       # "Dirty Dozen" adversarial security rules test spec
├── security_spec.md              # Security invariants & threat model documentation
├── eslint.config.js              # ESLint security rules validator config
├── server.ts                     # Node.js + Express API & Vite SSR/static server
├── index.html                    # Entry HTML with typography & metadata
├── package.json                  # Dependencies and npm scripts
└── src/
    ├── App.tsx                   # Application shell & view router
    ├── index.css                 # Tailwind CSS v4 & typography tokens
    ├── types/
    │   └── store.ts              # Shared TypeScript interfaces & schema limits
    ├── lib/
    │   └── firebase.ts           # Firebase SDK init, connection probe & error handler
    ├── data/
    │   └── seedCatalog.ts        # Clearly labeled initial demo/seed catalog
    ├── services/
    │   └── storeService.ts       # Firestore transactions, Storage uploads & API calls
    ├── context/
    │   └── StoreContext.tsx      # Auth, cart sync, catalog subscriptions & navigation
    ├── utils/
    │   └── formatters.ts         # Currency, date, slug & password validation helpers
    └── components/
        ├── Header.tsx            # Responsive 3-zone navigation, search & live bag count
        ├── HomeView.tsx          # Hero, categories, featured products & new arrivals
        ├── CatalogView.tsx       # Search, category tabs, availability & price sorting
        ├── ProductCard.tsx       # Clean product card with live stock status
        ├── ProductDetailView.tsx # Product detail page with stock-bounded purchase module
        ├── ProductImage.tsx      # Resilient image frame with fallback container
        ├── CartDrawer.tsx        # Persistent shopping bag drawer
        ├── AuthModal.tsx         # Email/Password registration/login & Google Sign-In
        ├── CheckoutView.tsx      # Protected checkout with atomic transaction stock lock
        ├── OrdersView.tsx        # Customer order history & downloadable HTML receipt
        ├── AccountView.tsx       # Protected customer profile & shipping address settings
        ├── AdminDashboard.tsx    # Protected admin console (inventory, orders, users)
        ├── ErrorBoundary.tsx     # Global error boundary with structured Firestore diagnostics
        ├── ToastContainer.tsx    # Transient notification feedback
        └── Footer.tsx            # Storefront footer
```

---

## Installation & Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Environment configuration**:
   Ensure `firebase-applet-config.json` is present in the project root (generated automatically via AI Studio Firebase provisioning, or copied from your Firebase Web App settings).

3. **Run the full-stack development server** (Express API + Vite on port `3000`):
   ```bash
   npm run dev
   ```

4. **Type-check and build for production**:
   ```bash
   npm run lint
   npm run build
   npm start
   ```

---

## Firebase Configuration Instructions

1. **Firebase Authentication**:
   - **Google Sign-In** is enabled automatically when provisioned through AI Studio.
   - **Email / Password Sign-In**: To enable customer registration and login with email/password, open your [Firebase Console](https://console.firebase.google.com/), go to **Authentication → Sign-in method**, click **Email/Password**, enable it, and save.

2. **Cloud Firestore & Security Rules**:
   - The database uses a named Firestore database (`firestoreDatabaseId` in `firebase-applet-config.json`).
   - Validate the rules locally using ESLint:
     ```bash
     npx eslint firestore.rules
     ```
   - Deploy `firestore.rules` via Firebase CLI (or AI Studio's `DeployRules` action):
     ```bash
     firebase deploy --only firestore:rules
     ```

3. **Firebase Storage (Product Images)**:
   - Open **Storage** in the Firebase Console and initialize your default bucket (`storageBucket` in `firebase-applet-config.json`).
   - Recommended Storage security rules:
     ```text
     rules_version = '2';
     service firebase.storage {
       match /b/{bucket}/o {
         match /products/{productId}/{fileName} {
           allow read: if true;
           allow write: if request.auth != null && request.resource.size < 5 * 1024 * 1024 && request.resource.contentType.matches('image/.*');
         }
       }
     }
     ```

---

## Database Structure (Cloud Firestore)

| Collection | Document ID | Description |
| :--- | :--- | :--- |
| `users` | `{userId}` | Customer profile (`uid`, `name`, `email`, `role`, `phone`, `defaultAddress`, `createdAt`, `updatedAt`). Isolated per owner or admin. |
| `admins` | `{userId}` | Authoritative admin RBAC anchor checked via `exists()` in `firestore.rules`. |
| `categories` | `{categoryId}` | Storefront categories (`id`, `name`, `slug`, `description`, `displayOrder`). Public read, admin write. |
| `products` | `{productId}` | Catalog items (`id`, `name`, `slug`, `description`, `price`, `stock`, `categoryId`, `categoryName`, `imageUrl`, `featured`, `isNewArrival`, `sku`, `specs`, `lastOrderId`). Public read; admin write; atomic stock deduction during verified customer checkout transactions. |
| `carts` | `{userId}` | Persistent shopping bag (`userId`, `items: [{ productId, quantity }]`, `updatedAt`). Strictly private to the owner. |
| `orders` | `{orderId}` | Immutable order records (`orderId`, `userId`, `customerName`, `customerEmail`, `customerPhone`, `shippingAddress`, `items`, `subtotal`, `shippingCost`, `total`, `status`, `paymentMethod`, `createdAt`, `updatedAt`). Owner read/create; admin read/status-update. |

---

## Admin Setup Instructions

Administrator permissions are enforced server-side in `firestore.rules` (never via client-only state):
1. **Bootstrapped Admin**: Sign in with the project's verified primary administrator email configured in `firestore.rules` (`kiranmanju2007@gmail.com` with `email_verified == true`).
2. **Initial Catalog Seed**: When signing in as Admin while Firestore `products` is empty, click **Seed Demo Catalog to Firestore** (or **Initialize Firestore Catalog**) to populate the 4 starter categories and 6 products.
3. **Granting Additional Admins**: Inside **Admin Dashboard → Customers**, an existing Admin can click **Make Admin** on any registered customer, which atomically writes `/admins/{uid}` and updates `/users/{uid}`.

---

## Backend API Endpoints (`server.ts`)

- `GET /api/health` — Returns API status and Firebase configuration readiness.
- `POST /api/checkout/prepare` — Requires `Authorization: Bearer <Firebase_ID_Token>`. Cryptographically verifies the Firebase ID token against Google's public X509 certificates, validates shipping/item payloads, enforces checkout idempotency keys, and generates a unique `KF-YYYYMMDD-XXXXXXXX` order ID before the atomic Firestore transaction commits.
- `POST /api/orders/receipt` — Requires `Authorization: Bearer <Firebase_ID_Token>`. Verifies order ownership and generates a downloadable HTML receipt.

---

## Testing Checklist

- [ ] **Authentication**: Register a new customer with password validation (8+ chars, upper, lower, number), log out, log back in, and test Google Sign-In.
- [ ] **Catalog & Search**: Search by product name/SKU, filter by category, toggle New Arrivals / In Stock Only, and sort by newest or price.
- [ ] **Product Details**: Open a product detail page, inspect specifications, and verify quantity cannot exceed available stock.
- [ ] **Shopping Bag**: Add items, increment/decrement quantities, remove items, refresh page to verify cart persistence, and merge guest cart on login.
- [ ] **Atomic Checkout & Stock Deduction**: Place an order, confirm unique `KF-...` Order ID and receipt download, verify product stock decreased in Firestore, and confirm duplicate double-clicks do not create duplicate orders.
- [ ] **Order History**: View past orders in `/orders`, inspect shipping details, and download receipt.
- [ ] **Admin Access Control**: Confirm standard customers cannot access Admin actions (and Firestore rules reject non-admin mutations); confirm Admins can add/edit/delete products, upload images, adjust stock, manage categories, update order statuses, and view live revenue totals.
- [ ] **Responsive Layout**: Verify layout integrity across desktop (`1440px`), tablet (`768px`), and mobile (`375px`).
