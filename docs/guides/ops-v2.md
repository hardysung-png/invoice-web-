# v2 운영 가이드

v2 기능(상태 추적, Slack 알림, 수신자 수락/거절/네고, 역제안, 만료 크론)에 대한 운영 절차를 설명합니다.

---

## 환경 변수

Vercel 대시보드 → Settings → Environment Variables에서 설정합니다.

| 변수                 | 필수 | 설명                                                   |
| -------------------- | ---- | ------------------------------------------------------ |
| `NOTION_API_KEY`     | ✅   | Notion 통합 API 키 (`secret_` 또는 `ntn_` 시작)        |
| `NOTION_DATABASE_ID` | ✅   | Invoices 데이터베이스 ID (32자, 하이픈 제외)           |
| `ADMIN_PASSWORD`     | ✅   | 어드민 로그인 비밀번호 (최소 8자)                      |
| `SESSION_SECRET`     | ✅   | 세션 서명 시크릿 (최소 32자)                           |
| `SLACK_WEBHOOK_URL`  | 선택 | Slack Incoming Webhook URL — 미설정 시 알림 비활성화   |
| `CRON_SECRET`        | 선택 | 크론 인증 시크릿 (최소 16자) — 미설정 시 크론 401 반환 |

---

## Slack 설정

1. Slack 앱 → Incoming Webhooks 활성화
2. 채널 선택 후 Webhook URL 복사
3. Vercel에 `SLACK_WEBHOOK_URL` 등록

### 발송되는 이벤트

| 이벤트      | 트리거                    |
| ----------- | ------------------------- |
| 견적서 발송 | 어드민이 "발송" 버튼 클릭 |
| 첫 열람     | 수신자가 링크 최초 접속   |
| 수락        | 수신자 수락               |
| 거절        | 수신자 거절 (사유 포함)   |
| 네고 제출   | 수신자 단가 협상 제출     |
| 역제안      | 어드민 역제안 제출        |
| 만료        | 크론 만료 처리 시         |
| D-1 알림    | 만료 하루 전 크론 알림    |

---

## 크론 잡 (만료 처리)

### 자동 실행

`vercel.json`의 cron 설정으로 **매일 00:00 UTC** 자동 실행됩니다.

```json
{
  "crons": [{ "path": "/api/cron/expire", "schedule": "0 0 * * *" }]
}
```

### 수동 트리거

```bash
curl -X GET https://your-domain.vercel.app/api/cron/expire \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

응답 예시:

```json
{
  "ok": true,
  "date": "2026-04-16",
  "results": {
    "expired": { "processed": 2, "errors": 0 },
    "expiring": { "notified": 1, "errors": 0 }
  }
}
```

### 인증 오류 시

- `401 { "error": "CRON_SECRET이 설정되지 않았습니다." }` → Vercel에 `CRON_SECRET` 등록 필요
- `401 { "error": "인증 실패" }` → Bearer 토큰이 `CRON_SECRET`과 불일치

---

## 배포 후 스모크 테스트

배포 완료 후 아래 순서로 기능을 확인합니다.

- [ ] `/admin-login` 접속 → 로그인 성공
- [ ] 견적서 목록 정상 로드 (상태 배지 표시 확인)
- [ ] 견적서 상세 → "발송" 버튼 클릭 → Slack "발송" 알림 수신
- [ ] 수신자 링크 접속 → Slack "열람" 알림 수신
- [ ] 수신자 수락 → 상태 `accepted` 반영, 버튼 사라짐
- [ ] `/api/cron/expire` 수동 호출 → 정상 응답

---

## 롤백 절차

### Vercel 롤백

1. Vercel 대시보드 → Deployments
2. 이전 배포 선택 → "Promote to Production"

### 긴급 롤백 (기능 비활성화)

Slack 알림만 비활성화:

- `SLACK_WEBHOOK_URL` 환경변수 삭제 또는 빈 값 설정

크론만 비활성화:

- `CRON_SECRET` 환경변수 삭제 (크론 호출 시 401 반환)

---

## 모니터링

- **Vercel Functions 로그**: Vercel 대시보드 → Functions → 각 라우트 로그 확인
- **Notion API 오류**: `[ERROR]` 레벨 로그 검색
- **크론 실행 기록**: Vercel 대시보드 → Cron Jobs 탭

---

## 네고 트리 구조

견적서는 부모-자식 관계로 네고 이력을 추적합니다.

```
INV-2026-001 (어드민 최초 발송)
└── INV-2026-001-N1 (수신자 네고 제출)
    └── INV-2026-001-N2 (어드민 역제안)
        └── INV-2026-001-N3 (수신자 재네고)
```

- 수신자가 `/invoice/INV-2026-001` 접속 시 → 자동으로 최신 자식으로 리다이렉트
- 어드민은 각 노드를 고정 URL로 직접 접근 가능
- 최대 네고 횟수 초과 시 네고 버튼 비활성화 (기본 3회)
