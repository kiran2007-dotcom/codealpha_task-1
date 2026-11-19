import { useStore } from '../context/StoreContext';

export function Footer() {
  const { setActiveView, openCatalogFiltered, categories, firebaseUser, openAuthModal } =
    useStore();

  return (
    <footer className="border-t border-white/10 bg-zinc-900/95 backdrop-blur-2xl text-zinc-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-10 border-b border-zinc-800">
          <div className="md:col-span-5">
            <p className="font-display text-lg font-bold tracking-tight text-white mb-3">
              KASTLE &amp; FORM
            </p>
            <p className="text-sm text-zinc-400 max-w-sm leading-relaxed">
              Architectural lighting, precision studio audio, workspace hardware, espresso instruments, smoked oak seating, and travel carry built for enduring utility.
            </p>
          </div>

          <div className="md:col-span-3 space-y-2.5 text-sm">
            <p className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
              Departments
            </p>
            <button
              type="button"
              onClick={() =>
                openCatalogFiltered({
                  categoryId: 'all',
                  search: '',
                  onlyNewArrivals: false,
                })
              }
              className="block text-zinc-300 hover:text-white cursor-pointer"
            >
              All Products
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => openCatalogFiltered({ categoryId: cat.id, search: '' })}
                className="block text-zinc-300 hover:text-white cursor-pointer"
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="md:col-span-4 space-y-2.5 text-sm">
            <p className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
              Customer Care
            </p>
            <button
              type="button"
              onClick={() => setActiveView('wishlist')}
              className="block text-zinc-300 hover:text-white cursor-pointer"
            >
              Saved Items &amp; Wishlist
            </button>
            <button
              type="button"
              onClick={() =>
                firebaseUser ? setActiveView('orders') : openAuthModal('login', 'orders')
              }
              className="block text-zinc-300 hover:text-white cursor-pointer"
            >
              Order Tracking &amp; History
            </button>
            <button
              type="button"
              onClick={() =>
                firebaseUser ? setActiveView('account') : openAuthModal('login', 'account')
              }
              className="block text-zinc-300 hover:text-white cursor-pointer"
            >
              Account Profile
            </button>
            <p className="text-xs text-zinc-500 pt-2">
              Studio Support: support@kastleandform.example
            </p>
          </div>
        </div>

        <div className="pt-8 flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-500">
          <p>&copy; {new Date().getFullYear()} Kastle &amp; Form Studio. All rights reserved.</p>
          <p>CodeAlpha Full-Stack E-Commerce Submission</p>
        </div>
      </div>
    </footer>
  );
}
