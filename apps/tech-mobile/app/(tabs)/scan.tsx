import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../src/theme/colors";

export default function ScanScreen() {
  return (
    <View style={styles.page}>
      <Text style={styles.title}>VIN scan</Text>
      <Text style={styles.body}>Coming in v1.1 — expo-camera + barcode scan</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: colors.surface },
  title: { fontSize: 20, fontWeight: "700", color: colors.navy },
  body: { fontSize: 15, color: colors.muted, marginTop: 8, textAlign: "center" },
});
