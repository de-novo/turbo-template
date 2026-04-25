import { permissions } from "@repo/auth";
import { projectConfig } from "@repo/config";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar style="dark" />
			<ScrollView contentContainerStyle={styles.container}>
				<View style={styles.header}>
					<Text style={styles.kicker}>MOBILE READY</Text>
					<Text style={styles.title}>{projectConfig.projectName}</Text>
					<Text style={styles.description}>
						Expo mobile shell shares config, auth contracts, and API contracts
						with the full monorepo.
					</Text>
				</View>
				<View style={styles.card}>
					<Text style={styles.cardLabel}>Shared permission</Text>
					<Text style={styles.cardValue}>{permissions.licenseRead}</Text>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: "#FFFFFF",
		borderColor: "#CBD5E1",
		borderRadius: 8,
		borderWidth: 1,
		padding: 20,
	},
	cardLabel: {
		color: "#475569",
		fontSize: 14,
		fontWeight: "600",
	},
	cardValue: {
		color: "#111827",
		fontSize: 18,
		fontWeight: "700",
		marginTop: 8,
	},
	container: {
		gap: 24,
		padding: 24,
	},
	description: {
		color: "#475569",
		fontSize: 16,
		lineHeight: 24,
		marginTop: 12,
	},
	header: {
		gap: 8,
	},
	kicker: {
		color: "#2563EB",
		fontSize: 12,
		fontWeight: "700",
	},
	safeArea: {
		backgroundColor: "#F8FAFC",
		flex: 1,
	},
	title: {
		color: "#111827",
		fontSize: 32,
		fontWeight: "700",
		lineHeight: 38,
	},
});
