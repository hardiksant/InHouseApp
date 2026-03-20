import { supabase } from './supabase';
import { getAdminUserIds, notifySystemError } from './notificationHelper';

interface ErrorLogData {
  module: string;
  errorMessage: string;
  errorStack?: string;
  errorType: 'JavaScript' | 'API' | 'Unhandled' | 'Form' | 'Network';
  severity?: 'Critical' | 'High' | 'Medium' | 'Low';
  pageUrl?: string;
}

function getBrowserInfo(): string {
  const ua = navigator.userAgent;
  let browser = 'Unknown';

  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';
  else if (ua.includes('Opera')) browser = 'Opera';

  return browser;
}

function getDeviceType(): string {
  const ua = navigator.userAgent;

  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'Tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'Mobile';
  }
  return 'Desktop';
}

function determineSeverity(errorType: string, errorMessage: string): 'Critical' | 'High' | 'Medium' | 'Low' {
  const message = errorMessage.toLowerCase();

  if (errorType === 'Unhandled' || message.includes('critical') || message.includes('fatal')) {
    return 'Critical';
  }

  if (errorType === 'API' || message.includes('network') || message.includes('timeout')) {
    return 'High';
  }

  if (errorType === 'Form' || message.includes('validation')) {
    return 'Medium';
  }

  return 'Low';
}

export async function logError(data: ErrorLogData): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    let userProfile = null;
    if (user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name, email, role')
        .eq('id', user.id)
        .maybeSingle();

      userProfile = profile;
    }

    const severity = data.severity || determineSeverity(data.errorType, data.errorMessage);

    const errorLog = {
      user_id: user?.id || null,
      user_name: userProfile?.full_name || userProfile?.email || 'Anonymous',
      user_email: userProfile?.email || null,
      user_role: userProfile?.role || null,
      module: data.module,
      page_url: data.pageUrl || window.location.href,
      error_message: data.errorMessage.substring(0, 1000),
      error_stack: data.errorStack?.substring(0, 5000) || null,
      error_type: data.errorType,
      severity: severity,
      browser: getBrowserInfo(),
      device_type: getDeviceType(),
      status: 'New'
    };

    await supabase.from('system_errors').insert(errorLog);

    if (severity === 'Critical' || severity === 'High') {
      const adminIds = await getAdminUserIds();
      await notifySystemError(data.errorMessage, data.module, adminIds);
    }
  } catch (error) {
    console.error('Failed to log error to database:', error);
  }
}

export function setupGlobalErrorHandler() {
  window.addEventListener('error', (event) => {
    const moduleName = extractModuleName(window.location.pathname);

    logError({
      module: moduleName,
      errorMessage: event.message || 'Unknown error',
      errorStack: event.error?.stack,
      errorType: 'JavaScript',
      severity: 'High'
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const moduleName = extractModuleName(window.location.pathname);

    logError({
      module: moduleName,
      errorMessage: event.reason?.message || String(event.reason) || 'Unhandled Promise Rejection',
      errorStack: event.reason?.stack,
      errorType: 'Unhandled',
      severity: 'Critical'
    });
  });
}

function extractModuleName(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return 'Home';

  const moduleMap: { [key: string]: string } = {
    'platform': 'Platform Dashboard',
    'expensepilot': 'ExpensePilot',
    'sales-bills': 'Sales Bills',
    'product-library': 'Product Library',
    'creatives': 'Creatives',
    'crm': 'CRM',
    'astro-recommendation': 'Astro Recommendation',
    'platform-reports': 'Platform Reports',
    'settings': 'Settings',
    'user-management': 'User Management',
    'my-profile': 'My Profile',
    'system-reports': 'System Reports',
    'system-errors': 'System Errors',
    'login': 'Login'
  };

  return moduleMap[parts[0]] || parts[0];
}

export async function logAPIError(
  endpoint: string,
  error: any,
  module: string
): Promise<void> {
  const errorMessage = error?.message || error?.error_description || String(error);

  await logError({
    module,
    errorMessage: `API Error at ${endpoint}: ${errorMessage}`,
    errorStack: error?.stack,
    errorType: 'API',
    severity: 'High'
  });
}

export async function logFormError(
  formName: string,
  error: string,
  module: string
): Promise<void> {
  await logError({
    module,
    errorMessage: `Form Error in ${formName}: ${error}`,
    errorType: 'Form',
    severity: 'Medium'
  });
}
