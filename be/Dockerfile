# 1. Build Stage
FROM eclipse-temurin:21-jdk AS build

WORKDIR /app

# Gradle wrapper 포함한 프로젝트 복사
COPY . .

# Gradle 빌드
RUN ./gradlew clean bootJar --no-daemon

# 2. Run Stage
FROM eclipse-temurin:21-jdk

WORKDIR /app

# Build stage에서 생성된 JAR 복사
COPY --from=build /app/build/libs/*.jar app.jar

# Spring Boot 기본 포트
EXPOSE 8080

# 앱 실행
ENTRYPOINT ["java","-jar","app.jar"]
