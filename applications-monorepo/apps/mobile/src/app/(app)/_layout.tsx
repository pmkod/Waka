import * as React from "react";
import { Tabs, useRouter } from "expo-router";
import {
	Home,
	Search,
	Bell,
	User as UserIcon,
	// MessageCircle, // Module de discussion temporairement désactivé.
	Bookmark,
} from "lucide-react-native";
import { Pressable, View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Logo } from "@/core/components/partials/logo";
import { useAuthenticatedUser } from "@/features/user/authenticated-user/use-authenticated-user";

export default function AppLayout() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { data: authData } = useAuthenticatedUser();
	const unseenCount = authData?.user?.unseenNotificationsCount ?? 0;

	return (
		<Tabs
			screenOptions={{
				headerStyle: {
					backgroundColor: "#09090b",
				},
				headerTintColor: "#fafafa",
				headerShadowVisible: false,
				tabBarStyle: {
					backgroundColor: "#09090b",
					borderTopColor: "#27272a",
					height: 62 + insets.bottom,
					paddingBottom: 8 + insets.bottom,
					paddingTop: 8,
				},
				tabBarActiveTintColor: "#bc243c",
				tabBarInactiveTintColor: "#71717a",
				tabBarLabelStyle: {
					fontSize: 11,
					fontWeight: "600",
				},
			}}
		>
			{/* 1. Home Tab */}
			<Tabs.Screen
				name="home"
				options={{
					title: "Home",
					tabBarIcon: ({ color, size }) => (
						<Home size={size ?? 22} color={color} />
					),
					headerLeft: () => (
						<View className="pl-4">
							<Logo size="sm" />
						</View>
					),
					headerTitle: () => null,
					headerRight: () => (
						<View className="flex-row items-center gap-2 pr-3">
							<Pressable
								onPress={() => router.push("/(app)/bookmarks" as any)}
								className="p-2 rounded-full active:bg-[#18181b]"
							>
								<Bookmark size={20} color="#fafafa" />
							</Pressable>
							{/* Module de discussion temporairement désactivé.
							<Pressable
								onPress={() => router.push("/(app)/discussions" as any)}
								className="p-2 rounded-full active:bg-[#18181b]"
							>
								<MessageCircle size={20} color="#fafafa" />
							</Pressable>
							*/}
						</View>
					),
				}}
			/>

			{/* 2. Search Tab */}
			<Tabs.Screen
				name="search"
				options={{
					title: "Search",
					headerShown: false,
					tabBarIcon: ({ color, size }) => (
						<Search size={size ?? 22} color={color} />
					),
				}}
			/>

			{/* 3. Notifications Tab */}
			<Tabs.Screen
				name="notifications"
				options={{
					title: "Notifications",
					headerShown: false,
					tabBarIcon: ({ color, size }) => (
						<View className="relative">
							<Bell size={size ?? 22} color={color} />
							{unseenCount > 0 && (
								<View className="absolute -top-1 -right-1.5 h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1">
									<Text className="text-[9px] font-bold text-white">
										{unseenCount > 99 ? "99+" : unseenCount}
									</Text>
								</View>
							)}
						</View>
					),
				}}
			/>

			{/* 4. Profile Tab */}
			<Tabs.Screen
				name="profile/index"
				options={{
					title: "Profile",
					headerShown: false,
					tabBarIcon: ({ color, size }) => (
						<UserIcon size={size ?? 22} color={color} />
					),
				}}
			/>

			{/* Hidden Inner Screens */}
			<Tabs.Screen
				name="create-post"
				options={{
					href: null,
					headerShown: false,
					tabBarStyle: { display: "none" },
				}}
			/>
			<Tabs.Screen
				name="posts/[postId]"
				options={{
					href: null,
					headerShown: false,
					tabBarStyle: { display: "none" },
				}}
			/>
			<Tabs.Screen
				name="profile/[username]"
				options={{
					href: null,
					headerShown: false,
					tabBarStyle: { display: "none" },
				}}
			/>
			<Tabs.Screen
				name="profile/[username]/followers"
				options={{
					href: null,
					headerShown: false,
					tabBarStyle: { display: "none" },
				}}
			/>
			<Tabs.Screen
				name="profile/[username]/following"
				options={{
					href: null,
					headerShown: false,
					tabBarStyle: { display: "none" },
				}}
			/>
			<Tabs.Screen
				name="edit-profile"
				options={{
					href: null,
					headerShown: false,
					tabBarStyle: { display: "none" },
				}}
			/>
			<Tabs.Screen
				name="discussions/index"
				options={{
					href: null,
					headerShown: false,
					tabBarStyle: { display: "none" },
				}}
			/>
			<Tabs.Screen
				name="discussions/[discussionId]"
				options={{
					href: null,
					headerShown: false,
					tabBarStyle: { display: "none" },
				}}
			/>
			<Tabs.Screen
				name="discussions/new"
				options={{
					href: null,
					headerShown: false,
					tabBarStyle: { display: "none" },
				}}
			/>
			<Tabs.Screen
				name="bookmarks"
				options={{
					href: null,
					headerShown: false,
					tabBarStyle: { display: "none" },
				}}
			/>
			<Tabs.Screen
				name="bookmark-collections/index"
				options={{
					href: null,
					headerShown: false,
					tabBarStyle: { display: "none" },
				}}
			/>
			<Tabs.Screen
				name="bookmark-collections/new"
				options={{
					href: null,
					headerShown: false,
					tabBarStyle: { display: "none" },
				}}
			/>
			<Tabs.Screen
				name="settings/index"
				options={{
					href: null,
					headerShown: false,
					tabBarStyle: { display: "none" },
				}}
			/>
			<Tabs.Screen
				name="settings/sessions"
				options={{
					href: null,
					headerShown: false,
					tabBarStyle: { display: "none" },
				}}
			/>
			<Tabs.Screen
				name="settings/change-password"
				options={{
					href: null,
					headerShown: false,
					tabBarStyle: { display: "none" },
				}}
			/>
			<Tabs.Screen
				name="settings/change-email"
				options={{
					href: null,
					headerShown: false,
					tabBarStyle: { display: "none" },
				}}
			/>
			<Tabs.Screen
				name="report"
				options={{
					href: null,
					headerShown: false,
					tabBarStyle: { display: "none" },
				}}
			/>
		</Tabs>
	);
}
