import React, { useState, useEffect } from 'react';
import { Search, X, Share2, Copy, Image as ImageIcon, Video, ArrowLeft, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { shareOnWhatsApp } from '../../lib/whatsappShare';

interface ProductCategory {
  id: string;
  name: string;
  type: 'rudraksha' | 'general';
}

interface RudrakshaBead {
  id: string;
  code: string;
  category_id: string;
  mukhi: string;
  lab: string;
  size_mm: number;
  weight_g: number;
  xray_report: string;
  price: number;
  status: string;
}

interface GeneralProduct {
  id: string;
  category_id: string;
  product_name: string;
  size: string;
  material: string;
  price: number;
  status: string;
  keywords: string;
}

interface ProductMedia {
  id: string;
  media_type: 'photo' | 'video' | 'certificate';
  file_url: string;
}

interface ProductCard {
  id: string;
  name: string;
  code: string;
  category: string;
  categoryId: string;
  price: number;
  type: 'rudraksha' | 'general';
  photoUrl?: string;
  details: any;
}

interface Props {
  onBack: () => void;
}

export function SalesModeView({ onBack }: Props) {
  const { user } = useAuth();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<ProductCard[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductCard[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<ProductCard | null>(null);
  const [productMedia, setProductMedia] = useState<ProductMedia[]>([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [searchTerm, selectedCategory, products]);

  const fetchData = async () => {
    if (!user) return;

    setLoading(true);

    const { data: categoriesData } = await supabase
      .from('product_categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (categoriesData) {
      setCategories(categoriesData);
    }

    const allProducts: ProductCard[] = [];

    const { data: rudrakshaBeads } = await supabase
      .from('rudraksha_beads')
      .select('*, rudraksha_categories(name)')
      .eq('created_by', user.id)
      .eq('status', 'Available');

    if (rudrakshaBeads) {
      for (const bead of rudrakshaBeads) {
        const { data: media } = await supabase
          .from('rudraksha_media')
          .select('file_url, media_type')
          .eq('bead_id', bead.id)
          .eq('media_type', 'photo')
          .limit(1)
          .maybeSingle();

        const category = categoriesData?.find(c => c.id === bead.category_id);

        allProducts.push({
          id: bead.id,
          name: `${bead.mukhi} Mukhi`,
          code: bead.code,
          category: category?.name || 'Certified Rudraksha',
          categoryId: bead.category_id,
          price: bead.price,
          type: 'rudraksha',
          photoUrl: media?.file_url,
          details: bead
        });
      }
    }

    const { data: generalProducts } = await supabase
      .from('general_products')
      .select('*')
      .eq('created_by', user.id)
      .eq('status', 'Available');

    if (generalProducts) {
      for (const product of generalProducts) {
        const { data: media } = await supabase
          .from('general_product_media')
          .select('file_url, media_type')
          .eq('product_id', product.id)
          .eq('media_type', 'photo')
          .limit(1)
          .maybeSingle();

        const category = categoriesData?.find(c => c.id === product.category_id);

        allProducts.push({
          id: product.id,
          name: product.product_name,
          code: product.product_name,
          category: category?.name || 'Products',
          categoryId: product.category_id,
          price: product.price,
          type: 'general',
          photoUrl: media?.file_url,
          details: product
        });
      }
    }

    setProducts(allProducts);
    setLoading(false);
  };

  const filterProducts = () => {
    let filtered = [...products];

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.categoryId === selectedCategory);
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchLower) ||
        p.code.toLowerCase().includes(searchLower) ||
        p.category.toLowerCase().includes(searchLower)
      );
    }

    setFilteredProducts(filtered);
  };

  const handleViewDetails = async (product: ProductCard) => {
    setSelectedProduct(product);

    if (product.type === 'rudraksha') {
      const { data: media } = await supabase
        .from('rudraksha_media')
        .select('*')
        .eq('bead_id', product.id);

      setProductMedia(media || []);
    } else {
      const { data: media } = await supabase
        .from('general_product_media')
        .select('*')
        .eq('product_id', product.id);

      setProductMedia(media || []);
    }

    setShowDetailsModal(true);
  };

  const handleShareWhatsApp = (product: ProductCard) => {
    let message = `*${product.name}*\n\n`;
    message += `Code: ${product.code}\n`;

    if (product.type === 'rudraksha') {
      const details = product.details as RudrakshaBead;
      message += `Size: ${details.size_mm}mm\n`;
      message += `Weight: ${details.weight_g}g\n`;
      message += `Lab: ${details.lab}\n`;
      message += `X-Ray: ${details.xray_report}\n`;
    } else {
      const details = product.details as GeneralProduct;
      if (details.size) message += `Size: ${details.size}\n`;
      if (details.material) message += `Material: ${details.material}\n`;
    }

    message += `Price: ₹${product.price}\n\n`;
    message += `Contact us to purchase!`;

    shareOnWhatsApp(message);
  };

  const handleCopyInfo = (product: ProductCard) => {
    let text = `${product.name}\n`;
    text += `Code: ${product.code}\n`;

    if (product.type === 'rudraksha') {
      const details = product.details as RudrakshaBead;
      text += `Size: ${details.size_mm}mm\n`;
      text += `Weight: ${details.weight_g}g\n`;
      text += `Lab: ${details.lab}\n`;
      text += `X-Ray: ${details.xray_report}\n`;
    } else {
      const details = product.details as GeneralProduct;
      if (details.size) text += `Size: ${details.size}\n`;
      if (details.material) text += `Material: ${details.material}\n`;
    }

    text += `Price: ₹${product.price}`;

    navigator.clipboard.writeText(text);
    alert('Product info copied to clipboard!');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-orange-600 hover:text-orange-700 mb-6 font-medium"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Admin Mode
      </button>

      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-3">Product Catalog</h1>
        <p className="text-lg text-slate-600">Browse available products for customers</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border-2 border-orange-100 p-6 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Showing {filteredProducts.length} available product{filteredProducts.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
          <p className="mt-4 text-slate-600">Loading products...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-orange-100 p-12 text-center">
          <ImageIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No products found. Try adjusting your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-2xl shadow-lg border-2 border-orange-100 overflow-hidden hover:shadow-xl hover:border-orange-300 transition group"
            >
              <div className="aspect-square bg-slate-100 relative overflow-hidden">
                {product.photoUrl ? (
                  <img
                    src={product.photoUrl}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-16 h-16 text-slate-300" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <span className="px-3 py-1 bg-white/90 backdrop-blur text-xs font-medium rounded-full text-slate-700">
                    {product.category}
                  </span>
                </div>
              </div>

              <div className="p-4">
                <h3 className="text-lg font-bold text-slate-900 mb-1">{product.name}</h3>
                <p className="text-sm text-slate-600 mb-2">Code: {product.code}</p>
                <p className="text-2xl font-bold text-orange-600 mb-4">₹{product.price.toLocaleString()}</p>

                <div className="space-y-2">
                  <button
                    onClick={() => handleViewDetails(product)}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white px-4 py-2 rounded-lg font-medium hover:from-orange-700 hover:to-amber-700 transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Details
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleShareWhatsApp(product)}
                      className="flex items-center justify-center gap-2 bg-green-100 text-green-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-200 transition"
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </button>
                    <button
                      onClick={() => handleCopyInfo(product)}
                      className="flex items-center justify-center gap-2 bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-200 transition"
                    >
                      <Copy className="w-4 h-4" />
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDetailsModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8">
            <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-amber-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h2 className="text-2xl font-bold">{selectedProduct.name}</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <div className="bg-slate-100 rounded-xl overflow-hidden mb-4">
                    {productMedia.length > 0 ? (
                      <div className="space-y-4">
                        {productMedia.filter(m => m.media_type === 'photo').map((media) => (
                          <img
                            key={media.id}
                            src={media.file_url}
                            alt="Product"
                            className="w-full h-auto"
                          />
                        ))}
                        {productMedia.filter(m => m.media_type === 'video').map((media) => (
                          <video
                            key={media.id}
                            src={media.file_url}
                            controls
                            className="w-full h-auto"
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="aspect-square flex items-center justify-center">
                        <ImageIcon className="w-24 h-24 text-slate-300" />
                      </div>
                    )}
                  </div>

                  {productMedia.filter(m => m.media_type === 'video').length > 0 && (
                    <p className="text-sm text-slate-600 flex items-center gap-2">
                      <Video className="w-4 h-4" />
                      Video available
                    </p>
                  )}
                </div>

                <div>
                  <div className="mb-6">
                    <span className="inline-block px-3 py-1 bg-orange-100 text-orange-700 text-sm font-medium rounded-full mb-4">
                      {selectedProduct.category}
                    </span>
                    <h3 className="text-3xl font-bold text-slate-900 mb-2">{selectedProduct.name}</h3>
                    <p className="text-4xl font-bold text-orange-600 mb-4">
                      ₹{selectedProduct.price.toLocaleString()}
                    </p>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between py-2 border-b border-slate-200">
                      <span className="text-slate-600">Code:</span>
                      <span className="font-semibold text-slate-900">{selectedProduct.code}</span>
                    </div>

                    {selectedProduct.type === 'rudraksha' && (
                      <>
                        <div className="flex items-center justify-between py-2 border-b border-slate-200">
                          <span className="text-slate-600">Size:</span>
                          <span className="font-semibold text-slate-900">
                            {selectedProduct.details.size_mm}mm
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-slate-200">
                          <span className="text-slate-600">Weight:</span>
                          <span className="font-semibold text-slate-900">
                            {selectedProduct.details.weight_g}g
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-slate-200">
                          <span className="text-slate-600">Lab:</span>
                          <span className="font-semibold text-slate-900">
                            {selectedProduct.details.lab}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-slate-200">
                          <span className="text-slate-600">X-Ray:</span>
                          <span className="font-semibold text-slate-900">
                            {selectedProduct.details.xray_report}
                          </span>
                        </div>
                      </>
                    )}

                    {selectedProduct.type === 'general' && (
                      <>
                        {selectedProduct.details.size && (
                          <div className="flex items-center justify-between py-2 border-b border-slate-200">
                            <span className="text-slate-600">Size:</span>
                            <span className="font-semibold text-slate-900">
                              {selectedProduct.details.size}
                            </span>
                          </div>
                        )}
                        {selectedProduct.details.material && (
                          <div className="flex items-center justify-between py-2 border-b border-slate-200">
                            <span className="text-slate-600">Material:</span>
                            <span className="font-semibold text-slate-900">
                              {selectedProduct.details.material}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => handleShareWhatsApp(selectedProduct)}
                      className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-green-700 transition"
                    >
                      <Share2 className="w-5 h-5" />
                      Share on WhatsApp
                    </button>
                    <button
                      onClick={() => handleCopyInfo(selectedProduct)}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition"
                    >
                      <Copy className="w-5 h-5" />
                      Copy Product Info
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
