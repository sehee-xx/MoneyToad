package com.potg.don.transaction.service;

import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.potg.don.card.entity.Card;
import com.potg.don.card.repository.CardRepository;
import com.potg.don.transaction.dto.request.UpdateCategoryRequest;
import com.potg.don.transaction.dto.response.MonthlyCategorySpendingResponse;
import com.potg.don.transaction.dto.response.MonthlySpendingResponse;
import com.potg.don.transaction.dto.response.TransactionResponse;
import com.potg.don.transaction.entity.Transaction;
import com.potg.don.transaction.projection.CategoryTotalProjection;
import com.potg.don.transaction.projection.MonthlyCategoryTotalRow;
import com.potg.don.transaction.projection.MonthlyTotalProjection;
import com.potg.don.transaction.repository.TransactionRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TransactionService {

	private static final ZoneId ZONE_SEOUL = ZoneId.of("Asia/Seoul");
	private static final DateTimeFormatter YM_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM");

	private final TransactionRepository transactionRepository;
	private final CardRepository cardRepository;

	/**
	 * GET /transactions
	 * 최근 12개월(현재월 포함) 월별 총 소비 응답
	 * Controller 반환 타입: List<MonthlySpendingResponse>
	 */
	public List<MonthlySpendingResponse> getYearlySpending(Long userId) {
		YearMonth now = YearMonth.now(ZONE_SEOUL);
		YearMonth from = now.minusMonths(11);

		LocalDateTime start = from.atDay(1).atStartOfDay();           // inclusive
		LocalDateTime end = now.plusMonths(1).atDay(1).atStartOfDay(); // exclusive

		List<MonthlyTotalProjection> rows =
			transactionRepository.aggregateMonthlyTotals(userId, start, end);

		Map<YearMonth, Long> dbMap = rows.stream()
			.collect(Collectors.toMap(
				r -> YearMonth.of(r.getYear(), r.getMonth()),
				r -> Optional.ofNullable(r.getTotal()).orElse(0L)
			));

		List<MonthlySpendingResponse> result = new ArrayList<>();
		YearMonth cursor = from;
		for (int i = 0; i < 12; i++) {
			long total = dbMap.getOrDefault(cursor, 0L);
			result.add(new MonthlySpendingResponse(cursor.format(YM_FORMAT), (int)total));
			cursor = cursor.plusMonths(1);
		}
		return result;
	}

	/**
	 * GET /transactions/{year}/{month}
	 * 해당 월의 전체 거래 목록
	 * Controller 반환 타입: List<TransactionResponse>
	 */
	public List<TransactionResponse> getMonthlyTransactions(Long userId, Integer year, Integer month) {
		YearMonth ym = YearMonth.of(year, month);
		LocalDateTime start = ym.atDay(1).atStartOfDay();
		LocalDateTime end = ym.plusMonths(1).atDay(1).atStartOfDay();

		List<Transaction> list = transactionRepository.findAllByUserAndBetween(userId, start, end);

		return list.stream()
			.sorted(Comparator.comparing(Transaction::getTransactionDateTime).reversed())
			.map(this::toTransactionResponse)
			.toList();
	}

	/**
	 * GET /transactions/{year}/{month}/categories
	 * 해당 월 카테고리별 합계
	 * Controller 메소드명에 맞춰 intentionally 'Spendig' 철자 유지
	 * 반환: List<MonthlyCategorySpendingResponse>
	 */
	public List<MonthlyCategorySpendingResponse> getMonthlyCategorySpending(Long userId, Integer year, Integer month) {
		YearMonth ym = YearMonth.of(year, month);
		LocalDateTime start = ym.atDay(1).atStartOfDay();
		LocalDateTime end = ym.plusMonths(1).atDay(1).atStartOfDay();

		List<CategoryTotalProjection> rows =
			transactionRepository.aggregateCategoryTotals(userId, start, end);

		return rows.stream()
			.map(r -> new MonthlyCategorySpendingResponse(
				Optional.ofNullable(r.getCategory()).orElse("미분류"),
				Math.toIntExact(Optional.ofNullable(r.getTotal()).orElse(0L))
			))
			.toList();
	}

	/**
	 * PATCH /transactions/{transactionId}/category
	 * 카테고리 수정
	 * Controller 반환 타입: TransactionResponse
	 */
	@Transactional
	public TransactionResponse updateTransactionCategory(Long userId, Long transactionId,
		UpdateCategoryRequest request) {
		Transaction tx = transactionRepository.findByIdAndCard_User_Id(transactionId, userId)
			.orElseThrow(() -> new NoSuchElementException("거래내역을 찾을 수 없거나 권한이 없습니다."));
		tx.update(request.getCategory());
		return TransactionResponse.from(transactionRepository.save(tx));
	}

	private TransactionResponse toTransactionResponse(Transaction t) {
		return TransactionResponse.builder()
			.id(t.getId())
			.transactionDateTime(t.getTransactionDateTime())
			.amount(t.getAmount())
			.merchantName(t.getMerchantName())
			.category(t.getCategory())
			.build();
	}

	public Map<YearMonth, Map<String, Integer>> getSpentMapByMonth(Long userId, YearMonth startYm, YearMonth endYm) {
		LocalDateTime start = startYm.atDay(1).atStartOfDay();
		LocalDateTime end   = endYm.plusMonths(1).atDay(1).atStartOfDay(); // [start, end)
		Card card = cardRepository.findByUserId(userId).orElseThrow(EntityNotFoundException::new);

		List<MonthlyCategoryTotalRow> rows =
			transactionRepository.aggregateCategoryTotalsByMonthForCard(card.getId(), start, end);

		Map<YearMonth, Map<String, Integer>> spentByMonth = new HashMap<>();
		for (MonthlyCategoryTotalRow r : rows) {
			YearMonth ym = YearMonth.of(r.getY(), r.getM());
			Map<String, Integer> byCat = spentByMonth.computeIfAbsent(ym, k -> new HashMap<>());
			String cat = (r.getCategory() == null ? "미분류" : r.getCategory());
			int total = Math.toIntExact(Objects.requireNonNullElse(r.getTotal(), 0L));
			byCat.merge(cat, total, Integer::sum);
		}
		return spentByMonth;
	}
}