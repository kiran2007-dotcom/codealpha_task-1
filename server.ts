import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface FirebaseAppletConfig {
  projectId: string;
  firestoreDatabaseId?: string;
}

const configPath = path.join(__dirname, 'firebase-applet-config.json');
let firebaseConfig: FirebaseAppletConfig = { projectId: '' };
if (fs.existsSync(configPath)) {
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as FirebaseAppletConfig;
  } catch {
    firebaseConfig = { projectId: '' };
  }
}

interface VerifiedFirebaseUser {
  uid: string;
  email?: string;
  emailVerified: boolean;
  name?: string;
}

interface RequestWithUser extends Request {
  firebaseUser?: VerifiedFirebaseUser;
}

let cachedCerts: Record<string, string> = {};
let certsExpiresAt = 0;

async function getFirebasePublicCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (now < certsExpiresAt && Object.keys(cachedCerts).length > 0) {
    return cachedCerts;
  }
  const response = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  if (!response.ok) {
    throw new Error('Unable to retrieve Firebase public signing certificates.');
  }
  const cacheControl = response.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeSeconds = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;
  cachedCerts = (await response.json()) as Record<string, string>;
  certsExpiresAt = now + maxAgeSeconds * 1000;
  return cachedCerts;
}

function decodeBase64Url(segment: string): Buffer {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + '='.repeat(padLength), 'base64');
}

async function verifyFirebaseIdToken(token: string): Promise<VerifiedFirebaseUser> {
  if (!firebaseConfig.projectId) {
    throw new Error('Firebase project configuration is missing.');
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed Firebase ID token.');
  }
  const [headerB64, payloadB64, signatureB64] = parts;
  const header = JSON.parse(decodeBase64Url(headerB64).toString('utf-8')) as {
    alg?: string;
    kid?: string;
  };
  const payload = JSON.parse(decodeBase64Url(payloadB64).toString('utf-8')) as {
    aud?: string;
    iss?: string;
    sub?: string;
    exp?: number;
    iat?: number;
    email?: string;
    email_verified?: boolean;
    name?: string;
  };

  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Invalid token algorithm or key identifier.');
  }
  if (payload.aud !== firebaseConfig.projectId) {
    throw new Error('Token audience mismatch.');
  }
  if (payload.iss !== `https://securetoken.google.com/${firebaseConfig.projectId}`) {
    throw new Error('Token issuer mismatch.');
  }
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp <= nowSeconds) {
    throw new Error('Firebase ID token has expired.');
  }
  if (!payload.iat || payload.iat > nowSeconds + 60) {
    throw new Error('Token issued-at timestamp is invalid.');
  }
  if (!payload.sub || typeof payload.sub !== 'string' || payload.sub.length > 128) {
    throw new Error('Token subject is invalid.');
  }

  const certs = await getFirebasePublicCerts();
  const certPem = certs[header.kid];
  if (!certPem) {
    throw new Error('Signing certificate not found for token key ID.');
  }

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();
  const signature = decodeBase64Url(signatureB64);
  const isValid = verifier.verify(certPem, signature);
  if (!isValid) {
    throw new Error('Token signature verification failed.');
  }

  return {
    uid: payload.sub,
    email: payload.email,
    emailVerified: Boolean(payload.email_verified),
    name: payload.name,
  };
}

async function requireFirebaseAuth(req: RequestWithUser, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication token is required.' });
    return;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  try {
    req.firebaseUser = await verifyFirebaseIdToken(token);
    next();
  } catch (error) {
    res.status(401).json({
      error: error instanceof Error ? error.message : 'Invalid or expired authentication token.',
    });
  }
}

interface IdempotencyEntry {
  orderId: string;
  userId: string;
  createdAt: number;
}

const idempotencyRegistry = new Map<string, IdempotencyEntry>();
const IDEMPOTENCY_TTL_MS = 15 * 60 * 1000;

function cleanupIdempotencyRegistry() {
  const cutoff = Date.now() - IDEMPOTENCY_TTL_MS;
  for (const [key, entry] of idempotencyRegistry.entries()) {
    if (entry.createdAt < cutoff) {
      idempotencyRegistry.delete(key);
    }
  }
}

function generateOrderId(): string {
  const now = new Date();
  const datePart = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, '0'),
    String(now.getUTCDate()).padStart(2, '0'),
  ].join('');
  const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `KF-${datePart}-${randomHex}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'kastle-and-form-api',
      firebaseConfigured: Boolean(firebaseConfig.projectId),
      timestamp: new Date().toISOString(),
    });
  });

  app.post('/api/checkout/prepare', requireFirebaseAuth, (req: RequestWithUser, res: Response) => {
    cleanupIdempotencyRegistry();

    const user = req.firebaseUser!;
    const {
      idempotencyKey,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      items,
      paymentMethod,
    } = req.body as {
      idempotencyKey?: string;
      customerName?: string;
      customerEmail?: string;
      customerPhone?: string;
      shippingAddress?: {
        line1?: string;
        line2?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
      };
      items?: Array<{ productId?: string; quantity?: number }>;
      paymentMethod?: string;
    };

    if (!idempotencyKey || typeof idempotencyKey !== 'string' || idempotencyKey.length < 8 || idempotencyKey.length > 128) {
      res.status(400).json({ error: 'Valid checkout idempotency key is required.' });
      return;
    }

    if (!customerName || customerName.trim().length < 2 || customerName.trim().length > 100) {
      res.status(400).json({ error: 'Customer full name must be between 2 and 100 characters.' });
      return;
    }

    if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
      res.status(400).json({ error: 'A valid customer email address is required.' });
      return;
    }

    if (!customerPhone || customerPhone.trim().length < 5 || customerPhone.trim().length > 30) {
      res.status(400).json({ error: 'A valid contact phone number is required.' });
      return;
    }

    if (
      !shippingAddress ||
      !shippingAddress.line1 ||
      shippingAddress.line1.trim().length < 2 ||
      !shippingAddress.city ||
      shippingAddress.city.trim().length < 1 ||
      !shippingAddress.state ||
      shippingAddress.state.trim().length < 1 ||
      !shippingAddress.postalCode ||
      shippingAddress.postalCode.trim().length < 2 ||
      !shippingAddress.country ||
      shippingAddress.country.trim().length < 2
    ) {
      res.status(400).json({ error: 'Complete shipping address details are required.' });
      return;
    }

    if (!Array.isArray(items) || items.length < 1 || items.length > 50) {
      res.status(400).json({ error: 'Checkout requires between 1 and 50 line items.' });
      return;
    }

    for (const item of items) {
      if (
        !item.productId ||
        typeof item.productId !== 'string' ||
        !/^[a-zA-Z0-9_-]+$/.test(item.productId) ||
        typeof item.quantity !== 'number' ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 99
      ) {
        res.status(400).json({ error: 'Invalid product ID or quantity in checkout items.' });
        return;
      }
    }

    if (paymentMethod !== 'card_standard' && paymentMethod !== 'cash_on_delivery') {
      res.status(400).json({ error: 'Unsupported payment method selected.' });
      return;
    }

    const compositeKey = `${user.uid}:${idempotencyKey}`;
    const existingEntry = idempotencyRegistry.get(compositeKey);
    if (existingEntry) {
      res.json({
        orderId: existingEntry.orderId,
        uid: user.uid,
        freeShippingThreshold: 250,
        standardShippingCost: 18,
        verifiedAt: new Date(existingEntry.createdAt).toISOString(),
        idempotentReplay: true,
      });
      return;
    }

    const orderId = generateOrderId();
    idempotencyRegistry.set(compositeKey, {
      orderId,
      userId: user.uid,
      createdAt: Date.now(),
    });

    res.json({
      orderId,
      uid: user.uid,
      freeShippingThreshold: 250,
      standardShippingCost: 18,
      verifiedAt: new Date().toISOString(),
      idempotentReplay: false,
    });
  });

  app.post('/api/orders/receipt', requireFirebaseAuth, (req: RequestWithUser, res: Response) => {
    const user = req.firebaseUser!;
    const { order } = req.body as {
      order?: {
        orderId?: string;
        userId?: string;
        customerName?: string;
        customerEmail?: string;
        customerPhone?: string;
        shippingAddress?: {
          line1: string;
          line2?: string;
          city: string;
          state: string;
          postalCode: string;
          country: string;
        };
        items?: Array<{ name: string; price: number; quantity: number; lineTotal: number }>;
        subtotal?: number;
        shippingCost?: number;
        total?: number;
        status?: string;
        paymentMethod?: string;
        createdAtIso?: string;
      };
    };

    if (!order || !order.orderId || !order.userId || !Array.isArray(order.items)) {
      res.status(400).json({ error: 'Order payload is incomplete.' });
      return;
    }

    const isBootstrapAdmin =
      user.email === 'kiranmanju2007@gmail.com' && user.emailVerified;
    if (order.userId !== user.uid && !isBootstrapAdmin) {
      res.status(403).json({ error: 'You are not authorized to generate this receipt.' });
      return;
    }

    const rowsHtml = order.items
      .map(
        (item) => `
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #e4e4e7;">${escapeHtml(item.name)}</td>
            <td style="padding:10px 0;border-bottom:1px solid #e4e4e7;text-align:right;">${item.quantity}</td>
            <td style="padding:10px 0;border-bottom:1px solid #e4e4e7;text-align:right;">$${Number(item.price).toFixed(2)}</td>
            <td style="padding:10px 0;border-bottom:1px solid #e4e4e7;text-align:right;">$${Number(item.lineTotal).toFixed(2)}</td>
          </tr>
        `
      )
      .join('');

    const addr = order.shippingAddress;
    const addressLine = addr
      ? `${escapeHtml(addr.line1)}${addr.line2 ? `, ${escapeHtml(addr.line2)}` : ''}<br/>${escapeHtml(addr.city)}, ${escapeHtml(addr.state)} ${escapeHtml(addr.postalCode)}<br/>${escapeHtml(addr.country)}`
      : '';

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Receipt ${escapeHtml(order.orderId)} — Kastle &amp; Form</title>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#18181b;max-width:720px;margin:40px auto;padding:24px;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #18181b;padding-bottom:16px;margin-bottom:24px;">
    <div>
      <h1 style="margin:0;font-size:20px;letter-spacing:0.04em;">KASTLE &amp; FORM</h1>
      <p style="margin:4px 0 0;color:#71717a;font-size:13px;">Architectural Goods &amp; Modern Objects</p>
    </div>
    <div style="text-align:right;font-size:13px;">
      <strong>Order ${escapeHtml(order.orderId)}</strong><br/>
      <span style="color:#71717a;">Date: ${escapeHtml(order.createdAtIso || new Date().toISOString())}</span><br/>
      <span style="color:#71717a;">Status: ${escapeHtml((order.status || 'pending').toUpperCase())}</span>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px;font-size:13px;">
    <div>
      <div style="color:#71717a;text-transform:uppercase;font-size:11px;margin-bottom:4px;">Customer</div>
      <strong>${escapeHtml(order.customerName || '')}</strong><br/>
      ${escapeHtml(order.customerEmail || '')}<br/>
      ${escapeHtml(order.customerPhone || '')}
    </div>
    <div>
      <div style="color:#71717a;text-transform:uppercase;font-size:11px;margin-bottom:4px;">Shipping Address</div>
      ${addressLine}
    </div>
  </div>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px;">
    <thead>
      <tr style="border-bottom:1px solid #18181b;text-align:left;">
        <th style="padding:8px 0;">Item</th>
        <th style="padding:8px 0;text-align:right;">Qty</th>
        <th style="padding:8px 0;text-align:right;">Unit Price</th>
        <th style="padding:8px 0;text-align:right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
  <div style="margin-left:auto;max-width:260px;font-size:13px;">
    <div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Subtotal</span><span>$${Number(order.subtotal || 0).toFixed(2)}</span></div>
    <div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Shipping</span><span>$${Number(order.shippingCost || 0).toFixed(2)}</span></div>
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-top:1px solid #18181b;font-weight:700;font-size:15px;"><span>Total</span><span>$${Number(order.total || 0).toFixed(2)}</span></div>
  </div>
</body>
</html>`;

    res.json({ html, filename: `receipt-${order.orderId}.html` });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kastle & Form server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
