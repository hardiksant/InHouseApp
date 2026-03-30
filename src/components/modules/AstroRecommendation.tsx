import React, { useState, useEffect } from 'react';
import { Users, FileText, History, ArrowLeft, Download, Share2, Sparkles, Check, X } from 'lucide-react';
import { AstroRecommendationHeader } from './AstroRecommendationHeader';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import ReportIssueButton from '../ReportIssueButton';
import { useToast } from '../../contexts/ToastContext';
import {
  RASHI_MAPPINGS,
  PROBLEM_OPTIONS,
  BUDGET_OPTIONS,
  getTier1Recommendations,
  getTier2Kavach,
  getTier3Recommendations,
  getMukhiBenefits,
  Tier1Recommendation,
  Tier3Recommendation
} from '../../lib/astroRecommendation';
import { generateRecommendationPDF } from '../../lib/pdfGenerator';
import { shareOnWhatsApp } from '../../lib/whatsappShare';

interface FormData {
  customerName: string;
  gender: string;
  dob: string;
  rashi: string;
  problem: string;
  budgetPreference: string;
  notes: string;
}

interface InventoryStatus {
  [mukhi: string]: boolean;
}

interface RecommendationResult {
  tier1: Tier1Recommendation[];
  tier2: string;
  tier3: Tier3Recommendation[];
}

interface SavedRecommendation {
  id: string;
  customer_name: string;
  gender: string;
  dob: string | null;
  rashi: string;
  problem: string;
  budget_preference: string;
  created_at: string;
  tier1_beads: any;
  tier2_kavach: string;
  tier3_beads: any;
}

export function AstroRecommendation() {
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();
  const [showForm, setShowForm] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    customerName: '',
    gender: 'Male',
    dob: '',
    rashi: 'Aries',
    problem: 'General Wellbeing',
    budgetPreference: 'Medium',
    notes: ''
  });
  const [recommendation, setRecommendation] = useState<RecommendationResult | null>(null);
  const [inventory, setInventory] = useState<InventoryStatus>({});
  const [history, setHistory] = useState<SavedRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  useEffect(() => {
    if (!showForm && recommendation) {
      checkInventory();
    }
  }, [showForm, recommendation]);

  useEffect(() => {
    if (showHistory) {
      fetchHistory();
    }
  }, [showHistory]);

  const checkInventory = async () => {
    if (!user || !recommendation) return;

    const allMukhis = new Set<string>();
    recommendation.tier1.forEach(r => allMukhis.add(r.mukhi));
    recommendation.tier3.forEach(r => allMukhis.add(r.mukhi));

    const inventoryStatus: InventoryStatus = {};

    for (const mukhi of allMukhis) {
      const { data } = await supabase
        .from('rudraksha_beads')
        .select('id')
        .eq('mukhi', mukhi)
        .eq('status', 'Available')
        .eq('created_by', user.id)
        .limit(1)
        .maybeSingle();

      inventoryStatus[mukhi] = !!data;
    }

    setInventory(inventoryStatus);
  };

  const fetchHistory = async () => {
    if (!user) return;

    const query = supabase
      .from('astro_recommendations')
      .select('*')
      .order('created_at', { ascending: false });

    if (!isAdmin) {
      query.eq('created_by', user.id);
    }

    const { data } = await query;
    if (data) {
      setHistory(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const tier1 = getTier1Recommendations(formData.rashi);
    const tier2 = getTier2Kavach(formData.rashi);
    const tier3 = getTier3Recommendations();

    const result: RecommendationResult = { tier1, tier2, tier3 };
    setRecommendation(result);

    await supabase.from('astro_recommendations').insert({
      customer_name: formData.customerName,
      gender: formData.gender,
      dob: formData.dob || null,
      rashi: formData.rashi,
      problem: formData.problem,
      budget_preference: formData.budgetPreference,
      notes: formData.notes,
      tier1_beads: tier1,
      tier2_kavach: tier2,
      tier3_beads: tier3,
      created_by: user!.id
    });

    setLoading(false);
    setShowForm(false);
  };

  const handleGeneratePDF = async () => {
    if (!recommendation || !user) return;

    setGeneratingPDF(true);

    try {
      const consultantInfo = {
        name: user.email?.split('@')[0] || 'Consultant',
        phone: '+91-XXXXXXXXXX'
      };

      const recommendedMukhis = recommendation.tier3.map(rec => rec.mukhi.toString());

      const { data: availableBeads } = await supabase
        .from('rudraksha_beads')
        .select('code, mukhi, size_mm, lab, status')
        .in('mukhi', recommendedMukhis)
        .eq('status', 'Available')
        .order('mukhi', { ascending: true });

      const pdfBlob = await generateRecommendationPDF(
        {
          name: formData.customerName,
          gender: formData.gender,
          dob: formData.dob,
          rashi: formData.rashi,
          problem: formData.problem,
          budgetPreference: formData.budgetPreference
        },
        recommendation,
        consultantInfo,
        availableBeads || []
      );

      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Rudraksha_Recommendation_${formData.customerName.replace(/\s+/g, '_')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      showToast('Failed to generate PDF. Please try again.', 'error');
    }

    setGeneratingPDF(false);
  };

  const handleShareWhatsApp = () => {
    if (!recommendation) return;

    let message = `*Rudraksha Recommendation for ${formData.customerName}*\n\n`;
    message += `Rashi: ${formData.rashi}\n`;
    message += `Concern: ${formData.problem}\n\n`;

    message += `*Tier 1 - Wear Any One:*\n`;
    recommendation.tier1.forEach(r => {
      message += `• ${r.mukhi} Mukhi - ${r.purpose}\n`;
    });

    message += `\n*Tier 2 - Kavach:*\n`;
    message += `${recommendation.tier2}\n\n`;

    message += `*Tier 3 - Premium Options:*\n`;
    recommendation.tier3.forEach(r => {
      message += `• ${r.mukhi} Mukhi - ${r.benefit}\n`;
    });

    message += `\n_Nepali Rudraksh Wala - Beads & Mala LLP_`;

    shareOnWhatsApp(message);
  };

  const handleNewRecommendation = () => {
    setShowForm(true);
    setRecommendation(null);
    setFormData({
      customerName: '',
      gender: 'Male',
      dob: '',
      rashi: 'Aries',
      problem: 'General Wellbeing',
      budgetPreference: 'Medium',
      notes: ''
    });
  };

  if (showHistory) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
        <AstroRecommendationHeader />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <button
            onClick={() => setShowHistory(false)}
            className="flex items-center gap-2 text-orange-600 hover:text-orange-700 mb-6 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>

          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 mb-3">Recommendation History</h1>
            <p className="text-lg text-slate-600">View all past recommendations</p>
          </div>

          <div className="space-y-4">
            {history.map((rec) => (
              <div
                key={rec.id}
                className="bg-white rounded-2xl shadow-lg border-2 border-orange-100 p-6 hover:shadow-xl transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{rec.customer_name}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-slate-600">Gender:</span>
                        <span className="ml-2 font-medium text-slate-900">{rec.gender}</span>
                      </div>
                      <div>
                        <span className="text-slate-600">Rashi:</span>
                        <span className="ml-2 font-medium text-slate-900">{rec.rashi}</span>
                      </div>
                      <div>
                        <span className="text-slate-600">Concern:</span>
                        <span className="ml-2 font-medium text-slate-900">{rec.problem}</span>
                      </div>
                      <div>
                        <span className="text-slate-600">Date:</span>
                        <span className="ml-2 font-medium text-slate-900">
                          {new Date(rec.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-sm text-slate-600 mb-2">Recommendations:</p>
                      <p className="text-sm font-medium text-orange-600">{rec.tier2_kavach}</p>
                    </div>
                  </div>
                  <FileText className="w-6 h-6 text-orange-600 ml-4" />
                </div>
              </div>
            ))}

            {history.length === 0 && (
              <div className="bg-white rounded-2xl shadow-lg border-2 border-orange-100 p-12 text-center">
                <History className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No recommendations found</p>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      <AstroRecommendationHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-3">Astro Recommendation</h1>
            <p className="text-lg text-slate-600">Generate personalized Rudraksha recommendations</p>
          </div>
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition shadow-lg"
          >
            <History className="w-5 h-5" />
            View History
          </button>
        </div>

        {showForm ? (
          <div className="bg-white rounded-2xl shadow-lg border-2 border-orange-100 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Enter customer name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Rashi <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.rashi}
                    onChange={(e) => setFormData({ ...formData, rashi: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {RASHI_MAPPINGS.map((r) => (
                      <option key={r.rashi} value={r.rashi}>
                        {r.rashi} ({r.planet})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Problem / Goal <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.problem}
                    onChange={(e) => setFormData({ ...formData, problem: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {PROBLEM_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Budget Preference <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.budgetPreference}
                    onChange={(e) => setFormData({ ...formData, budgetPreference: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {BUDGET_OPTIONS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Any additional information..."
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white px-8 py-3 rounded-xl font-medium hover:from-orange-700 hover:to-amber-700 transition shadow-lg disabled:opacity-50"
                >
                  <Sparkles className="w-5 h-5" />
                  {loading ? 'Generating...' : 'Generate Recommendation'}
                </button>
              </div>
            </form>
          </div>
        ) : recommendation && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border-2 border-orange-100 p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">{formData.customerName}</h2>
                  <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                    <span>Rashi: <strong>{formData.rashi}</strong></span>
                    <span>•</span>
                    <span>Concern: <strong>{formData.problem}</strong></span>
                    <span>•</span>
                    <span>Budget: <strong>{formData.budgetPreference}</strong></span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleShareWhatsApp}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                  <button
                    onClick={handleGeneratePDF}
                    disabled={generatingPDF}
                    className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white px-4 py-2 rounded-lg font-medium hover:from-orange-700 hover:to-amber-700 transition disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    {generatingPDF ? 'Generating...' : 'Download PDF'}
                  </button>
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="bg-orange-100 text-orange-700 px-4 py-2 rounded-lg font-bold text-sm">
                      TIER 1
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Wear Any One</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {recommendation.tier1.map((rec, index) => (
                      <div
                        key={index}
                        className="border-2 border-orange-200 rounded-xl p-4 hover:border-orange-400 transition"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-lg font-bold text-orange-600">{rec.mukhi} Mukhi</h4>
                          {inventory[rec.mukhi] !== undefined && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              inventory[rec.mukhi]
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {inventory[rec.mukhi] ? (
                                <span className="flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  Available
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <X className="w-3 h-3" />
                                  Out of Stock
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mb-2">{rec.purpose}</p>
                        <p className="text-xs text-slate-500">{getMukhiBenefits(rec.mukhi)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-bold text-sm">
                      TIER 2
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Kavach Recommendation</h3>
                  </div>
                  <div className="border-2 border-blue-200 rounded-xl p-6 bg-blue-50">
                    <h4 className="text-2xl font-bold text-blue-900 mb-2">{recommendation.tier2}</h4>
                    <p className="text-slate-700">
                      Wear all three beads together as a sacred combination for enhanced benefits and complete protection.
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg font-bold text-sm">
                      TIER 3
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Premium Rudraksha</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recommendation.tier3.map((rec, index) => (
                      <div
                        key={index}
                        className="border-2 border-purple-200 rounded-xl p-4 hover:border-purple-400 transition bg-gradient-to-br from-purple-50 to-pink-50"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-lg font-bold text-purple-600">{rec.mukhi} Mukhi</h4>
                          {inventory[rec.mukhi] !== undefined && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              inventory[rec.mukhi]
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {inventory[rec.mukhi] ? (
                                <span className="flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  Available
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <X className="w-3 h-3" />
                                  Out of Stock
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-700">{rec.benefit}</p>
                        <p className="text-xs text-slate-600 mt-2">{getMukhiBenefits(rec.mukhi)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleNewRecommendation}
                className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white px-8 py-3 rounded-xl font-medium hover:from-orange-700 hover:to-amber-700 transition shadow-lg"
              >
                <Users className="w-5 h-5" />
                New Recommendation
              </button>
            </div>
          </div>
        )}
      </main>
      <ReportIssueButton moduleName="Astro Recommendation" />
    </div>
  );
}
