import { router, type Href } from "expo-router";
import { ArrowRight, Zap } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import type { NotificationItem } from "@/lib/api";
import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";

import { KIND_META, timeAgo } from "./alert-meta";

type Props = {
  readonly item: NotificationItem;
  readonly onRead: (id: string) => void;
};

/** S30 row: unread = left accent bar + tinted tile; read = muted. */
export const NotificationRow = ({ item, onRead }: Props) => {
  const meta = KIND_META[item.kind];
  const unread = item.readAt == null;
  const route = item.payload?.route;
  const label = item.payload?.label;
  const chip = item.payload?.chip;

  const handlePress = () => {
    onRead(item.id);
    if (route) router.push(route as Href);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${unread ? "Unread. " : ""}${item.title}`}
      onPress={handlePress}
      style={sx(
        `flex-row overflow-hidden rounded-lg border ${
          unread
            ? "bg-surface-container-low border-surface-container-high"
            : "bg-surface-container-lowest border-surface-container-high/40 opacity-90"
        }`,
      )}
    >
      {unread ? <View style={sx(`w-1 self-stretch ${meta.bar}`)} /> : null}
      <View style={sx("min-w-0 flex-1 flex-row gap-space-md p-space-md")}>
        <View
          style={sx(`h-11 w-11 shrink-0 items-center justify-center rounded-full border ${meta.tile}`)}
        >
          <meta.Icon size={22} color={meta.iconColor} />
        </View>
        <View style={sx("min-w-0 flex-1 gap-space-xs")}>
          <View style={sx("flex-row items-start justify-between gap-space-sm")}>
            <Text
              style={sx(
                `min-w-0 flex-1 text-label-lg ${
                  unread ? "font-label-bold text-on-surface" : "font-label text-on-surface"
                }`,
              )}
            >
              {item.title}
            </Text>
            <Text
              style={sx(
                `font-body-medium text-body-sm ${unread ? meta.time : "text-on-surface-variant"}`,
              )}
            >
              {timeAgo(item.createdAt)}
            </Text>
          </View>
          <Text
            style={sx(
              `font-body text-body-md ${unread ? "text-on-surface-variant" : "text-on-surface-variant/80"}`,
            )}
          >
            {item.body}
          </Text>
          {chip ? (
            <View
              style={sx(
                "mt-space-xs flex-row items-center gap-space-xs self-start rounded-sm border border-primary-fixed/20 bg-surface-container-high px-space-sm py-space-xs",
              )}
            >
              <Zap size={13} color={color.primaryFixed} />
              <Text style={sx("font-label-bold text-label-caps uppercase text-primary-fixed")}>{chip}</Text>
            </View>
          ) : null}
          {label && route ? (
            <View
              style={sx(
                `mt-space-xs flex-row items-center gap-space-xs self-start rounded-full border px-3 py-1.5 ${meta.cta}`,
              )}
            >
              <Text style={sx(`font-label text-label-md ${meta.cta.split(" ")[1]}`)}>{label}</Text>
              <ArrowRight size={14} color={meta.iconColor} />
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
};
