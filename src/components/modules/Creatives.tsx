import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Folder, Upload, Download, Copy, X, FileImage, Search,
  Tag, Video, FileText, Image as ImageIcon, Play, Trash2,
  ChevronRight, ChevronDown, ArrowLeft
} from 'lucide-react';
import { CreativesHeader } from './CreativesHeader';
import { supabase, Creative } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import ReportIssueButton from '../ReportIssueButton';
import { useToast } from '../../contexts/ToastContext';

const FOLDER_STRUCTURE = {
  'Instagram Creatives': [],
  'Festival Creatives': [],
  'Ads Creatives': [],
  'WhatsApp Creatives': [],
  'Rudraksha Media': [
    '1 Mukhi', '2 Mukhi', '3 Mukhi', '4 Mukhi', '5 Mukhi',
    '6 Mukhi', '7 Mukhi', '8 Mukhi', '9 Mukhi', '10 Mukhi',
    '11 Mukhi', '12 Mukhi', '13 Mukhi', '14 Mukhi', '15 Mukhi',
    '16 Mukhi', '17 Mukhi', '18 Mukhi', '19 Mukhi', '20 Mukhi', '21 Mukhi'
  ]
};

const ALLOWED_FILE_TYPES = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'application/pdf': '.pdf'
};

export function Creatives() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { showToast } = useToast();
  const isAdminOrModerator = userProfile?.role === 'admin' || userProfile?.role === 'moderator';
  const isAdmin = userProfile?.role === 'admin';

  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedSubfolder, setSelectedSubfolder] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedCreative, setSelectedCreative] = useState<Creative | null>(null);

  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    folder_category: 'Instagram Creatives',
    subfolder: '',
    tags: '',
    suggested_caption: '',
    files: [] as File[]
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchCreatives();
  }, []);

  const fetchCreatives = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('creatives')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCreatives(data || []);
    } catch (error) {
      console.error('Error fetching creatives:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFileUrl = (filePath: string) => {
    const { data } = supabase.storage.from('creatives').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const isValidType = Object.keys(ALLOWED_FILE_TYPES).includes(file.type);
      const isValidSize = file.size <= 100 * 1024 * 1024;
      return isValidType && isValidSize;
    });

    if (validFiles.length !== files.length) {
      showToast('Some files were rejected. Please ensure files are JPG, PNG, MP4, MOV, or PDF and under 100MB.', 'warning');
    }

    setUploadForm(prev => ({ ...prev, files: validFiles }));
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadForm.files.length === 0) {
      showToast('Please select at least one file', 'warning');
      return;
    }

    setUploading(true);

    try {
      for (const file of uploadForm.files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${uploadForm.folder_category}/${uploadForm.subfolder ? uploadForm.subfolder + '/' : ''}${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('creatives')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const tags = uploadForm.tags.split(',').map(t => t.trim()).filter(t => t);

        const { error: dbError } = await supabase
          .from('creatives')
          .insert({
            title: uploadForm.title || file.name,
            description: uploadForm.description,
            file_path: fileName,
            file_type: file.type,
            file_size: file.size,
            folder_category: uploadForm.folder_category,
            subfolder: uploadForm.subfolder || null,
            tags: tags,
            suggested_caption: uploadForm.suggested_caption,
            uploaded_by: user!.id
          });

        if (dbError) throw dbError;
      }

      showToast('Creatives uploaded successfully!', 'success');
      setShowUploadModal(false);
      setUploadForm({
        title: '',
        description: '',
        folder_category: 'Instagram Creatives',
        subfolder: '',
        tags: '',
        suggested_caption: '',
        files: []
      });
      fetchCreatives();
    } catch (error) {
      console.error('Error uploading:', error);
      showToast('Failed to upload creatives. Please try again.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (creative: Creative) => {
    if (!confirm(`Are you sure you want to delete "${creative.title}"?`)) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('creatives')
        .remove([creative.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('creatives')
        .delete()
        .eq('id', creative.id);

      if (dbError) throw dbError;

      showToast('Creative deleted successfully', 'success');
      fetchCreatives();
    } catch (error) {
      console.error('Error deleting:', error);
      showToast('Failed to delete creative', 'error');
    }
  };

  const handleDownload = async (creative: Creative) => {
    const url = getFileUrl(creative.file_path);
    const link = document.createElement('a');
    link.href = url;
    link.download = creative.title;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyCaption = (caption: string) => {
    navigator.clipboard.writeText(caption);
    showToast('Caption copied to clipboard!', 'success');
  };

  const toggleFolder = (folder: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folder)) {
      newExpanded.delete(folder);
    } else {
      newExpanded.add(folder);
    }
    setExpandedFolders(newExpanded);
  };

  const filteredCreatives = creatives.filter(creative => {
    const matchesFolder = !selectedFolder || creative.folder_category === selectedFolder;
    const matchesSubfolder = !selectedSubfolder || creative.subfolder === selectedSubfolder;
    const matchesSearch = !searchQuery ||
      creative.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      creative.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      creative.folder_category.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFolder && matchesSubfolder && matchesSearch;
  });

  const getFolderCount = (folder: string, subfolder?: string) => {
    return creatives.filter(c =>
      c.folder_category === folder &&
      (!subfolder || c.subfolder === subfolder)
    ).length;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    if (fileType.startsWith('video/')) return <Video className="w-4 h-4" />;
    if (fileType === 'application/pdf') return <FileText className="w-4 h-4" />;
    return <FileImage className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50">
      <CreativesHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>

          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">Marketing Asset Library</h1>
              <p className="text-lg text-slate-600">
                Access and manage all marketing creatives in one place
              </p>
            </div>
            {isAdminOrModerator && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-rose-600 to-pink-600 text-white px-6 py-3 rounded-xl font-medium hover:from-rose-700 hover:to-pink-700 transition shadow-lg"
              >
                <Upload className="w-5 h-5" />
                Upload Creative
              </button>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, tags, or category..."
              className="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border-2 border-rose-100 p-6 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900">Folders</h3>
                {(selectedFolder || selectedSubfolder) && (
                  <button
                    onClick={() => {
                      setSelectedFolder(null);
                      setSelectedSubfolder(null);
                    }}
                    className="text-xs text-rose-600 hover:text-rose-700"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="space-y-1">
                {Object.entries(FOLDER_STRUCTURE).map(([folder, subfolders]) => (
                  <div key={folder}>
                    <button
                      onClick={() => {
                        if (subfolders.length > 0) {
                          toggleFolder(folder);
                        } else {
                          setSelectedFolder(folder);
                          setSelectedSubfolder(null);
                        }
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition ${
                        selectedFolder === folder && !selectedSubfolder
                          ? 'bg-rose-100 text-rose-700'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {subfolders.length > 0 ? (
                          expandedFolders.has(folder) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )
                        ) : (
                          <Folder className="w-4 h-4" />
                        )}
                        <span className="text-sm font-medium">{folder}</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        selectedFolder === folder && !selectedSubfolder
                          ? 'bg-rose-200'
                          : 'bg-slate-200'
                      }`}>
                        {getFolderCount(folder)}
                      </span>
                    </button>

                    {expandedFolders.has(folder) && subfolders.length > 0 && (
                      <div className="ml-6 mt-1 space-y-1">
                        {subfolders.map(subfolder => (
                          <button
                            key={subfolder}
                            onClick={() => {
                              setSelectedFolder(folder);
                              setSelectedSubfolder(subfolder);
                            }}
                            className={`w-full flex items-center justify-between p-2 rounded-lg transition text-sm ${
                              selectedFolder === folder && selectedSubfolder === subfolder
                                ? 'bg-rose-100 text-rose-700'
                                : 'hover:bg-slate-50 text-slate-600'
                            }`}
                          >
                            <span>{subfolder}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              selectedFolder === folder && selectedSubfolder === subfolder
                                ? 'bg-rose-200'
                                : 'bg-slate-200'
                            }`}>
                              {getFolderCount(folder, subfolder)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            {loading ? (
              <div className="bg-white rounded-2xl shadow-lg border-2 border-rose-100 p-12 text-center">
                <p className="text-slate-500">Loading creatives...</p>
              </div>
            ) : filteredCreatives.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg border-2 border-rose-100 p-12 text-center">
                <FileImage className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No creatives found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCreatives.map((creative) => {
                  const fileUrl = getFileUrl(creative.file_path);
                  const isVideo = creative.file_type.startsWith('video/');
                  const isImage = creative.file_type.startsWith('image/');
                  const isPdf = creative.file_type === 'application/pdf';

                  return (
                    <div
                      key={creative.id}
                      className="group bg-white rounded-2xl shadow-lg border-2 border-rose-100 overflow-hidden hover:shadow-xl transition"
                    >
                      <div
                        className="h-48 bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center cursor-pointer relative overflow-hidden"
                        onClick={() => {
                          setSelectedCreative(creative);
                          setShowPreview(true);
                        }}
                      >
                        {isImage && (
                          <img
                            src={fileUrl}
                            alt={creative.title}
                            className="w-full h-full object-cover"
                          />
                        )}
                        {isVideo && (
                          <div className="relative w-full h-full">
                            <video
                              src={fileUrl}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <Play className="w-12 h-12 text-white" />
                            </div>
                          </div>
                        )}
                        {isPdf && (
                          <div className="flex flex-col items-center justify-center text-slate-500">
                            <FileText className="w-16 h-16 mb-2" />
                            <span className="text-sm">PDF Document</span>
                          </div>
                        )}
                        <div className="absolute top-2 right-2">
                          <span className="px-2 py-1 bg-black/50 text-white text-xs rounded-full flex items-center gap-1">
                            {getFileIcon(creative.file_type)}
                            {creative.file_type.split('/')[1].toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="mb-2 flex items-center gap-2 flex-wrap">
                          <span className="inline-block px-2 py-1 bg-rose-100 text-rose-700 text-xs font-medium rounded-full">
                            {creative.folder_category}
                          </span>
                          {creative.subfolder && (
                            <span className="inline-block px-2 py-1 bg-pink-100 text-pink-700 text-xs font-medium rounded-full">
                              {creative.subfolder}
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-semibold text-slate-900 mb-2 truncate" title={creative.title}>
                          {creative.title}
                        </h3>

                        {creative.tags.length > 0 && (
                          <div className="flex items-center gap-1 mb-2 flex-wrap">
                            <Tag className="w-3 h-3 text-slate-400" />
                            {creative.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                {tag}
                              </span>
                            ))}
                            {creative.tags.length > 3 && (
                              <span className="text-xs text-slate-400">+{creative.tags.length - 3}</span>
                            )}
                          </div>
                        )}

                        <p className="text-xs text-slate-500 mb-3">
                          {new Date(creative.created_at).toLocaleDateString()}
                        </p>

                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDownload(creative)}
                            className="flex-1 p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Download"
                          >
                            <Download className="w-4 h-4 mx-auto" />
                          </button>
                          {creative.suggested_caption && (
                            <button
                              onClick={() => handleCopyCaption(creative.suggested_caption)}
                              className="flex-1 p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Copy Caption"
                            >
                              <Copy className="w-4 h-4 mx-auto" />
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(creative)}
                              className="flex-1 p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 mx-auto" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8">
            <div className="bg-gradient-to-r from-rose-600 to-pink-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-2xl font-bold">Upload Creative</h2>
              <button onClick={() => setShowUploadModal(false)} className="p-1 hover:bg-white/10 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Folder Category *
                  </label>
                  <select
                    value={uploadForm.folder_category}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, folder_category: e.target.value, subfolder: '' }))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                    required
                  >
                    {Object.keys(FOLDER_STRUCTURE).map(folder => (
                      <option key={folder} value={folder}>{folder}</option>
                    ))}
                  </select>
                </div>

                {FOLDER_STRUCTURE[uploadForm.folder_category as keyof typeof FOLDER_STRUCTURE].length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Subfolder
                    </label>
                    <select
                      value={uploadForm.subfolder}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, subfolder: e.target.value }))}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                    >
                      <option value="">None</option>
                      {FOLDER_STRUCTURE[uploadForm.folder_category as keyof typeof FOLDER_STRUCTURE].map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={uploadForm.tags}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="e.g., rudraksha, spiritual, healing"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Suggested Caption
                </label>
                <textarea
                  value={uploadForm.suggested_caption}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, suggested_caption: e.target.value }))}
                  rows={3}
                  placeholder="Enter a suggested caption for this creative..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Files * (JPG, PNG, MP4, MOV, PDF - Max 100MB each)
                </label>
                <input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.mp4,.mov,.pdf"
                  onChange={handleFileChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
                {uploadForm.files.length > 0 && (
                  <p className="text-sm text-slate-600 mt-2">
                    {uploadForm.files.length} file(s) selected
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-xl font-medium hover:from-rose-700 hover:to-pink-700 transition shadow-lg disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPreview && selectedCreative && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-5xl w-full">
            <button
              onClick={() => setShowPreview(false)}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition z-10"
            >
              <X className="w-6 h-6 text-white" />
            </button>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              {selectedCreative.file_type.startsWith('image/') && (
                <img
                  src={getFileUrl(selectedCreative.file_path)}
                  alt={selectedCreative.title}
                  className="w-full max-h-[70vh] object-contain rounded-lg"
                />
              )}
              {selectedCreative.file_type.startsWith('video/') && (
                <video
                  src={getFileUrl(selectedCreative.file_path)}
                  controls
                  className="w-full max-h-[70vh] object-contain rounded-lg"
                />
              )}
              {selectedCreative.file_type === 'application/pdf' && (
                <div className="bg-white rounded-lg p-8 text-center">
                  <FileText className="w-24 h-24 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-700 mb-4">PDF files cannot be previewed in browser</p>
                  <button
                    onClick={() => handleDownload(selectedCreative)}
                    className="px-6 py-3 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition"
                  >
                    Download PDF
                  </button>
                </div>
              )}

              <div className="mt-4 bg-white rounded-lg p-4">
                <h3 className="font-bold text-slate-900 text-lg mb-2">{selectedCreative.title}</h3>
                {selectedCreative.description && (
                  <p className="text-sm text-slate-600 mb-3">{selectedCreative.description}</p>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 bg-rose-100 text-rose-700 text-sm rounded-full">
                    {selectedCreative.folder_category}
                  </span>
                  {selectedCreative.subfolder && (
                    <span className="px-3 py-1 bg-pink-100 text-pink-700 text-sm rounded-full">
                      {selectedCreative.subfolder}
                    </span>
                  )}
                </div>
                {selectedCreative.tags.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <Tag className="w-4 h-4 text-slate-400" />
                    {selectedCreative.tags.map(tag => (
                      <span key={tag} className="text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {selectedCreative.suggested_caption && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">Suggested Caption:</span>
                      <button
                        onClick={() => handleCopyCaption(selectedCreative.suggested_caption)}
                        className="flex items-center gap-1 text-sm text-rose-600 hover:text-rose-700"
                      >
                        <Copy className="w-4 h-4" />
                        Copy
                      </button>
                    </div>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{selectedCreative.suggested_caption}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <ReportIssueButton moduleName="Creatives Library" />
    </div>
  );
}
