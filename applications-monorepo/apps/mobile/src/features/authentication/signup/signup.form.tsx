import * as React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert, AlertDescription } from "@/core/components/ui/alert";
import { Button } from "@/core/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/core/components/ui/field";
import { Input } from "@/core/components/ui/input";
import { PasswordInput } from "@/core/components/ui/password-input";
import { UserValidationSchema } from "@/features/user/common/user.validation-schemas";
import { useSignup } from "./use-signup";

const signupSchema = z.object({
	fullName: UserValidationSchema.shape.fullName,
	email: UserValidationSchema.shape.email,
	password: UserValidationSchema.shape.password,
});

type SignupFormValues = z.infer<typeof signupSchema>;

type SignupFormProps = {
	onSuccess: () => void;
	onNavigateLogin: () => void;
};

export function SignupForm({ onSuccess, onNavigateLogin }: SignupFormProps) {
	const signup = useSignup();
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

	const {
		control,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<SignupFormValues>({
		resolver: zodResolver(signupSchema),
		defaultValues: {
			fullName: "",
			email: "",
			password: "",
		},
	});

	const onSubmit = async (values: SignupFormValues) => {
		setErrorMessage(null);
		try {
			await signup.mutateAsync({
				fullName: values.fullName.trim(),
				email: values.email.trim(),
				password: values.password,
			});
			onSuccess();
		} catch (err: any) {
			setErrorMessage(
				err.message || "Failed to create account. Please try again.",
			);
		}
	};

	return (
		<View className="w-full flex-col gap-6">
			{/* Title & Subtitle */}
			<View className="flex-col gap-1.5">
				<Text className="text-2xl font-bold tracking-tight text-foreground">
					Create an account
				</Text>
				<Text className="text-sm text-muted-foreground leading-normal">
					Join us in just a few seconds.
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
					name="fullName"
					render={({ field: { onChange, onBlur, value } }) => (
						<Field>
							<FieldLabel>Full name</FieldLabel>
							<Input
								placeholder="John Doe"
								value={value}
								onBlur={onBlur}
								onChangeText={(val) => {
									setErrorMessage(null);
									onChange(val);
								}}
								autoCapitalize="words"
							/>
							<FieldError error={errors.fullName?.message} />
						</Field>
					)}
				/>

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
								autoComplete="email"
							/>
							<FieldError error={errors.email?.message} />
						</Field>
					)}
				/>

				<Controller
					control={control}
					name="password"
					render={({ field: { onChange, onBlur, value } }) => (
						<Field>
							<FieldLabel>Password</FieldLabel>
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
				disabled={isSubmitting || signup.isPending}
			>
				{isSubmitting || signup.isPending ? (
					<View className="flex-row items-center gap-2">
						<ActivityIndicator size="small" color="#ffffff" />
						<Text className="text-primary-foreground font-semibold text-base">
							Creating account…
						</Text>
					</View>
				) : (
					<Text className="text-primary-foreground font-semibold text-base">
						Create an account
					</Text>
				)}
			</Button>

			{/* Footer */}
			<View className="flex-row items-center justify-center gap-1.5 pt-2">
				<Text className="text-sm text-muted-foreground">
					Already have an account?
				</Text>
				<Pressable onPress={onNavigateLogin} hitSlop={8}>
					<Text className="text-sm font-semibold text-foreground underline underline-offset-2">
						Log in
					</Text>
				</Pressable>
			</View>
		</View>
	);
}
