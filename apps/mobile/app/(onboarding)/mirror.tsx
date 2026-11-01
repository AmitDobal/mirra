import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Camera, Lock } from "lucide-react-native";
import { useState } from "react";
import { Alert, Image, Pressable, Text, View } from "react-native";

import { onboardingCopy } from "@/content/onboarding";
import {
  OnboardingShell,
  ProgressHeader,
  QuizEyebrow,
  useOnboardingStore,
} from "@/features/onboarding";
import { uploadMirrorSelfie } from "@/features/onboarding/services/upload-mirror";
import { color } from "@/theme/tokens";
import { Button, Card } from "@/ui";
import { sx } from "@/theme/sx";

/** S10 — Optional mirror selfie (camera / library). */
const MirrorScreen = () => {
  const c = onboardingCopy.mirror;
  const mirrorUri = useOnboardingStore((s) => s.mirrorUri);
  const setMirrorSkipped = useOnboardingStore((s) => s.setMirrorSkipped);
  const setMirrorUri = useOnboardingStore((s) => s.setMirrorUri);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFailed, setUploadFailed] = useState(false);

  const goNext = (skipped: boolean) => {
    setMirrorSkipped(skipped);
    if (skipped) setMirrorUri(null);
    router.push("/(onboarding)/generating");
  };

  const saveUri = (uri: string) => {
    setMirrorUri(uri);
    setMirrorSkipped(false);
    setUploadFailed(false);
  };

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Photos needed",
        "Allow photo library access to pick a mirror selfie.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [3, 4],
    });
    if (!result.canceled && result.assets[0]?.uri) {
      saveUri(result.assets[0].uri);
    }
  };

  const handleCapture = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const cam = await ImagePicker.requestCameraPermissionsAsync();
      if (cam.granted) {
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          quality: 0.8,
          allowsEditing: true,
          aspect: [3, 4],
          cameraType: ImagePicker.CameraType.front,
        });
        if (!result.canceled && result.assets[0]?.uri) {
          saveUri(result.assets[0].uri);
          return;
        }
        if (!result.canceled) return;
      }

      Alert.alert(
        "Camera unavailable",
        "Use a photo from your library instead? (Simulator has no camera — use a real iPhone for live capture.)",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Choose photo",
            onPress: () => {
              void pickFromLibrary();
            },
          },
        ],
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Could not open camera";
      Alert.alert("Camera", message, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Choose photo",
          onPress: () => {
            void pickFromLibrary();
          },
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  /** Upload to R2 via media API; on failure stay here with retry / continue-anyway. */
  const handleUploadAndContinue = async () => {
    if (uploading) return;
    setUploading(true);
    setUploadFailed(false);
    const ok = await uploadMirrorSelfie();
    setUploading(false);
    if (ok) goNext(false);
    else setUploadFailed(true);
  };

  const handleContinue = () => {
    if (mirrorUri) void handleUploadAndContinue();
    else void handleCapture();
  };

  const locked = busy || uploading;

  return (
    <OnboardingShell
      header={<ProgressHeader step={12} onBack={() => router.back()} />}
      footer={
        <>
          <Button
            label={
              uploading
                ? c.uploading
                : uploadFailed
                  ? c.retryUpload
                  : mirrorUri
                    ? c.continue
                    : c.capture
            }
            disabled={locked}
            onPress={handleContinue}
          />
          {uploadFailed ? (
            <Button
              label={c.continueAnyway}
              variant="outline"
              disabled={locked}
              onPress={() => goNext(false)}
            />
          ) : mirrorUri ? (
            <Button
              label={c.retake}
              variant="outline"
              disabled={locked}
              onPress={() => {
                void handleCapture();
              }}
            />
          ) : (
            <Button
              label={c.skip}
              variant="outline"
              disabled={locked}
              onPress={() => goNext(true)}
            />
          )}
        </>
      }
    >
      <QuizEyebrow label={c.eyebrow} />
      <Text style={sx("font-headline text-headline-md text-on-surface")}>
        {c.title}
      </Text>
      <Text style={sx("mt-space-sm font-body text-body-sm text-on-surface-variant")}>
        {c.sub}
      </Text>
      {uploadFailed ? (
        <View
          accessibilityRole="alert"
          style={sx(
            "mt-space-md rounded-lg border border-error bg-surface-container-low p-space-md",
          )}
        >
          <Text style={sx("font-label-bold text-label-lg text-error")}>
            {c.uploadFailedTitle}
          </Text>
          <Text
            style={sx("mt-space-xs font-body text-body-sm text-on-surface-variant")}
          >
            {c.uploadFailedBody}
          </Text>
        </View>
      ) : null}
      <View style={sx("mt-space-lg min-h-[300px] flex-1 items-center justify-center")}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={mirrorUri ? "Retake mirror selfie" : "Open camera"}
        onPress={() => {
          void handleCapture();
        }}
        style={sx("w-full items-center")}
      >
        <Card
          tone="lowest"
          style={sx(
            "w-full max-w-[280px] aspect-[3/4] max-h-[340px] items-center justify-center self-center overflow-hidden border border-outline-variant",
          )}
        >
          {mirrorUri ? (
            <Image
              source={{ uri: mirrorUri }}
              accessibilityLabel="Mirror selfie preview"
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          ) : (
            <View style={sx("items-center justify-center px-space-lg")}>
              <Camera color={color.onSurfaceVariant} size={48} />
              <Text
                style={sx(
                  "mt-space-sm text-center font-body text-body-sm text-on-surface-variant",
                )}
              >
                {c.tapHint}
              </Text>
              <View
                style={sx(
                  "mt-space-md flex-row items-center justify-center gap-space-xs",
                )}
              >
                <Lock color={color.outline} size={14} />
                <Text style={sx("text-center font-body text-body-sm text-outline")}>
                  {c.privacy}
                </Text>
              </View>
            </View>
          )}
        </Card>
      </Pressable>
      </View>
    </OnboardingShell>
  );
};

export default MirrorScreen;
