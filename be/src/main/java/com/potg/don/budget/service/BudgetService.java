package com.potg.don.budget.service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;

import com.potg.don.budget.dto.request.BudgetUpdateRequest;
import com.potg.don.budget.entity.Budget;
import com.potg.don.budget.repository.BudgetRepository;
import com.potg.don.global.util.LeakCategories;
import com.potg.don.user.entity.User;
import com.potg.don.user.repository.UserRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class BudgetService {

	private static final Set<String> EXCLUDED_FOR_LEAK = Set.of("보험 / 세금");

	private final BudgetRepository budgetRepository;
	private final UserRepository userRepository;

	public List<Budget> getMonthlyBudgets(Long userId, int year, int month) {
		YearMonth yearMonth = YearMonth.of(year, month);
		LocalDate startInclusive = yearMonth.atDay(1);
		return budgetRepository.findAllByUserIdAndBudgetDate(userId, startInclusive);
	}

	public Budget updateBudget(Long userId, BudgetUpdateRequest budgetUpdateRequest) {
		User user = userRepository.findById(userId)
			.orElseThrow(() -> new EntityNotFoundException("해당 ID의 사용자를 찾을 수 없습니다: " + userId));
		Budget budget = budgetRepository.findById(budgetUpdateRequest.getBudgetId())
			.orElseThrow(() -> new EntityNotFoundException("누수를 찾을 수 없습니다"));
		budget.updateBudget(budgetUpdateRequest.getBudget());
		return budgetRepository.save(budget);
	}

	private static boolean includeForLeak(String category) {
		return category != null && !EXCLUDED_FOR_LEAK.contains(category);
	}

	public Map<YearMonth, Map<String, Integer>> getBudgetMapByMonth(
		Long userId, YearMonth startYm, YearMonth endYm) {

		LocalDate start = startYm.atDay(1);
		LocalDate end = endYm.atEndOfMonth();

		List<Budget> budgets = budgetRepository
			.findAllByUserIdAndBudgetDateBetweenOrderByBudgetDateAsc(userId, start, end);

		Map<YearMonth, Map<String, Integer>> budgetByMonth = new HashMap<>();
		for (Budget b : budgets) {
			String cat = b.getCategory();
			// 예산 쪽은 null 카테고리가 사실상 없겠지만 방어적으로 처리
			if (cat != null && !includeForLeak(cat)) continue;

			YearMonth ym = YearMonth.from(b.getBudgetDate());
			Map<String, Integer> byCat = budgetByMonth.computeIfAbsent(ym, k -> new HashMap<>());
			int amt = (b.getAmount() == null ? 0 : b.getAmount());
			byCat.merge(cat == null ? "미분류" : cat, amt, Integer::sum); // 중복시 합산
		}
		return budgetByMonth;
	}

	public Map<YearMonth, Map<String, Integer>> getBudgetMapByMonthExcludingOthers(
		Long userId, YearMonth startYm, YearMonth endYm
	) {
		LocalDate start = startYm.atDay(1);
		LocalDate end = endYm.atEndOfMonth(); // Between 포함의 우측 경계는 말일이어야 전체 월 포함

		List<Budget> budgets = budgetRepository
			.findAllByUserIdAndBudgetDateBetweenOrderByBudgetDateAsc(userId, start, end);

		Map<YearMonth, Map<String, Integer>> result = new HashMap<>();
		for (Budget b : budgets) {
			String mapped = LeakCategories.mapToAllowedOrNull(b.getCategory());
			if (mapped == null) continue; // 보험/세금 등 12개 외는 제외

			YearMonth ym = YearMonth.from(b.getBudgetDate());
			int amt = (b.getAmount() == null ? 0 : b.getAmount());

			result.computeIfAbsent(ym, k -> new HashMap<>())
				.merge(mapped, amt, Integer::sum);
		}
		return result;
	}

}
