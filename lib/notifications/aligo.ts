import type { SupabaseClient } from "@supabase/supabase-js";
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Database } from "@/types/database";
import { phoneDigits } from "@/lib/phone";

const SMS_URL = "https://apis.aligo.in/send/";
const ALIMTALK_URL = "https://kakaoapi.aligo.in/akv10/alimtalk/send/";

export type NotificationTemplateKey =
  | "order_received"
  | "payment_paid"
  | "quote_needed"
  | "confirmed"
  | "producing"
  | "ready"
  | "completed"
  | "cancelled"
  | "review_request";

export interface NotificationInput {
  orderId?: string;
  customerId?: string;
  phone: string;
  name?: string;
  templateKey: NotificationTemplateKey;
  variables?: Record<string, string | number | null | undefined>;
  fallbackMessage?: string;
}

const ENV_TEMPLATE_CODES: Record<NotificationTemplateKey, string | undefined> = {
  order_received: process.env.ALIGO_TPL_ORDER_RECEIVED,
  payment_paid: process.env.ALIGO_TPL_PAYMENT_PAID,
  quote_needed: process.env.ALIGO_TPL_QUOTE_NEEDED,
  confirmed: process.env.ALIGO_TPL_CONFIRMED,
  producing: process.env.ALIGO_TPL_PRODUCING,
  ready: process.env.ALIGO_TPL_READY,
  completed: process.env.ALIGO_TPL_COMPLETED,
  cancelled: process.env.ALIGO_TPL_CANCELLED,
  review_request: process.env.ALIGO_TPL_REVIEW_REQUEST,
};

const DEFAULT_MESSAGES: Record<NotificationTemplateKey, { subject: string; body: string }> = {
  order_received: {
    subject: "주문 접수",
    body: "[앙금앤케이크] #{고객명}님 주문서가 접수되었습니다. 주문번호: #{주문번호}",
  },
  quote_needed: {
    subject: "상담 필요 주문 접수",
    body: "[앙금앤케이크] 주문서가 접수되었습니다. 사장님 확인 후 카카오톡 또는 전화로 안내드릴게요. 주문번호: #{주문번호}",
  },
  payment_paid: {
    subject: "결제 완료",
    body: "[앙금앤케이크] 결제가 완료되어 예약 확인 대기 중입니다. 주문번호: #{주문번호}",
  },
  confirmed: {
    subject: "예약 확정",
    body: "[앙금앤케이크] 예약이 확정되었습니다. 픽업일: #{픽업일} #{픽업시간}",
  },
  producing: {
    subject: "제작 시작",
    body: "[앙금앤케이크] 케이크 제작을 시작했습니다.",
  },
  ready: {
    subject: "픽업 준비 완료",
    body: "[앙금앤케이크] 케이크 준비가 완료되었습니다. 예약 시간에 방문해 주세요.",
  },
  completed: {
    subject: "픽업 완료",
    body: "[앙금앤케이크] 픽업이 완료되었습니다. 이용해주셔서 감사합니다.",
  },
  cancelled: {
    subject: "주문 취소",
    body: "[앙금앤케이크] 주문이 취소되었습니다. 문의가 필요하면 매장으로 연락해 주세요.",
  },
  review_request: {
    subject: "리뷰 요청",
    body: "[앙금앤케이크] 소중한 후기를 남겨주세요. #{리뷰링크}",
  },
};

function interpolate(template: string, variables: NotificationInput["variables"] = {}) {
  return template.replace(/#\{([^}]+)\}/g, (_, key: string) => String(variables[key] ?? ""));
}

async function resolveTemplate(
  supabase: SupabaseClient<Database>,
  templateKey: NotificationTemplateKey
) {
  const defaults = DEFAULT_MESSAGES[templateKey];

  try {
    const { data } = await (supabase as any)
      .from("notification_templates")
      .select("aligo_template_code, subject, body, enabled")
      .eq("key", templateKey)
      .maybeSingle();

    if (data?.enabled !== false) {
      return {
        subject: data?.subject || defaults.subject,
        body: data?.body || defaults.body,
        templateCode: data?.aligo_template_code || ENV_TEMPLATE_CODES[templateKey],
      };
    }
  } catch (err) {
    console.warn("[notification template fallback]", err);
  }

  return {
    subject: defaults.subject,
    body: defaults.body,
    templateCode: ENV_TEMPLATE_CODES[templateKey],
  };
}

function assertAligoSmsEnv() {
  const missing = ["ALIGO_API_KEY", "ALIGO_USER_ID", "ALIGO_SENDER"].filter((key) => !process.env[key]);
  if (missing.length > 0) throw new Error(`ALIGO_SMS_ENV_MISSING:${missing.join(",")}`);
}

async function logNotification(
  supabase: SupabaseClient<Database>,
  input: NotificationInput,
  channel: "alimtalk" | "sms",
  payload: {
    subject: string;
    message: string;
    status: "sent" | "failed" | "fallback_sent";
    providerResponse?: unknown;
    errorMessage?: string;
    fallbackLogId?: string | null;
  }
) {
  const { data } = await (supabase as any)
    .from("notification_logs")
    .insert({
      order_id: input.orderId ?? null,
      customer_id: input.customerId ?? null,
      template_key: input.templateKey,
      channel,
      status: payload.status,
      receiver_phone: input.phone,
      receiver_name: input.name ?? null,
      subject: payload.subject,
      message: payload.message,
      provider_response: payload.providerResponse ?? {},
      error_message: payload.errorMessage ?? null,
      fallback_log_id: payload.fallbackLogId ?? null,
      sent_at: payload.status === "sent" || payload.status === "fallback_sent" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  return data?.id as string | undefined;
}

async function sendSMSRaw(phone: string, message: string) {
  if (process.env.SMS_MOCK_MODE === "true") {
    console.log(`[SMS MOCK] To: ${phone}\n${message}`);
    return { mock: true };
  }

  assertAligoSmsEnv();

  const body = new URLSearchParams({
    key: process.env.ALIGO_API_KEY!,
    user_id: process.env.ALIGO_USER_ID!,
    sender: process.env.ALIGO_SENDER!,
    receiver: phoneDigits(phone),
    msg: message,
    msg_type: message.length > 45 ? "LMS" : "SMS",
  });

  const res = await fetch(SMS_URL, { method: "POST", body });
  const data = await res.json().catch(() => ({}));
  if (String(data.result_code) !== "1") throw new Error(data.message ?? "SMS_SEND_FAILED");
  return data;
}

async function sendAlimtalkRaw(phone: string, name: string | undefined, subject: string, message: string, templateCode: string) {
  if (process.env.SMS_MOCK_MODE === "true") {
    console.log(`[ALIMTALK MOCK] To: ${phone}\n${subject}\n${message}`);
    return { mock: true };
  }

  const senderKey = process.env.ALIGO_KAKAO_SENDER_KEY;
  if (!senderKey) throw new Error("ALIGO_KAKAO_SENDER_KEY_MISSING");
  assertAligoSmsEnv();

  const body = new URLSearchParams({
    apikey: process.env.ALIGO_API_KEY!,
    userid: process.env.ALIGO_USER_ID!,
    senderkey: senderKey,
    tpl_code: templateCode,
    sender: process.env.ALIGO_SENDER!,
    receiver_1: phoneDigits(phone),
    recvname_1: name ?? "",
    subject_1: subject,
    message_1: message,
  });

  const res = await fetch(ALIMTALK_URL, { method: "POST", body });
  const data = await res.json().catch(() => ({}));
  const code = String(data.code ?? data.result_code ?? "");
  if (code !== "0" && code !== "1") throw new Error(data.message ?? "ALIMTALK_SEND_FAILED");
  return data;
}

export async function sendOperationalNotification(
  supabase: SupabaseClient<Database>,
  input: NotificationInput
) {
  const safeLog = async (
    channel: "alimtalk" | "sms",
    payload: Parameters<typeof logNotification>[3]
  ) => {
    try {
      await logNotification(supabase, input, channel, payload);
    } catch (err) {
      console.warn("[notification log skipped]", err);
    }
  };

  const template = await resolveTemplate(supabase, input.templateKey);
  const subject = template.subject;
  const message = interpolate(input.fallbackMessage ?? template.body, input.variables);
  const templateCode = template.templateCode;

  if (templateCode) {
    try {
      const providerResponse = await sendAlimtalkRaw(input.phone, input.name, subject, message, templateCode);
      await safeLog("alimtalk", { subject, message, status: "sent", providerResponse });
      return { ok: true, channel: "alimtalk" as const };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "ALIMTALK_SEND_FAILED";
      await safeLog("alimtalk", { subject, message, status: "failed", errorMessage });
    }
  }

  try {
    const providerResponse = await sendSMSRaw(input.phone, message);
    await safeLog("sms", { subject, message, status: templateCode ? "fallback_sent" : "sent", providerResponse });
    return { ok: true, channel: "sms" as const };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "SMS_SEND_FAILED";
    await safeLog("sms", { subject, message, status: "failed", errorMessage });
    return { ok: false, error: errorMessage };
  }
}

export async function sendSMS(phone: string, text: string): Promise<void> {
  await sendSMSRaw(phone, text);
}
