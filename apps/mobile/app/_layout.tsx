import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import {
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ensureMirraDb } from "@/lib/local";
import { configurePurchases } from "@/lib/purchases";
import { color } from "@/theme/tokens";

void SplashScreen.preventAutoHideAsync();

const RootLayout = () => {
  const [bootSettled, setBootSettled] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    void (async () => {
      try {
        await ensureMirraDb();
      } catch (error: unknown) {
        console.warn("[mirra] ensureMirraDb failed", error);
      }
      try {
        await configurePurchases();
      } catch (error: unknown) {
        console.warn("[mirra] configurePurchases failed", error);
      } finally {
        setBootSettled(true);
      }
    })();
  }, []);

  const fontsReady = fontsLoaded || Boolean(fontError);
  const appReady = fontsReady && bootSettled;

  useEffect(() => {
    if (appReady) {
      void SplashScreen.hideAsync();
    }
  }, [appReady]);

  if (!appReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView
        className="flex-1 bg-background"
        style={styles.root}
      >
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: color.background },
            animation: "fade",
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.background,
  },
});

export default RootLayout;
