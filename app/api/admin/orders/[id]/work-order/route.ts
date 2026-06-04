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
import { formatKoreanPhone } from "@/lib/phone";
import { fetchAllowedPublicStorageImage } from "@/lib/security/images";

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

type WorkOrderRow = [string, unknown];
type WorkOrderBox = { x: number; y: number; width: number; height: number };

const pageSize: [number, number] = [841.89, 595.28];
const margin = 24;
const panelBorder = rgb(0.88, 0.84, 0.8);
const panelBg = rgb(1, 0.99, 0.97);
const titleColor = rgb(0.78, 0.26, 0.23);
const textColor = rgb(0.12, 0.1, 0.09);
const mutedColor = rgb(0.42, 0.38, 0.34);

const OPTION_LABELS: Record<string, string> = {
  size: "사이즈",
  sheet_flavor: "빵맛",
  rice_base: "떡 종류",
  filling: "필링",
  design_style: "디자인 설명",
  desired_color: "색감",
  phrase: "문구",
  lettering: "문구 추가",
  candle: "초 추가",
  allergy: "알레르기",
  extra_request: "기타 요청",
  payment_method: "결제 방식",
  reference_note: "참고 설명",
  number_count: "숫자 개수",
  two_tier: "2단",
  number_rice_cake: "숫자떡",
  form_variant: "폼 유형",
  product_key: "상품키",
};

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

function drawTextAt(
  ctx: PdfContext,
  text: string,
  x: number,
  y: number,
  size = 8,
  options?: { bold?: boolean; color?: ReturnType<typeof rgb> }
) {
  ctx.page.drawText(text, {
    x,
    y,
    size,
    font: options?.bold ? ctx.boldFont : ctx.font,
    color: options?.color ?? textColor,
  });
}

function isPresent(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function formatWorkOrderValue(value: unknown): string {
  if (!isPresent(value)) return "";
  if (typeof value === "boolean") return value ? "예" : "아니오";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value.map((item) => formatWorkOrderValue(item)).filter(Boolean).join(", ");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => isPresent(item))
      .map(([key, item]) => `${OPTION_LABELS[key] ?? key}: ${formatWorkOrderValue(item)}`)
      .filter((item) => !item.endsWith(": "))
      .join(" / ");
  }
  return String(value);
}

function normalizeRows(rows: WorkOrderRow[]) {
  return rows
    .map(([label, value]) => [label, formatWorkOrderValue(value)] as [string, string])
    .filter(([, value]) => value.trim());
}

function drawPanel(ctx: PdfContext, title: string, box: WorkOrderBox) {
  ctx.page.drawRectangle({
    x: box.x,
    y: box.y - box.height,
    width: box.width,
    height: box.height,
    borderWidth: 0.7,
    borderColor: panelBorder,
    color: panelBg,
  });
  ctx.page.drawRectangle({
    x: box.x,
    y: box.y - 20,
    width: box.width,
    height: 20,
    color: rgb(0.97, 0.91, 0.88),
  });
  drawTextAt(ctx, title, box.x + 8, box.y - 14, 8.8, { bold: true, color: titleColor });
}

function drawCompactRowsPanel(
  ctx: PdfContext,
  title: string,
  rows: WorkOrderRow[],
  box: WorkOrderBox,
  options?: { labelWidth?: number; fontSize?: number }
) {
  drawPanel(ctx, title, box);

  const normalized = normalizeRows(rows);
  const padding = 7;
  const labelWidth = options?.labelWidth ?? 60;
  const contentWidth = box.width - padding * 2;
  const valueWidth = contentWidth - labelWidth - 7;
  const availableHeight = box.height - 31;
  const measure = (fontSize: number, lineHeight: number) => {
    const measuredRows = normalized.map(([label, value]) => {
      const lines = wrapText(value, ctx.font, fontSize, valueWidth);
      return { label, lines, height: Math.max(lineHeight + 2, lines.length * lineHeight + 2) };
    });
    const totalHeight = measuredRows.reduce((sum, row) => sum + row.height, 0);
    return { measuredRows, totalHeight };
  };

  let fontSize = options?.fontSize ?? 6.7;
  let lineHeight = fontSize + 1.5;
  let measured = measure(fontSize, lineHeight);
  if (measured.totalHeight > availableHeight) {
    const scale = Math.max(0.68, availableHeight / measured.totalHeight);
    fontSize = Math.max(4.8, fontSize * scale);
    lineHeight = Math.max(5.7, lineHeight * scale);
    measured = measure(fontSize, lineHeight);
  }

  let y = box.y - 27;
  const bottom = box.y - box.height + 7;
  for (const row of measured.measuredRows) {
    if (y < bottom) break;
    drawTextAt(ctx, row.label, box.x + padding, y - fontSize, Math.max(4.8, fontSize - 0.1), {
      bold: true,
      color: mutedColor,
    });
    row.lines.forEach((line, index) => {
      drawTextAt(ctx, line, box.x + padding + labelWidth + 7, y - fontSize - index * lineHeight, fontSize);
    });
    y -= row.height;
    ctx.page.drawLine({
      start: { x: box.x + padding, y: y + 1 },
      end: { x: box.x + box.width - padding, y: y + 1 },
      thickness: 0.25,
      color: rgb(0.92, 0.89, 0.85),
    });
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

async function drawImageSlot(ctx: PdfContext, title: string, imageUrl: string | null | undefined, box: WorkOrderBox) {
  drawPanel(ctx, title, box);
  const innerX = box.x + 8;
  const innerY = box.y - box.height + 8;
  const innerWidth = box.width - 16;
  const innerHeight = box.height - 34;

  if (!imageUrl) {
    drawTextAt(ctx, "첨부 이미지 없음", innerX + 4, innerY + innerHeight / 2, 7.2, { color: mutedColor });
    return;
  }

  try {
    const { bytes, contentType } = await fetchAllowedPublicStorageImage(imageUrl);
    const image = await embedPdfImage(ctx, bytes, contentType, imageUrl);
    const scaled = image.scale(Math.min(innerWidth / image.width, innerHeight / image.height, 1));
    ctx.page.drawImage(image, {
      x: innerX + (innerWidth - scaled.width) / 2,
      y: innerY + (innerHeight - scaled.height) / 2,
      width: scaled.width,
      height: scaled.height,
    });
  } catch (err) {
    console.error("[work-order image]", err);
    drawTextAt(ctx, "이미지를 PDF에 삽입하지 못했습니다. 관리자 상세 화면에서 원본 확인", innerX, innerY + innerHeight / 2, 6.3, {
      color: mutedColor,
    });
  }
}

function getItemRows(order: any): WorkOrderRow[] {
  const items = Array.isArray(order.order_items) ? order.order_items : [];
  return items.map((item: any, index: number) => {
    const title = item?.cake_designs?.title ?? item?.dessert_products?.title ?? item?.product_type ?? "상품";
    const quantity = item?.quantity ? `${item.quantity}개` : "";
    const price = item?.unit_price ? formatWon(item.unit_price) : "";
    const options = item?.options_json && typeof item.options_json === "object"
      ? Object.entries(item.options_json as Record<string, unknown>)
        .filter(([key, value]) => key !== "reference_image_url" && isPresent(value))
        .map(([key, value]) => `${OPTION_LABELS[key] ?? key}: ${formatWorkOrderValue(value)}`)
        .join(" / ")
      : "";

    return [`품목 ${index + 1}`, [title, quantity, price, options].filter(Boolean).join(" / ")];
  });
}

function drawHeader(ctx: PdfContext, order: any, customer: any) {
  drawTextAt(ctx, "앙금앤케이크 작업지시서", margin, pageSize[1] - margin - 18, 18, {
    bold: true,
    color: titleColor,
  });
  drawTextAt(ctx, `주문번호 ${order.order_number}`, margin, pageSize[1] - margin - 34, 9.2, { color: mutedColor });

  const bannerY = pageSize[1] - margin - 66;
  ctx.page.drawRectangle({
    x: margin,
    y: bannerY,
    width: pageSize[0] - margin * 2,
    height: 28,
    color: rgb(0.18, 0.16, 0.14),
  });
  const pickup = `${order.pickup_date} ${order.pickup_time ?? ""}`.trim();
  const bannerText = [
    `픽업 ${pickup}`,
    `고객 ${customer?.name ?? "-"}`,
    `연락처 ${formatKoreanPhone(customer?.phone ?? "-")}`,
    `상태 ${STATUS_LABELS[order.status as keyof typeof STATUS_LABELS] ?? order.status}`,
    `금액 ${formatWon(order.confirmed_price ?? order.total_price)}`,
  ].join("   |   ");
  drawTextAt(ctx, bannerText, margin + 12, bannerY + 10, 8.4, { color: rgb(1, 0.98, 0.95), bold: true });
}

function formatFileDate(value: string | null | undefined) {
  if (!value) return "주문날짜";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10) || "주문날짜";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sanitizeFileNamePart(value: string | null | undefined, fallback: string) {
  const normalized = String(value ?? "")
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "")
    .trim();
  return normalized || fallback;
}

function buildWorkOrderFileName(order: any, customer: any) {
  const pickupDate = sanitizeFileNamePart(formatFileDate(order.pickup_date ?? order.created_at), "픽업일");
  const customerName = sanitizeFileNamePart(customer?.name, "고객");
  return `${pickupDate}_${customerName}.pdf`;
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

  drawHeader(ctx, order, customer);

  const contentTop = pageSize[1] - margin - 82;
  const contentBottom = margin + 18;
  const contentHeight = contentTop - contentBottom;
  const gap = 10;
  const leftWidth = 238;
  const centerWidth = 286;
  const rightWidth = pageSize[0] - margin * 2 - leftWidth - centerWidth - gap * 2;
  const leftX = margin;
  const centerX = leftX + leftWidth + gap;
  const rightX = centerX + centerWidth + gap;
  const imageHeight = (contentHeight - gap) / 2;

  const operationRows: WorkOrderRow[] = [
    ["주문번호", order.order_number],
    ["주문일", formatDateTime(order.created_at)],
    ["픽업일시", `${order.pickup_date} ${order.pickup_time ?? ""}`],
    ["주문 상태", STATUS_LABELS[order.status as keyof typeof STATUS_LABELS] ?? order.status],
    ["입금 상태", PAYMENT_STATUS_LABELS[order.payment_status] ?? order.payment_status],
    ["견적 상태", QUOTE_STATUS_LABELS[order.quote_status] ?? order.quote_status ?? "견적 불필요"],
    ["확정 금액", formatWon(order.confirmed_price ?? order.total_price)],
    ["주문 금액", formatWon(order.total_price)],
    ["예약금", order.deposit_amount ? formatWon(order.deposit_amount) : ""],
    ["결제기한", formatDateTime(order.payment_due_at)],
    ["협의 필요", order.requires_consultation ? "필요" : "불필요"],
    ["우선순위", order.internal_priority ? String(order.internal_priority) : ""],
    ["유입 채널", order.source_channel],
    ["고객명", customer?.name ?? "-"],
    ["연락처", formatKoreanPhone(customer?.phone ?? "-")],
    ["알레르기", customer?.allergy ?? cakeDetails.allergy ?? "-"],
    ["고객 메모", customer?.memo ?? "-"],
    ["사장님 메모", order.admin_memo ?? "-"],
    ["취소 사유", order.cancel_reason],
  ];

  const detailRows: WorkOrderRow[] = [
    ...getItemRows(order),
    ...orderFields.map((item) => [item.label, item.value] as WorkOrderRow),
    ["시뮬레이터 요약", simulator?.summary],
  ];

  drawCompactRowsPanel(ctx, "운영/고객 정보", operationRows, {
    x: leftX,
    y: contentTop,
    width: leftWidth,
    height: contentHeight,
  }, { labelWidth: 58, fontSize: 6.8 });
  drawCompactRowsPanel(ctx, "품목/제작 상세", detailRows, {
    x: centerX,
    y: contentTop,
    width: centerWidth,
    height: contentHeight,
  }, { labelWidth: 58, fontSize: 6.5 });
  await drawImageSlot(ctx, "제작 시안", simulatorImageUrl, {
    x: rightX,
    y: contentTop,
    width: rightWidth,
    height: imageHeight,
  });
  await drawImageSlot(ctx, "고객 참고 이미지", referenceImageUrl, {
    x: rightX,
    y: contentTop - imageHeight - gap,
    width: rightWidth,
    height: imageHeight,
  });

  drawTextAt(ctx, `PDF 생성 시각 ${formatDateTime(new Date().toISOString())}`, margin, margin - 4, 6.3, {
    color: mutedColor,
  });

  const pdf = await doc.save();
  const body = Buffer.from(pdf);
  const fileName = buildWorkOrderFileName(order, customer);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="work-order.pdf"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}
