import * as React from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { SignupForm } from "@/features/authentication/signup/signup.form";
import { UserVerificationGoals } from "@/features/authentication/user-verification/user-verification-goal";

export default function SignupScreen() {
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
					<SignupForm
						onSuccess={() => {
							router.push({
								pathname: "/user-verification",
								params: { goal: UserVerificationGoals.signup },
							});
						}}
						onNavigateLogin={() => {
							router.replace("/login");
						}}
					/>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}
