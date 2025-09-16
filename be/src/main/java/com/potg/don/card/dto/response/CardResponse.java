package com.potg.don.card.dto.response;

import com.potg.don.card.entity.Card;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CardResponse {
	private String cardNo;
	private String cvc;

	public static CardResponse from(Card card) {
		return CardResponse.builder()
			.cardNo(card.getCardNo())
			.cvc(card.getCvc())
			.build();
	}
}
