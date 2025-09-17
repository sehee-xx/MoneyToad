package com.potg.don.config;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.potg.don.auth.jwt.JwtAuthenticationFilter;
import com.potg.don.auth.oauth.CustomOAuth2UserService;
import com.potg.don.auth.oauth.OAuth2SuccessHandler;

import lombok.RequiredArgsConstructor;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

	private final CustomOAuth2UserService oAuth2UserService;
	private final OAuth2SuccessHandler successHandler;
	private final JwtAuthenticationFilter jwtFilter;

	// (1) application.yml에서 CORS 허용 Origin 목록을 주입받습니다.
	// @Value("${cors.allowed-origins}")
	// private List<String> allowedOrigins;

	@Bean
	public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
		// 1. CORS 및 기본 설정
		http
			.csrf(AbstractHttpConfigurer::disable)
			// corsConfigurationSource Bean을 사용하여 CORS를 명시적으로 설정합니다.
			.cors(cors -> cors.configurationSource(corsConfigurationSource()))
			.sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
			.formLogin(AbstractHttpConfigurer::disable)
			.httpBasic(AbstractHttpConfigurer::disable);

		// 2. HTTP 요청 권한 설정
		http
			.authorizeHttpRequests(auth -> auth
				// 인증 없이 접근 허용할 경로들
				.requestMatchers(
					"/login/**", "/oauth2/**", // 소셜 로그인
					"/test", // 테스트용
					"/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html" // Swagger
				).permitAll()
				// (2) reissue, logout은 반드시 인증이 필요합니다.
				.requestMatchers("/auth/reissue", "/auth/logout").authenticated()
				// 나머지 모든 요청은 인증 필요
				.anyRequest().authenticated()
			);

		// 3. OAuth2 로그인 설정
		http
			.oauth2Login(o -> o
				.userInfoEndpoint(u -> u.userService(oAuth2UserService))
				.successHandler(successHandler)
			);

		// (3) JWT 필터를 UsernamePasswordAuthenticationFilter 앞에 추가합니다.
		http.addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

		return http.build();
	}

	@Bean
	public CorsConfigurationSource corsConfigurationSource() {
		CorsConfiguration config = new CorsConfiguration();

		// (4) 설정 파일에서 읽어온 Origin 목록을 설정합니다.
		config.setAllowedOrigins(List.of(
			"http://localhost:3000",
			"http://localhost:5173",
			"http://localhost:8080",
			"https://j13a409.p.ssafy.io",
			"http://j13a409.p.ssafy.io:3002"
		));
		config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
		// (5) 모든 헤더 대신, 필요한 헤더만 명시적으로 허용하는 것이 더 안전합니다.
		config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
		config.setAllowCredentials(true);

		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/**", config);
		return source;
	}
}
