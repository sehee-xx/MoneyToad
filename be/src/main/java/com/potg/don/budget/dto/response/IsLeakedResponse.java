package com.potg.don.budget.dto.response;

import java.time.YearMonth;

import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@Builder
public class IsLeakedResponse {
	private YearMonth budgetDate;
	private boolean isLeaked;

	public static IsLeakedResponse from(YearMonth budgetDate, boolean isLeaked) {
		return IsLeakedResponse.builder()
			.budgetDate(budgetDate)
			.isLeaked(isLeaked)
			.build();
	}
}
