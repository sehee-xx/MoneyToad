package com.potg.don.transaction.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.potg.don.auth.entity.CustomUserDetails;
import com.potg.don.transaction.dto.request.UpdateCategoryRequest;
import com.potg.don.transaction.dto.response.MonthlyCategorySpendingResponse;
import com.potg.don.transaction.dto.response.MonthlySpendingResponse;
import com.potg.don.transaction.dto.response.TransactionResponse;
import com.potg.don.transaction.service.TransactionService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/transactions")
public class TransactionController {
	private final TransactionService transactionService;

	@GetMapping("")
	public ResponseEntity<List<MonthlySpendingResponse>> getYearlySpending(
		@AuthenticationPrincipal CustomUserDetails user) {
		return ResponseEntity.ok(transactionService.getYearlySpending(user.getUserId()));
	}

	@GetMapping("/{year}/{month}")
	public ResponseEntity<List<TransactionResponse>> getMonthlyTransactions(
		@AuthenticationPrincipal CustomUserDetails user,
		@PathVariable Integer year,
		@PathVariable Integer month) {
		return ResponseEntity.ok(transactionService.getMonthlyTransactions(user.getUserId(), year, month));
	}

	@GetMapping("/{year}/{month}/categories")
	public ResponseEntity<List<MonthlyCategorySpendingResponse>> getMonthlyCategorySpending(
		@AuthenticationPrincipal CustomUserDetails user,
		@PathVariable Integer year,
		@PathVariable Integer month) {
		return ResponseEntity.ok(transactionService.getMonthlyCategorySpending(user.getUserId(), year, month));
	}

	@PatchMapping("/{transactionId}/category")
	public ResponseEntity<TransactionResponse> updateTransactionCategory(
		@AuthenticationPrincipal CustomUserDetails user,
		@PathVariable Long transactionId,
		@RequestBody @Valid UpdateCategoryRequest request) {
		return ResponseEntity.ok(
			transactionService.updateTransactionCategory(user.getUserId(), transactionId, request));
	}
}
