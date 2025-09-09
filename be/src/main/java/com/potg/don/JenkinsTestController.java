package com.potg.don;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class JenkinsTestController {

    @GetMapping("/api/test")
    public String Test() {
        return "Hello World";
    }
}
