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
        <View style={styles.topRow}>
          <View style={styles.eyebrow}>
            <Text style={styles.eyebrowText}>{c.eyebrow}</Text>
          </View>
          <View style={styles.enginePill}>
            <Text style={styles.engineText}>{c.engine}</Text>
            <View style={styles.engineBadge}>
              <Text style={styles.engineBadgeText}>{c.engineBadge}</Text>
            </View>
          </View>
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
        <Text style={styles.motto}>{c.motto}</Text>
        <Card tone="lavender" style={styles.card}>
          {c.steps.map((step, index) => (
            <View key={step.num} style={styles.stepRow}>
              <View style={styles.stepRail}>
                <View style={styles.stepDot}>
                  <Text style={styles.stepNum}>{step.num}</Text>
                </View>
                {index < c.steps.length - 1 ? <View style={styles.stepLine} /> : null}
              </View>
              <View style={styles.stepCopy}>
                <Text style={styles.stepLabel}>{step.label}</Text>
                <Text style={styles.stepDetail}>{step.detail}</Text>
              </View>
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
  topRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: space.sm,
    marginBottom: space.md,
  },
  eyebrow: {
    alignSelf: "flex-start",
    borderRadius: radius.full,
    backgroundColor: color.primaryContainer,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
  },
  eyebrowText: {
    fontFamily: font.labelBold,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.8,
    color: color.onPrimaryFixed,
    textTransform: "uppercase",
  },
  enginePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radius.full,
    backgroundColor: color.surfaceContainerHigh,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    maxWidth: "100%",
  },
  engineText: {
    fontFamily: font.label,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.6,
    color: color.onSurfaceVariant,
    textTransform: "uppercase",
    flexShrink: 1,
  },
  engineBadge: {
    borderRadius: radius.full,
    backgroundColor: color.secondaryContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  engineBadgeText: {
    fontFamily: font.labelBold,
    fontSize: 8,
    lineHeight: 10,
    color: color.onSecondaryContainer,
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
    marginTop: space.md,
    gap: 0,
    paddingVertical: 10,
    paddingHorizontal: space.md,
    borderWidth: 1,
    borderColor: "rgba(203,241,80,0.22)",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: space.sm,
    minHeight: 42,
  },
  stepRail: {
    width: 28,
    alignItems: "center",
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.primaryFixed,
    shadowColor: color.primaryFixed,
    shadowOpacity: 0.45,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  stepLine: {
    flex: 1,
    width: 2,
    marginVertical: 2,
    borderRadius: 1,
    backgroundColor: "rgba(203,241,80,0.4)",
  },
  stepNum: {
    fontFamily: font.labelBold,
    fontSize: 10,
    lineHeight: 12,
    color: color.onPrimaryFixed,
  },
  stepCopy: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: 5,
    gap: 1,
  },
  stepLabel: {
    fontFamily: font.bodySemi,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 0.2,
    color: color.onSecondaryContainer,
  },
  stepDetail: {
    fontFamily: font.body,
    fontSize: 11,
    lineHeight: 14,
    color: color.secondary,
  },
  motto: {
    marginTop: space.md,
    textAlign: "center",
    fontFamily: font.label,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.4,
    color: color.onSurfaceVariant,
  },
});

export default WelcomeScreen;
