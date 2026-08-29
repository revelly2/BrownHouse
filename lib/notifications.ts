import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Set notification handler to show alerts when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
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

  // Notification 1: At start time
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Time for your workout!",
      body: `Your reservation for ${equipmentName} starts now. Please confirm your arrival within 3 minutes.`,
      sound: true,
    },
    trigger: startDate,
  });

  // Notification 2: At end time
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Time is up!",
      body: `Your reservation for ${equipmentName} has ended.`,
      sound: true,
    },
    trigger: endDate,
  });
}
