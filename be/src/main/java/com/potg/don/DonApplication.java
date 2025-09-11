package com.potg.don;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class DonApplication {

    public static void main(String[] args) {
        SpringApplication.run(DonApplication.class, args);
    }

}
