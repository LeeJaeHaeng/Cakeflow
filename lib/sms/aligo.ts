const ALIGO_URL = "https://apis.aligo.in/send/";

interface AligoSendResult {
  result_code: string;
  message: string;
}

export async function sendSMS(phone: string, text: string): Promise<void> {
  // 개발 환경 Mock 모드
  if (process.env.SMS_MOCK_MODE === "true") {
    console.log(`[SMS MOCK] To: ${phone}\n${text}`);
    return;
  }

  const body = new URLSearchParams({
    key: process.env.ALIGO_API_KEY!,
    user_id: process.env.ALIGO_USER_ID!,
    sender: process.env.ALIGO_SENDER!,
    receiver: phone.replace(/-/g, ""),
    msg: text,
    msg_type: "SMS",
  });

  const res = await fetch(ALIGO_URL, {
    method: "POST",
    body,
  });

  const data: AligoSendResult = await res.json();

  if (data.result_code !== "1") {
    throw new Error(`SMS 발송 실패: ${data.message}`);
  }
}
