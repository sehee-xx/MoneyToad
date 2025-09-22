package com.potg.don.transaction.dto.response;

import lombok.Data;
import lombok.Getter;

@Getter
public class CsvUploadResponse {
	private String csv_file;
	private String file_id;
	private String checksum;
	private long size_bytes;
	private String uploaded_at;
	private String replaced_at;
	private String s3_key;
	private String s3_url;
}
