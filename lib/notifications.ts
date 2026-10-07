import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Set notification handler to show alerts when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'web') {
    return null; // Notifications not strictly required for web MVP
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }
    token = (await Notifications.getExpoPushTokenAsync()).data;
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

export async function scheduleReservationNotifications(
  equipmentName: string,
  startDate: Date,
  endDate: Date
) {
  if (Platform.OS === 'web') return;

  const now = new Date();

  // Helper safely scheduling a date notification if in the future
  const scheduleIfFuture = async (targetDate: Date, title: string, body: string) => {
    if (targetDate.getTime() <= now.getTime()) return;
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: targetDate,
        },
      });
    } catch (e) {
      console.warn("Could not schedule notification:", e);
    }
  };

  // Notification 1: 5 minutes before start
  const fiveMinBeforeStart = new Date(startDate.getTime() - 5 * 60 * 1000);
  await scheduleIfFuture(
    fiveMinBeforeStart,
    "5 Minutes Away — Equipment Ready",
    `Your reservation for ${equipmentName} starts in 5 minutes! Head to the equipment to begin your workout.`
  );

  // Notification 2: At start time
  await scheduleIfFuture(
    startDate,
    "Workout Time!",
    `Your reservation for ${equipmentName} starts now. Your session is active!`
  );

  // Notification 3: 5 minutes before end (Return and fix reminder)
  const fiveMinBeforeEnd = new Date(endDate.getTime() - 5 * 60 * 1000);
  await scheduleIfFuture(
    fiveMinBeforeEnd,
    "5 Mins Remaining — Wrap-Up Reminder",
    `5 minutes left on ${equipmentName}! Please prepare to wipe down, return, and rack the equipment in place.`
  );

  // Notification 4: At end time
  await scheduleIfFuture(
    endDate,
    "Session Completed",
    `Your reservation for ${equipmentName} has ended. Thank you for racking the equipment!`
  );
}
