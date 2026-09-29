import * as React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert, AlertDescription } from "@/core/components/ui/alert";
import { Button, ButtonText } from "@/core/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/core/components/ui/field";
import { Input } from "@/core/components/ui/input";
import { PasswordInput } from "@/core/components/ui/password-input";
import { UserValidationSchema } from "@/features/user/common/user.validation-schemas";
import { useLogin } from "./use-login";

const loginSchema = z.object({
	emailOrUsername: z.string().min(1, "This field is required."),
	password: UserValidationSchema.shape.password,
});

type LoginFormValues = z.infer<typeof loginSchema>;

type LoginFormProps = {
	onSuccess: () => void;
	onForgotPassword: () => void;
	onNavigateSignup: () => void;
};

export function LoginForm({
	onSuccess,
	onForgotPassword,
	onNavigateSignup,
}: LoginFormProps) {
	const login = useLogin();
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

	const {
		control,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<LoginFormValues>({
		resolver: zodResolver(loginSchema),
		defaultValues: {
			emailOrUsername: "",
			password: "",
		},
	});

	const onSubmit = async (values: LoginFormValues) => {
		setErrorMessage(null);
		try {
			await login.mutateAsync({
				emailOrUsername: values.emailOrUsername.trim(),
				password: values.password,
			});
			onSuccess();
		} catch (err: any) {
			setErrorMessage(err.message || "Failed to log in. Please try again.");
		}
	};

	return (
		<View className="w-full flex-col gap-6">
			{/* Title & Subtitle */}
			<View className="flex-col gap-1.5">
				<Text className="text-2xl font-bold tracking-tight text-foreground">
					Log in
				</Text>
				<Text className="text-sm text-muted-foreground leading-normal">
					Enter your credentials to access your account.
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
					name="emailOrUsername"
					render={({ field: { onChange, onBlur, value } }) => (
						<Field>
							<FieldLabel>Email or username</FieldLabel>
							<Input
								placeholder="Email or username"
								value={value}
								onBlur={onBlur}
								onChangeText={(val) => {
									setErrorMessage(null);
									onChange(val);
								}}
								autoCapitalize="none"
								autoCorrect={false}
								autoComplete="username"
							/>
							<FieldError error={errors.emailOrUsername?.message} />
						</Field>
					)}
				/>

				<Controller
					control={control}
					name="password"
					render={({ field: { onChange, onBlur, value } }) => (
						<Field>
							<View className="flex-row items-center justify-between">
								<FieldLabel>Password</FieldLabel>
								<Pressable onPress={onForgotPassword} hitSlop={8}>
									<Text className="text-xs text-muted-foreground underline underline-offset-2">
										Forgot password?
									</Text>
								</Pressable>
							</View>
							<PasswordInput
								placeholder="••••••••"
								value={value}
								onBlur={onBlur}
								onChangeText={(val) => {
									setErrorMessage(null);
									onChange(val);
								}}
								autoComplete="current-password"
							/>
							<FieldError error={errors.password?.message} />
						</Field>
					)}
				/>
			</FieldGroup>

			{/* Submit Button */}
			<Button
				variant="default"
				size="lg"
				onPress={handleSubmit(onSubmit)}
				disabled={isSubmitting || login.isPending}
			>
				{isSubmitting || login.isPending ? (
					<View className="flex-row items-center gap-2">
						<ActivityIndicator size="small" color="#ffffff" />
						<Text className="text-primary-foreground font-semibold text-base">
							Logging in…
						</Text>
					</View>
				) : (
					<ButtonText>Log in</ButtonText>
				)}
			</Button>

			{/* Footer */}
			<View className="flex-row items-center justify-center gap-1.5 pt-2">
				<Text className="text-sm text-muted-foreground">
					Not signed up yet?
				</Text>
				<Pressable onPress={onNavigateSignup} hitSlop={8}>
					<Text className="text-sm font-semibold text-foreground underline underline-offset-2">
						Sign up
					</Text>
				</Pressable>
			</View>
		</View>
	);
}
