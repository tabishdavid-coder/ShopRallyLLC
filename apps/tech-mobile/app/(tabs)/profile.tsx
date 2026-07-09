import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../src/theme/colors";

export default function ProfileScreen() {
  return (
    <View style={styles.page}>
      <Text style={styles.name}>Technician</Text>
      <Text style={styles.meta}>Clerk auth — wire in Phase 2</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Shift</Text>
        <Text style={styles.cardBody}>Not clocked in</Text>
      </View>
      <Text style={styles.version}>ShopRally for Techs · v1.0.0-dev</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 16, backgroundColor: colors.surface, gap: 12 },
  name: { fontSize: 22, fontWeight: "700", color: colors.navy },
  meta: { fontSize: 14, color: colors.muted },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
  },
  cardTitle: { fontSize: 14, fontWeight: "700", color: colors.navy },
  cardBody: { fontSize: 15, color: colors.muted, marginTop: 4 },
  version: { marginTop: "auto", fontSize: 12, color: colors.muted },
});
