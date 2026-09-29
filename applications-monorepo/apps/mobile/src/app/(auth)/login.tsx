import * as React from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LoginForm } from "@/features/authentication/login/login.form";
import { UserVerificationGoals } from "@/features/authentication/user-verification/user-verification-goal";

export default function LoginScreen() {
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
						// paddingVertical: 20,
					}}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					<LoginForm
						onSuccess={() => {
							router.push({
								pathname: "/user-verification",
								params: { goal: UserVerificationGoals.login },
							});
						}}
						onForgotPassword={() => {
							router.push("/password-reset");
						}}
						onNavigateSignup={() => {
							router.replace("/signup");
						}}
					/>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}
