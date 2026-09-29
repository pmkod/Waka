import { useMutation } from "@tanstack/react-query";
import { baseHttpClient } from "@/core/http-clients/base.http-client";
import { saveUserVerificationData } from "../common/authentication.utils";
import type { UserVerificationResponse } from "../common/user-verification-response";

export type PasswordResetRequestBody = {
	email: string;
};

export const usePasswordReset = () => {
	return useMutation({
		mutationFn: async (body: PasswordResetRequestBody) => {
			const { userVerification } = await baseHttpClient
				.post<UserVerificationResponse>("user/password-reset", {
					json: body,
				})
				.json();
			await saveUserVerificationData(userVerification);
			return userVerification;
		},
		onError: async (eror, variables, context) => {
			console.log(eror);
			console.log(variables);
			console.log(context);
		},
	});
};
