package com.potg.don.auth.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.potg.don.auth.dto.TokenResponse;
import com.potg.don.auth.entity.CustomUserDetails;

import com.potg.don.auth.service.AuthService;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/auth")
public class AuthController {
	private final AuthService authService;

	/**
	 * Refresh 토큰으로 Access 토큰을 재발급합니다.
	 */
	@PostMapping("/reissue")
	public ResponseEntity<TokenResponse> reissue(@AuthenticationPrincipal CustomUserDetails userDetails,
		@CookieValue("refreshToken") String refreshToken) {
		TokenResponse tokenResponse = authService.reissueTokens(userDetails.getUserId(), refreshToken);
		return ResponseEntity.ok(tokenResponse);
	}

	/**
	 * 로그아웃: Redis에 저장된 Refresh Token을 삭제합니다.
	 */
	@PostMapping("/logout")
	public ResponseEntity<Void> logout(@AuthenticationPrincipal CustomUserDetails userDetails) {
		authService.logout(userDetails.getUserId());
		return ResponseEntity.ok().build();
	}
}
