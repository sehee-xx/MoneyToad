package com.potg.don.auth.oauth;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import com.potg.don.auth.jwt.JwtUtil;
import com.potg.don.auth.jwt.RefreshTokenStore;
import com.potg.don.user.entity.User;
import com.potg.don.user.repository.UserRepository;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

	private final UserRepository userRepository;
	private final JwtUtil jwtUtil;
	private final RefreshTokenStore refreshStore;

	@Value("${app.oauth2.success-redirect}")
	private String successRedirect;

	@Override
	public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
		Authentication authentication) throws IOException, ServletException {
		CustomOAuth2User o = (CustomOAuth2User) authentication.getPrincipal();

		// 가입 or 조회
		User user = userRepository.findByEmail(o.getEmail())
			.orElseGet(() -> userRepository.save(User.builder()
				.email(o.getEmail())
				.name(o.getName())
				.gender(null) // 최초 로그인 시 미입력
				.age(null)
				.build()));

		// JWT 생성
		String access  = jwtUtil.createAccessToken(user.getId(), user.getEmail());
		String refresh = jwtUtil.createRefreshToken(user.getId());

		// Refresh -> Redis 저장 (RT:<userId> = token)
		refreshStore.save(user.getId(), refresh, jwtUtil.getRefreshTtlSeconds());

		// 프론트로 전달 (옵션1: 쿼리로 이동) — 보안상 운영은 HttpOnly 쿠키 권장
		String redirectUrl = String.format("%s?accessToken=%s&refreshToken=%s", successRedirect, access, refresh);
		response.sendRedirect(redirectUrl);
	}
}
