import React, { useState, useEffect } from 'react';
import { supabase, Expense } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../lib/currency';
import { Calendar, DollarSign, Receipt, RefreshCw, TrendingUp } from 'lucide-react';
import { DashboardHeader } from './DashboardHeader';
import { DashboardBanner } from './DashboardBanner';
import ReportIssueButton from './ReportIssueButton';

export function Dashboard() {
  const { user, userProfile, isAdmin } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('added_by', user!.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (err) {
      console.error('Error loading expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);

  const thisMonthExpenses = expenses
    .filter((exp) => {
      const expDate = new Date(exp.date);
      const now = new Date();
      return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);

  const recurringExpenses = expenses.filter((exp) => exp.is_recurring);
  const recurringTotal = recurringExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);

  const recentExpenses = expenses.slice(0, 5);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      <DashboardBanner />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-600 mt-2">Welcome back! Here's your expense summary</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {isAdmin && (
            <>
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-100">Total Expenses</p>
                    <p className="text-4xl font-bold mt-2">
                      {formatCurrency(totalExpenses)}
                    </p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm p-3 rounded-lg">
                    <DollarSign className="w-10 h-10" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-100">This Month</p>
                    <p className="text-4xl font-bold mt-2">
                      {formatCurrency(thisMonthExpenses)}
                    </p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm p-3 rounded-lg">
                    <Calendar className="w-10 h-10" />
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-100">Total Items</p>
                <p className="text-4xl font-bold mt-2">{expenses.length}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-lg">
                <Receipt className="w-10 h-10" />
              </div>
            </div>
          </div>
        </div>

        {recurringExpenses.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border-2 border-blue-100 mb-6 overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 p-3 rounded-xl shadow-md">
                    <RefreshCw className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Recurring Expenses</h2>
                    <p className="text-sm text-gray-600">Subscriptions and periodic payments</p>
                  </div>
                </div>
                {isAdmin && (
                  <div className="text-right bg-white rounded-lg p-4 shadow-sm">
                    <p className="text-sm font-medium text-gray-600">Total Monthly</p>
                    <p className="text-3xl font-bold text-blue-600">{formatCurrency(recurringTotal)}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recurringExpenses.map((expense) => (
                  <div key={expense.id} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border-2 border-gray-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold text-gray-900 text-lg">{expense.recurring_vendor || expense.title}</p>
                        <p className="text-xs text-gray-500 mt-1 font-medium">{expense.category}</p>
                      </div>
                      <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-semibold capitalize shadow-sm">
                        {expense.recurring_frequency}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600 mt-3">
                      {formatCurrency(parseFloat(expense.amount.toString()))}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
            <div className="flex items-center gap-3">
              <div className="bg-green-600 p-3 rounded-xl shadow-md">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Recent Activity</h2>
                <p className="text-sm text-gray-600">Your latest expense entries</p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {recentExpenses.length === 0 ? (
              <div className="p-12 text-center">
                <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No recent expenses</p>
              </div>
            ) : (
              recentExpenses.map((expense) => (
                <div key={expense.id} className="p-6 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 transition-all cursor-pointer border-l-4 border-transparent hover:border-blue-500">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900 text-lg">{expense.title}</p>
                        {expense.is_recurring && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-semibold shadow-sm">
                            <RefreshCw className="w-3 h-3" />
                            {expense.recurring_frequency}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-sm text-gray-600 font-medium">
                          {new Date(expense.date).toLocaleDateString()}
                        </span>
                        <span className="px-3 py-1 bg-gray-200 text-gray-800 rounded-full text-xs font-medium">
                          {expense.category}
                        </span>
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium capitalize">
                          {expense.payment_method}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(parseFloat(expense.amount.toString()))}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
      <ReportIssueButton moduleName="Expense Pilot Dashboard" />
    </div>
  );
}
