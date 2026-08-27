export type ClauseBlock =
  | { type: 'p'; text: string }
  | { type: 'ol'; items: string[] }
  | { type: 'ul'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] };

export type Clause = {
  title: string;
  blocks: ClauseBlock[];
};

export function DraftNotice({ effectiveDate }: { effectiveDate: string }) {
  return (
    <div className="mb-12 rounded-md border border-ink bg-ink px-6 py-5">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-primary">
        초안 · 법무 검토 전
      </p>
      <p className="mt-2 text-[14px] leading-[1.75] text-canvas-white/85">
        본 문서는 서비스 준비 과정에서 작성된 초안이며, 아직 법무 검토를 거치지 않았습니다.
        정식 시행 전까지 조항의 내용과 표현이 변경될 수 있습니다.
      </p>
      <p className="mt-3 text-[13px] text-canvas-white/55">시행일(예정) {effectiveDate}</p>
    </div>
  );
}

function LegalTableView({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-sm border border-hairline">
      <table className="w-full min-w-[480px] border-collapse text-[13px]">
        <thead>
          <tr className="bg-parchment">
            {headers.map((header) => (
              <th
                key={header}
                className="border-b border-hairline px-4 py-2.5 text-left font-semibold text-ink"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]} className="border-b border-hairline last:border-0">
              {row.map((cell, cellIndex) => (
                <td key={`${row[0]}-${cellIndex}`} className="px-4 py-2.5 align-top text-muted">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ClauseBlockView({ block }: { block: ClauseBlock }) {
  switch (block.type) {
    case 'p':
      return <p className="mt-3 text-[15px] leading-[1.9] text-muted">{block.text}</p>;
    case 'ol':
      return (
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[15px] leading-[1.8] text-muted">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      );
    case 'ul':
      return (
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-[1.8] text-muted">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case 'table':
      return <LegalTableView headers={block.headers} rows={block.rows} />;
  }
}

export function ClauseList({ clauses }: { clauses: Clause[] }) {
  return (
    <>
      {clauses.map((clause, index) => (
        <section key={clause.title} className={index === 0 ? '' : 'mt-10'}>
          <h2 className="text-[18px] font-bold text-ink">{clause.title}</h2>
          {clause.blocks.map((block, blockIndex) => (
            <ClauseBlockView key={blockIndex} block={block} />
          ))}
        </section>
      ))}
    </>
  );
}
