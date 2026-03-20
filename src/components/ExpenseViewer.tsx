import React, { useState, useEffect } from 'react';
import { supabase, Expense } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../lib/currency';
import { exportToCSV, exportToPDF } from '../lib/exportUtils';
import ReportIssueButton from './ReportIssueButton';
import { Calendar, Filter, DollarSign, TrendingUp, FileSpreadsheet, FileText, Search } from 'lucide-react';
import { DashboardHeader } from './DashboardHeader';
import { DashboardBanner } from './DashboardBanner';
import { ExpenseDetailsModal } from './ExpenseDetailsModal';

type FilterType = 'specific-date' | 'date-range' | 'month' | 'financial-year';

export function ExpenseViewer() {
  const { user, userProfile } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<FilterType>('month');
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const [specificDate, setSpecificDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedFY, setSelectedFY] = useState('');

  useEffect(() => {
    loadExpenses();
    initializeDefaults();
  }, []);

  const initializeDefaults = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${year}-${month}`);

    const fyStart = now.getMonth() >= 3 ? year : year - 1;
    setSelectedFY(`${fyStart}-${fyStart + 1}`);
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
    let filtered = [...expenses];

    switch (filterType) {
      case 'specific-date':
        if (specificDate) {
          filtered = expenses.filter(exp => {
            const expDate = new Date(exp.date).toISOString().split('T')[0];
            return expDate === specificDate;
          });
        }
        break;

      case 'date-range':
        if (startDate && endDate) {
          filtered = expenses.filter(exp => {
            const expDate = new Date(exp.date);
            return expDate >= new Date(startDate) && expDate <= new Date(endDate);
          });
        }
        break;

      case 'month':
        if (selectedMonth) {
          const [year, month] = selectedMonth.split('-').map(Number);
          filtered = expenses.filter(exp => {
            const expDate = new Date(exp.date);
            return expDate.getMonth() + 1 === month && expDate.getFullYear() === year;
          });
        }
        break;

      case 'financial-year':
        if (selectedFY) {
          const [startYear] = selectedFY.split('-').map(Number);
          const fyStart = new Date(startYear, 3, 1);
          const fyEnd = new Date(startYear + 1, 2, 31, 23, 59, 59);
          filtered = expenses.filter(exp => {
            const expDate = new Date(exp.date);
            return expDate >= fyStart && expDate <= fyEnd;
          });
        }
        break;
    }

    return filtered;
  };

  const filteredExpenses = getFilteredExpenses();
  const totalAmount = filteredExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);

  const categoryBreakdown = filteredExpenses.reduce((acc, exp) => {
    if (!acc[exp.category]) {
      acc[exp.category] = 0;
    }
    acc[exp.category] += parseFloat(exp.amount.toString());
    return acc;
  }, {} as Record<string, number>);

  const paymentMethodBreakdown = filteredExpenses.reduce((acc, exp) => {
    if (!acc[exp.payment_method]) {
      acc[exp.payment_method] = 0;
    }
    acc[exp.payment_method] += parseFloat(exp.amount.toString());
    return acc;
  }, {} as Record<string, number>);

  const handleExportCSV = () => {
    const filename = `expense-viewer-${filterType}-${new Date().toISOString().split('T')[0]}.csv`;
    exportToCSV(filteredExpenses, filename);
  };

  const handleExportPDF = () => {
    let dateRange = '';
    switch (filterType) {
      case 'specific-date':
        dateRange = specificDate ? new Date(specificDate).toLocaleDateString() : '';
        break;
      case 'date-range':
        dateRange = startDate && endDate
          ? `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
          : '';
        break;
      case 'month':
        if (selectedMonth) {
          const [year, month] = selectedMonth.split('-');
          dateRange = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('default', { month: 'long', year: 'numeric' });
        }
        break;
      case 'financial-year':
        dateRange = selectedFY ? `FY ${selectedFY}` : '';
        break;
    }
    exportToPDF(filteredExpenses, `expense-viewer-${filterType}.pdf`, filterType.replace('-', ' '), dateRange);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        <DashboardBanner />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading expenses...</p>
          </div>
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
            <h1 className="text-3xl font-bold text-gray-900">Expense Viewer</h1>
            <p className="text-gray-600 mt-2">View expenses by specific dates, ranges, or periods</p>
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

        <div className="bg-white rounded-xl shadow-lg border-2 border-blue-100 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-600 p-3 rounded-xl">
              <Filter className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Filter Options</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
            <button
              onClick={() => setFilterType('specific-date')}
              className={`px-4 py-3 rounded-lg font-semibold transition ${
                filterType === 'specific-date'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Calendar className="w-5 h-5 inline-block mr-2" />
              Specific Date
            </button>
            <button
              onClick={() => setFilterType('date-range')}
              className={`px-4 py-3 rounded-lg font-semibold transition ${
                filterType === 'date-range'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Calendar className="w-5 h-5 inline-block mr-2" />
              Date Range
            </button>
            <button
              onClick={() => setFilterType('month')}
              className={`px-4 py-3 rounded-lg font-semibold transition ${
                filterType === 'month'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Calendar className="w-5 h-5 inline-block mr-2" />
              Monthly
            </button>
            <button
              onClick={() => setFilterType('financial-year')}
              className={`px-4 py-3 rounded-lg font-semibold transition ${
                filterType === 'financial-year'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <TrendingUp className="w-5 h-5 inline-block mr-2" />
              Financial Year
            </button>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            {filterType === 'specific-date' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Date:
                </label>
                <input
                  type="date"
                  value={specificDate}
                  onChange={(e) => setSpecificDate(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                />
              </div>
            )}

            {filterType === 'date-range' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Start Date:
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    End Date:
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                  />
                </div>
              </div>
            )}

            {filterType === 'month' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Month:
                </label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                />
              </div>
            )}

            {filterType === 'financial-year' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Financial Year (April - March):
                </label>
                <select
                  value={selectedFY}
                  onChange={(e) => setSelectedFY(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                >
                  {Array.from({ length: 10 }, (_, i) => {
                    const year = new Date().getFullYear() - 5 + i;
                    return (
                      <option key={year} value={`${year}-${year + 1}`}>
                        FY {year}-{year + 1} (Apr {year} - Mar {year + 1})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-100">Total Amount</p>
                <p className="text-4xl font-bold mt-2">{formatCurrency(totalAmount)}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-lg">
                <DollarSign className="w-10 h-10" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-100">Transactions</p>
                <p className="text-4xl font-bold mt-2">{filteredExpenses.length}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-lg">
                <TrendingUp className="w-10 h-10" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-600 to-amber-700 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-100">Categories</p>
                <p className="text-4xl font-bold mt-2">{Object.keys(categoryBreakdown).length}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-lg">
                <Search className="w-10 h-10" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Category Breakdown</h3>
            {Object.keys(categoryBreakdown).length === 0 ? (
              <p className="text-gray-500 text-center py-8">No data available</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(categoryBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, amount]) => (
                    <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition">
                      <span className="font-semibold text-gray-800">{category}</span>
                      <span className="font-bold text-blue-600">{formatCurrency(amount)}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Payment Method Breakdown</h3>
            {Object.keys(paymentMethodBreakdown).length === 0 ? (
              <p className="text-gray-500 text-center py-8">No data available</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(paymentMethodBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([method, amount]) => (
                    <div key={method} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-green-50 transition">
                      <span className="font-semibold text-gray-800 capitalize">{method}</span>
                      <span className="font-bold text-green-600">{formatCurrency(amount)}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-900">Expense Details</h3>
            <p className="text-sm text-gray-600 mt-1">All expenses matching your filter criteria</p>
          </div>

          <div className="overflow-x-auto">
            {filteredExpenses.length === 0 ? (
              <div className="p-12 text-center">
                <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No expenses found for the selected period</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Payment</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredExpenses.map((expense) => (
                    <tr
                      key={expense.id}
                      onClick={() => setSelectedExpense(expense)}
                      className="hover:bg-blue-50 transition cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {new Date(expense.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-semibold">{expense.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 inline-block bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                          {expense.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 inline-block bg-green-100 text-green-800 rounded-full text-xs font-semibold capitalize">
                          {expense.payment_method}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                        {formatCurrency(parseFloat(expense.amount.toString()))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {selectedExpense && (
        <ExpenseDetailsModal
          expense={selectedExpense}
          onClose={() => setSelectedExpense(null)}
        />
      )}
      <ReportIssueButton moduleName="Expense Viewer" />
    </div>
  );
}
