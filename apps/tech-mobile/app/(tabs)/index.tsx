import { Link } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "../../src/theme/colors";

export default function TodayScreen() {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.timerRow}>
        <View style={styles.chip}>
          <Text style={styles.chipLabel}>SHIFT</Text>
          <Text style={styles.chipValue}>Not clocked in</Text>
        </View>
        <View style={[styles.chip, styles.chipMuted]}>
          <Text style={styles.chipLabel}>JOB</Text>
          <Text style={styles.chipValue}>No active timer</Text>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.sectionTitle}>Today</Text>
        <Text style={styles.summaryLine}>Connect API to load shop ROs</Text>
        <Text style={styles.summaryMuted}>All shop repair orders · assigned highlight</Text>
      </View>

      <Text style={styles.sectionTitle}>Priority</Text>
      <Link href="/repair-orders/demo-ro" asChild>
        <View style={styles.roCard}>
          <Text style={styles.roTitle}>RO #497 · Honda Accord</Text>
          <Text style={styles.roMeta}>In Progress · Demo placeholder</Text>
        </View>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16, gap: 16 },
  timerRow: { flexDirection: "row", gap: 12 },
  chip: {
    flex: 1,
    backgroundColor: colors.navy,
    borderRadius: 12,
    padding: 12,
  },
  chipMuted: { backgroundColor: "#334155" },
  chipLabel: { color: colors.azure, fontSize: 11, fontWeight: "700" },
  chipValue: { color: colors.white, fontSize: 14, marginTop: 4 },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.navy },
  summaryLine: { fontSize: 15, color: colors.navy, marginTop: 8 },
  summaryMuted: { fontSize: 13, color: colors.muted, marginTop: 4 },
  roCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roTitle: { fontSize: 15, fontWeight: "600", color: colors.navy },
  roMeta: { fontSize: 13, color: colors.muted, marginTop: 4 },
});
