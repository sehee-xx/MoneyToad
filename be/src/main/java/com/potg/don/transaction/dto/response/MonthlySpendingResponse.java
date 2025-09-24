package com.potg.don.transaction.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class MonthlySpendingResponse {
	private String date;
	private int totalAmount;
}
