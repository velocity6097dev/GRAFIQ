import { Check, Truck, PackageX } from 'lucide-react'
import Modal from '../ui/Modal'
import {
  ORDER_TIMELINE_STEPS,
  REPLACEMENT_TIMELINE_STEPS,
  buildTimeline,
  formatTimelineDate
} from '../../utils/orderTimeline'

function Timeline({ steps, isTerminalOther, terminalOtherLabel, terminalAt }) {
  if (isTerminalOther) {
    return (
      <div className="flex items-start gap-3 border border-red-500/30 bg-red-500/5 p-4">
        <PackageX size={20} className="text-red-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-red-400 font-accent uppercase text-sm">{terminalOtherLabel}</p>
          {terminalAt && <p className="text-xs text-slate mt-1">{formatTimelineDate(terminalAt)}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {steps.map((step, i) => (
        <div key={step.status} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 ${
                step.done ? 'bg-volt border-volt' : 'border-line bg-ink'
              }`}
            >
              {step.done && <Check size={13} className="text-ink" strokeWidth={3} />}
            </div>
            {i < steps.length - 1 && (
              <div className={`w-0.5 flex-1 min-h-[28px] ${step.done ? 'bg-volt' : 'bg-line'}`} />
            )}
          </div>
          <div className="pb-6">
            <p className={`text-sm font-accent uppercase tracking-wide ${step.done ? 'text-paper' : 'text-slate'}`}>
              {step.label}
            </p>
            {step.at && <p className="text-xs text-slate mt-0.5">{formatTimelineDate(step.at)}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function TrackOrderModal({ order, replacement, open, onClose }) {
  if (!order) return null

  const orderTimeline = buildTimeline(order.statusHistory, ORDER_TIMELINE_STEPS, ['Cancelled'])
  const replacementTimeline = replacement
    ? buildTimeline(replacement.statusHistory, REPLACEMENT_TIMELINE_STEPS, ['Rejected'])
    : null

  return (
    <Modal open={open} onClose={onClose} title={`Track Order ${order.id}`} maxWidth="max-w-lg">
      <div className="flex flex-col gap-6">
        <Timeline
          steps={orderTimeline.steps}
          isTerminalOther={orderTimeline.isTerminalOther}
          terminalOtherLabel="Order Cancelled"
          terminalAt={orderTimeline.terminalAt}
        />

        {order.shipping?.trackingId && (
          <div className="border border-line p-3 text-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <Truck size={15} className="text-volt shrink-0" />
              <span className="font-accent uppercase text-xs text-slate">Courier</span>
            </div>
            <p>{order.shipping.courierName || 'Assigned courier'}</p>
            <p className="text-slate text-xs mt-1">
              Tracking ID: <span className="text-paper">{order.shipping.trackingId}</span>
            </p>
          </div>
        )}

        {replacement && (
          <div className="pt-6 border-t border-line">
            <p className="font-accent uppercase tracking-wide text-volt text-sm mb-1">Replacement Tracking</p>
            <p className="text-xs text-slate mb-4">
              {replacement.productName} · Request {replacement.id}
            </p>
            <Timeline
              steps={replacementTimeline.steps}
              isTerminalOther={replacementTimeline.isTerminalOther}
              terminalOtherLabel="Replacement Rejected"
              terminalAt={replacementTimeline.terminalAt}
            />
            {(replacement.courierName || replacement.trackingId || replacement.estimatedDelivery) && (
              <div className="border border-line p-3 text-sm mt-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <Truck size={15} className="text-volt shrink-0" />
                  <span className="font-accent uppercase text-xs text-slate">Replacement Courier</span>
                </div>
                {replacement.courierName && <p>{replacement.courierName}</p>}
                {replacement.trackingId && (
                  <p className="text-slate text-xs mt-1">
                    Tracking ID: <span className="text-paper">{replacement.trackingId}</span>
                  </p>
                )}
                {replacement.estimatedDelivery && (
                  <p className="text-slate text-xs mt-1">
                    Estimated delivery:{' '}
                    <span className="text-paper">
                      {new Date(replacement.estimatedDelivery).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
