import { supabase } from './supabase';

interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  message: string;
  module: string;
  referenceId?: string;
  referenceType?: string;
}

interface CreateActivityLogParams {
  referenceId: string;
  referenceType: string;
  action: string;
  description: string;
  userId?: string;
  userName?: string;
  metadata?: Record<string, any>;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        module: params.module,
        reference_id: params.referenceId || null,
        reference_type: params.referenceType || null,
        is_read: false
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

export async function createActivityLog(params: CreateActivityLogParams) {
  try {
    const { error } = await supabase
      .from('activity_logs')
      .insert({
        reference_id: params.referenceId,
        reference_type: params.referenceType,
        action: params.action,
        description: params.description,
        user_id: params.userId || null,
        user_name: params.userName || null,
        metadata: params.metadata || null
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error creating activity log:', error);
  }
}

export async function notifyOrderApproval(orderId: string, orderNumber: string, salespersonId: string) {
  await createNotification({
    userId: salespersonId,
    type: 'order_approved',
    title: 'Order Approved',
    message: `Order ${orderNumber} has been approved`,
    module: 'Order Book',
    referenceId: orderId,
    referenceType: 'order'
  });
}

export async function notifyOrderDispatched(orderId: string, orderNumber: string, trackingId: string, salespersonId: string) {
  await createNotification({
    userId: salespersonId,
    type: 'order_dispatched',
    title: 'Order Dispatched',
    message: `Order ${orderNumber} dispatched with tracking ID: ${trackingId}`,
    module: 'Order Book',
    referenceId: orderId,
    referenceType: 'order'
  });
}

export async function notifyTrackingAdded(orderId: string, orderNumber: string, trackingId: string, salespersonId: string) {
  await createNotification({
    userId: salespersonId,
    type: 'tracking_added',
    title: 'Tracking ID Added',
    message: `Tracking ID ${trackingId} added to order ${orderNumber}`,
    module: 'Order Book',
    referenceId: orderId,
    referenceType: 'order'
  });
}

export async function notifyFollowUpReminder(leadId: string, leadName: string, salespersonId: string) {
  await createNotification({
    userId: salespersonId,
    type: 'follow_up_reminder',
    title: 'Follow-up Reminder',
    message: `Follow-up due today for ${leadName}`,
    module: 'CRM',
    referenceId: leadId,
    referenceType: 'lead'
  });
}

export async function notifyNewOrderPendingApproval(orderId: string, orderNumber: string, moderatorIds: string[]) {
  for (const moderatorId of moderatorIds) {
    await createNotification({
      userId: moderatorId,
      type: 'order_pending_approval',
      title: 'New Order Pending',
      message: `Order ${orderNumber} is pending approval`,
      module: 'Order Book',
      referenceId: orderId,
      referenceType: 'order'
    });
  }
}

export async function notifyOrderReadyForDispatch(orderId: string, orderNumber: string, moderatorIds: string[]) {
  for (const moderatorId of moderatorIds) {
    await createNotification({
      userId: moderatorId,
      type: 'order_ready_dispatch',
      title: 'Order Ready for Dispatch',
      message: `Order ${orderNumber} is ready for dispatch`,
      module: 'Order Book',
      referenceId: orderId,
      referenceType: 'order'
    });
  }
}

export async function notifySystemError(errorMessage: string, module: string, adminIds: string[]) {
  for (const adminId of adminIds) {
    await createNotification({
      userId: adminId,
      type: 'system_error',
      title: 'System Error Alert',
      message: `Error in ${module}: ${errorMessage.substring(0, 100)}`,
      module: 'System',
      referenceType: 'error'
    });
  }
}

export async function notifyNewIssueReport(issueId: string, issueTitle: string, module: string, adminIds: string[]) {
  for (const adminId of adminIds) {
    await createNotification({
      userId: adminId,
      type: 'new_issue_report',
      title: 'New Issue Reported',
      message: `${issueTitle} in ${module}`,
      module: 'System Reports',
      referenceId: issueId,
      referenceType: 'issue'
    });
  }
}

export async function getAdminUserIds(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('role', 'admin');

    if (error) throw error;
    return data?.map(u => u.id) || [];
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return [];
  }
}

export async function getModeratorUserIds(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('role', 'moderator');

    if (error) throw error;
    return data?.map(u => u.id) || [];
  } catch (error) {
    console.error('Error fetching moderator users:', error);
    return [];
  }
}

export async function markNotificationAsRead(notificationId: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) throw error;
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
}

export async function markAllNotificationsAsRead(userId: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
  }
}
