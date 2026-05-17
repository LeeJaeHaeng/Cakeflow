import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";

const ROOT_URL = process.env.CAKEFLOW_VERIFY_BASE_URL ?? "http://127.0.0.1:3010";
const PORT = new URL(ROOT_URL).port || "3010";
const MARK = `PARITY-${Date.now()}`;
const TEST_IMAGE = "https://images.unsplash.com/photo-1729875749558-826bfeb4b1bb?w=400&h=400&fit=crop";

function loadEnvFile(text) {
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    process.env[key] ??= value;
  }
}

async function request(path) {
  const res = await fetch(`${ROOT_URL}${path}`, { cache: "no-store" });
  const text = await res.text();
  if (!res.ok) throw new Error(`${path} returned ${res.status}: ${text.slice(0, 200)}`);
  return text;
}

async function waitForServer() {
  const deadline = Date.now() + 30_000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      await request("/api/settings");
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw lastError ?? new Error("server did not become ready");
}

function startServer() {
  const command = process.platform === "win32" ? "npm.cmd" : "npm";
  const child = spawn(command, ["run", "start", "--", "-p", PORT], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
  });

  child.stdout.on("data", (chunk) => process.stdout.write(`[next] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[next:err] ${chunk}`));
  return child;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  loadEnvFile(await readFile(".env.local", "utf8"));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert(url, "NEXT_PUBLIC_SUPABASE_URL is missing");
  assert(serviceKey, "SUPABASE_SERVICE_ROLE_KEY is missing");

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const designId = randomUUID();
  const dessertId = randomUUID();
  const customerId = randomUUID();
  const orderId = randomUUID();
  const reviewId = randomUUID();
  const orderNumber = `PV${Date.now()}`;
  const customerPhone = `010-${String(Date.now()).slice(-4)}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
  const designTitle = `${MARK} 케이크`;
  const updatedDesignTitle = `${MARK} 케이크 수정`;
  const dessertTitle = `${MARK} 디저트`;
  const updatedDessertTitle = `${MARK} 디저트 수정`;
  const shopInfo = {
    name: `${MARK} 매장`,
    phone: "010-9999-8888",
    address: `${MARK} 테스트 주소`,
    kakao_url: "https://pf.kakao.com/_hXAiK",
    instagram_url: "https://instagram.com/anggeumandcake",
  };
  const operatingHours = {
    mon: { open: "09:00", close: "18:00", closed: false },
    tue: { open: "10:00", close: "19:00", closed: false },
    wed: { open: "10:00", close: "19:00", closed: false },
    thu: { open: "10:00", close: "19:00", closed: false },
    fri: { open: "10:00", close: "19:00", closed: false },
    sat: { open: "11:00", close: "17:00", closed: false },
    sun: { open: "00:00", close: "00:00", closed: true },
  };

  const { data: previousSettings, error: settingsReadError } = await supabase
    .from("shop_settings")
    .select("*")
    .in("key", ["shop_info", "operating_hours"]);
  if (settingsReadError) throw settingsReadError;

  const previousByKey = new Map((previousSettings ?? []).map((row) => [row.key, row]));
  let server;

  try {
    const { error: designInsertError } = await supabase.from("cake_designs").insert({
      id: designId,
      title: designTitle,
      description: `${MARK} 관리자 등록 검증`,
      categories: ["birthday"],
      style_tags: ["검증"],
      color_tags: ["white"],
      price_from: 123456,
      thumbnail_url: TEST_IMAGE,
      display_status: "visible",
      simulator_enabled: true,
    });
    if (designInsertError) throw designInsertError;

    const { error: dessertInsertError } = await supabase.from("dessert_products").insert({
      id: dessertId,
      title: dessertTitle,
      category: "검증",
      price: 45678,
      cost: 1000,
      stock_count: 7,
      thumbnail_url: TEST_IMAGE,
      description: `${MARK} 관리자 등록 검증`,
      status: "active",
    });
    if (dessertInsertError) throw dessertInsertError;

    const { error: settingsWriteError } = await supabase.from("shop_settings").upsert([
      { key: "shop_info", value: shopInfo, updated_at: new Date().toISOString() },
      { key: "operating_hours", value: operatingHours, updated_at: new Date().toISOString() },
    ], { onConflict: "key" });
    if (settingsWriteError) throw settingsWriteError;

    const { error: customerInsertError } = await supabase.from("customers").insert({
      id: customerId,
      name: `${MARK} 고객`,
      phone: customerPhone,
    });
    if (customerInsertError) throw customerInsertError;

    const { error: orderInsertError } = await supabase.from("orders").insert({
      id: orderId,
      order_number: orderNumber,
      customer_id: customerId,
      order_type: "cake",
      status: "pending",
      delivery_method: "pickup",
      pickup_date: "2026-12-31",
      pickup_time: "12:00",
      total_price: 234567,
      payment_status: "unpaid",
    });
    if (orderInsertError) throw orderInsertError;

    const { error: orderItemInsertError } = await supabase.from("order_items").insert({
      order_id: orderId,
      product_type: "cake",
      cake_design_id: designId,
      quantity: 1,
      unit_price: 234567,
    });
    if (orderItemInsertError) throw orderItemInsertError;

    const existingServer = await fetch(`${ROOT_URL}/api/settings`).then((r) => r.ok).catch(() => false);
    if (!existingServer) {
      server = startServer();
      await waitForServer();
    }

    let designsJson = JSON.parse(await request("/api/designs"));
    assert(designsJson.items.some((item) => item.id === designId && item.title === designTitle), "public cake design API did not show inserted admin design");

    const { error: designUpdateError } = await supabase
      .from("cake_designs")
      .update({ title: updatedDesignTitle, price_from: 234567, updated_at: new Date().toISOString() })
      .eq("id", designId);
    if (designUpdateError) throw designUpdateError;

    designsJson = JSON.parse(await request("/api/designs"));
    assert(designsJson.items.some((item) => item.id === designId && item.title === updatedDesignTitle && item.price_from === 234567), "public cake design API did not show updated admin design");

    const { error: designHideError } = await supabase
      .from("cake_designs")
      .update({ display_status: "hidden", updated_at: new Date().toISOString() })
      .eq("id", designId);
    if (designHideError) throw designHideError;

    designsJson = JSON.parse(await request("/api/designs"));
    assert(!designsJson.items.some((item) => item.id === designId), "hidden admin design leaked into public design API");

    let productsJson = JSON.parse(await request("/api/products"));
    assert(productsJson.products.some((item) => item.id === dessertId && item.title === dessertTitle), "public dessert API did not show inserted admin dessert");

    const { error: dessertUpdateError } = await supabase
      .from("dessert_products")
      .update({ title: updatedDessertTitle, price: 56789, stock_count: 3, updated_at: new Date().toISOString() })
      .eq("id", dessertId);
    if (dessertUpdateError) throw dessertUpdateError;

    productsJson = JSON.parse(await request("/api/products"));
    assert(productsJson.products.some((item) => item.id === dessertId && item.title === updatedDessertTitle && item.price === 56789 && item.stock_count === 3), "public dessert API did not show updated admin dessert");

    const { error: dessertPauseError } = await supabase
      .from("dessert_products")
      .update({ status: "paused", updated_at: new Date().toISOString() })
      .eq("id", dessertId);
    if (dessertPauseError) throw dessertPauseError;

    productsJson = JSON.parse(await request("/api/products"));
    assert(!productsJson.products.some((item) => item.id === dessertId), "paused admin dessert leaked into public dessert API");

    const settingsJson = JSON.parse(await request("/api/settings"));
    assert(settingsJson.shop_info.name === shopInfo.name, "public settings API did not show updated shop name");
    assert(settingsJson.shop_info.address === shopInfo.address, "public settings API did not show updated shop address");
    assert(settingsJson.operating_hours.mon.open === "09:00", "public settings API did not show updated operating hours");

    const storeHtml = await request("/store");
    assert(storeHtml.includes(shopInfo.name), "store page HTML did not show updated shop name");
    assert(storeHtml.includes(shopInfo.address), "store page HTML did not show updated shop address");
    assert(storeHtml.includes("09:00 - 18:00"), "store page HTML did not show updated operating hours");

    let ordersJson = JSON.parse(await request(`/api/orders?order_number=${encodeURIComponent(orderNumber)}`));
    assert(ordersJson.orders.some((order) => order.id === orderId && order.status === "pending"), "public order lookup did not show inserted admin order status");

    const { error: orderReadyError } = await supabase
      .from("orders")
      .update({ status: "ready", updated_at: new Date().toISOString() })
      .eq("id", orderId);
    if (orderReadyError) throw orderReadyError;

    ordersJson = JSON.parse(await request(`/api/orders?phone=${encodeURIComponent(customerPhone)}`));
    assert(ordersJson.orders.some((order) => order.id === orderId && order.status === "ready"), "public order lookup did not show updated admin order status");

    const { error: orderCompletedError } = await supabase
      .from("orders")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", orderId);
    if (orderCompletedError) throw orderCompletedError;

    const { error: reviewInsertError } = await supabase.from("reviews").insert({
      id: reviewId,
      order_id: orderId,
      customer_id: customerId,
      design_id: designId,
      rating: 5,
      content: `${MARK} 리뷰`,
      hidden: false,
    });
    if (reviewInsertError) throw reviewInsertError;

    let reviewsJson = JSON.parse(await request(`/api/reviews?design_id=${encodeURIComponent(designId)}`));
    assert(reviewsJson.reviews.some((review) => review.id === reviewId && review.content === `${MARK} 리뷰`), "public reviews API did not show visible admin review");

    const { error: reviewHideError } = await supabase
      .from("reviews")
      .update({ hidden: true })
      .eq("id", reviewId);
    if (reviewHideError) throw reviewHideError;

    reviewsJson = JSON.parse(await request(`/api/reviews?design_id=${encodeURIComponent(designId)}`));
    assert(!reviewsJson.reviews.some((review) => review.id === reviewId), "hidden admin review leaked into public reviews API");

    console.log(JSON.stringify({
      ok: true,
      checked: [
        "cake design visible/update/hidden parity",
        "dessert active/update/paused parity",
        "shop settings API parity",
        "store page server-rendered shop info parity",
        "order status lookup parity",
        "review visible/hidden parity",
      ],
      mark: MARK,
    }, null, 2));
  } finally {
    await supabase.from("reviews").delete().eq("id", reviewId);
    await supabase.from("orders").delete().eq("id", orderId);
    await supabase.from("customers").delete().eq("id", customerId);
    await supabase.from("cake_designs").delete().eq("id", designId);
    await supabase.from("dessert_products").delete().eq("id", dessertId);

    for (const key of ["shop_info", "operating_hours"]) {
      const previous = previousByKey.get(key);
      if (previous) {
        await supabase.from("shop_settings").upsert({
          key,
          value: previous.value,
          updated_at: previous.updated_at ?? new Date().toISOString(),
        }, { onConflict: "key" });
      } else {
        await supabase.from("shop_settings").delete().eq("key", key);
      }
    }

    if (server) {
      if (process.platform === "win32") {
        spawnSync("taskkill", ["/pid", String(server.pid), "/t", "/f"], { stdio: "ignore" });
      } else {
        server.kill("SIGTERM");
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
