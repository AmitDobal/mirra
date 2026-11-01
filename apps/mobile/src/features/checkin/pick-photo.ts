import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";

const OPTIONS: ImagePicker.ImagePickerOptions = { quality: 0.7, allowsEditing: false };

const fromCamera = async (): Promise<string | null> => {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchCameraAsync(OPTIONS);
  return res.canceled ? null : (res.assets[0]?.uri ?? null);
};

const fromLibrary = async (): Promise<string | null> => {
  const res = await ImagePicker.launchImageLibraryAsync({ ...OPTIONS, mediaTypes: ["images"] });
  return res.canceled ? null : (res.assets[0]?.uri ?? null);
};

/** Optional check-in photo: camera or library. Resolves the picked URI, or null if skipped. */
export const pickCheckInPhoto = (): Promise<string | null> =>
  new Promise((resolve) => {
    const done = (task: () => Promise<string | null>) => () =>
      void task()
        .then(resolve)
        .catch(() => resolve(null));
    Alert.alert("Add photo", undefined, [
      { text: "Take photo", onPress: done(fromCamera) },
      { text: "Choose from library", onPress: done(fromLibrary) },
      { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
    ]);
  });
