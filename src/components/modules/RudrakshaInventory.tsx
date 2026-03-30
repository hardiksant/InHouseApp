import React, { useState, useEffect } from 'react';
import { Package, Plus, X, Download, Share2, Copy, Trash2, Image as ImageIcon, FileCheck, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getCompanySettings } from '../../lib/companySettings';
import { useToast } from '../../contexts/ToastContext';

interface RudrakshaCategory {
  id: string;
  name: string;
  display_order: number;
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
  status: 'Available' | 'Reserved' | 'Sold';
  created_at: string;
}

interface RudrakshaMedia {
  id: string;
  bead_id: string;
  media_type: 'photo' | 'video' | 'certificate';
  file_url: string;
}

interface Props {
  onBack: () => void;
}

export function RudrakshaInventory({ onBack }: Props) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [categories, setCategories] = useState<RudrakshaCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<RudrakshaCategory | null>(null);
  const [beads, setBeads] = useState<RudrakshaBead[]>([]);
  const [showAddBeadModal, setShowAddBeadModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [showGroupPostModal, setShowGroupPostModal] = useState(false);
  const [selectedBead, setSelectedBead] = useState<RudrakshaBead | null>(null);
  const [beadMedia, setBeadMedia] = useState<RudrakshaMedia[]>([]);
  const [exportColumns, setExportColumns] = useState({
    code: true,
    size: true,
    weight: true,
    xray: true,
    price: true,
    lab: true,
    status: false
  });
  const [formData, setFormData] = useState({
    code: '',
    mukhi: '',
    lab: '',
    size_mm: 0,
    weight_g: 0,
    xray_report: '',
    price: 0,
    status: 'Available' as 'Available' | 'Reserved' | 'Sold'
  });
  const [mediaFiles, setMediaFiles] = useState<{ file: File; type: 'photo' | 'video' | 'certificate' }[]>([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchBeads();
    }
  }, [selectedCategory]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('rudraksha_categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (!error && data) {
      setCategories(data);
      if (data.length > 0) {
        setSelectedCategory(data[0]);
      }
    }
  };

  const fetchBeads = async () => {
    if (!selectedCategory || !user) return;

    const { data, error } = await supabase
      .from('rudraksha_beads')
      .select('*')
      .eq('category_id', selectedCategory.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setBeads(data);
    }
  };

  const handleAddBead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedCategory) return;

    const { data, error } = await supabase
      .from('rudraksha_beads')
      .insert({
        ...formData,
        category_id: selectedCategory.id,
        mukhi: selectedCategory.name,
        created_by: user.id
      })
      .select()
      .single();

    if (!error && data) {
      if (mediaFiles.length > 0) {
        for (const { file, type } of mediaFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `rudraksha/${data.id}/${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(fileName, file);

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('product-images')
              .getPublicUrl(fileName);

            await supabase
              .from('rudraksha_media')
              .insert({
                bead_id: data.id,
                media_type: type,
                file_url: publicUrl
              });
          }
        }
      }

      setFormData({
        code: '',
        mukhi: '',
        lab: '',
        size_mm: 0,
        weight_g: 0,
        xray_report: '',
        price: 0,
        status: 'Available'
      });
      setMediaFiles([]);
      setShowAddBeadModal(false);
      fetchBeads();
    }
  };

  const handleUploadMedia = async (beadId: string) => {
    setSelectedBead(beads.find(b => b.id === beadId) || null);
    const { data } = await supabase
      .from('rudraksha_media')
      .select('*')
      .eq('bead_id', beadId);

    setBeadMedia(data || []);
    setShowMediaModal(true);
  };

  const handleDeleteBead = async (beadId: string) => {
    if (!confirm('Are you sure you want to delete this bead?')) return;

    const { error } = await supabase
      .from('rudraksha_beads')
      .delete()
      .eq('id', beadId);

    if (!error) {
      fetchBeads();
    }
  };

  const exportToCSV = () => {
    const availableBeads = beads.filter(b => b.status === 'Available');
    const headers = [];
    if (exportColumns.code) headers.push('Code');
    if (exportColumns.size) headers.push('Size (mm)');
    if (exportColumns.weight) headers.push('Weight (g)');
    if (exportColumns.xray) headers.push('X-Ray');
    if (exportColumns.price) headers.push('Price');
    if (exportColumns.lab) headers.push('Lab');
    if (exportColumns.status) headers.push('Status');

    const rows = availableBeads.map(bead => {
      const row = [];
      if (exportColumns.code) row.push(bead.code);
      if (exportColumns.size) row.push(bead.size_mm);
      if (exportColumns.weight) row.push(bead.weight_g);
      if (exportColumns.xray) row.push(bead.xray_report);
      if (exportColumns.price) row.push(bead.price);
      if (exportColumns.lab) row.push(bead.lab);
      if (exportColumns.status) row.push(bead.status);
      return row;
    });

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedCategory?.name}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToExcel = () => {
    const availableBeads = beads.filter(b => b.status === 'Available');
    const headers = [];
    if (exportColumns.code) headers.push('Code');
    if (exportColumns.size) headers.push('Size (mm)');
    if (exportColumns.weight) headers.push('Weight (g)');
    if (exportColumns.xray) headers.push('X-Ray');
    if (exportColumns.price) headers.push('Price');
    if (exportColumns.lab) headers.push('Lab');
    if (exportColumns.status) headers.push('Status');

    const rows = availableBeads.map(bead => {
      const row = [];
      if (exportColumns.code) row.push(bead.code);
      if (exportColumns.size) row.push(bead.size_mm);
      if (exportColumns.weight) row.push(bead.weight_g);
      if (exportColumns.xray) row.push(bead.xray_report);
      if (exportColumns.price) row.push(bead.price);
      if (exportColumns.lab) row.push(bead.lab);
      if (exportColumns.status) row.push(bead.status);
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
    link.download = `${selectedCategory?.name}_${new Date().toISOString().split('T')[0]}.xls`;
    link.click();
  };

  const exportToJPG = async () => {
    const availableBeads = beads.filter(b => b.status === 'Available');
    if (!user || !selectedCategory) return;

    const settings = await getCompanySettings(user.id);
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800 + (availableBeads.length * 40);
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(settings.company_name, canvas.width / 2, 80);

    ctx.font = 'bold 36px Arial';
    ctx.fillText(selectedCategory.name, canvas.width / 2, 140);

    ctx.font = '20px Arial';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`Available Beads - ${new Date().toLocaleDateString()}`, canvas.width / 2, 180);

    let y = 240;
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left';

    const columns = [];
    if (exportColumns.code) columns.push({ label: 'Code', x: 50 });
    if (exportColumns.size) columns.push({ label: 'Size', x: 250 });
    if (exportColumns.weight) columns.push({ label: 'Weight', x: 400 });
    if (exportColumns.xray) columns.push({ label: 'X-Ray', x: 550 });
    if (exportColumns.price) columns.push({ label: 'Price', x: 700 });
    if (exportColumns.lab) columns.push({ label: 'Lab', x: 900 });

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

    availableBeads.forEach(bead => {
      let colIndex = 0;
      if (exportColumns.code) ctx.fillText(bead.code, columns[colIndex++].x, y);
      if (exportColumns.size) ctx.fillText(`${bead.size_mm}mm`, columns[colIndex++].x, y);
      if (exportColumns.weight) ctx.fillText(`${bead.weight_g}g`, columns[colIndex++].x, y);
      if (exportColumns.xray) ctx.fillText(bead.xray_report, columns[colIndex++].x, y);
      if (exportColumns.price) ctx.fillText(`₹${bead.price}`, columns[colIndex++].x, y);
      if (exportColumns.lab) ctx.fillText(bead.lab, columns[colIndex++].x, y);
      y += 35;
    });

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedCategory?.name}_${new Date().toISOString().split('T')[0]}.jpg`;
      link.click();
    }, 'image/jpeg', 0.95);
  };

  const generateGroupPost = () => {
    setShowGroupPostModal(true);
  };

  const copyGroupPostText = () => {
    const availableBeads = beads.filter(b => b.status === 'Available');
    let text = `${selectedCategory?.name}\n`;
    text += `Nepali Rudraksh Wala Beads & Mala LLP\n\n`;
    text += `Available Beads:\n\n`;

    availableBeads.forEach(bead => {
      text += `Code: ${bead.code}\n`;
      text += `Size: ${bead.size_mm}mm | Weight: ${bead.weight_g}g\n`;
      text += `X-Ray: ${bead.xray_report}\n`;
      text += `Price: ₹${bead.price}\n\n`;
    });

    navigator.clipboard.writeText(text);
    showToast('Text copied to clipboard!', 'success');
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
        <h1 className="text-4xl font-bold text-slate-900 mb-3">Certified Rudraksha</h1>
        <p className="text-lg text-slate-600">Manage your Rudraksha bead inventory</p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-3 bg-white rounded-2xl shadow-lg border-2 border-orange-100 p-4 h-fit">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Categories</h2>
          <div className="space-y-1">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category)}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition ${
                  selectedCategory?.id === category.id
                    ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white'
                    : 'text-slate-700 hover:bg-orange-50'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-9">
          {selectedCategory && (
            <>
              <div className="bg-white rounded-2xl shadow-lg border-2 border-orange-100 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-slate-900">{selectedCategory.name}</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAddBeadModal(true)}
                      className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white px-4 py-2 rounded-lg font-medium hover:from-orange-700 hover:to-amber-700 transition"
                    >
                      <Plus className="w-4 h-4" />
                      Add Bead
                    </button>
                    <button
                      onClick={generateGroupPost}
                      className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition"
                    >
                      <Share2 className="w-4 h-4" />
                      Generate Post
                    </button>
                  </div>
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
                {beads.length === 0 ? (
                  <div className="p-12 text-center">
                    <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No beads added yet. Add your first bead!</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-orange-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Code</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Lab</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Size (mm)</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Weight (g)</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">X-Ray</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Price</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {beads.map((bead) => (
                          <tr key={bead.id} className="hover:bg-orange-50 transition">
                            <td className="px-4 py-3 text-sm font-medium text-slate-900">{bead.code}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{bead.lab}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{bead.size_mm}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{bead.weight_g}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{bead.xray_report}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-slate-900">₹{bead.price}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                                bead.status === 'Available' ? 'bg-green-100 text-green-700' :
                                bead.status === 'Reserved' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {bead.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleUploadMedia(bead.id)}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
                                  title="Media"
                                >
                                  <ImageIcon className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteBead(bead.id)}
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
            </>
          )}
        </div>
      </div>

      {showAddBeadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-amber-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-2xl font-bold">Add New Bead</h2>
              <button onClick={() => setShowAddBeadModal(false)} className="p-1 hover:bg-white/10 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddBead} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Lab</label>
                  <input
                    type="text"
                    value={formData.lab}
                    onChange={(e) => setFormData({ ...formData, lab: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Size (mm)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.size_mm}
                    onChange={(e) => setFormData({ ...formData, size_mm: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Weight (g)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.weight_g}
                    onChange={(e) => setFormData({ ...formData, weight_g: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">X-Ray Report</label>
                  <input
                    type="text"
                    value={formData.xray_report}
                    onChange={(e) => setFormData({ ...formData, xray_report: e.target.value })}
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
                <label className="block text-sm font-medium text-slate-700 mb-2">Upload Media</label>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*,.pdf"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setMediaFiles(files.map(file => ({
                      file,
                      type: file.type.startsWith('image/') ? 'photo' :
                            file.type.startsWith('video/') ? 'video' : 'certificate'
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
                  onClick={() => setShowAddBeadModal(false)}
                  className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-medium hover:from-orange-700 hover:to-amber-700 transition shadow-lg"
                >
                  Add Bead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMediaModal && selectedBead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-amber-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-2xl font-bold">Media for {selectedBead.code}</h2>
              <button onClick={() => setShowMediaModal(false)} className="p-1 hover:bg-white/10 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {beadMedia.length === 0 ? (
                <div className="text-center py-12">
                  <ImageIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No media uploaded yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {beadMedia.map((media) => (
                    <div key={media.id} className="relative group">
                      {media.media_type === 'photo' ? (
                        <img src={media.file_url} alt="Bead" className="w-full h-48 object-cover rounded-lg" />
                      ) : media.media_type === 'video' ? (
                        <video src={media.file_url} className="w-full h-48 object-cover rounded-lg" controls />
                      ) : (
                        <div className="w-full h-48 bg-slate-100 rounded-lg flex items-center justify-center">
                          <FileCheck className="w-12 h-12 text-slate-400" />
                        </div>
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

      {showGroupPostModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-2xl font-bold">Generate Group Post</h2>
              <button onClick={() => setShowGroupPostModal(false)} className="p-1 hover:bg-white/10 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="font-bold text-lg mb-2">Select Export Columns</h3>
                <div className="space-y-2">
                  {Object.keys(exportColumns).map((key) => (
                    <label key={key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={exportColumns[key as keyof typeof exportColumns]}
                        onChange={(e) => setExportColumns({ ...exportColumns, [key]: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="capitalize">{key}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={copyGroupPostText}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  <Copy className="w-5 h-5" />
                  Copy Text
                </button>
                <button
                  onClick={exportToJPG}
                  className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-purple-700 transition"
                >
                  <Download className="w-5 h-5" />
                  Download Image
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
