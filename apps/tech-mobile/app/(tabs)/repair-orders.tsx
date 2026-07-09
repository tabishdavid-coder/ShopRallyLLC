import { Link } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "../../src/theme/colors";

const DEMO_ORDERS = [
  { id: "demo-ro", number: 497, customer: "test test", vehicle: "2014 Honda Accord", status: "In Progress" },
  { id: "demo-ro-2", number: 502, customer: "David Cortes", vehicle: "2014 BMW 640i", status: "Waiting Parts" },
];

export default function RepairOrdersScreen() {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.filterHint}>All shop ROs (API: GET /api/mobile/v1/repair-orders)</Text>
      {DEMO_ORDERS.map((ro) => (
        <Link key={ro.id} href={`/repair-orders/${ro.id}`} asChild>
          <View style={styles.card}>
            <Text style={styles.title}>RO #{ro.number}</Text>
            <Text style={styles.line}>{ro.customer} · {ro.vehicle}</Text>
            <Text style={styles.status}>{ro.status}</Text>
          </View>
        </Link>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16, gap: 12 },
  filterHint: { fontSize: 13, color: colors.muted, marginBottom: 4 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 16, fontWeight: "700", color: colors.navy },
  line: { fontSize: 14, color: colors.navy, marginTop: 4 },
  status: { fontSize: 13, color: colors.azure, marginTop: 8, fontWeight: "600" },
});
