package com.potg.don.budget.service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.potg.don.budget.dto.request.BudgetUpdateRequest;
import com.potg.don.budget.entity.Budget;
import com.potg.don.budget.repository.BudgetRepository;
import com.potg.don.user.entity.User;
import com.potg.don.user.repository.UserRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class BudgetService {
	private final BudgetRepository budgetRepository;
	private final UserRepository userRepository;

	public List<Budget> getMonthlyBudgets(Long userId, int year, int month) {
		YearMonth yearMonth = YearMonth.of(year, month);
		LocalDate startInclusive = yearMonth.atDay(1);
		return budgetRepository.findAllByUserIdAndBudgetDate(userId, startInclusive);
	}

	public Map<YearMonth, Map<String, Integer>> getBudgetMapByMonth(Long userId, YearMonth startYm, YearMonth endYm) {
		LocalDate start = startYm.atDay(1);
		LocalDate end   = endYm.atDay(1);

		List<Budget> budgets = budgetRepository
			.findAllByUserIdAndBudgetDateBetweenOrderByBudgetDateAsc(userId, start, end);

		Map<YearMonth, Map<String, Integer>> budgetByMonth = new HashMap<>();
		for (Budget b : budgets) {
			YearMonth ym = YearMonth.from(b.getBudgetDate());
			Map<String, Integer> byCat = budgetByMonth.computeIfAbsent(ym, k -> new HashMap<>());
			int amt = (b.getAmount() == null ? 0 : b.getAmount());
			byCat.merge(b.getCategory(), amt, Integer::sum); // 중복시 합산
		}
		return budgetByMonth;
	}

	public Budget updateBudget(Long userId, BudgetUpdateRequest budgetUpdateRequest) {
		User user = userRepository.findById(userId)
			.orElseThrow(() -> new EntityNotFoundException("해당 ID의 사용자를 찾을 수 없습니다: " + userId));
		Budget budget = budgetRepository.findById(budgetUpdateRequest.getBudgetId())
			.orElseThrow(() -> new EntityNotFoundException("누수를 찾을 수 없습니다"));
		budget.updateBudget(budgetUpdateRequest.getBudget());
		return budgetRepository.save(budget);
	}

}
