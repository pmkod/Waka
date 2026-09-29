import { cn } from "@/core/lib/utils";
import { Platform, TextInput } from "react-native";

function Input({
	className,
	placeholderTextColor = "#71717a",
	...props
}: React.ComponentProps<typeof TextInput> & React.RefAttributes<TextInput>) {
	return (
		<TextInput
			placeholderTextColor={placeholderTextColor}
			className={cn(
				"border-input bg-card text-foreground flex h-11 w-full min-w-0 flex-row items-center rounded border px-3.5 py-2 text-base shadow-sm shadow-black/5",
				props.editable === false &&
					cn(
						"opacity-50",
						Platform.select({
							web: "disabled:pointer-events-none disabled:cursor-not-allowed",
						}),
					),
				Platform.select({
					web: cn(
						"placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground outline-none transition-[color,box-shadow]",
						"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[2px]",
						"aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
					),
					native: "placeholder:text-muted-foreground/60",
				}),
				className,
			)}
			{...props}
		/>
	);
}

export { Input };
