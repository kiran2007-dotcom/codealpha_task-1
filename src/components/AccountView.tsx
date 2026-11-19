import React, { useEffect, useState } from 'react';
import { sendEmailVerification } from 'firebase/auth';
import { Lock, LogOut, RefreshCw } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { auth } from '../lib/firebase';
import { updateCustomerProfile } from '../services/storeService';

export function AccountView() {
  const {
    firebaseUser,
    userProfile,
    isAdmin,
    openAuthModal,
    logout,
    pushToast,
    setActiveView,
    refreshAdminState,
    updateDeliveryLocation,
  } = useStore();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [stateRegion, setStateRegion] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('United States');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || '');
      setPhone(userProfile.phone || '');
      setLine1(userProfile.defaultAddress?.line1 || '');
      setLine2(userProfile.defaultAddress?.line2 || '');
      setCity(userProfile.defaultAddress?.city || '');
      setStateRegion(userProfile.defaultAddress?.state || '');
      setPostalCode(userProfile.defaultAddress?.postalCode || '');
      setCountry(userProfile.defaultAddress?.country || 'United States');
    }
  }, [userProfile]);

  if (!firebaseUser) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="glass-panel rounded-3xl p-10">
          <Lock className="w-8 h-8 text-zinc-400 mx-auto mb-4" />
          <h1 className="font-display text-2xl font-semibold text-zinc-900 mb-2">
            Account Access Protected
          </h1>
          <p className="text-sm text-zinc-600 mb-6">
            Sign in to manage your profile details, default shipping address, and order preferences.
          </p>
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="px-6 py-3 rounded-xl bg-zinc-900 text-white text-sm font-medium cursor-pointer"
          >
            Sign In / Register
          </button>
        </div>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const anyAddressField = Boolean(
        line1.trim() || line2.trim() || city.trim() || stateRegion.trim() || postalCode.trim()
      );
      const hasCompleteAddress = Boolean(
        line1.trim().length >= 2 &&
          city.trim().length >= 1 &&
          stateRegion.trim().length >= 1 &&
          postalCode.trim().length >= 2 &&
          country.trim().length >= 2
      );
      if (anyAddressField && !hasCompleteAddress) {
        pushToast(
          'To save a shipping address, please complete street, city, state, postal code, and country.',
          'error'
        );
        setSaving(false);
        return;
      }

      await updateCustomerProfile(firebaseUser.uid, {
        name: name.trim(),
        phone: phone.trim(),
        ...(hasCompleteAddress
          ? {
              defaultAddress: {
                line1: line1.trim(),
                ...(line2.trim() ? { line2: line2.trim() } : {}),
                city: city.trim(),
                state: stateRegion.trim(),
                postalCode: postalCode.trim(),
                country: country.trim(),
              },
            }
          : {}),
      });
      if (hasCompleteAddress) {
        updateDeliveryLocation({ city: city.trim(), postalCode: postalCode.trim() });
      }
      pushToast('Account profile updated.', 'success');
    } catch (err) {
      pushToast(
        err instanceof Error ? err.message : 'Unable to save profile.',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      await sendEmailVerification(firebaseUser);
      pushToast('Verification email sent. Check your inbox.', 'success');
    } catch (err) {
      pushToast(
        err instanceof Error ? err.message : 'Could not send verification email.',
        'error'
      );
    }
  };

  const handleRefreshVerification = async () => {
    await auth.currentUser?.reload();
    await refreshAdminState();
    pushToast(
      auth.currentUser?.emailVerified
        ? 'Email verification confirmed.'
        : 'Email is still pending verification.',
      auth.currentUser?.emailVerified ? 'success' : 'neutral'
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="glass-panel rounded-3xl p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">
            Account Profile
          </p>
          <h1 className="font-display text-3xl font-semibold text-zinc-900 tracking-tight">
            {userProfile?.name || firebaseUser.displayName || 'Customer Account'}
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            {firebaseUser.email} · {isAdmin ? 'Administrator' : 'Customer'} ·{' '}
            {firebaseUser.emailVerified ? 'Verified Email' : 'Unverified Email'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveView('admin')}
              className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-medium cursor-pointer"
            >
              Open Admin Dashboard
            </button>
          )}
          <button
            type="button"
            onClick={logout}
            className="px-4 py-2 rounded-xl glass-subtle text-zinc-900 text-xs font-medium inline-flex items-center gap-2 hover:bg-white/90 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {!firebaseUser.emailVerified && (
        <div className="mb-6 p-4 rounded-2xl glass-panel flex flex-wrap items-center justify-between gap-4 text-xs">
          <p className="text-zinc-700">
            Verify your email address to unlock full account verification status.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleResendVerification}
              className="underline underline-offset-4 font-medium text-zinc-900 cursor-pointer"
            >
              Resend Verification Email
            </button>
            <button
              type="button"
              onClick={handleRefreshVerification}
              className="px-3 py-1.5 rounded-lg glass-subtle inline-flex items-center gap-1.5 text-zinc-900 font-medium cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Check Status</span>
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
        <h2 className="font-display text-lg font-semibold text-zinc-900">
          Personal &amp; Shipping Details
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 234-5678"
              className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              Street Address
            </label>
            <input
              type="text"
              value={line1}
              onChange={(e) => setLine1(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              Apartment / Suite (Optional)
            </label>
            <input
              type="text"
              value={line2}
              onChange={(e) => setLine2(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              City
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              State / Province
            </label>
            <input
              type="text"
              value={stateRegion}
              onChange={(e) => setStateRegion(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              Postal Code
            </label>
            <input
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              Country
            </label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 shadow-[0_10px_24px_-8px_rgba(24,24,27,0.45)] transition-all disabled:opacity-50 cursor-pointer"
        >
          {saving ? 'Saving Changes...' : 'Save Account Details'}
        </button>
      </form>
    </div>
  );
}
