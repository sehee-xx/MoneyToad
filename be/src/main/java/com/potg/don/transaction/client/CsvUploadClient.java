package com.potg.don.transaction.client;

import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import com.potg.don.transaction.dto.response.CsvUploadResponse;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class CsvUploadClient {

	private final WebClient webClient;

	private static final String UPLOAD_URL = "https://j13a409.p.ssafy.io/api/ai/csv/upload";

	public CsvUploadResponse uploadCsv(byte[] csvBytes, Long cardId) {
		String filename = "transactions_" + cardId + ".csv";
		ByteArrayResource filePart = new ByteArrayResource(csvBytes) {
			@Override
			public String getFilename() {
				return filename;
			}
		};

		MultipartBodyBuilder mb = new MultipartBodyBuilder();
		mb.part("file", filePart)
			.contentType(MediaType.TEXT_PLAIN); // 서버가 text/csv 요구 시 MediaType.parseMediaType("text/csv")로 교체

		return webClient.post()
			.uri(UPLOAD_URL)
			.contentType(MediaType.MULTIPART_FORM_DATA)
			.body(BodyInserters.fromMultipartData(mb.build()))
			.retrieve()
			.bodyToMono(CsvUploadResponse.class)
			.block();
	}
}
