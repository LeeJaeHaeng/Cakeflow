import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth/admin";

export async function POST(request: Request) {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const body = await request.json() as {
    image_url?: string;
    design_title?: string;
    style?: string;
    occasion?: string;
  };

  const apiKey = process.env.OPENAI_API_KEY;

  // OpenAI API 키가 없으면 샘플 캡션 반환 (개발 모드)
  if (!apiKey) {
    const sampleCaptions = [
      `✨ ${body.design_title ?? "앙금플라워 케이크"} 🎂\n\n오직 당신만을 위한 맞춤 케이크\n한 송이 한 송이 정성껏 담아드립니다 🌸\n\n주문 문의는 프로필 링크 또는 카카오톡 채널로\n\n#앙금앤케이크 #앙금플라워케이크 #수원케이크 #생일케이크 #케이크주문`,
      `🌸 오늘의 케이크 🌸\n\n${body.design_title ?? "앙금플라워"}로 특별한 날을 더욱 달콤하게\n\n세상에 단 하나뿐인 나만의 케이크를 만나보세요\n\n📍 경기 수원 팔달구\n📞 카카오톡 채널: 앙금앤케이크\n\n#앙금케이크 #플라워케이크 #수원케이크맛집 #케이크스타그램`,
    ];
    const randomCaption = sampleCaptions[Math.floor(Math.random() * sampleCaptions.length)];
    const hashtags = ["앙금앤케이크", "앙금플라워케이크", "수원케이크", "케이크주문", "생일케이크"];
    return NextResponse.json({ caption: randomCaption, hashtags });
  }

  const prompt = [
    "당신은 한국 앙금케이크 전문점 인스타그램 마케터입니다.",
    "아래 정보를 바탕으로 인스타그램 게시글 캡션을 한국어로 작성하세요.",
    "- 이모지를 적절히 사용하고 감성적인 톤으로 작성",
    "- 150자 이내 본문 + 줄바꿈 후 해시태그 5~8개 (# 포함)",
    "- 매장명: 앙금앤케이크 (수원 팔달구)",
    body.design_title ? `- 케이크 이름: ${body.design_title}` : "",
    body.occasion ? `- 용도: ${body.occasion}` : "",
    body.style ? `- 스타일: ${body.style}` : "",
  ].filter(Boolean).join("\n");

  const messages = body.image_url
    ? [{ role: "user" as const, content: [
        { type: "text" as const, text: prompt },
        { type: "image_url" as const, image_url: { url: body.image_url } },
      ] }]
    : [{ role: "user" as const, content: prompt }];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: body.image_url ? "gpt-4o" : "gpt-4o-mini",
      messages,
      max_tokens: 400,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[OpenAI 오류]", err);
    return NextResponse.json({ error: "AI 캡션 생성 실패" }, { status: 500 });
  }

  const json = await res.json() as { choices: { message: { content: string } }[] };
  const text = json.choices[0]?.message?.content ?? "";

  // 본문과 해시태그 분리
  const lines = text.split("\n");
  const hashtagLine = lines.findIndex((l) => l.trim().startsWith("#"));
  const caption = hashtagLine > 0 ? lines.slice(0, hashtagLine).join("\n").trim() : text;
  const hashtags = hashtagLine > 0
    ? lines.slice(hashtagLine).join(" ").match(/#[\w가-힣]+/g) ?? []
    : [];

  return NextResponse.json({ caption, hashtags: hashtags.map((h) => h.replace("#", "")) });
}
