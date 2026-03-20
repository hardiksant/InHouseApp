import React, { useEffect, useState } from 'react';
import { Clock, User, CheckCircle, XCircle, AlertCircle, Package, Truck, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ActivityLog {
  id: string;
  action: string;
  description: string;
  user_name: string | null;
  created_at: string;
  metadata: Record<string, any> | null;
}

interface ActivityTimelineProps {
  referenceId: string;
  referenceType: string;
}

export function ActivityTimeline({ referenceId, referenceType }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, [referenceId, referenceType]);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('reference_id', referenceId)
        .eq('reference_type', referenceType)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-blue-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'status_changed':
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      case 'tracking_added':
        return <MapPin className="w-5 h-5 text-purple-600" />;
      case 'dispatched':
        return <Truck className="w-5 h-5 text-blue-600" />;
      case 'product_prepared':
        return <Package className="w-5 h-5 text-green-600" />;
      case 'updated':
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Timeline</h3>
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Timeline</h3>
        <div className="text-center py-8 text-gray-500">
          <Clock className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No activity recorded yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Timeline</h3>

      <div className="relative">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

        <div className="space-y-6">
          {activities.map((activity, index) => (
            <div key={activity.id} className="relative flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center z-10">
                {getActivityIcon(activity.action)}
              </div>

              <div className="flex-1 pt-1">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {activity.description}
                    </p>
                    {activity.user_name && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                        <User className="w-3 h-3" />
                        <span>{activity.user_name}</span>
                      </div>
                    )}
                    {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                      <div className="mt-2 bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
                        {activity.metadata.old_status && activity.metadata.new_status && (
                          <div>
                            <span className="font-medium">Status:</span>{' '}
                            <span className="text-gray-500">{activity.metadata.old_status}</span>
                            {' → '}
                            <span className="text-green-600">{activity.metadata.new_status}</span>
                          </div>
                        )}
                        {activity.metadata.tracking_id && (
                          <div>
                            <span className="font-medium">Tracking ID:</span>{' '}
                            {activity.metadata.tracking_id}
                          </div>
                        )}
                        {activity.metadata.courier_partner && (
                          <div>
                            <span className="font-medium">Courier:</span>{' '}
                            {activity.metadata.courier_partner}
                          </div>
                        )}
                        {activity.metadata.notes && (
                          <div className="mt-1">
                            <span className="font-medium">Notes:</span>{' '}
                            {activity.metadata.notes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-gray-500 whitespace-nowrap">
                    {getTimeAgo(activity.created_at)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
