import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { ToastManager } from '../components/ui/Toast';
import { serializeReservationMetadata, parseReservationMetadata, getReservationState } from './reservation-utils';
import { Reservation } from './types';

// Set notification handler to show alerts when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Setup Android channels safely
async function setupNotificationChannels() {
  if (Platform.OS !== 'android') return;

  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#E6C84F',
    });

    await Notifications.setNotificationChannelAsync('sessions', {
      name: 'Session Alerts & Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#E6C84F',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('memberships', {
      name: 'Membership Updates',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#E6C84F',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('workouts', {
      name: 'Workout Plans & AI',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#E6C84F',
      sound: 'default',
    });
  } catch (err) {
    console.warn('[Notifications] Error setting up Android channels:', err);
  }
}

/**
 * Register for Expo push and local notifications
 */
export async function registerForPushNotificationsAsync(userId?: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    // Request browser notification permission if available
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        if (Notification.permission === 'default') {
          await Notification.requestPermission();
        }
      } catch (e) {
        console.warn('[Notifications] Web notification permission error:', e);
      }
    }
    return null;
  }

  let token: string | null = null;

  try {
    await setupNotificationChannels();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Notifications] Permission not granted for push/local notifications');
      return null;
    }

    // Try obtaining push token if on device
    if (Device.isDevice) {
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync();
        token = tokenData?.data ?? null;

        if (token && userId) {
          // Persist token in profile for backend notifications
          await supabase
            .from('profiles')
            .update({ push_token: token } as any)
            .eq('id', userId);
        }
      } catch (tokenErr) {
        console.log('[Notifications] Push token unavailable (local notifications active):', tokenErr);
      }
    }
  } catch (err) {
    console.warn('[Notifications] Setup error:', err);
  }

  return token;
}

/**
 * Dispatches an immediate local notification (sound, banner, vibration)
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>,
  channelId: string = 'default'
) {
  if (Platform.OS !== 'web') {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: true,
          badge: 1,
        },
        trigger: channelId ? { channelId } : null,
      });
    } catch (e) {
      console.warn('[Notifications] Failed to present local notification:', e);
    }
  } else {
    // Web fallback using browser Notification API
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, { body });
      } catch (e) {
        // Fallback silently if blocked
      }
    }
  }
}

/**
 * Build standard Date object from reservation date and time strings
 */
export function buildReservationDateTime(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

/**
 * Creates in-app database notification record, fires local notification, and triggers Toast
 */
export async function createAndSendNotification({
  clientId,
  title,
  message,
  actionUrl,
  type = 'default',
  showToast = true,
}: {
  clientId: string;
  title: string;
  message: string;
  actionUrl?: string;
  type?: 'booking' | 'membership' | 'workout' | 'alert' | 'session' | 'default';
  showToast?: boolean;
}) {
  try {
    // 1. Insert into public.notifications
    const { error } = await supabase.from('notifications').insert({
      client_id: clientId,
      title,
      message,
      action_url: actionUrl ?? '/client/notifications',
      is_read: false,
    });

    if (error) {
      console.warn('[Notifications] DB insert warning:', error.message);
    }

    // 2. Map channel
    let channelId = 'default';
    if (type === 'session' || type === 'booking') channelId = 'sessions';
    if (type === 'membership') channelId = 'memberships';
    if (type === 'workout') channelId = 'workouts';

    // 3. Fire immediate local device notification, only when this device belongs to the recipient
    // (admins notifying a member would otherwise get the member's banner on their own phone)
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user.id === clientId) {
      await sendLocalNotification(title, message, { actionUrl, type }, channelId);
    }

    // 4. In-app toast if desired
    if (showToast) {
      ToastManager.show(title, message, 'info', 4500);
    }
  } catch (e) {
    console.warn('[Notifications] createAndSendNotification error:', e);
  }
}

/**
 * Schedules time-based notification reminders for a reservation session
 */
export async function scheduleReservationNotifications(
  equipmentName: string,
  startDate: Date,
  endDate: Date,
  reservationId?: string
) {
  if (Platform.OS === 'web') return;

  const now = new Date();

  const scheduleIfFuture = async (
    targetDate: Date,
    title: string,
    body: string,
    reminderType: string
  ) => {
    if (targetDate.getTime() <= now.getTime()) return;
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          data: {
            reservationId,
            reminderType,
            actionUrl: '/client/reservations',
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: targetDate,
          channelId: 'sessions',
        },
      });
    } catch (e) {
      console.warn('[Notifications] Could not schedule notification:', e);
    }
  };

  // 1. 5 minutes before start (Head to session reminder)
  const fiveMinBeforeStart = new Date(startDate.getTime() - 5 * 60 * 1000);
  await scheduleIfFuture(
    fiveMinBeforeStart,
    "Time to Head to Your Session! 🏃",
    `Your reservation for ${equipmentName} starts in 5 minutes! Head over to start on time.`,
    "start_reminder"
  );

  // 2. At start time
  await scheduleIfFuture(
    startDate,
    "Session Started! ⚡",
    `Your reservation for ${equipmentName} is now active. Have a great workout!`,
    "started"
  );

  // 3. 5 minutes before end (Return and wrap-up reminder)
  const fiveMinBeforeEnd = new Date(endDate.getTime() - 5 * 60 * 1000);
  await scheduleIfFuture(
    fiveMinBeforeEnd,
    "5 Mins Remaining — Wrap-Up Reminder ⏳",
    `5 minutes left on ${equipmentName}! Please prepare to wipe down, return, and rack the equipment.`,
    "end_reminder"
  );

  // 4. At end time
  await scheduleIfFuture(
    endDate,
    "Session Completed ✅",
    `Your reservation for ${equipmentName} has ended. Thank you for racking the equipment!`,
    "completed"
  );
}

// In-memory cache for daily membership and session checks to prevent repeated duplicate spam
const notifiedTracker = new Set<string>();

/**
 * Verifies active session timing (5m before start, 5m before end, completion)
 * Can be run periodically across the app in NotificationListener.
 */
export async function checkActiveSessionsAndNotify(clientId: string) {
  if (!clientId) return;

  try {
    const today = new Date().toISOString().split('T')[0];
    const { data: reservations, error } = await supabase
      .from('reservations')
      .select('*, equipment:equipment(*)')
      .eq('client_id', clientId)
      .eq('reservation_date', today)
      .eq('status', 'confirmed');

    if (error || !reservations || reservations.length === 0) return;

    const now = new Date();

    for (const res of reservations as Reservation[]) {
      const timing = getReservationState(res, now);
      const equipName = (res as any).equipment?.name || 'Equipment';

      // 1. 5 minutes before start reminder
      const startKey = `${res.id}-start-5m`;
      if (
        timing.is5MinBeforeStart &&
        !timing.metadata.notified_5min_start &&
        !notifiedTracker.has(startKey)
      ) {
        notifiedTracker.add(startKey);
        await createAndSendNotification({
          clientId,
          title: 'Time to Head to Your Session! 🏃',
          message: `Your reservation for ${equipName} starts in 5 minutes! Head over to start on time.`,
          actionUrl: '/client/reservations',
          type: 'session',
        });

        const updatedNotes = serializeReservationMetadata(
          { notified_5min_start: true },
          res.notes
        );
        await supabase
          .from('reservations')
          .update({ notes: updatedNotes })
          .eq('id', res.id);
      }

      // 2. 5 minutes before end reminder
      const endKey = `${res.id}-end-5m`;
      if (
        timing.is5MinBeforeEnd &&
        !timing.metadata.notified_5min_end &&
        !notifiedTracker.has(endKey)
      ) {
        notifiedTracker.add(endKey);
        await createAndSendNotification({
          clientId,
          title: '5 Mins Remaining — Wrap-Up Reminder ⏳',
          message: `5 minutes left on ${equipName}! Please prepare to wipe down, return, and rack the equipment in place.`,
          actionUrl: '/client/reservations',
          type: 'session',
        });

        const updatedNotes = serializeReservationMetadata(
          { notified_5min_end: true },
          res.notes
        );
        await supabase
          .from('reservations')
          .update({ notes: updatedNotes })
          .eq('id', res.id);
      }

      // 3. Session completion
      if (timing.isEnded) {
        const completeKey = `${res.id}-completed`;
        if (!notifiedTracker.has(completeKey)) {
          notifiedTracker.add(completeKey);
          await supabase
            .from('reservations')
            .update({ status: 'completed' })
            .eq('id', res.id);

          await createAndSendNotification({
            clientId,
            title: 'Session Completed ✅',
            message: `Your reservation for ${equipName} has ended. Thank you for racking and returning the equipment!`,
            actionUrl: '/client/reservations',
            type: 'session',
          });
        }
      }
    }
  } catch (err) {
    console.warn('[Notifications] checkActiveSessionsAndNotify error:', err);
  }
}

/**
 * Checks membership expiration status and alerts user if expiring soon or expired
 */
export async function checkMembershipStatusAndNotify(clientId: string) {
  if (!clientId) return;

  try {
    const todayStr = new Date().toISOString().split('T')[0];

    // Find client's current or latest membership
    const { data: membershipData, error } = await supabase
      .from('client_memberships')
      .select('*, membership:memberships(*)')
      .eq('client_id', clientId)
      .order('end_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !membershipData) return;

    const planName = membershipData.membership?.name || 'Gym Membership';
    const endDate = new Date(membershipData.end_date);
    const now = new Date();

    const diffMs = endDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    // A. Expired
    if (daysRemaining <= 0) {
      const expiredTrackerKey = `mem-expired-${membershipData.id}-${todayStr}`;
      if (!notifiedTracker.has(expiredTrackerKey)) {
        notifiedTracker.add(expiredTrackerKey);

        if (membershipData.status === 'active') {
          await supabase
            .from('client_memberships')
            .update({ status: 'expired' })
            .eq('id', membershipData.id);
        }

        await createAndSendNotification({
          clientId,
          title: 'Membership Expired ⚠️',
          message: `Your ${planName} subscription has expired on ${endDate.toLocaleDateString()}. Visit the front desk to renew your membership!`,
          actionUrl: '/client/profile',
          type: 'membership',
          showToast: false, // Don't interrupt screen aggressively, user can see inbox & banner
        });
      }
    }
    // B. Expiring soon (Within 3 days)
    else if (daysRemaining <= 3 && membershipData.status === 'active') {
      const expiringTrackerKey = `mem-expiring-${membershipData.id}-${todayStr}`;
      if (!notifiedTracker.has(expiringTrackerKey)) {
        notifiedTracker.add(expiringTrackerKey);

        await createAndSendNotification({
          clientId,
          title: `Membership Expiring Soon (${daysRemaining} Day${daysRemaining > 1 ? 's' : ''} Left) ⏳`,
          message: `Your ${planName} subscription will expire on ${endDate.toLocaleDateString()}. Please renew at the front desk to keep your gym access!`,
          actionUrl: '/client/profile',
          type: 'membership',
        });
      }
    }
  } catch (err) {
    console.warn('[Notifications] checkMembershipStatusAndNotify error:', err);
  }
}

/**
 * Notify when AI workout finishes generating
 */
export async function notifyWorkoutGenerated(
  clientId: string,
  planName: string,
  isAi: boolean = true
) {
  const title = isAi ? 'AI Workout Plan Ready! 💪' : 'Workout Routine Ready! 🏋️';
  const message = isAi
    ? `Your personalized AI workout plan "${planName}" has been generated using Google Gemini! Check out your new routine.`
    : `Your personalized workout routine "${planName}" has been generated and is ready to start!`;

  await createAndSendNotification({
    clientId,
    title,
    message,
    actionUrl: '/client/workouts',
    type: 'workout',
  });
}
