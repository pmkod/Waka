import * as React from "react";
import { Platform, Pressable, TextInput, View } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { cn } from "@/core/lib/utils";

export type PasswordInputProps = React.ComponentProps<typeof TextInput> & {
	className?: string;
};

export function PasswordInput({ className, ...props }: PasswordInputProps) {
	const [showPassword, setShowPassword] = React.useState(false);

	return (
		<View className="relative w-full justify-center">
			<TextInput
				secureTextEntry={!showPassword}
				className={cn(
					"border-input bg-card text-foreground flex h-11 w-full flex-row items-center rounded border px-3.5 pr-11 text-base shadow-sm shadow-black/5",
					Platform.select({
						native: "placeholder:text-muted-foreground/60",
						web: "placeholder:text-muted-foreground outline-none focus-visible:border-ring focus-visible:ring-[2px]",
					}),
					className,
				)}
				placeholderTextColor="#71717a"
				autoCapitalize="none"
				autoCorrect={false}
				{...props}
			/>
			<Pressable
				onPress={() => setShowPassword((prev) => !prev)}
				className="absolute right-3 top-0 bottom-0 justify-center items-center active:opacity-70 p-1"
				hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
				accessibilityRole="button"
				accessibilityLabel={showPassword ? "Hide password" : "Show password"}
			>
				{showPassword ? (
					<EyeOff size={18} color="#a1a1aa" />
				) : (
					<Eye size={18} color="#a1a1aa" />
				)}
			</Pressable>
		</View>
	);
}
