package com.potg.don.budget.controller;

import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.potg.don.auth.entity.CustomUserDetails;
import com.potg.don.budget.dto.request.BudgetUpdateRequest;
import com.potg.don.budget.dto.response.BudgetResponse;
import com.potg.don.budget.dto.response.BudgetUpdateResponse;
import com.potg.don.budget.dto.response.IsLeakedResponse;
import com.potg.don.budget.entity.Budget;
import com.potg.don.budget.service.BudgetService;
import com.potg.don.transaction.dto.response.TransactionResponse;
import com.potg.don.transaction.service.TransactionService;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/budgets")
public class BudgetController {
	private final BudgetService budgetService;
	private final TransactionService transactionService;

	@GetMapping("")
	public ResponseEntity<List<IsLeakedResponse>> getRecent12MonthsLeaks(@AuthenticationPrincipal CustomUserDetails user) {
		Long userId = user.getUserId();
		YearMonth endYm = YearMonth.now();
		YearMonth startYm = endYm.minusMonths(11);

		Map<YearMonth, Map<String, Integer>> budgetByMonth =
			budgetService.getBudgetMapByMonth(userId, startYm, endYm);

		Map<YearMonth, Map<String, Integer>> spentByMonth =
			transactionService.getSpentMapByMonth(userId, startYm, endYm);

		List<IsLeakedResponse> result = new ArrayList<>(12);
		YearMonth cursor = startYm;
		while (!cursor.isAfter(endYm)) {
			Map<String, Integer> bm = budgetByMonth.getOrDefault(cursor, Map.of());
			Map<String, Integer> sm = spentByMonth.getOrDefault(cursor, Map.of());

			Set<String> cats = new HashSet<>(bm.keySet());
			cats.addAll(sm.keySet());

			boolean leaked = false;
			for (String cat : cats) {
				int budget = bm.getOrDefault(cat, 0);
				int spent  = sm.getOrDefault(cat, 0);
				if (spent > budget) { leaked = true; break; }
			}
			result.add(IsLeakedResponse.from(cursor, leaked));
			cursor = cursor.plusMonths(1);
		}
		return ResponseEntity.ok(result);
	}

	@PatchMapping("")
	public ResponseEntity<BudgetUpdateResponse> updateBudget(@AuthenticationPrincipal CustomUserDetails user, @RequestBody
	BudgetUpdateRequest updateBudgetRequest) {
		Budget budget = budgetService.updateBudget(user.getUserId(), updateBudgetRequest);
		return ResponseEntity.ok(BudgetUpdateResponse.from(budget));
	}

	@GetMapping("/{year}/{month}")
	public ResponseEntity<List<BudgetResponse>> getMonthlyBudget(@AuthenticationPrincipal CustomUserDetails user,
		@PathVariable Integer year, @PathVariable Integer month) {

		List<Budget> budgets = budgetService.getMonthlyBudgets(user.getUserId(), year, month);
		List<TransactionResponse> transactionResponses = transactionService.getMonthlyTransactions(user.getUserId(),
			year, month);

		return ResponseEntity.ok(toBudgetResponses(budgets, transactionResponses));
	}

	// 0) 숨길 카테고리 집합
	private static final Set<String> HIDDEN_CATEGORIES = Set.of("보험 / 세금");
	private static boolean visible(String category) {
		return !HIDDEN_CATEGORIES.contains(category);
	}

	private static List<BudgetResponse> toBudgetResponses(
		List<Budget> budgets,
		List<TransactionResponse> transactionResponses
	) {
		// 1) '보험 / 세금' 제외하고 지출 합계 계산
		Map<String, Integer> spentByCategory = transactionResponses.stream()
			.filter(tr -> visible(tr.getCategory()))
			.collect(Collectors.groupingBy(TransactionResponse::getCategory,
				Collectors.summingInt(TransactionResponse::getAmount)));

		// 2) '보험 / 세금' 제외 + 고정 순서 정렬 + 매핑
		return budgets.stream()
			.filter(b -> visible(b.getCategory()))
			.sorted(Comparator.comparingInt(b ->
				CATEGORY_RANK.getOrDefault(b.getCategory(), Integer.MAX_VALUE)))
			.map(b -> BudgetResponse.from(b, spentByCategory.getOrDefault(b.getCategory(), 0)))
			.collect(Collectors.toList());
	}

	// 고정 순서 정의에서 '보험 / 세금' 제거
	private static final List<String> CATEGORY_ORDER = List.of(
		"식비","카페","마트 / 편의점","문화생활","교통 / 차량","패션 / 미용",
		"생활용품","주거 / 통신","건강 / 병원","교육","경조사 / 회비","기타"
	);

	// 순위 맵(카테고리 -> 인덱스) 그대로 유지
	private static final Map<String, Integer> CATEGORY_RANK = new HashMap<>();
	static {
		for (int i = 0; i < CATEGORY_ORDER.size(); i++) {
			CATEGORY_RANK.put(CATEGORY_ORDER.get(i), i);
		}
	}
}
