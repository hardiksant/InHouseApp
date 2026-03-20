import React, { useState, useEffect } from 'react';
import { supabase, Expense, EXPENSE_CATEGORIES } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../lib/currency';
import { exportToCSV, exportToPDF } from '../lib/exportUtils';
import { getCompanySettings, type CompanySettings } from '../lib/companySettings';
import { TrendingUp, PieChart, BarChart3, Calendar, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { DashboardHeader } from './DashboardHeader';
import { DashboardBanner } from './DashboardBanner';
import ReportIssueButton from './ReportIssueButton';

export function Reports() {
  const { user, userProfile } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<'monthly' | 'yearly' | 'custom'>('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);

  useEffect(() => {
    loadExpenses();
    loadCompanySettings();
  }, [user]);

  const loadCompanySettings = async () => {
    if (!user) return;
    const settings = await getCompanySettings(user.id);
    setCompanySettings(settings);
  };

  const loadExpenses = async () => {
    try {
      const query = supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });

      if (userProfile?.role !== 'admin') {
        query.eq('added_by', user!.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setExpenses(data || []);
    } catch (err) {
      console.error('Error loading expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredExpenses = () => {
    const now = new Date();
    let filtered = [...expenses];

    if (reportType === 'monthly') {
      filtered = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
      });
    } else if (reportType === 'yearly') {
      filtered = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate.getFullYear() === now.getFullYear();
      });
    } else if (reportType === 'custom' && startDate && endDate) {
      filtered = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate >= new Date(startDate) && expDate <= new Date(endDate);
      });
    }

    return filtered;
  };

  const filteredExpenses = getFilteredExpenses();
  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);

  const categoryTotals = EXPENSE_CATEGORIES.map(category => {
    const categoryExpenses = filteredExpenses.filter(exp => exp.category === category);
    const total = categoryExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);
    return {
      category,
      total,
      count: categoryExpenses.length,
      percentage: totalExpenses > 0 ? (total / totalExpenses) * 100 : 0,
    };
  }).filter(item => item.count > 0).sort((a, b) => b.total - a.total);

  const monthlyData = filteredExpenses.reduce((acc, exp) => {
    const date = new Date(exp.date);
    const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
    if (!acc[monthYear]) {
      acc[monthYear] = 0;
    }
    acc[monthYear] += parseFloat(exp.amount.toString());
    return acc;
  }, {} as Record<string, number>);

  const monthlyTotals = Object.entries(monthlyData)
    .map(([month, total]) => ({ month, total }))
    .slice(0, 6);

  const maxMonthlyTotal = Math.max(...monthlyTotals.map(m => m.total), 1);

  const handleExportCSV = () => {
    const filename = `expense-report-${reportType}-${new Date().toISOString().split('T')[0]}.csv`;
    exportToCSV(filteredExpenses, filename);
  };

  const handleExportPDF = () => {
    let dateRange = '';
    if (reportType === 'monthly') {
      const now = new Date();
      dateRange = `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
    } else if (reportType === 'yearly') {
      dateRange = `${new Date().getFullYear()}`;
    } else if (reportType === 'custom' && startDate && endDate) {
      dateRange = `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
    }
    exportToPDF(
      filteredExpenses,
      `expense-report-${reportType}.pdf`,
      reportType.charAt(0).toUpperCase() + reportType.slice(1),
      dateRange,
      companySettings || undefined
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading reports...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      <DashboardBanner />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Expense Reports</h1>
            <p className="text-gray-600 mt-2">Analyze your spending patterns and trends</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold shadow-sm"
            >
              <FileSpreadsheet className="w-5 h-5" />
              Export CSV
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold shadow-sm"
            >
              <FileText className="w-5 h-5" />
              Export PDF
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-gray-700">Report Period:</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setReportType('monthly')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    reportType === 'monthly'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setReportType('yearly')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    reportType === 'yearly'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Yearly
                </button>
                <button
                  onClick={() => setReportType('custom')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    reportType === 'custom'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Custom
                </button>
              </div>
            </div>

            {reportType === 'custom' && (
              <div className="flex items-center gap-3 md:ml-auto">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">From:</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">To:</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {formatCurrency(totalExpenses)}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{filteredExpenses.length}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <BarChart3 className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Categories</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{categoryTotals.length}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <PieChart className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <PieChart className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Expenses by Category</h2>
                  <p className="text-sm text-gray-600">Breakdown of spending by category</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {categoryTotals.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No expense data available</p>
              ) : (
                <div className="space-y-4">
                  {categoryTotals.map((item) => (
                    <div key={item.category}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">{item.category}</span>
                        <span className="text-sm font-bold text-gray-900">
                          {formatCurrency(item.total)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${item.percentage}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {item.count} {item.count === 1 ? 'transaction' : 'transactions'} ({item.percentage.toFixed(1)}%)
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <Calendar className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Monthly Trends</h2>
                  <p className="text-sm text-gray-600">Spending over the last 6 months</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {monthlyTotals.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No expense data available</p>
              ) : (
                <div className="space-y-6">
                  {monthlyTotals.map((item) => (
                    <div key={item.month}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">{item.month}</span>
                        <span className="text-sm font-bold text-gray-900">
                          {formatCurrency(item.total)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-green-600 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${(item.total / maxMonthlyTotal) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <ReportIssueButton moduleName="Reports" />
    </div>
  );
}
