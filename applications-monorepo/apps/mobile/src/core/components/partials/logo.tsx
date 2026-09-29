import { View, Image } from "react-native";
import { cn } from "@/core/lib/utils";

type LogoProps = {
	size?: "md" | "lg" | "sm";
};

const image = require("../../../../assets/images/waka-white-logo.png");
const { width, height } = Image.resolveAssetSource(image);

export function Logo({ size = "md" }: LogoProps) {
	const sizeClasses = {
		sm: "w-20",
		md: "w-24",
		lg: "w-28",
	}[size];

	return (
		<View className={cn("flex-row items-center", sizeClasses)}>
			<Image
				source={image}
				style={{
					width: "100%",
					aspectRatio: width / height,
					resizeMode: "contain",
				}}
			/>
		</View>
	);
}
