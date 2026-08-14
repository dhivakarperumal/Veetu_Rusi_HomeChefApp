import { Text, View } from "react-native";
import BottomBar from "./componets/buttombar";
import TopHeader from "./componets/topheader";
import { colors } from "../theme/colors";

export default function EarningsScreen() {
  return (
    <View className="flex-1" style={{ backgroundColor: colors.pageBackground }}>
      <TopHeader />
      <View className="flex-1 px-5 pb-28 pt-5">
        <View
          className="rounded-[26px] p-5"
          style={{ backgroundColor: colors.cardBackground }}
        >
          <Text className="text-2xl font-bold" style={{ color: colors.primaryDark }}>
            Earnings
          </Text>
          <Text className="mt-2 text-base" style={{ color: colors.primarySoft }}>
            Your revenue overview
          </Text>
        </View>
      </View>
      <BottomBar />
    </View>
  );
}
