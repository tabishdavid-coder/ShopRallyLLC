import { useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "../../src/theme/colors";

export default function RepairOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.vehicle}>2014 Honda Accord EX-L</Text>
      <Text style={styles.customer}>test test · Placeholder RO detail</Text>
      <View style={styles.actions}>
        <View style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>Start timer</Text>
        </View>
      </View>
      <Text style={styles.section}>Jobs, inspections, and notes — API Phase 2</Text>
      <Text style={styles.mono}>id: {id}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16, gap: 12 },
  vehicle: { fontSize: 20, fontWeight: "700", color: colors.navy },
  customer: { fontSize: 14, color: colors.muted },
  actions: { flexDirection: "row", marginTop: 8 },
  primaryBtn: {
    backgroundColor: colors.orange,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  primaryBtnText: { color: colors.white, fontWeight: "700" },
  section: { fontSize: 14, color: colors.navy, marginTop: 16 },
  mono: { fontSize: 12, color: colors.muted },
});
