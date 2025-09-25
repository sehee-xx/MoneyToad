package com.potg.don.transaction.dto.response;

import java.time.YearMonth;

import org.apache.commons.csv.CSVRecord;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class MonthlySpendingResponse {
	private String date;
	private int totalAmount;
	private boolean leaked;

	public static MonthlySpendingResponse from(String date, int totalAmount, boolean leaked) {
		return MonthlySpendingResponse.builder()
			.date(date)
			.totalAmount(totalAmount)
			.leaked(leaked)
			.build();
	}
}
