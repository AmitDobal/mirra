import { ArrowRight, Camera, Dumbbell, Moon, NotebookPen, X, Zap } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { s20bDailyCheckInTap } from "../../../assets/stitch";
import { color, space } from "@/theme/tokens";
import { FormSheet } from "@/ui/FormSheet";

import { AreaChips, EnergyTiles, RowHeader, Segmented } from "./CheckInRows";
import {
  ENERGY_LABEL,
  SLEEP_LABEL,
  SLEEP_OPTIONS,
  SORENESS_OPTIONS,
  sorenessCaption,
} from "./checkin-logic";
import { useCheckInStore } from "./checkin-store";
import { pickCheckInPhoto } from "./pick-photo";
import { PressScale } from "./PressScale";
import { ScrimGradient } from "./ScrimGradient";
import { styles } from "./CheckInScreen.styles";

const NOTE_FIELDS = [
  { key: "note", label: "Note (optional)", placeholder: "Anything Mirra should know?" },
] as const;

type Props = {
  readonly onClose: () => void;
};

/** S20b — three taps (Energy, Sleep, Soreness) + optional note/photo. */
export const CheckInScreen = ({ onClose }: Props) => {
  const insets = useSafeAreaInsets();
  const energy = useCheckInStore((s) => s.energy);
  const sleep = useCheckInStore((s) => s.sleep);
  const soreness = useCheckInStore((s) => s.soreness);
  const areas = useCheckInStore((s) => s.areas);
  const note = useCheckInStore((s) => s.note);
  const photoUri = useCheckInStore((s) => s.photoUri);
  const busy = useCheckInStore((s) => s.busy);
  const error = useCheckInStore((s) => s.error);
  const setEnergy = useCheckInStore((s) => s.setEnergy);
  const setSleep = useCheckInStore((s) => s.setSleep);
  const setSoreness = useCheckInStore((s) => s.setSoreness);
  const toggleArea = useCheckInStore((s) => s.toggleArea);
  const setNote = useCheckInStore((s) => s.setNote);
  const setPhotoUri = useCheckInStore((s) => s.setPhotoUri);
  const submit = useCheckInStore((s) => s.submit);
  const skip = useCheckInStore((s) => s.skip);
  const [noteOpen, setNoteOpen] = useState(false);

  const handlePhoto = useCallback(async () => {
    if (photoUri) {
      setPhotoUri(null);
      return;
    }
    const uri = await pickCheckInPhoto();
    if (uri) setPhotoUri(uri);
  }, [photoUri, setPhotoUri]);

  const handleSkip = async () => {
    if (await skip()) onClose();
  };

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: insets.top + space.md,
          paddingBottom: insets.bottom + space.xl,
          paddingHorizontal: space.margin,
          gap: space.md,
        }}
      >
        <View style={styles.topBar}>
          <View style={styles.brand}>
            <Text style={styles.brandText}>MIRRA</Text>
            <View style={styles.brandDot} />
          </View>
          <PressScale
            accessibilityRole="button"
            accessibilityLabel="Close check-in"
            onPress={onClose}
            style={styles.closeBtn}
          >
            <X size={20} color={color.onSurface} />
          </PressScale>
        </View>

        <View style={styles.hero}>
          <View style={StyleSheet.absoluteFill}>
            <Image
              source={s20bDailyCheckInTap.hero}
              accessibilityLabel="Athlete breathing at dawn"
              style={styles.heroImg}
              resizeMode="cover"
            />
          </View>
          <ScrimGradient id="s20b-hero" />
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>How are you today?</Text>
            <Text style={styles.heroSub}>3 taps. We adjust the plan.</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <RowHeader
              Icon={Zap}
              iconColor={color.primaryContainer}
              label="Energy"
              caption={ENERGY_LABEL[energy]}
              captionColor={color.primaryContainer}
            />
            <EnergyTiles value={energy} onChange={setEnergy} />
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <RowHeader
              Icon={Moon}
              iconColor={color.secondary}
              label="Sleep"
              caption={SLEEP_LABEL[sleep]}
              captionColor={color.secondary}
            />
            <Segmented
              label="Sleep"
              options={SLEEP_OPTIONS}
              value={sleep}
              onChange={setSleep}
              tone="lavender"
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <RowHeader
              Icon={Dumbbell}
              iconColor={color.onSurface}
              label="Soreness"
              caption={sorenessCaption(soreness, areas)}
              captionColor={color.onSurfaceVariant}
            />
            <Segmented
              label="Soreness"
              options={SORENESS_OPTIONS}
              value={soreness}
              onChange={setSoreness}
              tone="neutral"
            />
            {soreness !== "none" ? <AreaChips selected={areas} onToggle={toggleArea} /> : null}
          </View>
        </View>

        <View style={styles.extras}>
          <PressScale
            accessibilityRole="button"
            accessibilityLabel={note.trim() ? "Edit note" : "Add note"}
            onPress={() => setNoteOpen(true)}
            style={styles.extraBtn}
          >
            <NotebookPen size={18} color={note.trim() ? color.primaryContainer : color.onSurfaceVariant} />
            <Text style={styles.extraText}>{note.trim() ? "Note added" : "Add note"}</Text>
          </PressScale>
          <PressScale
            accessibilityRole="button"
            accessibilityLabel={photoUri ? "Remove photo" : "Add photo, optional"}
            onPress={() => void handlePhoto()}
            style={styles.extraBtn}
          >
            <Camera size={18} color={photoUri ? color.primaryContainer : color.onSurfaceVariant} />
            <Text style={styles.extraText}>{photoUri ? "Photo added" : "Add photo"}</Text>
            {photoUri ? null : <Text style={styles.extraOpt}>(Opt)</Text>}
          </PressScale>
        </View>

        <PressScale
          accessibilityRole="button"
          accessibilityLabel="Update my day"
          accessibilityState={{ disabled: busy, busy }}
          onPress={() => void submit()}
          style={[styles.cta, busy && styles.ctaBusy]}
        >
          <Text style={styles.ctaText}>{busy ? "Updating…" : "Update my day"}</Text>
          {busy ? null : <ArrowRight size={20} color={color.onPrimaryFixed} />}
        </PressScale>

        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip, rest counts"
            disabled={busy}
            onPress={() => void handleSkip()}
            hitSlop={8}
          >
            <Text style={styles.skip}>Skip — rest counts</Text>
          </Pressable>
          <Text style={styles.reassure}>Rest counts. No fallen streaks.</Text>
        </View>
      </ScrollView>

      <FormSheet
        visible={noteOpen}
        title="Add note"
        submitLabel="Save note"
        fields={NOTE_FIELDS}
        initial={{ note }}
        onClose={() => setNoteOpen(false)}
        onSubmit={(values) => setNote(values.note ?? "")}
      />
    </View>
  );
};
