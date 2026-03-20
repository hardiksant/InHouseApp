import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, X, Folder, ToggleLeft, ToggleRight } from 'lucide-react';
import { ProductLibraryHeader } from './ProductLibraryHeader';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import ReportIssueButton from '../ReportIssueButton';
import { RudrakshaInventory } from './RudrakshaInventory';
import { GeneralProductInventory } from './GeneralProductInventory';
import { SalesModeView } from './SalesModeView';

interface ProductCategory {
  id: string;
  name: string;
  type: 'rudraksha' | 'general';
  display_order: number;
}

interface SearchResult {
  id: string;
  name: string;
  category: string;
  type: 'rudraksha' | 'general';
  details: string;
}

export function ProductLibrary() {
  const { user, isAdmin } = useAuth();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<'rudraksha' | 'general'>('general');
  const [isSalesMode, setIsSalesMode] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      performSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (!error && data) {
      setCategories(data);
    }
  };

  const performSearch = async () => {
    if (!user) return;

    const searchLower = searchTerm.toLowerCase();
    const results: SearchResult[] = [];

    const { data: rudrakshaBeads } = await supabase
      .from('rudraksha_beads')
      .select('id, code, mukhi, lab, size_mm, price, category_id')
      .eq('created_by', user.id)
      .or(`code.ilike.%${searchTerm}%,mukhi.ilike.%${searchTerm}%,lab.ilike.%${searchTerm}%,xray_report.ilike.%${searchTerm}%`);

    if (rudrakshaBeads) {
      for (const bead of rudrakshaBeads) {
        const category = categories.find(c => c.id === bead.category_id);
        results.push({
          id: bead.id,
          name: bead.code,
          category: category?.name || 'Certified Rudraksha',
          type: 'rudraksha',
          details: `${bead.mukhi} | ${bead.size_mm}mm | ₹${bead.price}`
        });
      }
    }

    const { data: generalProducts } = await supabase
      .from('general_products')
      .select('id, product_name, size, material, price, keywords, category_id')
      .eq('created_by', user.id)
      .or(`product_name.ilike.%${searchTerm}%,keywords.ilike.%${searchTerm}%,material.ilike.%${searchTerm}%`);

    if (generalProducts) {
      for (const product of generalProducts) {
        const category = categories.find(c => c.id === product.category_id);
        results.push({
          id: product.id,
          name: product.product_name,
          category: category?.name || 'Products',
          type: 'general',
          details: `${product.size || ''} | ${product.material || ''} | ₹${product.price}`
        });
      }
    }

    setSearchResults(results);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    const maxOrder = Math.max(...categories.map(c => c.display_order), 0);

    const { error } = await supabase
      .from('product_categories')
      .insert({
        name: newCategoryName,
        type: newCategoryType,
        display_order: maxOrder + 1
      });

    if (!error) {
      setNewCategoryName('');
      setShowAddCategoryModal(false);
      fetchCategories();
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? All products in this category will be deleted.')) return;

    const { error } = await supabase
      .from('product_categories')
      .delete()
      .eq('id', categoryId);

    if (!error) {
      fetchCategories();
    }
  };

  if (isSalesMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
        <ProductLibraryHeader />
        <SalesModeView onBack={() => setIsSalesMode(false)} />
      </div>
    );
  }

  if (selectedCategory) {
    if (selectedCategory.type === 'rudraksha') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
          <ProductLibraryHeader />
          <RudrakshaInventory onBack={() => setSelectedCategory(null)} />
        </div>
      );
    } else {
      return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
          <ProductLibraryHeader />
          <GeneralProductInventory
            categoryId={selectedCategory.id}
            categoryName={selectedCategory.name}
            onBack={() => setSelectedCategory(null)}
          />
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      <ProductLibraryHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-3">Product Library</h1>
              <p className="text-lg text-slate-600">Select a category to manage your inventory</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSalesMode(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition shadow-lg"
              >
                <ToggleRight className="w-5 h-5" />
                Sales Mode
              </button>
              {isAdmin && (
                <button
                  onClick={() => setShowAddCategoryModal(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white px-6 py-3 rounded-xl font-medium hover:from-orange-700 hover:to-amber-700 transition shadow-lg"
                >
                  <Plus className="w-5 h-5" />
                  Add Category
                </button>
              )}
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search products across all categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border-2 border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-lg"
            />
          </div>

          {searchResults.length > 0 && (
            <div className="mt-4 bg-white rounded-2xl shadow-lg border-2 border-orange-100 overflow-hidden">
              <div className="p-4 bg-orange-50 border-b border-orange-100">
                <h3 className="font-bold text-slate-900">Search Results ({searchResults.length})</h3>
              </div>
              <div className="divide-y divide-slate-200 max-h-96 overflow-y-auto">
                {searchResults.map((result) => (
                  <div key={result.id} className="p-4 hover:bg-orange-50 transition cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-slate-900">{result.name}</h4>
                        <p className="text-sm text-slate-600">{result.details}</p>
                      </div>
                      <span className="px-3 py-1 bg-orange-100 text-orange-700 text-sm font-medium rounded-full">
                        {result.category}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <div
              key={category.id}
              className="group bg-white rounded-2xl shadow-lg border-2 border-orange-100 overflow-hidden hover:shadow-xl hover:border-orange-300 transition cursor-pointer"
            >
              <div
                onClick={() => setSelectedCategory(category)}
                className="p-8"
              >
                <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl mb-4 group-hover:from-orange-200 group-hover:to-amber-200 transition">
                  <Folder className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{category.name}</h3>
                <p className="text-sm text-slate-600">
                  {category.type === 'rudraksha' ? 'Rudraksha Beads Inventory' : 'General Product Inventory'}
                </p>
              </div>
              {isAdmin && (
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCategory(category.id);
                    }}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}

          {categories.length === 0 && (
            <div className="col-span-full bg-white rounded-2xl shadow-lg border-2 border-orange-100 p-12 text-center">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No categories found. Add your first category!</p>
            </div>
          )}
        </div>
      </main>

      {showAddCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-amber-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-2xl font-bold">Add New Category</h2>
              <button onClick={() => setShowAddCategoryModal(false)} className="p-1 hover:bg-white/10 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Category Name *</label>
                <input
                  type="text"
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g., Premium Mala"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Category Type *</label>
                <select
                  value={newCategoryType}
                  onChange={(e) => setNewCategoryType(e.target.value as 'rudraksha' | 'general')}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="general">General Product Inventory</option>
                  <option value="rudraksha">Rudraksha Beads Inventory</option>
                </select>
                <p className="text-sm text-slate-500 mt-2">
                  Rudraksha type includes fields for bead codes, size, weight, and X-ray reports.
                  General type is for regular products with name, size, and material.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-medium hover:from-orange-700 hover:to-amber-700 transition shadow-lg"
                >
                  Add Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ReportIssueButton moduleName="Product Library" />
    </div>
  );
}
