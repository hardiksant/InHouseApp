import React, { useState, useEffect } from 'react';
import { Package, Plus, X, Download, Share2, Copy, Trash2, Image as ImageIcon, Video, ArrowLeft, MessageCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getCompanySettings } from '../../lib/companySettings';
import { useToast } from '../../contexts/ToastContext';
import { generateGeneralProductMessage, shareOnWhatsApp } from '../../lib/whatsappShare';
import { downloadFile, downloadMultipleFiles, getMediaFileName } from '../../lib/mediaDownload';

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
  thumbnail_url?: string;
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
  const { showToast } = useToast();
  const [products, setProducts] = useState<GeneralProduct[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<GeneralProduct | null>(null);
  const [productMedia, setProductMedia] = useState<ProductMedia[]>([]);
  const [whatsAppOptions, setWhatsAppOptions] = useState({
    sharePhotos: true,
    shareVideos: false
  });
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
  const [loadingMedia, setLoadingMedia] = useState(false);

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
      const productsWithThumbnails = await Promise.all(
        data.map(async (product) => {
          const { data: mediaData } = await supabase
            .from('general_product_media')
            .select('file_url')
            .eq('product_id', product.id)
            .eq('media_type', 'photo')
            .limit(1)
            .maybeSingle();

          return {
            ...product,
            thumbnail_url: mediaData?.file_url || null
          };
        })
      );

      setProducts(productsWithThumbnails);
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
    setLoadingMedia(true);
    setShowMediaModal(true);

    const { data, error } = await supabase
      .from('general_product_media')
      .select('*')
      .eq('product_id', productId);

    if (error) {
      console.error('Error fetching media:', error);
    }

    setProductMedia(data || []);
    setLoadingMedia(false);
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

  const handleWhatsAppShare = async (product: GeneralProduct) => {
    setSelectedProduct(product);
    const { data } = await supabase
      .from('general_product_media')
      .select('*')
      .eq('product_id', product.id);

    setProductMedia(data || []);
    setShowWhatsAppModal(true);
  };

  const executeWhatsAppShare = async () => {
    if (!selectedProduct) return;

    const message = generateGeneralProductMessage({
      product_name: selectedProduct.product_name,
      size: selectedProduct.size,
      material: selectedProduct.material,
      price: selectedProduct.price
    });

    const filesToDownload: { url: string; filename: string }[] = [];

    if (whatsAppOptions.sharePhotos) {
      const photos = productMedia.filter(m => m.media_type === 'photo');
      photos.forEach((photo, index) => {
        filesToDownload.push({
          url: photo.file_url,
          filename: getMediaFileName(selectedProduct.product_name.replace(/\s+/g, '_'), 'photo', index, photo.file_url)
        });
      });
    }

    if (whatsAppOptions.shareVideos) {
      const videos = productMedia.filter(m => m.media_type === 'video');
      videos.forEach((video, index) => {
        filesToDownload.push({
          url: video.file_url,
          filename: getMediaFileName(selectedProduct.product_name.replace(/\s+/g, '_'), 'video', index, video.file_url)
        });
      });
    }

    if (filesToDownload.length > 0) {
      showToast('Downloading media files...', 'info');
      await downloadMultipleFiles(filesToDownload);
    }

    navigator.clipboard.writeText(message);
    shareOnWhatsApp(message);

    showToast('Message copied! Please attach the downloaded media in WhatsApp', 'success');
    setShowWhatsAppModal(false);
  };

  const handleDownloadMedia = async (media: ProductMedia) => {
    const filename = getMediaFileName(
      selectedProduct?.product_name.replace(/\s+/g, '_') || 'product',
      media.media_type,
      productMedia.indexOf(media),
      media.file_url
    );

    const success = await downloadFile(media.file_url, filename);
    if (success) {
      showToast('Download started!', 'success');
    } else {
      showToast('Download failed', 'error');
    }
  };

  const handleDownloadAllMedia = async () => {
    if (!selectedProduct || productMedia.length === 0) return;

    const filesToDownload = productMedia.map((media, index) => ({
      url: media.file_url,
      filename: getMediaFileName(selectedProduct.product_name.replace(/\s+/g, '_'), media.media_type, index, media.file_url)
    }));

    showToast('Downloading all media...', 'info');
    await downloadMultipleFiles(filesToDownload);
    showToast('All downloads complete!', 'success');
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
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Preview</th>
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
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleViewMedia(product.id)}
                        className="flex items-center justify-center w-14 h-14 rounded-lg overflow-hidden bg-slate-100 hover:ring-2 hover:ring-orange-400 transition"
                      >
                        {product.thumbnail_url ? (
                          <img
                            src={product.thumbnail_url}
                            alt={product.product_name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                            }}
                          />
                        ) : (
                          <Package className="w-6 h-6 text-slate-400" />
                        )}
                      </button>
                    </td>
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
                          title="View Media"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleWhatsAppShare(product)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded transition"
                          title="Share on WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
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
                  <div className="mt-3">
                    <p className="text-sm text-slate-600 mb-2">{mediaFiles.length} file(s) selected</p>
                    <div className="grid grid-cols-4 gap-2">
                      {mediaFiles.map((item, index) => (
                        <div key={index} className="relative group">
                          {item.type === 'photo' ? (
                            <img
                              src={URL.createObjectURL(item.file)}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-20 object-cover rounded-lg border-2 border-slate-200"
                            />
                          ) : (
                            <div className="w-full h-20 bg-slate-100 rounded-lg border-2 border-slate-200 flex items-center justify-center">
                              <Video className="w-6 h-6 text-slate-400" />
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setMediaFiles(mediaFiles.filter((_, i) => i !== index));
                            }}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <span className="absolute bottom-1 left-1 px-1 py-0.5 bg-black/60 text-white text-[10px] rounded">
                            {item.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
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
              <div className="flex items-center gap-2">
                {productMedia.length > 0 && (
                  <button
                    onClick={handleDownloadAllMedia}
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition"
                    title="Download All"
                  >
                    <Download className="w-4 h-4" />
                    Download All
                  </button>
                )}
                <button onClick={() => setShowMediaModal(false)} className="p-1 hover:bg-white/10 rounded-lg">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {loadingMedia ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-slate-500">Loading media...</p>
                </div>
              ) : productMedia.length === 0 ? (
                <div className="text-center py-12">
                  <ImageIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No media uploaded for this product</p>
                  <p className="text-sm text-slate-400 mt-2">Media can be added when creating a new product</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {productMedia.map((media, index) => (
                    <div key={media.id} className="relative group">
                      {media.media_type === 'photo' ? (
                        <img
                          src={media.file_url}
                          alt="Product"
                          className="w-full h-48 object-cover rounded-lg bg-slate-100"
                          onError={(e) => {
                            e.currentTarget.src = '';
                            e.currentTarget.className = 'w-full h-48 object-cover rounded-lg bg-slate-200 flex items-center justify-center';
                          }}
                        />
                      ) : (
                        <video src={media.file_url} className="w-full h-48 object-cover rounded-lg bg-slate-100" controls />
                      )}
                      <div className="absolute top-2 right-2 flex gap-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full shadow ${
                          media.media_type === 'photo' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {media.media_type}
                        </span>
                      </div>
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleDownloadMedia(media)}
                          className="bg-white text-slate-900 p-2 rounded-lg hover:bg-slate-100 transition"
                          title="Download"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="absolute bottom-2 left-2">
                        <span className="px-2 py-1 bg-black/70 text-white text-xs font-medium rounded">
                          {index + 1} of {productMedia.length}
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

      {showWhatsAppModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-2xl font-bold">Share on WhatsApp</h2>
              <button onClick={() => setShowWhatsAppModal(false)} className="p-1 hover:bg-white/10 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="font-bold text-lg mb-2 text-slate-900">Product Details</h3>
                <div className="bg-slate-50 rounded-lg p-4 space-y-1 text-sm">
                  <p><span className="font-semibold">Product:</span> {selectedProduct.product_name}</p>
                  {selectedProduct.size && <p><span className="font-semibold">Size:</span> {selectedProduct.size}</p>}
                  {selectedProduct.material && <p><span className="font-semibold">Material:</span> {selectedProduct.material}</p>}
                  <p><span className="font-semibold">Price:</span> ₹{selectedProduct.price}</p>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-lg mb-3 text-slate-900">Select Media to Share</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 border-2 border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={whatsAppOptions.sharePhotos}
                      onChange={(e) => setWhatsAppOptions({ ...whatsAppOptions, sharePhotos: e.target.checked })}
                      className="w-5 h-5 text-green-600"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-slate-900">Share Photos</span>
                      <p className="text-sm text-slate-600">
                        {productMedia.filter(m => m.media_type === 'photo').length} photo(s) available
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border-2 border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={whatsAppOptions.shareVideos}
                      onChange={(e) => setWhatsAppOptions({ ...whatsAppOptions, shareVideos: e.target.checked })}
                      className="w-5 h-5 text-green-600"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-slate-900">Share Videos</span>
                      <p className="text-sm text-slate-600">
                        {productMedia.filter(m => m.media_type === 'video').length} video(s) available
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {(whatsAppOptions.sharePhotos || whatsAppOptions.shareVideos) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    Selected media will be downloaded automatically. Please attach them manually in WhatsApp after the message opens.
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowWhatsAppModal(false)}
                  className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={executeWhatsAppShare}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition shadow-lg flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-5 h-5" />
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
