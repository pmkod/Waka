import * as React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert, AlertDescription } from "@/core/components/ui/alert";
import { Button, ButtonText } from "@/core/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/core/components/ui/field";
import { Input } from "@/core/components/ui/input";
import { UserValidationSchema } from "@/features/user/common/user.validation-schemas";
import { usePasswordReset } from "./use-password-reset";

const passwordResetSchema = z.object({
	email: UserValidationSchema.shape.email,
});

type PasswordResetFormValues = z.infer<typeof passwordResetSchema>;

type PasswordResetFormProps = {
	onSuccess: () => void;
	onBackToLogin: () => void;
};

export function PasswordResetForm({
	onSuccess,
	onBackToLogin,
}: PasswordResetFormProps) {
	const passwordReset = usePasswordReset();
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

	const {
		control,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<PasswordResetFormValues>({
		resolver: zodResolver(passwordResetSchema),
		defaultValues: {
			email: "",
		},
	});

	const onSubmit = async (values: PasswordResetFormValues) => {
		setErrorMessage(null);
		try {
			await passwordReset.mutateAsync({ email: values.email.trim() });
			onSuccess();
		} catch (err: any) {
			setErrorMessage(
				err.message || "Failed to send reset code. Please try again.",
			);
		}
	};

	return (
		<View className="w-full flex-col gap-6">
			{/* Title & Subtitle */}
			<View className="flex-col gap-1.5">
				<Text className="text-2xl font-bold tracking-tight text-foreground">
					Forgot password
				</Text>
				<Text className="text-sm text-muted-foreground leading-normal">
					Enter your email to receive a reset link.
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
					name="email"
					render={({ field: { onChange, onBlur, value } }) => (
						<Field>
							<FieldLabel>Email</FieldLabel>
							<Input
								placeholder="you@example.com"
								value={value}
								onBlur={onBlur}
								onChangeText={(val) => {
									setErrorMessage(null);
									onChange(val);
								}}
								keyboardType="email-address"
								autoCapitalize="none"
								autoCorrect={false}
							/>
							<FieldError error={errors.email?.message} />
						</Field>
					)}
				/>
			</FieldGroup>

			{/* Submit Button */}
			<Button
				variant="default"
				size="lg"
				onPress={handleSubmit(onSubmit)}
				disabled={isSubmitting || passwordReset.isPending}
			>
				{isSubmitting || passwordReset.isPending ? (
					<ButtonText className="flex-row items-center gap-2">
						<ActivityIndicator size="small" color="#ffffff" />
						<Text className="text-primary-foreground font-semibold text-base">
							Sending…
						</Text>
					</ButtonText>
				) : (
					<ButtonText>Send code</ButtonText>
				)}
			</Button>

			{/* Footer */}
			<View className="flex-row items-center justify-center pt-2">
				<Pressable onPress={onBackToLogin} hitSlop={8}>
					<Text className="text-sm text-muted-foreground underline underline-offset-2">
						Back to log in
					</Text>
				</Pressable>
			</View>
		</View>
	);
}
