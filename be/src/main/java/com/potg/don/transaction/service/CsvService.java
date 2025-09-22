package com.potg.don.transaction.service;

import java.io.ByteArrayOutputStream;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.util.List;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.potg.don.transaction.client.CsvUploadClient;
import com.potg.don.transaction.dto.response.CsvUploadResponse;
import com.potg.don.transaction.entity.Transaction;
import com.potg.don.transaction.repository.TransactionRepository;
import com.potg.don.user.entity.User;
import com.potg.don.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CsvService {

	private final CsvUploadClient csvUploadClient;
	private final UserRepository userRepository;
	private final TransactionRepository transactionRepository;

	@Transactional
	public CsvUploadResponse uploadAndSaveFileId(Long userId, Long cardId) {
		// 1) CSV 생성
		byte[] csv = buildTransactionsCsvForCard(cardId);

		// 2) 업로드 호출
		CsvUploadResponse response = csvUploadClient.uploadCsv(csv, cardId);
		if (response == null || response.getFile_id() == null || response.getFile_id().isBlank()) {
			throw new IllegalStateException("AI 서버에서 file_id가 반환되지 않았습니다.");
		}

		// 3) users.file_id 업데이트
		User user = userRepository.findById(userId)
			.orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + userId));
		user.updateFileId(response.getFile_id()); // User 엔티티에 setFileId(String) 존재해야 함

		// JPA @Transactional 이면 flush는 커밋 시점에 자동 반영
		return response;
	}

	public byte[] buildTransactionsCsvForCard(Long cardId) {
		List<Transaction> rows = transactionRepository
			.findAllByCard_IdOrderByTransactionDateTimeAsc(cardId);

		ByteArrayOutputStream baos = new ByteArrayOutputStream();

		// UTF-8 BOM (엑셀 한글 대응)
		byte[] bom = new byte[] {(byte)0xEF, (byte)0xBB, (byte)0xBF};
		try {
			baos.write(bom);

			try (OutputStreamWriter writer = new OutputStreamWriter(baos, StandardCharsets.UTF_8);
				 CSVPrinter csv = new CSVPrinter(writer, CSVFormat.DEFAULT
					 .withHeader("transaction_id", "transaction_date_time", "merchant_name", "category", "amount"))) {

				for (Transaction t : rows) {
					csv.printRecord(
						t.getId(),
						t.getTransactionDateTime(), // ISO-8601 문자열로 출력됨
						t.getMerchantName(),
						t.getCategory(),
						t.getAmount()
					);
				}
			}
			return baos.toByteArray();

		} catch (Exception e) {
			throw new IllegalStateException("CSV 생성 실패", e);
		}
	}
}
