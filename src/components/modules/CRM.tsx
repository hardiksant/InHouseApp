import React, { useState, useEffect } from 'react';
import {
  Users, UserPlus, Calendar, TrendingUp, Phone, Clock,
  CheckCircle, AlertCircle, DollarSign, Filter, Search
} from 'lucide-react';
import { CRMHeader } from './CRMHeader';
import { DailyHotLeads } from './crm/DailyHotLeads';
import { AllLeads } from './crm/AllLeads';
import { FollowUpsDashboard } from './crm/FollowUpsDashboard';
import { Customers } from './crm/Customers';
import ReportIssueButton from '../ReportIssueButton';
import { SalesHistory } from './crm/SalesHistory';
import { OrderBook } from './crm/OrderBook';
import { ModeratorDispatchWorkflow } from './crm/ModeratorDispatchWorkflow';
import { SalesAnalytics } from './crm/SalesAnalytics';
import { supabase, CRMLead, CRMFollowUp } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type CRMView = 'dashboard' | 'hot-leads' | 'all-leads' | 'follow-ups' | 'customers' | 'sales-history' | 'order-book' | 'dispatch-workflow' | 'sales-analytics';

export function CRM() {
  const { user, userProfile } = useAuth();
  const isAdmin = userProfile?.role === 'admin';

  const [currentView, setCurrentView] = useState<CRMView>('dashboard');
  const [stats, setStats] = useState({
    leadsToday: 0,
    followUpsToday: 0,
    hotLeads: 0,
    convertedCustomers: 0,
    overdueFollowUps: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString();
      const tomorrowStr = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString();

      const { count: leadsToday } = await supabase
        .from('crm_leads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStr)
        .lt('created_at', tomorrowStr);

      const { count: followUpsToday } = await supabase
        .from('crm_follow_ups')
        .select('*', { count: 'exact', head: true })
        .gte('follow_up_date', todayStr)
        .lt('follow_up_date', tomorrowStr)
        .eq('status', 'pending');

      // FIX: correctly count all active hot leads excluding terminal statuses
      const { count: hotLeads } = await supabase
        .from('crm_leads')
        .select('*', { count: 'exact', head: true })
        .eq('is_hot_lead', true)
        .not('status', 'in', '("sold","not_interested")');

      const { count: convertedCustomers } = await supabase
        .from('crm_customers')
        .select('*', { count: 'exact', head: true });

      const { count: overdueFollowUps } = await supabase
        .from('crm_follow_ups')
        .select('*', { count: 'exact', head: true })
        .lt('follow_up_date', todayStr)
        .eq('status', 'pending');

      setStats({
        leadsToday: leadsToday || 0,
        followUpsToday: followUpsToday || 0,
        hotLeads: hotLeads || 0,
        convertedCustomers: convertedCustomers || 0,
        overdueFollowUps: overdueFollowUps || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'hot-leads':
        return <DailyHotLeads onRefresh={fetchStats} />;
      case 'all-leads':
        return <AllLeads />;
      case 'follow-ups':
        return <FollowUpsDashboard onRefresh={fetchStats} />;
      case 'customers':
        return <Customers />;
      case 'sales-history':
        return <SalesHistory />;
      case 'order-book':
        return <OrderBook />;
      case 'dispatch-workflow':
        return <ModeratorDispatchWorkflow />;
      case 'sales-analytics':
        return <SalesAnalytics />;
      default:
        return renderDashboard();
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-lg border-2 border-blue-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <UserPlus className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-3xl font-bold text-blue-600">{stats.leadsToday}</span>
          </div>
          <h3 className="text-sm font-medium text-slate-600">Leads Today</h3>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border-2 border-orange-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-100 rounded-xl">
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
            <span className="text-3xl font-bold text-orange-600">{stats.followUpsToday}</span>
          </div>
          <h3 className="text-sm font-medium text-slate-600">Follow-ups Today</h3>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border-2 border-red-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-100 rounded-xl">
              <TrendingUp className="w-6 h-6 text-red-600" />
            </div>
            <span className="text-3xl font-bold text-red-600">{stats.hotLeads}</span>
          </div>
          <h3 className="text-sm font-medium text-slate-600">Hot Leads</h3>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border-2 border-green-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-3xl font-bold text-green-600">{stats.convertedCustomers}</span>
          </div>
          <h3 className="text-sm font-medium text-slate-600">Customers</h3>
        </div>
      </div>

      {stats.overdueFollowUps > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <div>
              <h3 className="text-lg font-bold text-red-900">
                {stats.overdueFollowUps} Overdue Follow-ups
              </h3>
              <p className="text-sm text-red-700">
                You have pending follow-ups that need immediate attention
              </p>
            </div>
            <button
              onClick={() => setCurrentView('follow-ups')}
              className="ml-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              View Now
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-100 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={() => setCurrentView('hot-leads')}
              className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl hover:from-blue-100 hover:to-blue-200 transition"
            >
              <UserPlus className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-900">Add New Lead</span>
            </button>
            <button
              onClick={() => setCurrentView('follow-ups')}
              className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl hover:from-orange-100 hover:to-orange-200 transition"
            >
              <Phone className="w-5 h-5 text-orange-600" />
              <span className="font-medium text-orange-900">View Follow-ups</span>
            </button>
            <button
              onClick={() => setCurrentView('customers')}
              className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl hover:from-green-100 hover:to-green-200 transition"
            >
              <Users className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-900">View Customers</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-100 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Module Overview</h3>
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span>Daily Hot Leads</span>
              <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full font-medium">
                High Priority
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span>Follow-up Management</span>
              <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full font-medium">
                Auto-scheduled
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span>Lead Conversion</span>
              <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                Track Sales
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span>Customer Database</span>
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                Full History
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <CRMHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">CRM System</h1>
          <p className="text-lg text-slate-600">
            Manage leads, follow-ups, and customer relationships
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-100 p-2 mb-8">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                currentView === 'dashboard'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setCurrentView('hot-leads')}
              className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                currentView === 'hot-leads'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Daily Hot Leads
            </button>
            <button
              onClick={() => setCurrentView('all-leads')}
              className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                currentView === 'all-leads'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Leads
            </button>
            <button
              onClick={() => setCurrentView('follow-ups')}
              className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                currentView === 'follow-ups'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Follow-ups
              {stats.overdueFollowUps > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {stats.overdueFollowUps}
                </span>
              )}
            </button>
            <button
              onClick={() => setCurrentView('customers')}
              className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                currentView === 'customers'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Customers
            </button>
            <button
              onClick={() => setCurrentView('sales-history')}
              className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                currentView === 'sales-history'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Sales History
            </button>
            <button
              onClick={() => setCurrentView('order-book')}
              className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                currentView === 'order-book'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Order Book
            </button>
            {(userProfile?.role === 'admin' || userProfile?.role === 'moderator') && (
              <button
                onClick={() => setCurrentView('dispatch-workflow')}
                className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                  currentView === 'dispatch-workflow'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Dispatch Workflow
              </button>
            )}
            <button
              onClick={() => setCurrentView('sales-analytics')}
              className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                currentView === 'sales-analytics'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Sales Analytics
            </button>
          </div>
        </div>

        {renderView()}
      </main>
      <ReportIssueButton moduleName="CRM" />
    </div>
  );
}