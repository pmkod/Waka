import * as React from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { UserVerificationForm } from "@/features/authentication/user-verification/user-verification.form";
import {
	UserVerificationGoals,
	type UserVerificationGoalType,
} from "@/features/authentication/user-verification/user-verification-goal";

export default function UserVerificationScreen() {
	const params = useLocalSearchParams<{ goal?: string }>();
	const goal: UserVerificationGoalType =
		params.goal === UserVerificationGoals.signup
			? UserVerificationGoals.signup
			: params.goal === UserVerificationGoals.passwordReset
				? UserVerificationGoals.passwordReset
				: UserVerificationGoals.login;

	const handleSuccess = async () => {
		if (goal === UserVerificationGoals.login) {
			router.replace("/home");
		} else if (goal === UserVerificationGoals.signup) {
			router.replace("/complete-signup");
		} else {
			router.replace("/new-password");
		}
	};

	return (
		<SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				className="flex-1"
			>
				<ScrollView
					contentContainerStyle={{
						flexGrow: 1,
						paddingHorizontal: 24,
					}}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					<UserVerificationForm onSuccess={handleSuccess} goal={goal} />
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}
