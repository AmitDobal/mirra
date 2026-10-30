import { router } from "expo-router";
import { Image, StyleSheet, Text, View } from "react-native";

import { s02WelcomeHook } from "../../assets/stitch";
import { onboardingCopy } from "@/content/onboarding";
import { OnboardingShell } from "@/features/onboarding";
import { color, font, radius, space, type } from "@/theme/tokens";
import { Button, Card } from "@/ui";

/** S02 — Mirror→Week hook. */
const WelcomeScreen = () => {
  const c = onboardingCopy.welcome;

  const handleContinue = () => router.push("/(onboarding)/goal");
  const handleAccount = () => router.push("/(onboarding)/auth");

  return (
    <OnboardingShell
      footer={
        <>
          <Button label={c.continue} onPress={handleContinue} />
          <Button
            label={c.haveAccount}
            variant="ghost"
            onPress={handleAccount}
          />
        </>
      }
    >
      <View style={styles.body}>
        <Image
          source={s02WelcomeHook.heroRunnerSilhouette}
          accessibilityLabel="Athlete silhouette"
          style={styles.hero}
          resizeMode="cover"
        />
        <View style={styles.eyebrow}>
          <Text style={styles.eyebrowText}>{c.eyebrow}</Text>
        </View>
        <Text style={styles.title}>{c.titleLine1}</Text>
        <Text style={styles.title}>{c.titleLine2}</Text>
        <Text style={styles.sub}>{c.sub}</Text>
        <View style={styles.portraits}>
          <Image
            source={s02WelcomeHook.portraitWomanAthlete}
            accessibilityLabel="Athlete portrait"
            style={styles.portrait}
            resizeMode="cover"
          />
          <Image
            source={s02WelcomeHook.portraitMaleCrossfit}
            accessibilityLabel="Athlete portrait"
            style={styles.portrait}
            resizeMode="cover"
          />
        </View>
        <Card tone="lavender" style={styles.card}>
          {c.steps.map((step) => (
            <View key={step.num} style={styles.stepRow}>
              <Text style={styles.stepNum}>{step.num}</Text>
              <Text style={styles.stepLabel}>{step.label}</Text>
            </View>
          ))}
        </Card>
      </View>
    </OnboardingShell>
  );
};

const styles = StyleSheet.create({
  body: {
    paddingTop: space.xl,
  },
  hero: {
    width: "100%",
    height: 180,
    borderRadius: radius.DEFAULT,
    marginBottom: space.md,
  },
  eyebrow: {
    alignSelf: "flex-start",
    marginBottom: space.md,
    borderRadius: radius.full,
    backgroundColor: color.primaryContainer,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
  },
  eyebrowText: {
    fontFamily: font.labelBold,
    fontSize: type.labelCaps.size,
    lineHeight: type.labelCaps.line,
    letterSpacing: type.labelCaps.tracking * type.labelCaps.size,
    color: color.onPrimaryFixed,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: font.headline,
    fontSize: type.headlineLg.size,
    lineHeight: type.headlineLg.line,
    letterSpacing: type.headlineLg.tracking * type.headlineLg.size,
    color: color.onSurface,
  },
  sub: {
    marginTop: space.sm,
    maxWidth: 320,
    fontFamily: font.bodyMedium,
    fontSize: type.bodyMd.size,
    lineHeight: type.bodyMd.line,
    color: color.onSurfaceVariant,
  },
  portraits: {
    marginTop: space.md,
    flexDirection: "row",
    gap: space.sm,
  },
  portrait: {
    flex: 1,
    height: 96,
    borderRadius: 12,
  },
  card: {
    marginTop: space.xl,
    gap: space.md,
    padding: space.md,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  stepNum: {
    width: 32,
    fontFamily: font.label,
    fontSize: type.labelMd.size,
    lineHeight: type.labelMd.line,
    color: color.primaryFixed,
  },
  stepLabel: {
    fontFamily: font.bodySemi,
    fontSize: type.bodyLg.size,
    lineHeight: type.bodyLg.line,
    color: color.onSecondaryContainer,
  },
});

export default WelcomeScreen;
