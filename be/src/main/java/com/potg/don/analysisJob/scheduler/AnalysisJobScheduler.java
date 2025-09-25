package com.potg.don.analysisJob.scheduler;

import java.time.Instant;
import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.potg.don.analysisJob.entity.AnalysisJob;
import com.potg.don.analysisJob.repository.AnalysisJobRepository;
import com.potg.don.analysisJob.service.AnalysisJobService;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class AnalysisJobScheduler {

	private final AnalysisJobRepository jobRepo;
	private final AnalysisJobService jobService;

	// 2초마다 큐 조회 (처리량/부하에 맞춰 조정)
	@Scheduled(fixedDelay = 2000)
	public void poll() {
		Instant now = Instant.now();
		List<AnalysisJob> jobs = jobRepo.findPollableJobs(now, PageRequest.of(0, 10));
		for (AnalysisJob j : jobs) {
			try {
				jobService.pollOnce(j);
			} catch (Exception e) {
				// 실패 시 다음 재시도 예약
				j.setLeasedUntil(null);
				j.setRetryCount((j.getRetryCount()==null?0:j.getRetryCount())+1);
				j.setNextPollAt(now.plusSeconds(10));
				j.setLastMessage("POLL_ERROR: " + e.getMessage());
				j.setUpdatedAt(Instant.now());
				jobRepo.save(j);
			}
		}
	}
}

