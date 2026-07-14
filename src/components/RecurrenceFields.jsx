import { FREQ_LABEL } from '../lib/recurrence'

export default function RecurrenceFields({ recurrence, onChange, disabled }) {
  function patch(partial) {
    onChange({ ...recurrence, ...partial })
  }

  return (
    <div className="recurrence-box">
      <label className="recurrence-toggle">
        <input type="checkbox" checked={recurrence.enabled} disabled={disabled}
          onChange={e => patch({ enabled: e.target.checked })} />
        <span>Repeats</span>
      </label>

      {recurrence.enabled && (
        <div className="field-row" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 10 }}>
          <div className="field">
            <label>Frequency</label>
            <select value={recurrence.freq} onChange={e => patch({ freq: e.target.value })}>
              {Object.entries(FREQ_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Ends</label>
            <select value={recurrence.endType} onChange={e => patch({ endType: e.target.value })}>
              <option value="count">After N occurrences</option>
              <option value="date">On a date</option>
            </select>
          </div>
          {recurrence.endType === 'count' ? (
            <div className="field">
              <label>Occurrences (max 24)</label>
              <input type="number" min="1" max="24" className="figure" value={recurrence.count}
                onChange={e => patch({ count: Number(e.target.value) })} />
            </div>
          ) : (
            <div className="field">
              <label>End date</label>
              <input type="date" value={recurrence.endDate} onChange={e => patch({ endDate: e.target.value })} />
            </div>
          )}
        </div>
      )}
      {recurrence.enabled && (
        <p className="recurrence-note">
          Creates up to 24 separate records on this schedule, each editable on its own. Extend the series later by creating a new one starting from the last date.
        </p>
      )}
    </div>
  )
}
