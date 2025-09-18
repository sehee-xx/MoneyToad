package com.potg.don.auth.jwt;

import java.io.IOException;
import java.util.Collections;
import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.potg.don.auth.entity.CustomUserDetails;
import com.potg.don.user.entity.User;
import com.potg.don.user.repository.UserRepository;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

	private final JwtUtil jwtUtil;
	private final UserRepository userRepository;
	private final ObjectMapper objectMapper = new ObjectMapper();

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
		throws ServletException, IOException {

		String token = resolveToken(request);

		if (token != null) {
			try {
				// ✅ 1. (핵심 수정) 토큰 재발급 요청일 경우를 위한 ExpiredJwtException 분리 처리
				Claims claims = jwtUtil.parse(token).getPayload();
				// Access Token 타입일 경우에만 인증 처리
				if ("ACCESS".equals(claims.get("typ", String.class))) {
					setAuthentication(claims);
				}
			} catch (ExpiredJwtException e) {
				// Access Token이 만료되었을 때, 재발급 요청(/api/auth/reissue)인지 확인
				String requestURI = request.getRequestURI();
				if (requestURI.equals("/api/auth/reissue")) {
					log.info("Token expired, but it's for reissue. Proceeding with authentication from expired token.");
					// 만료된 토큰의 Claims를 사용하여 SecurityContext에 인증 정보 임시 저장
					setAuthentication(e.getClaims());
				} else {
					log.warn("Expired JWT Token on non-reissue path. URI: {}", requestURI);
					sendErrorResponse(response, "만료된 토큰입니다.");
					return; // 필터 체인 중단
				}
			} catch (JwtException | IllegalArgumentException | NullPointerException e) {
				// ✅ 2. (개선) NullPointerException 등 다른 런타임 예외도 처리 범위에 추가
				log.warn("Invalid JWT Token: {}. URI: {}", e.getMessage(), request.getRequestURI());
				sendErrorResponse(response, "유효하지 않은 토큰입니다.");
				return; // 필터 체인 중단
			}
		}

		// 다음 필터로 요청 전달
		filterChain.doFilter(request, response);
	}

	/**
	 * Claims 정보를 바탕으로 SecurityContext에 인증 정보를 저장하는 메소드
	 */
	private void setAuthentication(Claims claims) {
		Long userId = Long.valueOf(claims.getSubject());
		User user = userRepository.findById(userId)
			.orElseThrow(() -> new NullPointerException("User not found with id: " + userId));

		CustomUserDetails userDetails = new CustomUserDetails(
			user.getId(),
			user.getEmail(),
			"", // Password는 민감 정보이므로 비워둠
			Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER"))
		);

		Authentication authentication = new UsernamePasswordAuthenticationToken(
			userDetails,
			null,
			userDetails.getAuthorities()
		);
		SecurityContextHolder.getContext().setAuthentication(authentication);
		log.info("Successfully authenticated user: {}", userDetails.getUsername());
	}

	private String resolveToken(HttpServletRequest request) {
		String bearerToken = request.getHeader("Authorization");
		if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
			return bearerToken.substring(7).trim();
		}
		return null;
	}

	private void sendErrorResponse(HttpServletResponse response, String message) throws IOException {
		// 🚨 CORS 헤더 설정은 SecurityConfig의 corsConfigurationSource에서 중앙 관리하는 것이 더 좋습니다.
		//    다만, 현재 구조를 유지하기 위해 이 코드를 남겨둡니다.
		response.setHeader("Access-Control-Allow-Origin", "*"); // 실제 운영에서는 특정 Origin만 허용해야 합니다.
		response.setHeader("Access-Control-Allow-Credentials", "true");

		response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		response.setCharacterEncoding("UTF-8");

		Map<String, Object> body = Map.of(
			"status", 401,
			"error", "Unauthorized",
			"message", message
		);
		objectMapper.writeValue(response.getWriter(), body);
	}
}
