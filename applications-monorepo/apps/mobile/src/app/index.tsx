import * as React from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Logo } from "@/core/components/partials/logo";
import { Button, ButtonText } from "@/core/components/ui/button";
import { FullPageLoader } from "@/core/components/ui/full-page-loader";
import { AuthShowcaseCards } from "@/features/authentication/showcase/auth-showcase-cards";
import { useAuthenticatedUser } from "@/features/user/authenticated-user/use-authenticated-user";

export default function Index() {
	const authenticatedUserQuery = useAuthenticatedUser();

	React.useEffect(() => {
		if (authenticatedUserQuery.data) {
			router.replace("/home");
		}
	}, [authenticatedUserQuery.data]);

	if (authenticatedUserQuery.isLoading) {
		return <FullPageLoader />;
	}

	return (
		<SafeAreaView className="flex-1 bg-background">
			<ScrollView
				contentContainerStyle={{
					flexGrow: 1,
					justifyContent: "space-between",
					paddingHorizontal: 24,
					paddingTop: 16,
					paddingBottom: 24,
				}}
				showsVerticalScrollIndicator={false}
			>
				{/* Top Section: Logo + Web Headline */}
				<View className="flex-col gap-6 pt-2">
					<Logo size="lg" />
					<Text className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-[1.2]">
						A space to share, connect, and find your people.
					</Text>
				</View>

				{/* Middle Section: Trio of showcase cards */}
				<View className="my-auto py-2">
					<AuthShowcaseCards />
				</View>

				{/* Bottom Section: Action Buttons */}
				<View className="flex-col gap-3 pt-4">
					<Button
						variant="default"
						size="lg"
						onPress={() => router.push("/login")}
					>
						<ButtonText>Log in</ButtonText>
					</Button>

					<Button
						variant="outline"
						size="lg"
						onPress={() => router.push("/signup")}
					>
						<ButtonText>Sign up</ButtonText>
					</Button>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}
