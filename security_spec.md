# Security Specification & Payload-First TDD

## 1. Data Invariants
1. **Identity Isolation**: Users can only read, create, and update their own `/users/{userId}` and `/carts/{userId}` documents. No user can read another customer's PII (`email`, `phone`, `defaultAddress`) or list `/users` unless they are an authenticated, verified administrator (`isAdmin()`).
2. **Privilege Escalation Prevention**: A customer cannot create a `/users/{userId}` profile with `role: "admin"`, cannot update their own `role` field, and cannot write to `/admins/{userId}`. Only the bootstrapped admin (`kiranmanju2007@gmail.com` with `email_verified == true`) or existing admins listed in `/admins/{uid}` may grant or exercise admin privileges.
3. **Catalog Integrity**: Only admins can create or delete `/products/{productId}` and `/categories/{categoryId}`, or modify product metadata (`price`, `name`, `sku`, `description`). Customers can ONLY decrement `products/{productId}.stock` in an atomic transaction that simultaneously creates a matching `/orders/{orderId}` owned by `request.auth.uid` at `request.time`.
4. **Order Integrity & Terminal State Locking**: Orders can only be created with `status == "pending"`, `userId == request.auth.uid`, valid non-empty bounded `items` (`1..50`), and server timestamps (`request.time`). Customers cannot mutate order status, totals, or items after creation. Admins can update order `status` (except once cancelled/delivered, unless explicitly corrected by admin).
5. **Path & Volumetric Hardening**: All document IDs match `^[a-zA-Z0-9_\-]+$` (`<= 128` chars), all strings enforce explicit `.size()` bounds, and all arrays enforce strict `.size() <= 50` upper limits.

## 2. The "Dirty Dozen" Adversarial Payloads

| # | Attack Vector | Target Collection | Malicious Payload / Operation | Expected Result |
|---|---------------|-------------------|-------------------------------|-----------------|
| 1 | Self-Admin Escalation on Signup | `/users/attacker` | `create({ uid: "attacker", name: "Eve", email: "eve@test.com", role: "admin", ... })` | `PERMISSION_DENIED` |
| 2 | Role Tampering on Update | `/users/attacker` | `update({ role: "admin", updatedAt: serverTimestamp() })` | `PERMISSION_DENIED` |
| 3 | Ghost / Shadow Field Injection | `/users/attacker` | `create({ ..., isSuperUser: true })` | `PERMISSION_DENIED` |
| 4 | Unverified Email Admin Spoof | `/products/p1` | Auth email `kiranmanju2007@gmail.com` with `email_verified: false` attempting product write | `PERMISSION_DENIED` |
| 5 | Cross-User PII Read | `/users/victim` | Authenticated `attacker` calling `get(/users/victim)` or `list(/users)` | `PERMISSION_DENIED` |
| 6 | Unauthorized Product Creation | `/products/fake` | Non-admin customer calling `set(/products/fake, ...)` | `PERMISSION_DENIED` |
| 7 | Price Manipulation on Order Update | `/orders/ord_1` | Customer calling `update({ total: 0.01 })` on existing order | `PERMISSION_DENIED` |
| 8 | Arbitrary Stock Wipeout (No Order) | `/products/p1` | Customer calling `update({ stock: 0, lastOrderId: "nonexistent", updatedAt: serverTimestamp() })` without atomic order creation | `PERMISSION_DENIED` |
| 9 | Forged Order Owner Spoofing | `/orders/ord_2` | Attacker creating order with `userId: "victim_uid"` | `PERMISSION_DENIED` |
| 10 | Order Status Skip on Create | `/orders/ord_3` | Customer creating order directly with `status: "delivered"` | `PERMISSION_DENIED` |
| 11 | ID Poisoning / Resource Exhaustion | `/carts/<1500-char-id>` | Creating document with oversized or invalid-character document ID | `PERMISSION_DENIED` |
| 12 | Cross-User Order List Scraping | `/orders` | Non-admin querying `collection(db, "orders")` without `where("userId", "==", auth.uid)` | `PERMISSION_DENIED` |
