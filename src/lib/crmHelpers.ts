import { supabase } from './supabase';

export async function generateFollowUps(leadId: string, createdAt: string) {
  const followUpSchedule = [
    { number: 1, daysOffset: 0 },
    { number: 2, daysOffset: 2 },
    { number: 3, daysOffset: 5 },
    { number: 4, daysOffset: 10 },
    { number: 5, daysOffset: 20 }
  ];

  const baseDate = new Date(createdAt);

  const followUps = followUpSchedule.map(schedule => {
    const followUpDate = new Date(baseDate);
    followUpDate.setDate(baseDate.getDate() + schedule.daysOffset);

    return {
      lead_id: leadId,
      follow_up_number: schedule.number,
      follow_up_date: followUpDate.toISOString(),
      status: 'pending',
      notes: ''
    };
  });

  const { error } = await supabase
    .from('crm_follow_ups')
    .insert(followUps);

  if (error) {
    console.error('Error generating follow-ups:', error);
    throw error;
  }

  return followUps;
}

export async function addTimelineEvent(
  leadId: string,
  eventType: string,
  eventDescription: string,
  userId: string,
  oldValue?: string,
  newValue?: string
) {
  const { error } = await supabase
    .from('crm_lead_timeline')
    .insert({
      lead_id: leadId,
      event_type: eventType,
      event_description: eventDescription,
      old_value: oldValue,
      new_value: newValue,
      created_by: userId
    });

  if (error) {
    console.error('Error adding timeline event:', error);
    throw error;
  }
}

export function isOverdue(followUpDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const followUp = new Date(followUpDate);
  followUp.setHours(0, 0, 0, 0);

  return followUp < today;
}

export function isToday(dateString: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);

  return date.getTime() === today.getTime();
}

export function isTomorrow(dateString: string): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);

  return date.getTime() === tomorrow.getTime();
}

export function getUserRole(user: any): 'admin' | 'moderator' | 'team' {
  return user?.raw_user_meta_data?.role || 'team';
}

export function canAccessLead(leadAssignedTo: string, currentUserId: string, userRole: string): boolean {
  if (userRole === 'admin' || userRole === 'moderator') {
    return true;
  }
  return leadAssignedTo === currentUserId;
}

export function canEditLead(leadAssignedTo: string, currentUserId: string, userRole: string): boolean {
  if (userRole === 'admin') {
    return true;
  }
  if (userRole === 'moderator') {
    return false;
  }
  return leadAssignedTo === currentUserId;
}
