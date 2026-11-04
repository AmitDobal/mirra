import { User } from "lucide-react-native";
import { Image, Text, View } from "react-native";

import type { MeEntitlement, MeUser } from "@/lib/api/me";
import { color } from "@/theme/tokens";
import { sx } from "@/theme/sx";

import { t } from "./you-text";
import { displayName, displaySubtitle, initialsFrom, showProBadge } from "./profile-display";

type Props = {
  readonly user: MeUser | null;
  readonly entitlement: MeEntitlement | null;
  readonly fallbackName: string;
  readonly fallbackMeta: string;
};

const AVATAR = { width: 64, height: 64, borderRadius: 32 } as const;

/**
 * S41 profile card: lime-ringed avatar, name + PRO pill, email.
 * PM (AMI-176): no sex/age/height/weight chips here; those live in Personal details.
 */
export const ProfileCard = ({ user, entitlement, fallbackName, fallbackMeta }: Props) => {
  const name = displayName(user, fallbackName);
  const meta = displaySubtitle(user, fallbackMeta);
  const initials = initialsFrom(user);
  const imageUri = user?.image?.trim() || null;

  return (
    <View style={sx("rounded-[28px] border border-surface-container-high bg-surface-container-low p-5")}>
      <View style={sx("flex-row items-center gap-4")}>
        <View
          accessibilityLabel={imageUri ? "Profile avatar" : `Avatar initials ${initials || "none"}`}
          style={[AVATAR, sx("items-center justify-center overflow-hidden border-primary-fixed bg-surface-container-highest"), { borderWidth: 2 }]}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={AVATAR} resizeMode="cover" />
          ) : initials ? (
            <Text style={t.initials}>{initials}</Text>
          ) : (
            <User size={26} color={color.onSurfaceVariant} />
          )}
        </View>
        <View style={sx("min-w-0 flex-1")}>
          <View style={sx("flex-row items-center gap-2")}>
            <Text numberOfLines={1} style={[sx("min-w-0 shrink"), t.name]}>
              {name}
            </Text>
            {showProBadge(entitlement) ? (
              <View style={[sx("shrink-0 rounded-full bg-primary-fixed px-2"), { paddingVertical: 2 }]}>
                <Text style={t.pro}>PRO</Text>
              </View>
            ) : null}
          </View>
          <Text numberOfLines={1} style={[sx("font-body text-body-sm text-on-surface-variant"), { marginTop: 2 }]}>
            {meta}
          </Text>
        </View>
      </View>
    </View>
  );
};
