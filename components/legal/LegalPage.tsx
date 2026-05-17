import { BUSINESS_INFO } from "@/lib/legal";

type Section = {
  title: string;
  body: string[];
};

export function LegalPage({
  title,
  description,
  sections,
}: {
  title: string;
  description: string;
  sections: Section[];
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 border-b border-border pb-6">
        <p className="text-sm font-medium text-primary">앙금앤케이크</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>

      <div className="space-y-8">
        {sections.map((section) => (
          <section key={section.title} className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
            <div className="space-y-2 text-sm leading-7 text-muted-foreground">
              {section.body.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="mt-10 rounded-xl border border-border bg-muted/40 p-4 text-sm leading-7 text-muted-foreground">
        <h2 className="mb-2 font-semibold text-foreground">사업자 정보</h2>
        <p>상호: {BUSINESS_INFO.businessName}</p>
        <p>대표자명: {BUSINESS_INFO.representative}</p>
        <p>사업자등록번호: {BUSINESS_INFO.businessNumber}</p>
        <p>유선번호/대표 연락처: {BUSINESS_INFO.contact}</p>
        <p>사업장 주소: {BUSINESS_INFO.address}</p>
        <p>업태/종목: {BUSINESS_INFO.businessType} / {BUSINESS_INFO.businessItem}</p>
      </section>
    </div>
  );
}
