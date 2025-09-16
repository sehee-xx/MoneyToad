package com.potg.don.user.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.potg.don.auth.dto.UpdateProfileRequest;
import com.potg.don.user.entity.User;
import com.potg.don.user.service.UserService;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/users")
public class UserController {

	private final UserService userService;

	@GetMapping("/me")
	public ResponseEntity<User> getUser(@AuthenticationPrincipal User me) {
		if (me == null) return ResponseEntity.status(401).build();
		return ResponseEntity.ok(userService.getUser(me));
	}

	// 최초 로그인 후 gender/age 입력
	@PutMapping("/me")
	public ResponseEntity<User> updateUser(@AuthenticationPrincipal User me,
		@RequestBody UpdateProfileRequest req) {
		if (me == null) return ResponseEntity.status(401).build();
		return ResponseEntity.ok(userService.updateUser(me, req));
	}
}
