import { Image, Text, View } from "react-native";

import { s24ProfileSettings } from "../../../assets/stitch";
import type { MeEntitlement, MeUser } from "@/lib/api/me";
import { sx } from "@/theme/sx";

import { displayName, displaySubtitle, initialsFrom, showProBadge } from "./profile-display";

type Props = {
  readonly user: MeUser | null;
  readonly entitlement: MeEntitlement | null;
  readonly fallbackName: string;
  readonly fallbackMeta: string;
};

const AVATAR = { width: 64, height: 64, borderRadius: 32 } as const;

/** S24 compact identity row — 64px circle avatar (image / initials / placeholder). */
export const ProfileHero = ({ user, entitlement, fallbackName, fallbackMeta }: Props) => {
  const name = displayName(user, fallbackName);
  const meta = displaySubtitle(user, fallbackMeta);
  const initials = initialsFrom(user);
  const imageUri = user?.image?.trim() || null;
  const pro = showProBadge(entitlement);

  return (
    <View style={sx("mb-space-lg flex-row items-center gap-space-md")}>
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          accessibilityLabel="Profile avatar"
          style={AVATAR}
          resizeMode="cover"
        />
      ) : initials ? (
        <View
          accessibilityLabel={`Avatar initials ${initials}`}
          style={[
            AVATAR,
            sx("items-center justify-center bg-surface-container-highest"),
          ]}
        >
          <Text style={sx("font-headline text-headline-sm text-on-surface")}>{initials}</Text>
        </View>
      ) : (
        <Image
          source={s24ProfileSettings.avatarAlexChen}
          accessibilityLabel="Profile avatar placeholder"
          style={AVATAR}
          resizeMode="cover"
        />
      )}
      <View style={sx("min-w-0 flex-1")}>
        <View style={sx("flex-row items-center gap-space-sm")}>
          <Text
            numberOfLines={1}
            style={sx("min-w-0 flex-shrink font-headline text-headline-sm text-on-surface")}
          >
            {name}
          </Text>
          {pro ? (
            <View style={sx("shrink-0 rounded-full bg-primary-fixed px-2 py-0.5")}>
              <Text style={sx("font-label-bold text-[9px] leading-3 text-on-primary-fixed")}>
                PRO
              </Text>
            </View>
          ) : null}
        </View>
        <Text
          numberOfLines={2}
          style={sx("mt-0.5 font-body text-body-sm text-on-surface-variant")}
        >
          {meta}
        </Text>
      </View>
    </View>
  );
};
