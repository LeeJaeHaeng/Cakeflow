import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { BUSINESS_INFO } from "@/lib/legal";

export const metadata: Metadata = {
  title: "환불정책",
};

export default function RefundPage() {
  return (
    <LegalPage
      title="환불정책"
      description="맞춤 제작 케이크 특성을 고려한 취소, 변경, 환불 기준을 안내합니다."
      sections={[
        {
          title: "주문 취소 및 환불",
          body: [
            "제작 시작 전 취소 요청은 결제 수단 또는 계좌이체 방식에 따라 환불 처리됩니다.",
            "픽업일 기준 3일 전까지 취소 요청 시 전액 환불이 가능합니다.",
            "픽업일 2일 전부터는 재료 준비와 제작 일정 확정으로 인해 환불이 제한될 수 있습니다.",
          ],
        },
        {
          title: "맞춤 제작 상품의 제한",
          body: [
            "고객 요청 문구, 색상, 디자인, 피규어, 참고 이미지 등을 반영한 맞춤 제작 상품은 제작 착수 후 단순 변심 환불이 어렵습니다.",
            "매장 귀책 사유로 주문 내용과 현저히 다르게 제작된 경우 재제작 또는 환불을 협의합니다.",
          ],
        },
        {
          title: "픽업 지연 및 보관",
          body: [
            "고객 사정으로 픽업이 지연되는 경우 상품 품질 저하에 대한 책임은 고객에게 있을 수 있습니다.",
            "픽업 시간 변경이 필요한 경우 가능한 한 빠르게 매장으로 연락해 주세요.",
          ],
        },
        {
          title: "환불 문의",
          body: [
            `환불 및 주문 변경 문의는 대표 연락처 ${BUSINESS_INFO.contact}로 접수해 주세요.`,
          ],
        },
      ]}
    />
  );
}
