import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { BUSINESS_INFO } from "@/lib/legal";

export const metadata: Metadata = {
  title: "개인정보처리방침",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="개인정보처리방침"
      description="앙금앤케이크는 주문 접수, 결제, 고객 안내에 필요한 범위에서 개인정보를 처리합니다."
      sections={[
        {
          title: "수집하는 개인정보",
          body: [
            "필수 항목: 이름, 휴대폰 번호, 주문 상품, 픽업일시, 주문 요청사항, 결제 및 환불 처리 정보",
            "선택 항목: 알레르기 정보, 참고 이미지 설명, 기타 제작 요청사항",
          ],
        },
        {
          title: "개인정보 이용 목적",
          body: [
            "주문 접수, 본인 확인, 결제 처리, 제작 상담, 픽업 안내, 주문 상태 알림, 환불 및 고객 문의 응대에 이용합니다.",
          ],
        },
        {
          title: "보유 및 이용 기간",
          body: [
            "주문 및 결제 기록은 전자상거래 관련 법령상 보관 의무가 있는 기간 동안 보관합니다.",
            "법령상 보관 의무가 없고 처리 목적이 달성된 개인정보는 지체 없이 파기합니다.",
          ],
        },
        {
          title: "제3자 제공 및 처리위탁",
          body: [
            "결제 처리를 위해 포트원 및 PG사에 결제에 필요한 정보가 전달될 수 있습니다.",
            "알림 발송을 위해 문자 또는 카카오 알림톡 발송 사업자에게 수신번호와 메시지 내용이 전달될 수 있습니다.",
          ],
        },
        {
          title: "개인정보 보호책임자",
          body: [
            `상호: ${BUSINESS_INFO.businessName}`,
            `대표자: ${BUSINESS_INFO.representative}`,
            `연락처: ${BUSINESS_INFO.contact}`,
            `이메일: ${BUSINESS_INFO.email}`,
          ],
        },
      ]}
    />
  );
}
