import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../theme/colors";

/**
 * Reusable page header for inner screens (Orders, Dishes, Earnings, etc.)
 *
 * Props:
 *  title        – Page title shown on the left
 *  onLeftPress  – If provided, shows a left icon button (defaults to arrow-back)
 *  leftIcon     – Icon name to show on the left (e.g. "arrow-back", "menu-outline")
 *  centerTitle  – If true, centres the title
 *  rightActions – Array of { icon, onPress, badge, customContent } to render on the right
 */
export default function PageHeader({
  title,
  onLeftPress,
  leftIcon = "arrow-back",
  centerTitle = false,
  rightActions = [],
}) {
  return (
    <SafeAreaView
      edges={["top"]}
      style={{ backgroundColor: colors.pageBackground }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: 14,
          backgroundColor: colors.pageBackground,
        }}
      >
        {/* Left button (optional) */}
        {onLeftPress ? (
          <Pressable
            onPress={onLeftPress}
            hitSlop={8}
            style={{
              height: 40,
              width: 40,
              borderRadius: 20,
              backgroundColor: leftIcon === "arrow-back" ? colors.cardBackground : "transparent",
              alignItems: "center",
              justifyContent: "center",
              marginRight: leftIcon === "arrow-back" ? 10 : 6,
              shadowColor: "#000",
              shadowOpacity: leftIcon === "arrow-back" ? 0.06 : 0,
              shadowOffset: { width: 0, height: 1 },
              shadowRadius: 4,
              elevation: leftIcon === "arrow-back" ? 2 : 0,
            }}
          >
            <Ionicons name={leftIcon} size={22} color={colors.primaryDark} />
          </Pressable>
        ) : null}

        {/* Title */}
        <Text
          style={{
            flex: 1,
            fontSize: 24,
            fontWeight: "800",
            color: colors.primaryDark,
            textAlign: centerTitle ? "center" : "left",
            marginLeft: centerTitle && !onLeftPress ? 0 : 0,
          }}
        >
          {title}
        </Text>

        {/* Right action buttons */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {rightActions.map((action, idx) => {
            if (action.customContent) {
              return <View key={idx}>{action.customContent}</View>;
            }
            return (
              <Pressable
                key={idx}
                onPress={action.onPress}
                style={{
                  height: 40,
                  width: 40,
                  borderRadius: 20,
                  backgroundColor: colors.cardBackground,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: "#000",
                  shadowOpacity: 0.06,
                  shadowOffset: { width: 0, height: 1 },
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Ionicons name={action.icon} size={20} color={colors.primaryDark} />
                {action.badge ? (
                  <View
                    style={{
                      position: "absolute",
                      top: 7,
                      right: 7,
                      height: 8,
                      width: 8,
                      borderRadius: 4,
                      backgroundColor: "#FF5252",
                      borderWidth: 1.5,
                      borderColor: colors.pageBackground,
                    }}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}
