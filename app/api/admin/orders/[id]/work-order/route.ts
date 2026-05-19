import { NextResponse } from "next/server";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdminSession } from "@/lib/auth/admin";
import { STATUS_LABELS } from "@/lib/orders/status";

export const runtime = "nodejs";

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: "입금 전",
  partial: "일부 입금",
  paid: "입금 완료",
  refunded: "환불 완료",
};

const QUOTE_STATUS_LABELS: Record<string, string> = {
  not_required: "견적 불필요",
  pending_quote: "견적 안내 필요",
  quoted: "견적 안내 완료",
  accepted: "고객 수락",
  expired: "견적 만료",
  legacy_schema: "이전 주문",
};

type PdfContext = {
  doc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  boldFont: PDFFont;
  y: number;
};

const pageSize: [number, number] = [595.28, 841.89];
const margin = 42;

function formatWon(value: number | null | undefined) {
  return `${Number(value ?? 0).toLocaleString("ko-KR")}원`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
}

function parseOrderMessage(message: string | null | undefined) {
  if (!message) return [];
  return message
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const index = line.indexOf(":");
      if (index < 0) return { label: "요청 내용", value: line };
      return { label: line.slice(0, index).trim(), value: line.slice(index + 1).trim() };
    })
    .filter((item) => item.value && item.label !== "참고사진 URL");
}

function getOrderItemDetails(order: any) {
  const items = Array.isArray(order.order_items) ? order.order_items : [];
  const optionRows = items
    .map((item: any) => item?.options_json)
    .filter((options: unknown) => options && typeof options === "object") as Array<Record<string, unknown>>;
  return optionRows.find((options) => typeof options.reference_image_url === "string" && options.reference_image_url.trim()) ?? optionRows[0] ?? {};
}

function getCakeDetails(order: any) {
  const details = order.cake_details;
  return details && typeof details === "object" ? details : getOrderItemDetails(order);
}

function extractMessageField(message: string | null | undefined, label: string) {
  if (!message) return "";
  const prefix = `${label}:`;
  return message
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith(prefix))
    ?.slice(prefix.length)
    .trim() ?? "";
}

function getReferenceImageUrl(order: any, cakeDetails: any) {
  const candidates = [
    cakeDetails.reference_image_url,
    getOrderItemDetails(order).reference_image_url,
    extractMessageField(order.customer_message, "참고사진 URL"),
  ];

  return candidates.find((value) => typeof value === "string" && value.trim())?.trim() ?? "";
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const result: string[] = [];
  for (const sourceLine of String(text || "-").split("\n")) {
    let line = "";
    for (const char of sourceLine) {
      const next = line + char;
      if (font.widthOfTextAtSize(next, size) > maxWidth && line) {
        result.push(line);
        line = char;
      } else {
        line = next;
      }
    }
    result.push(line || " ");
  }
  return result;
}

function ensureSpace(ctx: PdfContext, needed: number) {
  if (ctx.y - needed > margin) return;
  ctx.page = ctx.doc.addPage(pageSize);
  ctx.y = pageSize[1] - margin;
}

function drawText(ctx: PdfContext, text: string, x: number, size = 10, options?: { bold?: boolean; color?: ReturnType<typeof rgb> }) {
  const font = options?.bold ? ctx.boldFont : ctx.font;
  ctx.page.drawText(text, {
    x,
    y: ctx.y,
    size,
    font,
    color: options?.color ?? rgb(0.12, 0.1, 0.09),
  });
}

function drawSectionTitle(ctx: PdfContext, title: string) {
  ensureSpace(ctx, 34);
  ctx.y -= 14;
  drawText(ctx, title, margin, 14, { bold: true, color: rgb(0.78, 0.26, 0.23) });
  ctx.y -= 14;
  ctx.page.drawLine({
    start: { x: margin, y: ctx.y },
    end: { x: pageSize[0] - margin, y: ctx.y },
    thickness: 0.8,
    color: rgb(0.88, 0.84, 0.8),
  });
  ctx.y -= 16;
}

function drawKeyValues(ctx: PdfContext, rows: Array<[string, string]>) {
  const labelWidth = 90;
  const valueWidth = pageSize[0] - margin * 2 - labelWidth - 18;
  for (const [label, value] of rows.filter(([, value]) => Boolean(value))) {
    const lines = wrapText(value, ctx.font, 10, valueWidth);
    const height = Math.max(30, lines.length * 13 + 16);
    ensureSpace(ctx, height + 4);
    const top = ctx.y;
    ctx.page.drawRectangle({
      x: margin,
      y: top - height + 6,
      width: pageSize[0] - margin * 2,
      height,
      borderWidth: 0.6,
      borderColor: rgb(0.88, 0.84, 0.8),
      color: rgb(0.99, 0.98, 0.96),
    });
    ctx.page.drawText(label, {
      x: margin + 12,
      y: top - 15,
      size: 9,
      font: ctx.boldFont,
      color: rgb(0.42, 0.38, 0.34),
    });
    lines.forEach((line, index) => {
      ctx.page.drawText(line, {
        x: margin + labelWidth + 12,
        y: top - 15 - index * 13,
        size: 10,
        font: ctx.font,
        color: rgb(0.12, 0.1, 0.09),
      });
    });
    ctx.y -= height + 6;
  }
}

async function embedPdfImage(ctx: PdfContext, bytes: Uint8Array, contentType: string, imageUrl: string) {
  const normalizedUrl = imageUrl.toLowerCase().split("?")[0];
  const isPng = contentType.includes("png") || normalizedUrl.endsWith(".png");
  const isJpeg = contentType.includes("jpeg") || contentType.includes("jpg") || /\.jpe?g$/.test(normalizedUrl);

  try {
    if (isPng) return await ctx.doc.embedPng(bytes);
    if (isJpeg) return await ctx.doc.embedJpg(bytes);
  } catch {
    // Fall through to server-side conversion below.
  }

  const pngBytes = await sharp(Buffer.from(bytes)).rotate().png().toBuffer();
  return ctx.doc.embedPng(pngBytes);
}

async function drawImageBlock(ctx: PdfContext, title: string, imageUrl: string | null | undefined) {
  drawSectionTitle(ctx, title);
  if (!imageUrl) {
    drawKeyValues(ctx, [["이미지", "첨부 이미지 없음"]]);
    return;
  }

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error("이미지를 불러올 수 없습니다.");
    const bytes = new Uint8Array(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") ?? "";
    const image = await embedPdfImage(ctx, bytes, contentType, imageUrl);
    const maxWidth = pageSize[0] - margin * 2;
    const maxHeight = 300;
    const scaled = image.scale(Math.min(maxWidth / image.width, maxHeight / image.height, 1));
    ensureSpace(ctx, scaled.height + 20);
    ctx.page.drawImage(image, {
      x: margin,
      y: ctx.y - scaled.height,
      width: scaled.width,
      height: scaled.height,
    });
    ctx.y -= scaled.height + 18;
  } catch (err) {
    console.error("[work-order image]", err);
    drawKeyValues(ctx, [["이미지", "첨부 이미지를 PDF에 삽입하지 못했습니다. 관리자 상세 화면에서 원본 이미지를 확인하세요."]]);
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { id } = await params;
  const supabase = await createServiceClient();
  const { data: order, error } = await (supabase as any)
    .from("orders")
    .select(`
      *,
      customers(name, phone, allergy, memo),
      order_items(*, cake_designs(title, thumbnail_url), dessert_products:dessert_id(title)),
      simulator_sessions(preview_url, production_url, summary, state_json)
    `)
    .eq("id", id)
    .single();

  if (error || !order) return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });

  const customer = order.customers;
  const simulator = order.simulator_sessions;
  const cakeDetails = getCakeDetails(order);
  const orderFields = parseOrderMessage(order.customer_message);
  const referenceImageUrl = getReferenceImageUrl(order, cakeDetails);
  const simulatorImageUrl = simulator?.production_url ?? simulator?.preview_url;

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const fontBytes = await readFile(path.join(process.cwd(), "public", "fonts", "NotoSansKR-Regular.ttf"));
  const font = await doc.embedFont(fontBytes, { subset: false });
  const boldFont = font;
  const ctx: PdfContext = { doc, page: doc.addPage(pageSize), font, boldFont, y: pageSize[1] - margin };

  drawText(ctx, "앙금앤케이크 작업지시서", margin, 20, { bold: true, color: rgb(0.78, 0.26, 0.23) });
  ctx.y -= 24;
  drawText(ctx, `주문번호 ${order.order_number}`, margin, 11, { color: rgb(0.42, 0.38, 0.34) });
  ctx.y -= 20;

  drawSectionTitle(ctx, "주문상태");
  drawKeyValues(ctx, [
    ["주문 상태", STATUS_LABELS[order.status as keyof typeof STATUS_LABELS] ?? order.status],
    ["입금 상태", PAYMENT_STATUS_LABELS[order.payment_status] ?? order.payment_status],
    ["견적 상태", QUOTE_STATUS_LABELS[order.quote_status] ?? order.quote_status ?? "견적 불필요"],
    ["확정 금액", formatWon(order.confirmed_price ?? order.total_price)],
    ["협의 필요", order.requires_consultation ? "필요" : "불필요"],
  ]);

  drawSectionTitle(ctx, "고객/픽업");
  drawKeyValues(ctx, [
    ["고객명", customer?.name ?? "-"],
    ["연락처", customer?.phone ?? "-"],
    ["픽업일시", `${order.pickup_date} ${order.pickup_time ?? ""}`],
    ["알레르기", customer?.allergy ?? cakeDetails.allergy ?? "-"],
    ["고객 메모", customer?.memo ?? "-"],
    ["사장님 메모", order.admin_memo ?? "-"],
  ]);

  drawSectionTitle(ctx, "주문서 상세");
  drawKeyValues(ctx, orderFields.map((item) => [item.label, item.value]));

  await drawImageBlock(ctx, "제작자료", simulatorImageUrl);
  await drawImageBlock(ctx, "고객 첨부 이미지", referenceImageUrl);

  drawSectionTitle(ctx, "발행 정보");
  drawKeyValues(ctx, [["PDF 생성 시각", formatDateTime(new Date().toISOString())]]);

  const pdf = await doc.save();
  const body = Buffer.from(pdf);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${order.order_number}-work-order.pdf"`,
    },
  });
}
