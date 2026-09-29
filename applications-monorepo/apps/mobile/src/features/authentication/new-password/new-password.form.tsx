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
import { PasswordInput } from "@/core/components/ui/password-input";
import { UserValidationSchema } from "@/features/user/common/user.validation-schemas";
import { useNewPassword } from "./use-new-password";

const newPasswordSchema = z
	.object({
		password: UserValidationSchema.shape.password,
		confirmPassword: z.string().min(1, "Please confirm your password."),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords do not match.",
		path: ["confirmPassword"],
	});

type NewPasswordFormValues = z.infer<typeof newPasswordSchema>;

type NewPasswordFormProps = {
	onSuccess: () => void;
};

export function NewPasswordForm({ onSuccess }: NewPasswordFormProps) {
	const newPassword = useNewPassword();
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

	const {
		control,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<NewPasswordFormValues>({
		resolver: zodResolver(newPasswordSchema),
		defaultValues: {
			password: "",
			confirmPassword: "",
		},
	});

	const onSubmit = async (values: NewPasswordFormValues) => {
		setErrorMessage(null);
		try {
			await newPassword.mutateAsync({ newPassword: values.password });
			onSuccess();
		} catch (err: any) {
			setErrorMessage(
				err.message || "Failed to save password. Please try again.",
			);
		}
	};

	return (
		<View className="w-full flex-col gap-6">
			{/* Title & Subtitle */}
			<View className="flex-col gap-1.5">
				<Text className="text-2xl font-bold tracking-tight text-foreground">
					New password
				</Text>
				<Text className="text-sm text-muted-foreground leading-normal">
					Choose a new secure password.
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
					name="password"
					render={({ field: { onChange, onBlur, value } }) => (
						<Field>
							<FieldLabel>New password</FieldLabel>
							<PasswordInput
								placeholder="••••••••"
								value={value}
								onBlur={onBlur}
								onChangeText={(val) => {
									setErrorMessage(null);
									onChange(val);
								}}
								autoComplete="new-password"
							/>
							<FieldDescription>Minimum 8 characters</FieldDescription>
							<FieldError error={errors.password?.message} />
						</Field>
					)}
				/>

				<Controller
					control={control}
					name="confirmPassword"
					render={({ field: { onChange, onBlur, value } }) => (
						<Field>
							<FieldLabel>Confirm password</FieldLabel>
							<PasswordInput
								placeholder="••••••••"
								value={value}
								onBlur={onBlur}
								onChangeText={(val) => {
									setErrorMessage(null);
									onChange(val);
								}}
								autoComplete="new-password"
							/>
							<FieldError error={errors.confirmPassword?.message} />
						</Field>
					)}
				/>
			</FieldGroup>

			{/* Submit Button */}
			<Button
				variant="default"
				size="lg"
				onPress={handleSubmit(onSubmit)}
				disabled={isSubmitting || newPassword.isPending}
			>
				{isSubmitting || newPassword.isPending ? (
					<View className="flex-row items-center gap-2">
						<ActivityIndicator size="small" color="#ffffff" />
						<Text className="text-primary-foreground font-semibold text-base">
							Saving…
						</Text>
					</View>
				) : (
					<Text className="text-primary-foreground font-semibold text-base">
						Save password
					</Text>
				)}
			</Button>
		</View>
	);
}
