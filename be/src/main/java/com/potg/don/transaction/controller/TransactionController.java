package com.potg.don.transaction.controller;

import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.potg.don.auth.entity.CustomUserDetails;
import com.potg.don.budget.service.BudgetService;
import com.potg.don.transaction.dto.request.UpdateCategoryRequest;
import com.potg.don.transaction.dto.response.MonthlyCategorySpendingResponse;
import com.potg.don.transaction.dto.response.MonthlyPeerSpendingResponse;
import com.potg.don.transaction.dto.response.MonthlySpendingResponse;
import com.potg.don.transaction.dto.response.TransactionResponse;
import com.potg.don.transaction.service.PeerTransactionStatsService;
import com.potg.don.transaction.service.TransactionService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/transactions")
public class TransactionController {
	private final TransactionService transactionService;
	private final PeerTransactionStatsService statsService;
	private final BudgetService budgetService;

	@GetMapping("")
	public ResponseEntity<List<MonthlySpendingResponse>> getYearlySpending(
		@AuthenticationPrincipal CustomUserDetails user) {
		Long userId = user.getUserId();
		YearMonth endYm = YearMonth.now();
		YearMonth startYm = endYm.minusMonths(11);

		Map<YearMonth, Map<String, Integer>> budgetByMonth =
			budgetService.getBudgetMapByMonth(userId, startYm, endYm);

		Map<YearMonth, Map<String, Integer>> spentByMonth =
			transactionService.getSpentMapByMonth(userId, startYm, endYm);

		List<MonthlySpendingResponse> result = new ArrayList<>(12);
		YearMonth cursor = startYm;

		while (!cursor.isAfter(endYm)) {
			Map<String, Integer> bm = budgetByMonth.getOrDefault(cursor, Map.of());
			Map<String, Integer> sm = spentByMonth.getOrDefault(cursor, Map.of());

			// ✅ 월 총 지출 합계
			int totalSpent = sm.values().stream().mapToInt(Integer::intValue).sum();

			// 누수 여부 판단
			Set<String> cats = new HashSet<>(bm.keySet());
			cats.addAll(sm.keySet());

			boolean leaked = false;
			for (String cat : cats) {
				int budget = bm.getOrDefault(cat, 0);
				int spent  = sm.getOrDefault(cat, 0);
				if (spent > budget) {
					leaked = true;
					break;
				}
			}

			// ✅ totalSpent 포함해서 응답 생성
			result.add(MonthlySpendingResponse.from(cursor.toString(), totalSpent, leaked));
			cursor = cursor.plusMonths(1);
		}

		return ResponseEntity.ok(result);
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

	@GetMapping("/peer")
	ResponseEntity<List<MonthlyPeerSpendingResponse>> getPeerTransactionStats(
		@AuthenticationPrincipal CustomUserDetails user) {
		return ResponseEntity.ok(statsService.getPeerMonthlySpendingForUser(user.getUserId()));
	}
}
