import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, Text, View } from "react-native";
import type { AppDialogButton, AppDialogOptions } from "../lib/app-dialog";
import { colors } from "../theme/colors";

type AppDialogProps = {
  dialog: AppDialogOptions | null;
  onClose: () => void;
};

export default function AppDialog({ dialog, onClose }: AppDialogProps) {
  if (!dialog) return null;

  const buttons = dialog.buttons?.length ? dialog.buttons : [{ text: "Done" }];
  const hasDestructive = buttons.some((button) => button.style === "destructive");
  const accent = hasDestructive ? "#C62828" : colors.primary;
  const icon = hasDestructive ? "alert-circle" : "information-circle";

  const handlePress = async (button: AppDialogButton) => {
    onClose();
    await button.onPress?.();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          backgroundColor: "rgba(17, 35, 27, 0.54)",
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 380,
            padding: 24,
            borderRadius: 24,
            backgroundColor: colors.cardBackground,
            shadowColor: "#000",
            shadowOpacity: 0.2,
            shadowOffset: { width: 0, height: 10 },
            shadowRadius: 24,
            elevation: 12,
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 18,
              backgroundColor: hasDestructive ? "#FFEBEE" : colors.softCard,
            }}
          >
            <Ionicons name={icon} size={29} color={accent} />
          </View>
          <Text
            style={{
              fontSize: 21,
              fontWeight: "800",
              color: colors.primaryDark,
            }}
          >
            {dialog.title}
          </Text>
          {!!dialog.message && (
            <Text
              style={{
                marginTop: 8,
                marginBottom: 24,
                fontSize: 14,
                lineHeight: 21,
                color: colors.muted,
              }}
            >
              {dialog.message}
            </Text>
          )}
          <View style={{ gap: 10 }}>
            {buttons.map((button, index) => {
              const isDestructive = button.style === "destructive";
              const isCancel = button.style === "cancel";
              return (
                <Pressable
                  key={`${button.text}-${index}`}
                  onPress={() => void handlePress(button)}
                  style={{
                    borderRadius: 13,
                    paddingVertical: 14,
                    alignItems: "center",
                    borderWidth: isCancel ? 1.5 : 0,
                    borderColor: colors.border,
                    backgroundColor: isCancel
                      ? colors.cardBackground
                      : isDestructive
                        ? "#C62828"
                        : colors.primary,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "800",
                      color: isCancel ? colors.primaryDark : "#fff",
                    }}
                  >
                    {button.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}
