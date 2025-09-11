package com.potg.don.auth.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.potg.don.auth.dto.ReissueRequest;
import com.potg.don.auth.dto.TokenResponse;
import com.potg.don.auth.jwt.JwtUtil;
import com.potg.don.auth.jwt.RefreshTokenStore;
import com.potg.don.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth")
public class AuthController {

	private final JwtUtil jwtUtil;
	private final RefreshTokenStore refreshStore;
	private final UserRepository userRepository;

	// Refresh 토큰으로 Access 재발급 (필요 시 refresh 회전도 가능)
	@PostMapping("/reissue")
	public ResponseEntity<TokenResponse> reissue(@RequestBody ReissueRequest req) {
		// Redis 에 저장된 RT가 일치하는지 체크
		String saved = refreshStore.get(req.userId());
		if (saved == null || !saved.equals(req.refreshToken()) || jwtUtil.isExpired(req.refreshToken())) {
			return ResponseEntity.status(401).build();
		}

		var user = userRepository.findById(req.userId()).orElse(null);
		if (user == null) return ResponseEntity.status(401).build();

		String newAccess  = jwtUtil.createAccessToken(user.getId(), user.getEmail());
		// (선택) refresh rotation
		String newRefresh = jwtUtil.createRefreshToken(user.getId());
		refreshStore.save(user.getId(), newRefresh, jwtUtil.getRefreshTtlSeconds());

		return ResponseEntity.ok(new TokenResponse(newAccess, newRefresh));
	}

	// 로그아웃: Redis 의 refresh 제거
	@PostMapping("/logout")
	public ResponseEntity<Void> logout(@RequestBody ReissueRequest req) {
		refreshStore.delete(req.userId());
		return ResponseEntity.ok().build();
	}
}
