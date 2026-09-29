import * as React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert, AlertDescription } from "@/core/components/ui/alert";
import { Button } from "@/core/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/core/components/ui/field";
import { Input } from "@/core/components/ui/input";
import { UserValidationSchema } from "@/features/user/common/user.validation-schemas";
import { useCompleteSignup } from "./use-complete-signup";

const completeSignupSchema = z.object({
	username: UserValidationSchema.shape.username,
});

type CompleteSignupFormValues = z.infer<typeof completeSignupSchema>;

type CompleteSignupFormProps = {
	onSuccess: () => void;
};

export function CompleteSignupForm({ onSuccess }: CompleteSignupFormProps) {
	const completeSignup = useCompleteSignup();
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

	const {
		control,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<CompleteSignupFormValues>({
		resolver: zodResolver(completeSignupSchema),
		defaultValues: {
			username: "",
		},
	});

	const onSubmit = async (values: CompleteSignupFormValues) => {
		setErrorMessage(null);
		try {
			await completeSignup.mutateAsync({
				username: values.username.trim(),
			});
			onSuccess();
		} catch (err: any) {
			setErrorMessage(
				err.message || "Failed to complete sign-up. Please try again.",
			);
		}
	};

	return (
		<View className="w-full flex-col gap-6">
			{/* Title & Subtitle */}
			<View className="flex-col gap-1.5">
				<Text className="text-2xl font-bold tracking-tight text-foreground">
					Choose a username
				</Text>
				<Text className="text-sm text-muted-foreground leading-normal">
					This name will be visible to other users.
				</Text>
			</View>

			{/* Error Alert */}
			{errorMessage ? (
				<Alert colorScheme="destructive">
					<AlertDescription>{errorMessage}</AlertDescription>
				</Alert>
			) : null}

			{/* Form Fields */}
			<FieldGroup>
				<Controller
					control={control}
					name="username"
					render={({ field: { onChange, onBlur, value } }) => (
						<Field>
							<FieldLabel>Username</FieldLabel>
							<Input
								placeholder="johndoe"
								value={value}
								onBlur={onBlur}
								onChangeText={(val) => {
									setErrorMessage(null);
									onChange(val);
								}}
								autoCapitalize="none"
								autoCorrect={false}
							/>
							<FieldError error={errors.username?.message} />
						</Field>
					)}
				/>
			</FieldGroup>

			{/* Submit Button */}
			<Button
				variant="default"
				size="lg"
				onPress={handleSubmit(onSubmit)}
				disabled={isSubmitting || completeSignup.isPending}
			>
				{isSubmitting || completeSignup.isPending ? (
					<View className="flex-row items-center gap-2">
						<ActivityIndicator size="small" color="#ffffff" />
						<Text className="text-primary-foreground font-semibold text-base">
							Finishing…
						</Text>
					</View>
				) : (
					<Text className="text-primary-foreground font-semibold text-base">
						Complete sign-up
					</Text>
				)}
			</Button>
		</View>
	);
}
