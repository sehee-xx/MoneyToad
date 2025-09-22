package com.potg.don.transaction.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class MonthlyCategorySpendingResponse {
	private String category;
	private int totalAmount;
}
