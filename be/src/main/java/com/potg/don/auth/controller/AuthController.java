package com.potg.don.auth.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.potg.don.auth.dto.ReissueRequest;
import com.potg.don.auth.dto.TokenResponse;
import com.potg.don.auth.entity.CustomUserDetails;
import com.potg.don.auth.jwt.JwtUtil;
import com.potg.don.auth.jwt.RefreshTokenStore;
import com.potg.don.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/auth")
public class AuthController {

	private final JwtUtil jwtUtil;
	private final RefreshTokenStore refreshStore;
	private final UserRepository userRepository;

	/**
	 * Refresh 토큰으로 Access 토큰을 재발급합니다.
	 */
	@PostMapping("/reissue")
	public ResponseEntity<TokenResponse> reissue(
		// 1. @AuthenticationPrincipal로 인증된 사용자 정보를 가져옵니다.
		@AuthenticationPrincipal CustomUserDetails userDetails,
		// 2. RequestBody에서는 refreshToken만 받습니다.
		@RequestBody ReissueRequest req) {

		// 3. Principal에서 직접 userId를 가져와 사용합니다.
		Long userId = userDetails.getUserId();

		// Redis에 저장된 RT와 일치하는지 체크
		String savedRefreshToken = refreshStore.get(userId);
		if (savedRefreshToken == null || !savedRefreshToken.equals(req.refreshToken()) || jwtUtil.isExpired(
			req.refreshToken())) {
			return ResponseEntity.status(401).build(); // 401 Unauthorized
		}

		// DB에서 사용자 정보 조회 (Principal에 필요한 정보가 다 있다면 생략 가능)
		var user = userRepository.findById(userId)
			.orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

		// 새로운 Access Token 생성
		String newAccessToken = jwtUtil.createAccessToken(user.getId(), user.getEmail());

		// (선택) Refresh Token 회전 (Rotation)
		String newRefreshToken = jwtUtil.createRefreshToken(user.getId());
		refreshStore.save(user.getId(), newRefreshToken, jwtUtil.getRefreshTtlSeconds());

		return ResponseEntity.ok(new TokenResponse(newAccessToken, newRefreshToken));
	}

	/**
	 * 로그아웃: Redis에 저장된 Refresh Token을 삭제합니다.
	 */
	@PostMapping("/logout")
	public ResponseEntity<Void> logout(
		// 1. @AuthenticationPrincipal로 인증된 사용자 정보만 가져옵니다.
		@AuthenticationPrincipal CustomUserDetails userDetails) {

		// 2. RequestBody 없이 Principal에서 userId를 가져와 처리합니다.
		Long userId = userDetails.getUserId();
		refreshStore.delete(userId);

		return ResponseEntity.ok().build();
	}
}
