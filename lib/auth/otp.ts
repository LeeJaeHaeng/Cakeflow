import { createServiceClient } from "@/lib/supabase/server";
import { sendSMS } from "@/lib/sms/aligo";

const OTP_TTL_SECONDS = 180; // 3분
const OTP_RESEND_COOLDOWN = 60; // 재발송 60초

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export interface OtpRequestResult {
  requestId: string;
  expiresIn: number;
  mockCode?: string; // SMS_MOCK_MODE일 때만
}

export async function requestOtp(phone: string): Promise<OtpRequestResult> {
  const supabase = await createServiceClient();

  // 최근 60초 내 재발송 방지
  const cutoff = new Date(Date.now() - OTP_RESEND_COOLDOWN * 1000).toISOString();
  const { data: recent } = await supabase
    .from("otp_requests")
    .select("id")
    .eq("phone", phone)
    .gte("created_at", cutoff)
    .limit(1)
    .single();

  if (recent) {
    throw new Error("OTP_COOLDOWN");
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000).toISOString();

  const { data, error } = await supabase
    .from("otp_requests")
    .insert({ phone, code, expires_at: expiresAt, verified: false })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error("OTP_CREATE_FAILED");
  }

  const message = `[앙금앤케이크] 인증번호: ${code} (3분 내 입력)`;
  await sendSMS(phone, message);

  return {
    requestId: data.id,
    expiresIn: OTP_TTL_SECONDS,
    ...(process.env.SMS_MOCK_MODE === "true" ? { mockCode: code } : {}),
  };
}

export interface OtpVerifyResult {
  phone: string;
}

export async function verifyOtp(
  requestId: string,
  code: string
): Promise<OtpVerifyResult> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from("otp_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (error || !data) {
    throw new Error("OTP_NOT_FOUND");
  }

  if (data.verified) {
    throw new Error("OTP_ALREADY_USED");
  }

  if (new Date(data.expires_at) < new Date()) {
    throw new Error("OTP_EXPIRED");
  }

  if (data.code !== code) {
    throw new Error("OTP_INVALID");
  }

  // 사용 처리
  await supabase
    .from("otp_requests")
    .update({ verified: true })
    .eq("id", requestId);

  return { phone: data.phone };
}
