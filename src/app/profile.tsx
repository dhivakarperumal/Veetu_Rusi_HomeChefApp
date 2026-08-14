import { Text, View } from "react-native";
import { colors } from "../theme/colors";
import BottomBar from "./componets/buttombar";
import TopHeader from "./componets/topheader";

export default function ProfileScreen() {
  return (
    <View className="flex-1" style={{ backgroundColor: colors.pageBackground }}>
      <TopHeader />
      <View className="flex-1 px-5 pb-28 pt-5">
        <View
          className="rounded-[26px] p-5"
          style={{ backgroundColor: colors.cardBackground }}
        >
          <Text
            className="text-2xl font-bold"
            style={{ color: colors.primaryDark }}
          >
            Profile
          </Text>
          <Text
            className="mt-2 text-base"
            style={{ color: colors.primarySoft }}
          >
            Manage your account details
          </Text>
        </View>
      </View>
      <BottomBar />
    </View>
  );
}
