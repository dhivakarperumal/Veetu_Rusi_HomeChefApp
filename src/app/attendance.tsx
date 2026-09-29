import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getHomeChefAttendance, setHomeChefAttendanceStatus } from "../api";
import TopHeader from "./componets/topheader";

const dateKey = (value: any) => String(value || "").slice(0, 10);

const formatDate = (value: any) => {
  const key = dateKey(value);
  if (!key || key === "null") return "-";
  const [year, month, day] = key.split("-").map(Number);
  if (!year || !month || !day) return "-";
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (value: any) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const filterAttendanceRecords = (
  records: any[],
  filter: string,
  customDate: string,
) => {
  if (!Array.isArray(records)) return [];

  const now = new Date();
  const todayKey = dateKey(now.toISOString());
  const oneDayMs = 24 * 60 * 60 * 1000;

  switch (filter) {
    case "today":
      return records.filter(
        (record) => dateKey(record.attendance_date) === todayKey,
      );
    case "week": {
      const cutoff = new Date(now.getTime() - 6 * oneDayMs);
      return records.filter((record) => {
        const recordDate = new Date(dateKey(record.attendance_date));
        return recordDate >= cutoff && recordDate <= now;
      });
    }
    case "month": {
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      return records.filter((record) =>
        dateKey(record.attendance_date).startsWith(monthKey),
      );
    }
    case "custom":
      return records.filter(
        (record) => dateKey(record.attendance_date) === customDate,
      );
    default:
      return records;
  }
};

export default function AttendanceScreen() {
  const [attendance, setAttendance] = useState<any>({
    today: "",
    currentSession: null,
    records: [],
  });
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [dateFilter, setDateFilter] = useState("all");
  const [customDate, setCustomDate] = useState("");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("table");
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;

  const loadAttendance = useCallback(async () => {
    try {
      const data = await getHomeChefAttendance();
      const currentSession =
        data?.currentSession ?? data?.current_session ?? data?.session ?? null;
      setAttendance({
        today: data?.today || "",
        currentSession,
        records: Array.isArray(data?.records) ? data.records : [],
      });
    } catch (error) {
      console.log("Failed to load attendance:", error);
      setAttendance({ today: "", currentSession: null, records: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAttendance();
    const interval = setInterval(() => {
      void loadAttendance();
    }, 15000);
    return () => clearInterval(interval);
  }, [loadAttendance]);

  const markAttendance = async () => {
    const action = attendance.currentSession ? "check_out" : "check_in";
    setMarking(true);
    try {
      const result = await setHomeChefAttendanceStatus(action);
      const nextSession =
        result?.currentSession ??
        result?.current_session ??
        result?.session ??
        null;
      const refreshed = {
        today: result?.today || attendance.today,
        currentSession: nextSession,
        records: Array.isArray(result?.records) ? result.records : attendance.records,
      };
      setAttendance(refreshed);
      if (refreshed.currentSession === null && attendance.records.length > 0) {
        const nextRecords = [...attendance.records];
        const latest = nextRecords[0];
        if (latest && !latest.check_out_at) {
          latest.check_out_at = new Date().toISOString();
        }
        refreshed.records = nextRecords;
      }
      if (!result || !result.records) {
        await loadAttendance();
      }
    } catch (error) {
      console.log("Attendance update error:", error);
    } finally {
      setMarking(false);
    }
  };

  const today = new Date();
  const currentMonth = attendance.today
    ? attendance.today.slice(0, 7)
    : `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const monthlySessions = useMemo(
    () =>
      attendance.records.filter((record: any) =>
        dateKey(record.attendance_date).startsWith(currentMonth),
      ),
    [attendance.records, currentMonth],
  );

  const completedSessions = attendance.records.filter(
    (record: any) => record.check_out_at,
  ).length;

  const summaryCards = [
    {
      label: "Total Sessions",
      value: attendance.records.length,
      caption: "All recorded sessions",
      icon: "calendar-outline",
      tint: "bg-[#E3F2FD]",
      accent: "#2563EB",
    },
    {
      label: "Active",
      value: attendance.currentSession ? 1 : 0,
      caption: "Current work session",
      icon: "checkmark-circle-outline",
      tint: "bg-[#E8F5E9]",
      accent: "#2E7A4F",
    },
    {
      label: "Completed",
      value: completedSessions,
      caption: "Checked-out sessions",
      icon: "time-outline",
      tint: "bg-[#FFF3E0]",
      accent: "#F59E0B",
    },
    {
      label: "This Month",
      value: monthlySessions.length,
      caption: "Sessions this month",
      icon: "calendar-clear-outline",
      tint: "bg-[#FDE7E7]",
      accent: "#E11D48",
    },
  ];

  const filteredRecords = useMemo(() => {
    const records = filterAttendanceRecords(
      attendance.records,
      dateFilter,
      customDate,
    );

    const query = search.trim().toLowerCase();
    if (!query) return records;

    return records.filter((record: any) => {
      const status = record.check_out_at ? "completed" : "active";
      return [
        formatDate(record.attendance_date),
        formatTime(record.check_in_at),
        formatTime(record.check_out_at),
        status,
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [attendance.records, customDate, dateFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, dateFilter, customDate]);

  return (
    <SafeAreaView className="flex-1 bg-[#F5F6F4]">
      <TopHeader showHero={false} showNotifications={false} title="Attendance" />

      <ScrollView
        className="flex-1 bg-[#F5F6F4]"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View className="px-4 pb-4 pt-4">
          <View className="mb-4 flex-row items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm shadow-black/5">
            <View>
              <Text className="text-[11px] font-bold uppercase tracking-[0.8px] text-[#7A8E87]">
                Work session
              </Text>
              <Text className="mt-1 text-[20px] font-extrabold text-[#1A3328]">
                {attendance.currentSession ? "Checked in" : "Ready to start"}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => void markAttendance()}
              disabled={marking || loading}
              className={
                attendance.currentSession
                  ? "rounded-xl bg-[#C62828] px-4 py-3"
                  : "rounded-xl bg-[#2E7A4F] px-4 py-3"
              }
              style={marking || loading ? { opacity: 0.7 } : undefined}
            >
              <Text className="text-[11px] font-extrabold uppercase tracking-[0.8px] text-white">
                {marking
                  ? "Updating..."
                  : attendance.currentSession
                    ? "Check out"
                    : "Check in"}
              </Text>
            </TouchableOpacity>
          </View>

          {attendance.currentSession && (
            <View className="mb-4 rounded-2xl border border-[#DDE9E2] bg-[#E8F5E9] p-3">
              <Text className="text-[12px] font-bold text-[#2E7A4F]">
                Checked in since {formatTime(attendance.currentSession.check_in_at)}
              </Text>
            </View>
          )}

          <View className="mb-4 grid-cols-2 gap-3" style={{ display: "flex", flexDirection: "row", flexWrap: "wrap" }}>
            {summaryCards.map((card) => (
              <View
                key={card.label}
                className="mb-3 w-[48%] rounded-[18px] bg-white p-4 shadow-sm shadow-black/5"
              >
                <View className={`mb-3 h-10 w-10 items-center justify-center rounded-xl ${card.tint}`}>
                  <Ionicons name={card.icon as any} size={18} color={card.accent} />
                </View>
                <Text className="text-[10px] font-bold uppercase tracking-[1px] text-[#7A8E87]">
                  {card.label}
                </Text>
                <Text className="mt-2 text-[28px] font-black text-[#1A3328]">
                  {card.value}
                </Text>
                <Text className="mt-1 text-[10px] font-medium text-[#7A8E87]">
                  {card.caption}
                </Text>
              </View>
            ))}
          </View>

          <View className="mb-4 rounded-2xl border border-[#E4ECE7] bg-white p-3 shadow-sm shadow-black/5">
            <Text className="mb-2 text-[10px] font-bold uppercase tracking-[1px] text-[#7A8E87]">
              Search & filter
            </Text>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search date, time or status..."
              placeholderTextColor="#7A8E87"
              className="mb-3 rounded-xl border border-[#E5EAE7] bg-[#F8FAF8] px-3 py-3 text-[13px] text-[#1A3328]"
            />

            <View className="mb-1 flex-row flex-wrap gap-2">
              {[
                ["all", "All"],
                ["today", "Today"],
                ["week", "Week"],
                ["month", "Month"],
              ].map(([value, label]) => (
                <TouchableOpacity
                  key={value}
                  activeOpacity={0.8}
                  onPress={() => setDateFilter(value)}
                  className={
                    dateFilter === value
                      ? "rounded-full bg-[#2E7A4F] px-3 py-2"
                      : "rounded-full border border-[#E5EAE7] bg-[#F8FAF8] px-3 py-2"
                  }
                >
                  <Text
                    className={
                      dateFilter === value
                        ? "text-[11px] font-bold text-white"
                        : "text-[11px] font-bold text-[#1A3328]"
                    }
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="mt-2 flex-row items-center gap-2">
              <Text className="text-[11px] font-bold uppercase tracking-[1px] text-[#7A8E87]">
                Custom date
              </Text>
              <TextInput
                value={customDate}
                onChangeText={(text) => {
                  setCustomDate(text);
                  setDateFilter("custom");
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#7A8E87"
                className="flex-1 rounded-xl border border-[#E5EAE7] bg-[#F8FAF8] px-3 py-2 text-[12px] text-[#1A3328]"
              />
            </View>
          </View>

          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-[11px] font-bold uppercase tracking-[1px] text-[#7A8E87]">
              View mode
            </Text>
            <View className="flex-row gap-2">
              {[
                ["table", "Table"],
                ["card", "Cards"],
              ].map(([value, label]) => (
                <TouchableOpacity
                  key={value}
                  activeOpacity={0.8}
                  onPress={() => setViewMode(value)}
                  className={
                    viewMode === value
                      ? "rounded-full bg-[#EAF4EE] px-3 py-2"
                      : "rounded-full border border-[#E5EAE7] bg-white px-3 py-2"
                  }
                >
                  <Text
                    className={
                      viewMode === value
                        ? "text-[11px] font-bold text-[#2E7A4F]"
                        : "text-[11px] font-bold text-[#1A3328]"
                    }
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {loading ? (
            <View className="mt-6 items-center justify-center py-12">
              <ActivityIndicator size="large" color="#2E7A4F" />
            </View>
          ) : filteredRecords.length === 0 ? (
            <View className="rounded-2xl border border-[#E5EAE7] bg-white p-10 text-center shadow-sm shadow-black/5">
              <View className="mb-4 h-16 w-16 items-center justify-center self-center rounded-full bg-[#EAF4EE]">
                <Ionicons name="calendar-outline" size={28} color="#2E7A4F" />
              </View>
              <Text className="text-[12px] font-black uppercase tracking-[1px] text-[#7A8E87]">
                No sessions found
              </Text>
              <Text className="mt-2 text-[12px] text-[#7A8E87]">
                {search ? `Nothing matched "${search}".` : "Your attendance sessions will appear here."}
              </Text>
            </View>
          ) : viewMode === "table" ? (
            <View className="overflow-hidden rounded-2xl border border-[#E5EAE7] bg-white shadow-sm shadow-black/5">
              <View className="overflow-x-auto">
                <View className="min-w-[620px]">
                  <View className="flex-row bg-[#F8FAF8] px-4 py-3">
                    {[
                      "Date",
                      "Check in",
                      "Check out",
                      "Status",
                    ].map((header) => (
                      <Text
                        key={header}
                        className="flex-1 text-[10px] font-black uppercase tracking-[1.5px] text-[#7A8E87]"
                      >
                        {header}
                      </Text>
                    ))}
                  </View>

                  {paginatedRecords.map((record: any) => (
                    <View
                      key={record.id || `${record.check_in_at}-${record.attendance_date}`}
                      className="flex-row border-t border-[#E5EAE7] px-4 py-4"
                    >
                      <Text className="flex-1 text-[13px] font-bold text-[#1A3328]">
                        {formatDate(record.attendance_date)}
                      </Text>
                      <Text className="flex-1 text-[13px] font-semibold text-[#1A3328]">
                        {formatTime(record.check_in_at)}
                      </Text>
                      <Text className="flex-1 text-[13px] font-semibold text-[#1A3328]">
                        {formatTime(record.check_out_at)}
                      </Text>
                      <View className="flex-1">
                        <View
                          className={
                            record.check_out_at
                              ? "self-start rounded-full border border-[#D7E0DC] bg-[#F1F3F2] px-3 py-1"
                              : "self-start rounded-full border border-[#C9E7D2] bg-[#E8F5E9] px-3 py-1"
                          }
                        >
                          <Text
                            className={
                              record.check_out_at
                                ? "text-[9px] font-black uppercase tracking-[1px] text-[#5A7A6E]"
                                : "text-[9px] font-black uppercase tracking-[1px] text-[#2E7A4F]"
                            }
                          >
                            {record.check_out_at ? "Completed" : "Active"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ) : (
            <View className="flex-row flex-wrap gap-3">
              {paginatedRecords.map((record: any) => (
                <View
                  key={record.id || `${record.check_in_at}-${record.attendance_date}`}
                  className="w-[48%] rounded-2xl border border-[#E5EAE7] bg-white p-4 shadow-sm shadow-black/5"
                >
                  <View className="mb-3 flex-row items-center justify-between">
                    <Text className="text-[10px] font-bold uppercase tracking-[1px] text-[#2E7A4F]">
                      Attendance session
                    </Text>
                    <View
                      className={
                        record.check_out_at
                          ? "rounded-full border border-[#D7E0DC] bg-[#F1F3F2] px-2 py-1"
                          : "rounded-full border border-[#C9E7D2] bg-[#E8F5E9] px-2 py-1"
                      }
                    >
                      <Text
                        className={
                          record.check_out_at
                            ? "text-[8px] font-black uppercase tracking-[1px] text-[#5A7A6E]"
                            : "text-[8px] font-black uppercase tracking-[1px] text-[#2E7A4F]"
                        }
                      >
                        {record.check_out_at ? "Completed" : "Active"}
                      </Text>
                    </View>
                  </View>

                  <Text className="text-[16px] font-extrabold text-[#1A3328]">
                    {formatDate(record.attendance_date)}
                  </Text>

                  <View className="mt-3 flex-row justify-between gap-2">
                    <View className="flex-1 rounded-xl bg-[#F8FAF8] p-3">
                      <Text className="text-[8px] font-bold uppercase tracking-[1px] text-[#7A8E87]">
                        Check in
                      </Text>
                      <Text className="mt-1 text-[14px] font-bold text-[#1A3328]">
                        {formatTime(record.check_in_at)}
                      </Text>
                    </View>

                    <View className="flex-1 rounded-xl bg-[#F8FAF8] p-3">
                      <Text className="text-[8px] font-bold uppercase tracking-[1px] text-[#7A8E87]">
                        Check out
                      </Text>
                      <Text className="mt-1 text-[14px] font-bold text-[#1A3328]">
                        {formatTime(record.check_out_at)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {filteredRecords.length > 0 && (
            <View className="mt-6 flex-row items-center justify-between gap-3">
              <Text className="text-[10px] font-bold uppercase tracking-[1px] text-[#7A8E87]">
                Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredRecords.length)} of {filteredRecords.length}
              </Text>

              <View className="flex-row items-center gap-2">
                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={currentPage === 1}
                  onPress={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                  className={
                    currentPage === 1
                      ? "rounded-xl border border-[#E5EAE7] bg-[#F8FAF8] px-3 py-2 opacity-50"
                      : "rounded-xl border border-[#E5EAE7] bg-[#F8FAF8] px-3 py-2"
                  }
                >
                  <Text className="text-[10px] font-extrabold uppercase tracking-[1px] text-[#1A3328]">
                    Prev
                  </Text>
                </TouchableOpacity>

                <Text className="text-[10px] font-extrabold uppercase tracking-[1px] text-[#1A3328]">
                  {currentPage}/{totalPages}
                </Text>

                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={currentPage === totalPages}
                  onPress={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                  className={
                    currentPage === totalPages
                      ? "rounded-xl border border-[#E5EAE7] bg-[#F8FAF8] px-3 py-2 opacity-50"
                      : "rounded-xl border border-[#E5EAE7] bg-[#F8FAF8] px-3 py-2"
                  }
                >
                  <Text className="text-[10px] font-extrabold uppercase tracking-[1px] text-[#1A3328]">
                    Next
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
