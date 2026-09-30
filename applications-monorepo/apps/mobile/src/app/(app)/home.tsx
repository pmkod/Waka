import React from "react";
import {
	View,
	Text,
	FlatList,
	RefreshControl,
	ActivityIndicator,
	Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather, Plus } from "lucide-react-native";
import { useFollowingFeed } from "@/features/post/feed/use-following-feed";
import { PostItem } from "@/features/post/common/post-item";
import { EmptyBlock } from "@/core/components/ui/empty-block";
import { ExceptionBlock } from "@/core/components/ui/exception-block";
import { useAuthenticatedUser } from "@/features/user/authenticated-user/use-authenticated-user";
import { UserAvatar } from "@/features/user/common/components/user-avatar";

export default function HomeScreen() {
	const router = useRouter();
	const { data: authData } = useAuthenticatedUser();
	const user = authData?.user;

	const {
		data,
		isLoading,
		isError,
		error,
		refetch,
		isRefetching,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	} = useFollowingFeed();

	const posts = data?.pages.flatMap((page) => page.posts) ?? [];

	if (isLoading && !data) {
		return (
			<View className="flex-1 items-center justify-center bg-[#09090b]">
				<ActivityIndicator size="large" color="#bc243c" />
			</View>
		);
	}

	if (isError && !data) {
		return (
			<View className="flex-1 items-center justify-center bg-[#09090b] px-4">
				<ExceptionBlock
					title="Failed to load feed"
					description={(error as Error)?.message}
					onRefresh={refetch}
					isRefetching={isRefetching}
				/>
			</View>
		);
	}

	return (
		<View className="flex-1 bg-[#09090b]">
			<FlatList
				data={posts}
				keyExtractor={(item) => item.id}
				renderItem={({ item }) => (
					<PostItem post={item} onDeleted={() => refetch()} />
				)}
				ListEmptyComponent={
					<View className="py-16 px-6 items-center">
						<EmptyBlock
							title="Your feed is empty"
							description="Follow other accounts to see their updates here, or create your first post!"
							onRefresh={refetch}
							isRefetching={isRefetching}
						/>
						<Pressable
							onPress={() => router.push("/(app)/search" as any)}
							className="mt-6 rounded-full bg-primary px-6 py-2.5 active:opacity-80"
						>
							<Text className="text-sm font-semibold text-white">
								Find People to Follow
							</Text>
						</Pressable>
					</View>
				}
				refreshControl={
					<RefreshControl
						refreshing={isRefetching}
						onRefresh={refetch}
						tintColor="#bc243c"
						colors={["#bc243c"]}
					/>
				}
				onEndReached={() => {
					if (hasNextPage && !isFetchingNextPage) {
						fetchNextPage();
					}
				}}
				onEndReachedThreshold={0.4}
				ListFooterComponent={
					isFetchingNextPage ? (
						<View className="py-6 items-center">
							<ActivityIndicator size="small" color="#bc243c" />
						</View>
					) : null
				}
			/>

			{/* Floating action button for quick post */}
			<Pressable
				onPress={() => router.push("/(app)/create-post" as any)}
				className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg shadow-black/60 active:scale-95"
			>
				<Plus size={26} color="#ffffff" />
			</Pressable>
		</View>
	);
}
