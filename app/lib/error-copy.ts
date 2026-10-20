import type { Locale } from "./contracts";

const messages: Record<string, readonly [string, string, string, string]> = {
  BUDGET_EXHAUSTED: [
    "活动预算不足，请联系有奖励权限的管理员补充预算后重试。",
    "The activity budget is exhausted. Ask a rewards administrator to allocate more budget.",
    "予算が不足しています。報酬管理者に予算の追加を依頼してください。",
    "활동 예산이 부족합니다. 보상 관리자에게 예산 추가를 요청하세요.",
  ],
  SESSION_REVOKED: [
    "当前会话已失效，请重新登录。",
    "This session has been revoked. Please sign in again.",
    "セッションは無効です。再ログインしてください。",
    "세션이 만료되었습니다. 다시 로그인하세요.",
  ],
  UNAUTHORIZED: [
    "登录信息无效或已过期，请重新登录。",
    "Your credentials are invalid or expired. Please sign in again.",
    "認証情報が無効か期限切れです。再ログインしてください。",
    "인증 정보가 유효하지 않거나 만료되었습니다. 다시 로그인하세요.",
  ],
  USER_FROZEN: [
    "此账号已暂停使用，请联系管理员。",
    "This account is suspended. Contact the administrator.",
    "このアカウントは停止中です。管理者にお問い合わせください。",
    "계정이 정지되었습니다. 관리자에게 문의하세요.",
  ],
  NOT_FOUND: [
    "未找到这条记录，或你没有访问权限。",
    "This record was not found or is not accessible.",
    "記録が見つからないか、アクセスできません。",
    "기록을 찾을 수 없거나 접근할 수 없습니다.",
  ],
  INSUFFICIENT_BALANCE: [
    "可用资产不足，请检查余额或票券。",
    "Insufficient assets. Check your balance or tickets.",
    "資産が不足しています。残高またはチケットをご確認ください。",
    "자산이 부족합니다. 잔액이나 티켓을 확인하세요.",
  ],
  QUOTE_EXPIRED: [
    "报价已过期，请重新获取后参与。",
    "Quote expired. Request a new quote.",
    "見積もりの期限が切れました。再取得してください。",
    "견적이 만료되었습니다. 새 견적을 요청하세요.",
  ],
  QUEST_EXPIRED: [
    "任务已结束或未开放，请刷新任务列表。",
    "This quest has ended or is unavailable. Refresh the list.",
    "クエストは終了したか、利用できません。一覧を更新してください。",
    "퀘스트가 종료되었거나 이용할 수 없습니다. 목록을 새로고침하세요.",
  ],
  STATE_CONFLICT: [
    "当前状态不支持此操作，请刷新后查看最新记录。",
    "This action is unavailable in the current state. Refresh the record.",
    "現在の状態では操作できません。記録を更新してください。",
    "현재 상태에서는 작업할 수 없습니다. 기록을 새로고침하세요.",
  ],
  VERSION_CONFLICT: [
    "记录已被更新，请刷新后再操作。",
    "This record has changed. Refresh before trying again.",
    "記録が変更されました。更新してから再試行してください。",
    "기록이 변경되었습니다. 새로고침 후 다시 시도하세요.",
  ],
  FIGHTER_LIMIT_REACHED: [
    "角色数量已达到当前配额。",
    "Your fighter quota has been reached.",
    "キャラクターの上限に達しました。",
    "캐릭터 한도에 도달했습니다.",
  ],
  FIGHTER_BUSY: [
    "该角色正在比赛中，请等待本场结束。",
    "This fighter is already in a match. Wait for it to finish.",
    "このキャラクターは対戦中です。終了をお待ちください。",
    "이미 경기 중인 캐릭터입니다. 경기가 끝날 때까지 기다리세요.",
  ],
  REWARD_NOT_ELIGIBLE: [
    "当前尚未满足领取条件，请查看任务或奖励状态。",
    "This reward is not claimable yet. Check its status.",
    "まだ報酬を受け取れません。状態をご確認ください。",
    "아직 보상을 받을 수 없습니다. 상태를 확인하세요.",
  ],
  FEATURE_DISABLED: [
    "此功能尚未启用，请稍后再试。",
    "This feature is not enabled yet.",
    "この機能は無効です。設定をご確認ください。",
    "아직 활성화되지 않은 기능입니다.",
  ],
  MOCK_DISABLED: [
    "接口未启用，请配置后端服务。",
    "This API is disabled. Configure the backend service.",
    "APIは無効です。バックエンドを設定してください。",
    "API가 비활성화되었습니다. 백엔드를 설정하세요.",
  ],
  CURSOR_EXPIRED: [
    "列表位置已失效，请返回第一页。",
    "This list position has expired. Return to the first page.",
    "一覧の位置が無効です。最初のページに戻ってください。",
    "목록 위치가 만료되었습니다. 첫 페이지로 돌아가세요.",
  ],
  AMOUNT_OUT_OF_RANGE: [
    "数量超出允许范围，请检查输入。",
    "The amount is outside the allowed range.",
    "数量が許容範囲外です。入力をご確認ください。",
    "수량이 허용 범위를 벗어났습니다. 입력을 확인하세요.",
  ],
  VALIDATION_ERROR: [
    "提交内容不符合要求，请检查必填项、格式和关联记录。",
    "Check the required fields, format and related record before submitting.",
    "必須項目、形式、関連記録をご確認ください。",
    "필수 항목, 형식 및 관련 기록을 확인하세요.",
  ],
  IDEMPOTENCY_CONFLICT: [
    "这次操作的内容已变化，请刷新记录后重试。",
    "This operation has changed. Refresh the record and retry.",
    "操作内容が変更されました。更新して再試行してください。",
    "작업 내용이 변경되었습니다. 새로고침 후 다시 시도하세요.",
  ],
  INVALID_RESPONSE: [
    "服务返回了无法识别的内容，请稍后重试。",
    "The server returned an invalid response. Try again later.",
    "サーバーの応答を読み取れません。後で再試行してください。",
    "서버 응답을 읽을 수 없습니다. 나중에 다시 시도하세요.",
  ],
  TIMEOUT: [
    "请求超时，结果尚未确认。请重试同一次操作。",
    "Request timed out; the result is unconfirmed. Retry the same operation.",
    "タイムアウトしました。結果は未確認です。同じ操作を再試行してください。",
    "요청 시간이 초과되었습니다. 결과가 확인되지 않았습니다. 같은 작업을 재시도하세요.",
  ],
  NETWORK_ERROR: [
    "暂时无法连接服务，请检查网络后重试。",
    "Could not connect to the service. Check your connection and retry.",
    "サービスに接続できません。通信環境をご確認ください。",
    "서비스에 연결할 수 없습니다. 네트워크를 확인하세요.",
  ],
  INTERNAL_ERROR: [
    "服务暂时不可用，请稍后重试。",
    "The service is temporarily unavailable. Try again later.",
    "一時的に利用できません。後で再試行してください。",
    "서비스를 일시적으로 이용할 수 없습니다. 나중에 다시 시도하세요.",
  ],
};

export function errorMessage(code: string, fallback: string, locale: string) {
  const index =
    ({ zh: 0, en: 1, ja: 2, ko: 3 } as const)[locale as Locale] ?? 0;
  return messages[code]?.[index] ?? fallback;
}
