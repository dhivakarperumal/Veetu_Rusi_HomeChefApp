import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    getApiErrorMessage,
    getHomeChefAttendance,
    setHomeChefAttendanceStatus,
} from "../api";
import BottomBar from "../components/buttombar";
import TopHeader from "../components/topheader";
import { showAppDialog } from "../lib/app-dialog";
import { colors } from "../theme/colors";

type AttendanceRecord = {
  id?: string | number;
  attendance_date?: string;
  check_in_at?: string;
  check_out_at?: string | null;
};

type AttendanceData = {
  today: string;
  currentSession: AttendanceRecord | null;
  records: AttendanceRecord[];
};

type DateFilter = "all" | "today" | "month" | "custom";

const EMPTY_ATTENDANCE: AttendanceData = {
  today: "",
  currentSession: null,
  records: [],
};

const dateKey = (value?: string | null) => String(value || "").slice(0, 10);

function formatDate(value?: string | null) {
  const key = dateKey(value);
  if (!key) return "-";
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function normalizeAttendance(value: any): AttendanceData {
  const data = value?.attendance ?? value ?? {};
  return {
    today: data.today || "",
    currentSession:
      data.currentSession ?? data.current_session ?? data.session ?? null,
    records: Array.isArray(data.records) ? data.records : [],
  };
}

export default function AttendanceScreen() {
  const [attendance, setAttendance] = useState(EMPTY_ATTENDANCE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [marking, setMarking] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [customDate, setCustomDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadAttendance = useCallback(async () => {
    try {
      const data = await getHomeChefAttendance();
      setAttendance(normalizeAttendance(data));
    } catch (error) {
      showAppDialog(
        "Attendance unavailable",
        getApiErrorMessage(error, "Unable to load attendance."),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void loadAttendance(), 0);
    return () => clearTimeout(timer);
  }, [loadAttendance]);

  const filteredRecords = useMemo(() => {
    const today = dateKey(attendance.today) || dateKey(new Date().toISOString());
    const month = today.slice(0, 7);
    const query = search.trim().toLowerCase();

    return attendance.records.filter((record) => {
      const recordDate = dateKey(record.attendance_date);
      if (dateFilter === "today" && recordDate !== today) return false;
      if (dateFilter === "month" && !recordDate.startsWith(month)) return false;
      if (dateFilter === "custom" && recordDate !== dateKey(customDate.toISOString())) return false;
      if (!query) return true;

      const status = record.check_out_at ? "completed" : "active";
      return [
        formatDate(record.attendance_date),
        formatTime(record.check_in_at),
        formatTime(record.check_out_at),
        status,
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [attendance, customDate, dateFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );
  const completedSessions = attendance.records.filter(
    (record) => record.check_out_at,
  ).length;
  const currentMonth = (dateKey(attendance.today) || dateKey(new Date().toISOString())).slice(0, 7);
  const monthlySessions = attendance.records.filter((record) =>
    dateKey(record.attendance_date).startsWith(currentMonth),
  ).length;

  const setFilter = (filter: DateFilter) => {
    setDateFilter(filter);
    setCurrentPage(1);
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === "dismissed") {
      setShowDatePicker(false);
      return;
    }
    if (selectedDate) {
      setCustomDate(selectedDate);
      setFilter("custom");
    }
    if (event.type === "set") setShowDatePicker(false);
  };

  const handleAttendanceToggle = async () => {
    const action = attendance.currentSession ? "check_out" : "check_in";
    setMarking(true);
    try {
      const result = await setHomeChefAttendanceStatus(action);
      let nextAttendance = normalizeAttendance(result);
      if (!result?.attendance && !Array.isArray(result?.records)) {
        try {
          nextAttendance = normalizeAttendance(await getHomeChefAttendance());
        } catch {
          nextAttendance = {
            ...attendance,
            currentSession:
              action === "check_in"
                ? result?.currentSession ?? result?.current_session ?? result?.session ?? attendance.currentSession
                : null,
          };
        }
      }
      setAttendance(nextAttendance);
      showAppDialog(
        action === "check_in" ? "Checked in" : "Checked out",
        result?.message ||
          (action === "check_in"
            ? "You are now online and ready to cook."
            : "Your attendance session has been closed."),
      );
    } catch (error) {
      showAppDialog(
        "Attendance update failed",
        getApiErrorMessage(error, "Unable to mark attendance."),
      );
    } finally {
      setMarking(false);
    }
  };

  const summary = [
    { label: "Total sessions", value: attendance.records.length, icon: "calendar-outline" as const, tint: "#E9F1FF", color: "#3974C6" },
    { label: "Active", value: attendance.currentSession ? 1 : 0, icon: "radio-button-on-outline" as const, tint: "#E7F3E9", color: colors.primary },
    { label: "Completed", value: completedSessions, icon: "checkmark-done-outline" as const, tint: "#FFF1DE", color: "#C47A20" },
    { label: "This month", value: monthlySessions, icon: "calendar-number-outline" as const, tint: "#FCE9E6", color: "#C65345" },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.pageBackground }} edges={["left", "right"]}>
      <TopHeader showHero={false} title="Attendance" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadAttendance();
            }}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 28 }}
      >
        <View style={{ marginBottom: 18 }}>
          <Text style={{ color: colors.primaryDark, fontSize: 25, fontWeight: "900" }}>
            Attendance
          </Text>
          <Text style={{ color: colors.muted, fontSize: 13, marginTop: 5 }}>
            Work sessions and attendance history
          </Text>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
          {summary.map((item) => (
            <View
              key={item.label}
              style={{
                width: "48%",
                flexGrow: 1,
                minHeight: 102,
                flexDirection: "row",
                alignItems: "center",
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.cardBackground,
                padding: 14,
              }}
            >
              <View style={{ width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: item.tint, marginRight: 11 }}>
                <Ionicons name={item.icon} size={21} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "700" }} numberOfLines={1}>
                  {item.label.toUpperCase()}
                </Text>
                <Text style={{ color: colors.primaryDark, fontSize: 27, fontWeight: "900", marginTop: 2 }}>
                  {item.value}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ backgroundColor: colors.primaryDark, borderRadius: 16, padding: 17, marginBottom: 18 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "800" }}>
                {attendance.currentSession ? "Your shift is active" : "Ready to start your shift?"}
              </Text>
              <Text style={{ color: "#D3E2D9", fontSize: 12, marginTop: 5 }}>
                {attendance.currentSession
                  ? `Checked in since ${formatTime(attendance.currentSession.check_in_at)}`
                  : "Check in when you are ready to receive orders."}
              </Text>
            </View>
            <Pressable
              onPress={handleAttendanceToggle}
              disabled={marking || loading}
              style={({ pressed }) => ({
                minHeight: 46,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                borderRadius: 11,
                backgroundColor: attendance.currentSession ? "#B6433B" : colors.primary,
                paddingHorizontal: 13,
                opacity: marking || loading ? 0.55 : pressed ? 0.85 : 1,
              })}
            >
              {marking ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name={attendance.currentSession ? "log-out-outline" : "log-in-outline"} size={17} color="#FFFFFF" />
              )}
              <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "800" }}>
                {marking ? "Updating" : attendance.currentSession ? "Check out" : "Check in"}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={{ marginBottom: 13 }}>
          <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.cardBackground, paddingHorizontal: 12 }}>
            <Ionicons name="search-outline" size={18} color={colors.muted} />
            <TextInput
              value={search}
              onChangeText={(value) => {
                setSearch(value);
                setCurrentPage(1);
              }}
              placeholder="Search date, time or status"
              placeholderTextColor="#91A39A"
              style={{ flex: 1, minHeight: 46, color: colors.primaryDark, fontSize: 13, paddingHorizontal: 9 }}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <Pressable accessibilityLabel="Clear search" onPress={() => setSearch("")} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.muted} />
              </Pressable>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 11 }}>
            {([
              ["all", "All"],
              ["today", "Today"],
              ["month", "This month"],
            ] as [DateFilter, string][]).map(([filter, label]) => {
              const active = dateFilter === filter;
              return (
                <Pressable
                  key={filter}
                  onPress={() => setFilter(filter)}
                  style={{ borderRadius: 20, borderWidth: 1, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : colors.cardBackground, paddingHorizontal: 14, paddingVertical: 8 }}
                >
                  <Text style={{ color: active ? "#FFFFFF" : colors.label, fontSize: 12, fontWeight: "700" }}>{label}</Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => setShowDatePicker(true)}
              style={{ flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, borderWidth: 1, borderColor: dateFilter === "custom" ? colors.primary : colors.border, backgroundColor: dateFilter === "custom" ? colors.primary : colors.cardBackground, paddingHorizontal: 13, paddingVertical: 8 }}
            >
              <Ionicons name="calendar-outline" size={14} color={dateFilter === "custom" ? "#FFFFFF" : colors.label} />
              <Text style={{ color: dateFilter === "custom" ? "#FFFFFF" : colors.label, fontSize: 12, fontWeight: "700" }}>
                {dateFilter === "custom" ? formatDate(customDate.toISOString()) : "Choose date"}
              </Text>
            </Pressable>
          </ScrollView>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 5, marginBottom: 10 }}>
          <Text style={{ color: colors.primaryDark, fontSize: 16, fontWeight: "800" }}>Session history</Text>
          <Text style={{ color: colors.muted, fontSize: 11 }}>{filteredRecords.length} sessions</Text>
        </View>

        {loading ? (
          <View style={{ paddingVertical: 44, alignItems: "center" }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : filteredRecords.length === 0 ? (
          <View style={{ alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.cardBackground, paddingVertical: 38, paddingHorizontal: 20 }}>
            <Ionicons name="calendar-outline" size={34} color={colors.primary} />
            <Text style={{ color: colors.primaryDark, fontSize: 13, fontWeight: "800", marginTop: 11 }}>No sessions found</Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 5, textAlign: "center" }}>
              {search ? `Nothing matched “${search}”.` : "Your attendance sessions will appear here."}
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {paginatedRecords.map((record, index) => {
              const active = !record.check_out_at;
              return (
                <View
                  key={record.id ?? `${record.attendance_date}-${record.check_in_at}-${index}`}
                  style={{ borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBackground, padding: 15 }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
                      <View style={{ width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#EAF4EE" }}>
                        <Ionicons name="calendar-outline" size={17} color={colors.primary} />
                      </View>
                      <Text style={{ color: colors.primaryDark, fontSize: 14, fontWeight: "800" }}>{formatDate(record.attendance_date)}</Text>
                    </View>
                    <View style={{ borderRadius: 20, backgroundColor: active ? "#E7F3E9" : "#EEF0F1", paddingHorizontal: 10, paddingVertical: 5 }}>
                      <Text style={{ color: active ? colors.primary : "#65746D", fontSize: 10, fontWeight: "800" }}>
                        {active ? "ACTIVE" : "COMPLETED"}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    {([
                      ["Check in", record.check_in_at, "log-in-outline" as const],
                      ["Check out", record.check_out_at, "log-out-outline" as const],
                    ] as const).map(([label, time, icon]) => (
                      <View key={label} style={{ flex: 1, borderRadius: 10, backgroundColor: "#F6F8F5", padding: 11 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                          <Ionicons name={icon} size={14} color={colors.muted} />
                          <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "700" }}>{label}</Text>
                        </View>
                        <Text style={{ color: colors.primaryDark, fontSize: 15, fontWeight: "800", marginTop: 7 }}>{formatTime(time)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {filteredRecords.length > itemsPerPage && (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
            <Text style={{ color: colors.muted, fontSize: 11 }}>
              {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredRecords.length)} of {filteredRecords.length}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Pressable
                accessibilityLabel="Previous page"
                disabled={currentPage === 1}
                onPress={() => setCurrentPage((page) => Math.max(1, page - 1))}
                style={{ width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBackground, opacity: currentPage === 1 ? 0.4 : 1 }}
              >
                <Ionicons name="chevron-back" size={18} color={colors.primaryDark} />
              </Pressable>
              <Text style={{ color: colors.label, fontSize: 12, fontWeight: "700" }}>{currentPage} / {totalPages}</Text>
              <Pressable
                accessibilityLabel="Next page"
                disabled={currentPage === totalPages}
                onPress={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                style={{ width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBackground, opacity: currentPage === totalPages ? 0.4 : 1 }}
              >
                <Ionicons name="chevron-forward" size={18} color={colors.primaryDark} />
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
      <BottomBar />

      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <Pressable onPress={() => setShowDatePicker(false)} style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" }}>
          <Pressable onPress={(event) => event.stopPropagation()} style={{ backgroundColor: colors.cardBackground, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 30 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={{ color: colors.primaryDark, fontSize: 16, fontWeight: "800" }}>Choose a date</Text>
              <Pressable onPress={() => setShowDatePicker(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.primaryDark} />
              </Pressable>
            </View>
            <DateTimePicker
              value={customDate}
              mode="date"
              display="spinner"
              maximumDate={new Date()}
              onChange={handleDateChange}
              themeVariant="light"
            />
            <Pressable onPress={() => setShowDatePicker(false)} style={{ alignSelf: "flex-end", paddingHorizontal: 18, paddingVertical: 10 }}>
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "800" }}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}