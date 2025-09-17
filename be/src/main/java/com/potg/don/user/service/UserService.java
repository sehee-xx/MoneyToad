package com.potg.don.user.service;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.potg.don.user.dto.request.UpdateProfileRequest;
import com.potg.don.user.entity.User;
import com.potg.don.user.repository.UserRepository;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

	private final UserRepository userRepository;

	/**
	 * 인증된 사용자(me) 기준, 최신 상태로 재조회하여 반환
	 */
	public User getUser(Long userId) {
		if (userId == null) {
			throw new IllegalStateException("Unauthenticated user");
		}
		return userRepository.findById(userId)
			.orElseThrow(() -> new IllegalStateException("User not found"));
	}

	/**
	 * 성별/나이 업데이트
	 */
	@Transactional
	public User updateUser(Long userId, UpdateProfileRequest req) {
		if (userId == null) {
			throw new IllegalStateException("Unauthenticated user");
		}
		// 최신 엔티티 로드 후 수정
		User me = userRepository.findById(userId)
			.orElseThrow(() -> new IllegalStateException("User not found"));

		me.updateUser(req.gender(), req.age());

		// 변경감지로 반영되지만, 명시적으로 save 해도 무방
		return userRepository.save(me);
	}
}
