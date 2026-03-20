import { supabase } from './supabase';
import { createActivityLog } from './notificationHelper';

export interface LogActivityParams {
  userId: string;
  userName: string;
  actionType: string;
  actionDescription: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const { error } = await supabase.rpc('log_activity', {
      p_user_id: params.userId,
      p_user_name: params.userName,
      p_action_type: params.actionType,
      p_action_description: params.actionDescription,
      p_entity_type: params.entityType || null,
      p_entity_id: params.entityId || null,
      p_metadata: params.metadata || {}
    });

    if (error) {
      console.error('Error logging activity:', error);
    }

    if (params.entityId && params.entityType) {
      await createActivityLog({
        referenceId: params.entityId,
        referenceType: params.entityType,
        action: params.actionType,
        description: params.actionDescription,
        userId: params.userId,
        userName: params.userName,
        metadata: params.metadata
      });
    }
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

export const ActivityTypes = {
  LEAD_CREATED: 'lead_created',
  LEAD_UPDATED: 'lead_updated',
  LEAD_CONVERTED: 'lead_converted',
  LEAD_DELETED: 'lead_deleted',

  FOLLOW_UP_CREATED: 'follow_up_created',
  FOLLOW_UP_COMPLETED: 'follow_up_completed',
  FOLLOW_UP_UPDATED: 'follow_up_updated',

  BILL_GENERATED: 'bill_generated',
  BILL_UPDATED: 'bill_updated',
  BILL_DELETED: 'bill_deleted',

  PRODUCT_ADDED: 'product_added',
  PRODUCT_UPDATED: 'product_updated',
  PRODUCT_DELETED: 'product_deleted',

  EXPENSE_ADDED: 'expense_added',
  EXPENSE_UPDATED: 'expense_updated',
  EXPENSE_DELETED: 'expense_deleted',

  USER_CREATED: 'user_created',
  USER_UPDATED: 'user_updated',
  USER_ACTIVATED: 'user_activated',
  USER_DEACTIVATED: 'user_deactivated',

  LOGIN: 'login',
  LOGOUT: 'logout',

  CREATIVE_UPLOADED: 'creative_uploaded',
  CREATIVE_UPDATED: 'creative_updated',
  CREATIVE_DELETED: 'creative_deleted',

  RECOMMENDATION_CREATED: 'recommendation_created',
  RECOMMENDATION_UPDATED: 'recommendation_updated',

  SETTINGS_UPDATED: 'settings_updated'
} as const;
