package com.potg.don.auth.oauth;

import java.io.IOException;

import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import com.potg.don.auth.dto.AccessTokenResponse;
import com.potg.don.auth.jwt.JwtUtil;
import com.potg.don.auth.jwt.RefreshTokenStore;
import com.potg.don.user.entity.User;
import com.potg.don.user.repository.UserRepository;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.http.Cookie;

import org.springframework.http.MediaType;

import java.nio.charset.StandardCharsets;

@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

	private final UserRepository userRepository;
	private final JwtUtil jwtUtil;
	private final RefreshTokenStore refreshStore;
	private final ObjectMapper objectMapper; // JSON 변환을 위해 추가

	@Override
	public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
		Authentication authentication) throws IOException, ServletException {
		CustomOAuth2User o = (CustomOAuth2User)authentication.getPrincipal();

		// 가입 또는 조회
		User user = userRepository.findByEmail(o.getEmail())
			.orElseGet(() -> userRepository.save(User.createUser(o.getEmail(), o.getName())));

		// JWT 생성
		String accessToken = jwtUtil.createAccessToken(user.getId(), user.getEmail());
		String refreshToken = jwtUtil.createRefreshToken(user.getId());

		// Refresh Token -> Redis 저장 (RT:<userId> = token)
		refreshStore.save(user.getId(), refreshToken, jwtUtil.getRefreshTtlSeconds());

		// --- 응답 방식 변경 ---
		// 1. Refresh Token을 HttpOnly 쿠키에 담기
		Cookie refreshTokenCookie = CookieUtil.createCookie(
			"refreshToken",
			refreshToken,
			(int)jwtUtil.getRefreshTtlSeconds()
		);
		response.addCookie(refreshTokenCookie);

		// 2. Access Token을 JSON 응답 본문에 담기
		sendAccessTokenResponse(response, accessToken);
	}

	private void sendAccessTokenResponse(HttpServletResponse response, String accessToken) throws IOException {
		response.setStatus(HttpServletResponse.SC_OK);
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		response.setCharacterEncoding(StandardCharsets.UTF_8.name());

		// AccessTokenResponse DTO를 사용하여 JSON 응답 생성
		AccessTokenResponse tokenResponse = new AccessTokenResponse(accessToken);

		String responseBody = objectMapper.writeValueAsString(tokenResponse);
		response.getWriter().write(responseBody);
	}
}