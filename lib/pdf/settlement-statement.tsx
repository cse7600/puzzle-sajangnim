import path from 'path';
import { Document, Page, View, Text, StyleSheet, Font } from '@react-pdf/renderer';
import { COMPANY_INFO } from '@/lib/company-info';
import { PLATFORM_INFO, Platform } from '@/lib/hub';

const FONTS_DIR = path.join(process.cwd(), 'assets', 'fonts');

Font.register({
  family: 'Pretendard',
  fonts: [
    { src: path.join(FONTS_DIR, 'Pretendard-Regular.ttf'), fontWeight: 'normal' },
    { src: path.join(FONTS_DIR, 'Pretendard-SemiBold.ttf'), fontWeight: 'semibold' as never },
    { src: path.join(FONTS_DIR, 'Pretendard-Bold.ttf'), fontWeight: 'bold' },
  ],
});

const styles = StyleSheet.create({
  page: { fontFamily: 'Pretendard', fontSize: 9, color: '#1d1d1f', padding: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  brand: { fontSize: 16, fontWeight: 'bold' as never },
  brandSub: { fontSize: 8, color: '#6e6e73', marginTop: 4, lineHeight: 1.5 },
  companyBlock: { alignItems: 'flex-end' },
  title: { fontSize: 18, fontWeight: 'bold' as never, textAlign: 'center', marginVertical: 16 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  metaLabel: { fontSize: 8, color: '#6e6e73', marginBottom: 2 },
  metaValue: { fontSize: 10, fontWeight: 'semibold' as never },
  table: { marginTop: 8 },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#f5f5f7', paddingVertical: 8, paddingHorizontal: 6 },
  tableRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  colPlatform: { width: '15%' },
  colAccount: { width: '30%' },
  colSpend: { width: '20%', textAlign: 'right' },
  colRate: { width: '12%', textAlign: 'right' },
  colAmount: { width: '23%', textAlign: 'right', fontWeight: 'semibold' as never },
  tableHeaderText: { fontSize: 8, color: '#6e6e73', fontWeight: 'semibold' as never },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#1d1d1f' },
  totalLabel: { fontSize: 11, marginRight: 12 },
  totalAmount: { fontSize: 15, fontWeight: 'bold' as never, color: '#0066cc' },
  footer: { marginTop: 40, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e0e0e0' },
  footerNote: { fontSize: 8, color: '#6e6e73', lineHeight: 1.6, marginBottom: 4 },
  docFooter: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 7, color: '#a1a1a6' },
});

const PAYBACK_STATUS_LABEL: Record<string, string> = {
  pending: '처리중',
  confirmed: '확정',
  paid: '지급완료',
};

export interface StatementRow {
  platform: string;
  accountName: string;
  spend: number;
  costBasis: 'submitted' | 'verified';
  paybackRate: number;
  amount: number;
}

export interface StatementData {
  period: string;
  recipientName: string;
  businessName: string;
  rows: StatementRow[];
  totalAmount: number;
  scheduledPayDate: string | null;
  status: string;
  settlementDay: number;
  generatedAt: string;
  documentNo: string;
}

function formatWon(n: number): string {
  return `${n.toLocaleString('ko-KR')}원`;
}

function formatPoint(n: number): string {
  return `${n.toLocaleString('ko-KR')}P`;
}

export function SettlementStatementDocument({ data }: { data: StatementData }) {
  const [year, month] = data.period.split('-');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>PUZL CORP.</Text>
            <Text style={styles.brandSub}>
              {COMPANY_INFO.nameKo}{'\n'}
              사업자등록번호 {COMPANY_INFO.businessRegistrationNumber}{'\n'}
              대표 {COMPANY_INFO.representatives.join(', ')} (공동대표)
            </Text>
          </View>
          <View style={styles.companyBlock}>
            <Text style={styles.brandSub}>
              {COMPANY_INFO.address}{'\n'}
              Tel {COMPANY_INFO.tel}{'\n'}
              {COMPANY_INFO.email}
            </Text>
          </View>
        </View>

        <Text style={styles.title}>{year}년 {Number(month)}월 마케팅 페이백 정산내역서</Text>

        <View style={styles.metaRow}>
          <View>
            <Text style={styles.metaLabel}>수신</Text>
            <Text style={styles.metaValue}>{data.recipientName} 사장님 ({data.businessName})</Text>
          </View>
          <View>
            <Text style={styles.metaLabel}>정산 기준</Text>
            <Text style={styles.metaValue}>{data.period} 광고비, 매월 {data.settlementDay}일 마감</Text>
          </View>
          <View>
            <Text style={styles.metaLabel}>지급 예정일</Text>
            <Text style={styles.metaValue}>{data.scheduledPayDate ?? '미정'}</Text>
          </View>
          <View>
            <Text style={styles.metaLabel}>지급 상태</Text>
            <Text style={styles.metaValue}>{PAYBACK_STATUS_LABEL[data.status] ?? data.status}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.colPlatform, styles.tableHeaderText]}>플랫폼</Text>
            <Text style={[styles.colAccount, styles.tableHeaderText]}>광고계정</Text>
            <Text style={[styles.colSpend, styles.tableHeaderText]}>광고비(기준)</Text>
            <Text style={[styles.colRate, styles.tableHeaderText]}>페이백율</Text>
            <Text style={[styles.colAmount, styles.tableHeaderText]}>페이백 금액</Text>
          </View>
          {data.rows.map((row, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.colPlatform}>{PLATFORM_INFO[row.platform as Platform]?.name ?? row.platform}</Text>
              <Text style={styles.colAccount}>{row.accountName}</Text>
              <Text style={styles.colSpend}>
                {formatWon(row.spend)} ({row.costBasis === 'verified' ? '확인됨' : '제출값'})
              </Text>
              <Text style={styles.colRate}>{row.paybackRate}%</Text>
              <Text style={styles.colAmount}>{formatPoint(row.amount)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>합계</Text>
          <Text style={styles.totalAmount}>{formatPoint(data.totalAmount)}</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerNote}>
            · &quot;제출값&quot;은 사장님이 직접 입력한 광고비 기준이며, 광고계정 연동이 완료되면 실비용(&quot;확인됨&quot;) 기준으로 자동 전환됩니다.
          </Text>
          <Text style={styles.footerNote}>
            · 본 정산내역서는 {COMPANY_INFO.nameKo}의 영업권 이관 계약에 따라 발행되었습니다.
          </Text>
          <Text style={styles.footerNote}>문의: {COMPANY_INFO.email} · {COMPANY_INFO.tel}</Text>
        </View>

        <Text style={styles.docFooter}>
          문서번호 {data.documentNo} · 발행일 {data.generatedAt} · {COMPANY_INFO.nameKo}
        </Text>
      </Page>
    </Document>
  );
}
