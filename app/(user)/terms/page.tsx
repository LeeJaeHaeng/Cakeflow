import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { BUSINESS_INFO } from "@/lib/legal";

export const metadata: Metadata = {
  title: "이용약관",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="이용약관"
      description="앙금앤케이크 온라인 주문 서비스 이용 조건과 주문 절차를 안내합니다."
      sections={[
        {
          title: "제1조 목적",
          body: [
            "본 약관은 앙금앤케이크가 운영하는 CakeFlow 웹사이트에서 제공하는 케이크 시뮬레이터, 주문서 접수, 결제 및 주문 조회 서비스의 이용 조건을 정합니다.",
          ],
        },
        {
          title: "제2조 주문 접수 및 계약 성립",
          body: [
            "고객은 상품, 픽업일시, 디자인 요청사항, 연락처를 입력하여 주문서를 제출합니다.",
            "확정 금액 주문은 온라인 결제 완료 후 예약 확인 단계로 진행됩니다.",
            "상담이 필요한 맞춤 주문은 주문서 접수 후 매장 확인 및 고객 안내를 거쳐 최종 금액과 예약 가능 여부가 확정됩니다.",
          ],
        },
        {
          title: "제3조 결제",
          body: [
            "온라인 결제는 포트원 결제창을 통해 처리되며, 결제 결과는 주문 상태에 반영됩니다.",
            "계좌이체 또는 상담 주문은 매장 안내에 따라 별도 입금 확인 후 예약이 확정됩니다.",
          ],
        },
        {
          title: "제4조 고객 의무",
          body: [
            "고객은 주문서에 정확한 연락처, 픽업일시, 알레르기 정보, 디자인 요청사항을 입력해야 합니다.",
            "잘못 입력된 정보로 인해 발생하는 제작 지연, 연락 불가, 픽업 차질은 고객에게 책임이 있을 수 있습니다.",
          ],
        },
        {
          title: "제5조 문의",
          body: [
            `서비스 및 주문 관련 문의는 대표 연락처 ${BUSINESS_INFO.contact}로 접수할 수 있습니다.`,
          ],
        },
      ]}
    />
  );
}
