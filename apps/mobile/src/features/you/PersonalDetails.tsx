import { ChevronRight, UserRound } from "lucide-react-native";
import { Fragment, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { profileCopy as c } from "@/content/profile";
import { color } from "@/theme/tokens";
import { sx } from "@/theme/sx";

import { ProfileEditBody, SheetModal } from "./ProfileEditSheet";
import { isSheetField, type EditableField } from "./profile-fields";
import type { PrefsSource, ProfileRow, ProfileSource, Units } from "./profile-format";
import { Card, Divider, ValueRow } from "./you-settings";

/**
 * PM (AMI-176): body details stay off the main scroll. One S41-style row opens a sheet
 * listing Sex · Age · Height · Weight · Goal weight · Pace · Units; each row edits in place.
 */
export const PersonalDetailsRow = ({ onPress }: { onPress: () => void }) => (
  <View style={sx("mt-7")}>
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${c.personal.title}. ${c.personal.sub}`}
        onPress={onPress}
        style={({ pressed }) => [
          sx("flex-row items-center gap-3 p-4"),
          pressed ? sx("bg-surface-container") : null,
        ]}
      >
        <View style={[sx("items-center justify-center bg-surface-container-high"), { width: 36, height: 36, borderRadius: 18 }]}>
          <UserRound size={18} color={color.secondary} />
        </View>
        <View style={sx("min-w-0 flex-1")}>
          <Text style={sx("font-body text-body-md text-on-surface")}>{c.personal.title}</Text>
          <Text numberOfLines={1} style={[sx("font-body text-body-sm text-on-surface-variant"), { marginTop: 2 }]}>
            {c.personal.sub}
          </Text>
        </View>
        <ChevronRight size={16} color={color.onSurfaceVariant} />
      </Pressable>
    </Card>
  </View>
);

type SheetProps = {
  readonly visible: boolean;
  readonly rows: readonly ProfileRow[];
  readonly units: Units;
  readonly profile: ProfileSource | null;
  readonly prefs: PrefsSource | null;
  readonly onSave: (patch: Record<string, unknown>) => Promise<boolean>;
  readonly onClose: () => void;
};

/** Single modal: list view ↔ field editor (no stacked modals; iOS drops a second one). */
export const PersonalDetailsSheet = ({ visible, rows, units, profile, prefs, onSave, onClose }: SheetProps) => {
  const [editing, setEditing] = useState<EditableField | null>(null);

  useEffect(() => {
    if (!visible) setEditing(null);
  }, [visible]);

  return (
    <SheetModal visible={visible} label={c.personal.title} onClose={onClose}>
      {editing ? (
        <ProfileEditBody
          field={editing}
          units={units}
          profile={profile}
          prefs={prefs}
          onSave={onSave}
          onDone={() => setEditing(null)}
          onBack={() => setEditing(null)}
        />
      ) : (
        <>
          <Text style={sx("font-headline-sm text-headline-sm text-on-surface")}>{c.personal.title}</Text>
          <Text style={[sx("font-body text-body-sm text-on-surface-variant"), { marginTop: 2, marginBottom: 16 }]}>
            {c.personal.hint}
          </Text>
          <Card>
            {rows.map((row, i) => (
              <Fragment key={row.id}>
                {i > 0 ? <Divider /> : null}
                <ValueRow
                  title={row.title}
                  value={row.value}
                  onPress={isSheetField(row.id) ? () => setEditing(row.id as EditableField) : undefined}
                />
              </Fragment>
            ))}
          </Card>
        </>
      )}
    </SheetModal>
  );
};
