package com.potg.don.auth.jwt;

import java.io.IOException;
import java.util.Collections;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import com.potg.don.auth.entity.CustomUserDetails;
import com.potg.don.user.entity.User;
import com.potg.don.user.repository.UserRepository;

import io.jsonwebtoken.Claims;
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

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
		throws ServletException, IOException {

		// 1. 헤더에서 토큰 추출
		String token = resolveToken(request);

		// 2. 토큰이 존재하고 유효한 경우 인증 처리
		if (token != null) {
			try {
				Claims claims = jwtUtil.parse(token).getPayload();

				// "typ" 클레임이 "ACCESS"인지 확인
				if ("ACCESS".equals(claims.get("typ", String.class))) {
					Long userId = Long.valueOf(claims.getSubject());

					// DB에서 사용자 정보 조회
					User user = userRepository.findById(userId)
						.orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

					// --- [핵심 수정 사항] ---
					// 1. CustomUserDetails 객체 생성 (Principal로 사용될 객체)
					CustomUserDetails userDetails = new CustomUserDetails(
						user.getId(),
						user.getEmail(),
						"", // 비밀번호는 보통 보안상 비워두거나 "" 처리합니다.
						Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER")) // 사용자의 권한 설정
					);

					// 2. Authentication 객체 생성 (Principal에 userDetails 삽입)
					Authentication authentication = new UsernamePasswordAuthenticationToken(
						userDetails, // Principal: CustomUserDetails 객체
						null,        // Credentials: 보통 null 처리
						userDetails.getAuthorities() // Authorities: 권한 목록
					);

					// 3. SecurityContext에 Authentication 객체 저장
					SecurityContextHolder.getContext().setAuthentication(authentication);
					log.info("Successfully authenticated user: {}, uri: {}", userDetails.getUsername(),
						request.getRequestURI());
				}
			} catch (Exception e) {
				// 토큰 관련 예외는 로그로 남겨서 디버깅이 용이하도록 함
				log.warn("Invalid JWT Token: {}. URI: {}", e.getMessage(), request.getRequestURI());
			}
		}

		// 다음 필터로 요청 전달
		filterChain.doFilter(request, response);
	}

	/**
	 * 요청 헤더에서 "Bearer " 접두사를 제거하고 토큰을 추출합니다.
	 *
	 * @param request HttpServletRequest
	 * @return 추출된 토큰 문자열 (없으면 null)
	 */
	private String resolveToken(HttpServletRequest request) {
		String bearerToken = request.getHeader("Authorization");
		if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
			// "Bearer " 이후의 문자열을 가져오고, 앞뒤 공백을 제거합니다.
			return bearerToken.substring(7).trim();
		}
		return null;
	}
}
