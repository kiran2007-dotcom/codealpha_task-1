/**
 * Payload-First Security TDD Spec for Firestore Rules
 * Verifies all "Dirty Dozen" adversarial payloads against firestore.rules logic.
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  collection: string;
  operation: 'create' | 'update' | 'get' | 'list' | 'delete';
  auth: {
    uid: string;
    email: string;
    email_verified: boolean;
  } | null;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
  enforcedByRule: string;
}

export const DIRTY_DOZEN_CASES: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Self-Admin Escalation on Signup',
    collection: 'users/attacker_uid',
    operation: 'create',
    auth: { uid: 'attacker_uid', email: 'eve@example.com', email_verified: true },
    payload: { uid: 'attacker_uid', name: 'Eve', email: 'eve@example.com', role: 'admin' },
    expected: 'PERMISSION_DENIED',
    enforcedByRule: 'incoming().role == "customer"',
  },
  {
    id: 2,
    name: 'Role Tampering on Update',
    collection: 'users/attacker_uid',
    operation: 'update',
    auth: { uid: 'attacker_uid', email: 'eve@example.com', email_verified: true },
    payload: { role: 'admin' },
    expected: 'PERMISSION_DENIED',
    enforcedByRule: 'affectedKeys().hasOnly(["name", "phone", "defaultAddress", "updatedAt"])',
  },
  {
    id: 3,
    name: 'Shadow Field Injection',
    collection: 'users/attacker_uid',
    operation: 'create',
    auth: { uid: 'attacker_uid', email: 'eve@example.com', email_verified: true },
    payload: { uid: 'attacker_uid', name: 'Eve', email: 'eve@example.com', role: 'customer', isSuperUser: true },
    expected: 'PERMISSION_DENIED',
    enforcedByRule: 'data.keys().hasOnly([...])',
  },
  {
    id: 4,
    name: 'Unverified Email Admin Spoof',
    collection: 'products/prod_1',
    operation: 'create',
    auth: { uid: 'spoof_uid', email: 'kiranmanju2007@gmail.com', email_verified: false },
    payload: { id: 'prod_1', name: 'Spoof Item', price: 10 },
    expected: 'PERMISSION_DENIED',
    enforcedByRule: 'request.auth.token.email_verified == true in isBootstrappedAdmin()',
  },
  {
    id: 5,
    name: 'Cross-User PII Read',
    collection: 'users/victim_uid',
    operation: 'get',
    auth: { uid: 'attacker_uid', email: 'eve@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
    enforcedByRule: 'isOwner(userId) || isAdmin()',
  },
  {
    id: 6,
    name: 'Unauthorized Product Creation',
    collection: 'products/fake_prod',
    operation: 'create',
    auth: { uid: 'customer_uid', email: 'user@example.com', email_verified: true },
    payload: { id: 'fake_prod', name: 'Fake', price: 1, stock: 10 },
    expected: 'PERMISSION_DENIED',
    enforcedByRule: 'isAdmin()',
  },
  {
    id: 7,
    name: 'Price Manipulation on Order Update',
    collection: 'orders/ord_1',
    operation: 'update',
    auth: { uid: 'customer_uid', email: 'user@example.com', email_verified: true },
    payload: { total: 0.01 },
    expected: 'PERMISSION_DENIED',
    enforcedByRule: 'allow update: if isSignedIn() && isAdmin() && ...',
  },
  {
    id: 8,
    name: 'Arbitrary Stock Wipeout Without Atomic Order',
    collection: 'products/prod_1',
    operation: 'update',
    auth: { uid: 'attacker_uid', email: 'eve@example.com', email_verified: true },
    payload: { stock: 0, lastOrderId: 'nonexistent_order' },
    expected: 'PERMISSION_DENIED',
    enforcedByRule: 'existsAfter(/databases/$(database)/documents/orders/$(incoming().lastOrderId))',
  },
  {
    id: 9,
    name: 'Forged Order Owner Spoofing',
    collection: 'orders/ord_2',
    operation: 'create',
    auth: { uid: 'attacker_uid', email: 'eve@example.com', email_verified: true },
    payload: { orderId: 'ord_2', userId: 'victim_uid', status: 'pending' },
    expected: 'PERMISSION_DENIED',
    enforcedByRule: 'incoming().userId == request.auth.uid',
  },
  {
    id: 10,
    name: 'Order Status Skip on Create',
    collection: 'orders/ord_3',
    operation: 'create',
    auth: { uid: 'customer_uid', email: 'user@example.com', email_verified: true },
    payload: { orderId: 'ord_3', userId: 'customer_uid', status: 'delivered' },
    expected: 'PERMISSION_DENIED',
    enforcedByRule: 'incoming().status == "pending"',
  },
  {
    id: 11,
    name: 'ID Poisoning Attack',
    collection: `carts/${'a'.repeat(200)}`,
    operation: 'create',
    auth: { uid: 'customer_uid', email: 'user@example.com', email_verified: true },
    payload: { userId: 'customer_uid', items: [] },
    expected: 'PERMISSION_DENIED',
    enforcedByRule: 'isValidId(userId) && userId.size() <= 128',
  },
  {
    id: 12,
    name: 'Cross-User Order List Scraping',
    collection: 'orders',
    operation: 'list',
    auth: { uid: 'attacker_uid', email: 'eve@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
    enforcedByRule: 'resource.data.userId == request.auth.uid || isAdmin()',
  },
];
