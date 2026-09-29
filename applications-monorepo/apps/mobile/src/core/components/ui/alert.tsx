import * as React from "react";
import { Text, View } from "react-native";
import { AlertCircle } from "lucide-react-native";
import { cn } from "@/core/lib/utils";

type AlertProps = React.ComponentProps<typeof View> & {
	colorScheme?: "default" | "destructive";
	children: React.ReactNode;
};

export function Alert({
	className,
	colorScheme = "default",
	children,
	...props
}: AlertProps) {
	return (
		<View
			role="alert"
			className={cn(
				"flex-row items-start gap-2.5 rounded border p-3.5",
				colorScheme === "destructive"
					? "border-destructive"
					: "border-border bg-card",
				className,
			)}
			{...props}
		>
			<View className="flex-1">{children}</View>
		</View>
	);
}

export function AlertDescription({
	className,
	children,
	...props
}: React.ComponentProps<typeof Text>) {
	return (
		<Text
			className={cn(
				"text-sm text-destructive font-normal leading-5",
				className,
			)}
			{...props}
		>
			{children}
		</Text>
	);
}
