import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, TrendingUp, PieChart, LineChart, ArrowLeft } from 'lucide-react';
import { PlatformReportsHeader } from './PlatformReportsHeader';
import ReportIssueButton from '../ReportIssueButton';

export function PlatformReports() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50">
      <PlatformReportsHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Reports</h1>
          <p className="text-lg text-slate-600">
            Analytics, insights, and business intelligence
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border-2 border-cyan-100 p-12">
          <div className="text-center max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-6 rounded-2xl inline-block mb-6">
              <BarChart3 className="w-20 h-20 text-white" />
            </div>

            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Reports Module
            </h2>

            <p className="text-lg text-slate-600 mb-8">
              This module is ready for implementation. Features will include comprehensive analytics,
              business intelligence dashboards, custom reports, and data visualization tools.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <div className="bg-cyan-50 p-6 rounded-xl border border-cyan-200">
                <TrendingUp className="w-10 h-10 text-cyan-600 mx-auto mb-3" />
                <h3 className="font-bold text-slate-900 mb-2">Trend Analysis</h3>
                <p className="text-sm text-slate-600">Track business performance trends</p>
              </div>

              <div className="bg-cyan-50 p-6 rounded-xl border border-cyan-200">
                <PieChart className="w-10 h-10 text-cyan-600 mx-auto mb-3" />
                <h3 className="font-bold text-slate-900 mb-2">Visual Reports</h3>
                <p className="text-sm text-slate-600">Interactive charts and graphs</p>
              </div>

              <div className="bg-cyan-50 p-6 rounded-xl border border-cyan-200">
                <LineChart className="w-10 h-10 text-cyan-600 mx-auto mb-3" />
                <h3 className="font-bold text-slate-900 mb-2">Custom Analytics</h3>
                <p className="text-sm text-slate-600">Build personalized reports</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <ReportIssueButton moduleName="Platform Reports" />
    </div>
  );
}
