import React, { useState } from 'react';

/**
 * A small dialog for mobile screens: user can pick filters.
 */
function MobileFiltersDialog({
  open,
  onClose,
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  selectedSupplier,
  setSelectedSupplier,
  bioOnly,
  setBioOnly,
  distinctCategories,
  distinctSuppliers,
}) {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Filtrer</h2>
        </div>
        
        <div className="p-4 max-h-[70vh] overflow-y-auto">
          <div className="mb-4">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Rechercher
            </label>
            <input
              id="search"
              type="text"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Catégorie
            </label>
            <select
              id="category"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">Toutes</option>
              {distinctCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label htmlFor="supplier" className="block text-sm font-medium text-gray-700 mb-1">
              Fournisseur
            </label>
            <select
              id="supplier"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
            >
              <option value="">Tous</option>
              {distinctSuppliers.map((sup) => (
                <option key={sup} value={sup}>
                  {sup}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <input
              id="bio-only"
              type="checkbox"
              className="h-4 w-4 text-green-600 border-gray-300 rounded"
              checked={bioOnly}
              onChange={(e) => setBioOnly(e.target.checked)}
            />
            <label htmlFor="bio-only" className="ml-2 block text-sm text-gray-700">
              Bio seulement
            </label>
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * FilterBar decides:
 * - On mobile: show a single "Filtrer" button -> opens MobileFiltersDialog
 * - On larger screens: show the filters inline
 */
export default function TailwindFilterBar({
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  selectedSupplier,
  setSelectedSupplier,
  bioOnly,
  setBioOnly,
  distinctCategories,
  distinctSuppliers,
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const isMobile = window.innerWidth < 640;

  if (!isMobile) {
    return (
      <div className="flex gap-2 items-center mb-2 flex-wrap ml-0 pl-0 w-full">
        <div className="min-w-[200px]">
          <label htmlFor="desktop-search" className="sr-only">Rechercher</label>
          <input
            id="desktop-search"
            type="text"
            className="w-full p-2 border border-gray-300 rounded-md"
            placeholder="Rechercher"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="min-w-[160px]">
          <label htmlFor="desktop-category" className="sr-only">Catégorie</label>
          <select
            id="desktop-category"
            className="w-full p-2 border border-gray-300 rounded-md"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">Toutes les catégories</option>
            {distinctCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[160px]">
          <label htmlFor="desktop-supplier" className="sr-only">Fournisseur</label>
          <select
            id="desktop-supplier"
            className="w-full p-2 border border-gray-300 rounded-md"
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
          >
            <option value="">Tous les fournisseurs</option>
            {distinctSuppliers.map((sup) => (
              <option key={sup} value={sup}>
                {sup}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center">
          <input
            id="desktop-bio-only"
            type="checkbox"
            className="h-4 w-4 text-green-600 border-gray-300 rounded"
            checked={bioOnly}
            onChange={(e) => setBioOnly(e.target.checked)}
          />
          <label htmlFor="desktop-bio-only" className="ml-2 block text-sm text-gray-700">
            Bio seulement
          </label>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setDialogOpen(true)}
        className="mb-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
      >
        Filtrer
      </button>

      <MobileFiltersDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedSupplier={selectedSupplier}
        setSelectedSupplier={setSelectedSupplier}
        bioOnly={bioOnly}
        setBioOnly={setBioOnly}
        distinctCategories={distinctCategories}
        distinctSuppliers={distinctSuppliers}
      />
    </>
  );
}
