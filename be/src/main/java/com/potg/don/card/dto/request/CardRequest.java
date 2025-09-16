package com.potg.don.card.dto.request;

import com.potg.don.card.entity.Card;
import com.potg.don.user.entity.User;

import lombok.Getter;

@Getter
public class CardRequest {
	private String cardNo;
	private String cvc;
}
