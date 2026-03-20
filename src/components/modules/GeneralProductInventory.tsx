import React, { useState, useEffect } from 'react';
import { Package, Plus, X, Download, Share2, Copy, Trash2, Image as ImageIcon, Video, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getCompanySettings } from '../../lib/companySettings';

interface GeneralProduct {
  id: string;
  category_id: string;
  product_name: string;
  size: string;
  material: string;
  price: number;
  status: 'Available' | 'Reserved' | 'Sold';
  keywords: string;
  created_at: string;
}

interface ProductMedia {
  id: string;
  product_id: string;
  media_type: 'photo' | 'video';
  file_url: string;
}

interface Props {
  categoryId: string;
  categoryName: string;
  onBack: () => void;
}

export function GeneralProductInventory({ categoryId, categoryName, onBack }: Props) {
  const { user } = useAuth();
  const [products, setProducts] = useState<GeneralProduct[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<GeneralProduct | null>(null);
  const [productMedia, setProductMedia] = useState<ProductMedia[]>([]);
  const [exportColumns, setExportColumns] = useState({
    name: true,
    size: true,
    material: true,
    price: true,
    status: false
  });
  const [formData, setFormData] = useState({
    product_name: '',
    size: '',
    material: '',
    price: 0,
    status: 'Available' as 'Available' | 'Reserved' | 'Sold',
    keywords: ''
  });
  const [mediaFiles, setMediaFiles] = useState<{ file: File; type: 'photo' | 'video' }[]>([]);

  useEffect(() => {
    fetchProducts();
  }, [categoryId]);

  const fetchProducts = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('general_products')
      .select('*')
      .eq('category_id', categoryId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProducts(data);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const { data, error } = await supabase
      .from('general_products')
      .insert({
        ...formData,
        category_id: categoryId,
        created_by: user.id
      })
      .select()
      .single();

    if (!error && data) {
      if (mediaFiles.length > 0) {
        for (const { file, type } of mediaFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `products/${data.id}/${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(fileName, file);

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('product-images')
              .getPublicUrl(fileName);

            await supabase
              .from('general_product_media')
              .insert({
                product_id: data.id,
                media_type: type,
                file_url: publicUrl
              });
          }
        }
      }

      setFormData({
        product_name: '',
        size: '',
        material: '',
        price: 0,
        status: 'Available',
        keywords: ''
      });
      setMediaFiles([]);
      setShowAddModal(false);
      fetchProducts();
    }
  };

  const handleViewMedia = async (productId: string) => {
    setSelectedProduct(products.find(p => p.id === productId) || null);
    const { data } = await supabase
      .from('general_product_media')
      .select('*')
      .eq('product_id', productId);

    setProductMedia(data || []);
    setShowMediaModal(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    const { error } = await supabase
      .from('general_products')
      .delete()
      .eq('id', productId);

    if (!error) {
      fetchProducts();
    }
  };

  const exportToCSV = () => {
    const availableProducts = products.filter(p => p.status === 'Available');
    const headers = [];
    if (exportColumns.name) headers.push('Product Name');
    if (exportColumns.size) headers.push('Size');
    if (exportColumns.material) headers.push('Material');
    if (exportColumns.price) headers.push('Price');
    if (exportColumns.status) headers.push('Status');

    const rows = availableProducts.map(product => {
      const row = [];
      if (exportColumns.name) row.push(product.product_name);
      if (exportColumns.size) row.push(product.size);
      if (exportColumns.material) row.push(product.material);
      if (exportColumns.price) row.push(product.price);
      if (exportColumns.status) row.push(product.status);
      return row;
    });

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${categoryName}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToExcel = () => {
    const availableProducts = products.filter(p => p.status === 'Available');
    const headers = [];
    if (exportColumns.name) headers.push('Product Name');
    if (exportColumns.size) headers.push('Size');
    if (exportColumns.material) headers.push('Material');
    if (exportColumns.price) headers.push('Price');
    if (exportColumns.status) headers.push('Status');

    const rows = availableProducts.map(product => {
      const row = [];
      if (exportColumns.name) row.push(product.product_name);
      if (exportColumns.size) row.push(product.size);
      if (exportColumns.material) row.push(product.material);
      if (exportColumns.price) row.push(product.price);
      if (exportColumns.status) row.push(product.status);
      return row;
    });

    let html = '<html><head><meta charset="utf-8"></head><body><table border="1">';
    html += '<tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr>';
    rows.forEach(row => {
      html += '<tr>' + row.map(cell => `<td>${cell}</td>`).join('') + '</tr>';
    });
    html += '</table></body></html>';

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${categoryName}_${new Date().toISOString().split('T')[0]}.xls`;
    link.click();
  };

  const exportToJPG = async () => {
    const availableProducts = products.filter(p => p.status === 'Available');
    if (!user) return;

    const settings = await getCompanySettings(user.id);
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800 + (availableProducts.length * 40);
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(settings.company_name, canvas.width / 2, 80);

    ctx.font = 'bold 36px Arial';
    ctx.fillText(categoryName, canvas.width / 2, 140);

    ctx.font = '20px Arial';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`Available Products - ${new Date().toLocaleDateString()}`, canvas.width / 2, 180);

    let y = 240;
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left';

    const columns = [];
    if (exportColumns.name) columns.push({ label: 'Product Name', x: 50 });
    if (exportColumns.size) columns.push({ label: 'Size', x: 350 });
    if (exportColumns.material) columns.push({ label: 'Material', x: 500 });
    if (exportColumns.price) columns.push({ label: 'Price', x: 700 });

    columns.forEach(col => ctx.fillText(col.label, col.x, y));

    y += 10;
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(canvas.width - 40, y);
    ctx.stroke();

    y += 30;
    ctx.font = '16px Arial';

    availableProducts.forEach(product => {
      let colIndex = 0;
      if (exportColumns.name) ctx.fillText(product.product_name, columns[colIndex++].x, y);
      if (exportColumns.size) ctx.fillText(product.size || '-', columns[colIndex++].x, y);
      if (exportColumns.material) ctx.fillText(product.material || '-', columns[colIndex++].x, y);
      if (exportColumns.price) ctx.fillText(`₹${product.price}`, columns[colIndex++].x, y);
      y += 35;
    });

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${categoryName}_${new Date().toISOString().split('T')[0]}.jpg`;
      link.click();
    }, 'image/jpeg', 0.95);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-orange-600 hover:text-orange-700 mb-6 font-medium"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Categories
      </button>

      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-3">{categoryName}</h1>
        <p className="text-lg text-slate-600">Manage your product inventory</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border-2 border-orange-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-slate-900">Products</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white px-4 py-2 rounded-lg font-medium hover:from-orange-700 hover:to-amber-700 transition"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-medium hover:bg-blue-200 transition"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-lg font-medium hover:bg-green-200 transition"
          >
            <Download className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={exportToJPG}
            className="flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-lg font-medium hover:bg-purple-200 transition"
          >
            <Download className="w-4 h-4" />
            JPG
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border-2 border-orange-100 overflow-hidden">
        {products.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No products added yet. Add your first product!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-orange-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Product Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Size</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Material</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Price</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-orange-50 transition">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{product.product_name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{product.size || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{product.material || '-'}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">₹{product.price}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                        product.status === 'Available' ? 'bg-green-100 text-green-700' :
                        product.status === 'Reserved' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {product.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewMedia(product.id)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
                          title="Media"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-amber-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-2xl font-bold">Add New Product</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-white/10 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Product Name *</label>
                <input
                  type="text"
                  required
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Size</label>
                  <input
                    type="text"
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Material</label>
                  <input
                    type="text"
                    value={formData.material}
                    onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="Available">Available</option>
                    <option value="Reserved">Reserved</option>
                    <option value="Sold">Sold</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Keywords (for search)</label>
                <input
                  type="text"
                  value={formData.keywords}
                  onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                  placeholder="e.g., premium, handmade, special"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Upload Media</label>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setMediaFiles(files.map(file => ({
                      file,
                      type: file.type.startsWith('image/') ? 'photo' : 'video'
                    })));
                  }}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                {mediaFiles.length > 0 && (
                  <p className="text-sm text-slate-600 mt-2">{mediaFiles.length} file(s) selected</p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-medium hover:from-orange-700 hover:to-amber-700 transition shadow-lg"
                >
                  Add Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMediaModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-amber-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-2xl font-bold">Media for {selectedProduct.product_name}</h2>
              <button onClick={() => setShowMediaModal(false)} className="p-1 hover:bg-white/10 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {productMedia.length === 0 ? (
                <div className="text-center py-12">
                  <ImageIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No media uploaded yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {productMedia.map((media) => (
                    <div key={media.id} className="relative group">
                      {media.media_type === 'photo' ? (
                        <img src={media.file_url} alt="Product" className="w-full h-48 object-cover rounded-lg" />
                      ) : (
                        <video src={media.file_url} className="w-full h-48 object-cover rounded-lg" controls />
                      )}
                      <div className="absolute top-2 right-2">
                        <span className="px-2 py-1 bg-white text-xs font-medium rounded-full">
                          {media.media_type}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
