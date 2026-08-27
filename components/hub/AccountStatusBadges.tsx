import { TRANSFER_STATUS_LABEL, CONNECTION_STATUS_LABEL, ConnectionStatus } from '@/lib/hub'

const TRANSFER_STYLE: Record<string, string> = {
  waiting: 'bg-gray-50 text-gray-600 border-gray-200',
  transfer_needed: 'bg-amber-50 text-amber-700 border-amber-200',
  verifying: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
}

// duplicate=에러, reviewing=중립/대기, connected=성공
const CONNECTION_STYLE: Record<ConnectionStatus, string> = {
  duplicate: 'bg-red-50 text-red-700 border-red-200',
  reviewing: 'bg-gray-50 text-gray-600 border-gray-200',
  connected: 'bg-green-50 text-green-700 border-green-200',
}

export default function AccountStatusBadges({
  transferStatus,
  connectionStatus,
}: {
  transferStatus: string
  connectionStatus: ConnectionStatus
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={`whitespace-nowrap rounded-[9999px] border px-2.5 py-1 text-[11px] font-medium ${TRANSFER_STYLE[transferStatus] ?? TRANSFER_STYLE.waiting}`}>
        {TRANSFER_STATUS_LABEL[transferStatus as keyof typeof TRANSFER_STATUS_LABEL] ?? transferStatus}
      </span>
      <span className={`whitespace-nowrap rounded-[9999px] border px-2.5 py-1 text-[11px] font-medium ${CONNECTION_STYLE[connectionStatus]}`}>
        {CONNECTION_STATUS_LABEL[connectionStatus]}
      </span>
    </div>
  )
}
