package com.potg.don.auth.jwt;

import java.io.IOException;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import com.potg.don.user.repository.UserRepository;

import io.jsonwebtoken.Claims;
import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter implements Filter {

	private final JwtUtil jwtUtil;
	private final UserRepository userRepository;

	@Override
	public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
		throws IOException, ServletException {

		HttpServletRequest request = (HttpServletRequest) req;
		String bearer = request.getHeader("Authorization");
		if (StringUtils.hasText(bearer) && bearer.startsWith("Bearer ")) {
			String token = bearer.substring(7);
			try {
				Claims claims = jwtUtil.parse(token).getPayload();
				if ("ACCESS".equals(claims.get("typ"))) {
					Long userId = Long.valueOf(claims.getSubject());
					var user = userRepository.findById(userId).orElse(null);
					if (user != null) {
						var auth = new UsernamePasswordAuthenticationToken(user, null, null);
						SecurityContextHolder.getContext().setAuthentication(auth);
					}
				}
			} catch (Exception ignore) { /* 토큰 오류 시 인증 없이 진행 */ }
		}
		chain.doFilter(req, res);
	}
}
