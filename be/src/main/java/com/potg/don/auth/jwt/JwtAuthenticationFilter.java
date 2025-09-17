package com.potg.don.auth.jwt;

import java.io.IOException;
import java.util.Collections;
import java.util.HashMap;
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
	// (1) JSON 응답을 생성하기 위해 ObjectMapper 추가
	private final ObjectMapper objectMapper = new ObjectMapper();

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
		throws ServletException, IOException {

		String token = resolveToken(request);

		if (token != null) {
			try {
				Claims claims = jwtUtil.parse(token).getPayload();
				if ("ACCESS".equals(claims.get("typ", String.class))) {
					Long userId = Long.valueOf(claims.getSubject());
					User user = userRepository.findById(userId)
						.orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

					CustomUserDetails userDetails = new CustomUserDetails(
						user.getId(),
						user.getEmail(),
						"",
						Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER"))
					);

					Authentication authentication = new UsernamePasswordAuthenticationToken(
						userDetails,
						null,
						userDetails.getAuthorities()
					);
					SecurityContextHolder.getContext().setAuthentication(authentication);
					log.info("Successfully authenticated user: {}, uri: {}", userDetails.getUsername(), request.getRequestURI());
				}
			} catch (JwtException | IllegalArgumentException e) {
				// (2) JWT 예외가 발생했을 때, 커스텀 에러 응답을 보내고 필터 체인을 중단
				log.warn("Invalid JWT Token: {}. URI: {}", e.getMessage(), request.getRequestURI());
				sendErrorResponse(response, "유효하지 않거나 만료된 토큰입니다.");
				return; // *** [중요] 필터 체인 중단 ***
			}
		}

		// 유효한 토큰이 있거나, 토큰이 아예 없는 경우 다음 필터로 진행
		filterChain.doFilter(request, response);
	}

	/**
	 * 요청 헤더에서 "Bearer " 접두사를 제거하고 토큰을 추출합니다.
	 */
	private String resolveToken(HttpServletRequest request) {
		String bearerToken = request.getHeader("Authorization");
		if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
			return bearerToken.substring(7).trim();
		}
		return null;
	}

	/**
	 * (3) 인증 오류 발생 시, JSON 형식의 에러 응답을 생성하여 전송하는 메서드
	 */
	private void sendErrorResponse(HttpServletResponse response, String message) throws IOException {
		response.setStatus(HttpServletResponse.SC_UNAUTHORIZED); // 401 상태 코드
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		response.setCharacterEncoding("UTF-8");

		Map<String, Object> errorDetails = new HashMap<>();
		errorDetails.put("status", 401);
		errorDetails.put("error", "Unauthorized");
		errorDetails.put("message", message);

		objectMapper.writeValue(response.getWriter(), errorDetails);
	}
}
