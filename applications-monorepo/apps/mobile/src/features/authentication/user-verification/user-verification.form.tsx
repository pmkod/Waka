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
import { useCompleteLogin } from "../complete-login/use-complete-login";
import { useResendUserVerificationCode } from "../resend-user-verification-code/use-resend-user-verification-code";
import { useUserVerification } from "./use-user-verification";
import {
	UserVerificationGoals,
	type UserVerificationGoalType,
} from "./user-verification-goal";

const verificationSchema = z.object({
	code: z
		.string()
		.length(6, "The code must contain exactly 6 digits.")
		.refine((val) => val.split("").every((c) => c >= "0" && c <= "9"), {
			message: "The code must contain digits only.",
		}),
});

type VerificationFormValues = z.infer<typeof verificationSchema>;

type UserVerificationFormProps = {
	onSuccess: () => void | Promise<void>;
	goal: UserVerificationGoalType;
};

export function UserVerificationForm({
	onSuccess,
	goal,
}: UserVerificationFormProps) {
	const userVerification = useUserVerification();
	const completeLogin = useCompleteLogin();
	const resend = useResendUserVerificationCode();

	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
	const [successNotice, setSuccessNotice] = React.useState<string | null>(null);

	const {
		control,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<VerificationFormValues>({
		resolver: zodResolver(verificationSchema),
		defaultValues: {
			code: "",
		},
	});

	const clearStatus = () => {
		setErrorMessage(null);
		setSuccessNotice(null);
	};

	const handleResend = async () => {
		clearStatus();
		try {
			await resend.mutateAsync();
			setSuccessNotice("A new verification code has been sent.");
		} catch (err: any) {
			setErrorMessage(err.message || "Failed to resend code.");
		}
	};

	const onSubmit = async (values: VerificationFormValues) => {
		clearStatus();
		try {
			await userVerification.mutateAsync({ code: values.code.trim() });
			if (goal === UserVerificationGoals.login) {
				await completeLogin.mutateAsync();
			}
			await onSuccess();
		} catch (err: any) {
			setErrorMessage(err.message || "Failed to verify code.");
		}
	};

	const isPending =
		userVerification.isPending || completeLogin.isPending || isSubmitting;

	return (
		<View className="w-full flex-col gap-6">
			{/* Title & Subtitle */}
			<View className="flex-col gap-1.5">
				<Text className="text-2xl font-bold tracking-tight text-foreground">
					Verification
				</Text>
				<Text className="text-sm text-muted-foreground leading-normal">
					Enter the 6-digit code sent to your email address.
				</Text>
			</View>

			{/* Status Alert */}
			{errorMessage ? (
				<Alert colorScheme="destructive">
					<AlertDescription>{errorMessage}</AlertDescription>
				</Alert>
			) : null}

			{successNotice ? (
				<View className="w-full rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5">
					<Text className="text-sm text-emerald-400 font-medium">
						{successNotice}
					</Text>
				</View>
			) : null}

			{/* Form Fields */}
			<FieldGroup>
				<Controller
					control={control}
					name="code"
					render={({ field: { onChange, onBlur, value } }) => (
						<Field>
							<FieldLabel>Verification code</FieldLabel>
							<Input
								placeholder="Votre code ici"
								value={value}
								onBlur={onBlur}
								onChangeText={(val) => {
									clearStatus();
									onChange(val);
								}}
								keyboardType="number-pad"
								maxLength={6}
							/>
							<FieldError error={errors.code?.message} />
						</Field>
					)}
				/>
			</FieldGroup>

			{/* Submit Button */}
			<Button
				variant="default"
				size="lg"
				onPress={handleSubmit(onSubmit)}
				disabled={isPending}
			>
				{isPending ? (
					<View className="flex-row items-center gap-2">
						<ActivityIndicator size="small" color="#ffffff" />
						<Text className="text-primary-foreground font-semibold text-base">
							Verifying…
						</Text>
					</View>
				) : (
					<ButtonText>Verify</ButtonText>
				)}
			</Button>

			{/* Resend Code */}
			<View className="flex-row items-center justify-center gap-1.5 pt-2">
				<Text className="text-sm text-muted-foreground">
					Didn't receive a code?
				</Text>
				<Pressable
					onPress={handleResend}
					disabled={resend.isPending}
					className="flex-row items-center gap-1"
					hitSlop={8}
				>
					<Text className="text-sm font-semibold text-foreground underline underline-offset-2">
						Resend
					</Text>
					{resend.isPending ? (
						<ActivityIndicator
							size="small"
							color="#ffffff"
							className="scale-75"
						/>
					) : null}
				</Pressable>
			</View>
		</View>
	);
}
