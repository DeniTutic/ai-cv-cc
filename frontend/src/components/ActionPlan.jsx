import { useMemo, useState } from 'react';
import styles from './ActionPlan.module.css';

const GROUPS = [
  { action: 'add',    title: 'Add',    verb: 'Missing from your CV',       symbol: '+' },
  { action: 'modify', title: 'Modify', verb: 'Present but weak',           symbol: '~' },
  { action: 'remove', title: 'Remove', verb: 'Hurting your chances',       symbol: '−' },
  { action: 'keep',   title: 'Keep',   verb: 'Strong — leave these alone', symbol: '✓' }
];

const PRIORITY_TONE = { critical: 'stop', important: 'caution', minor: 'go' };
const PRIORITY_ORDER = { critical: 0, important: 1, minor: 2 };

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" className={styles.copyBtn} onClick={copy} aria-live="polite">
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function ActionCard({ item }) {
  const tone = PRIORITY_TONE[item.priority] || 'caution';

  return (
    <article className={styles.card} data-tone={tone}>
      <header className={styles.cardHead}>
        <span className={styles.section}>{item.section}</span>
        <span className={styles.priority} data-tone={tone}>{item.priority}</span>
      </header>

      {item.target && <p className={styles.target}>{item.target}</p>}
      <p className={styles.reason}>{item.reason}</p>

      {item.suggestion && (
        <div className={styles.suggestion}>
          <div className={styles.suggestionHead}>
            <span className={styles.suggestionLabel}>Do this</span>
            <CopyButton text={item.suggestion} />
          </div>
          <p className={styles.suggestionBody}>{item.suggestion}</p>
        </div>
      )}
    </article>
  );
}

/**
 * The add / remove / modify debrief. Grouped by action, sorted by priority,
 * with the traffic-light scale carrying severity.
 */
export default function ActionPlan({ items = [] }) {
  const [filter, setFilter] = useState('all');

  const grouped = useMemo(() => {
    const byAction = {};
    for (const group of GROUPS) {
      byAction[group.action] = items
        .filter((i) => i.action === group.action)
        .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3));
    }
    return byAction;
  }, [items]);

  if (items.length === 0) return null;

  const criticalCount = items.filter((i) => i.priority === 'critical').length;
  const visibleGroups = GROUPS.filter(
    (g) => grouped[g.action].length > 0 && (filter === 'all' || filter === g.action)
  );

  return (
    <section className={styles.wrap} aria-labelledby="action-plan-heading">
      <div className={styles.head}>
        <h2 id="action-plan-heading" className={styles.heading}>Your action plan</h2>
        <p className={styles.subheading}>
          {items.length} change{items.length === 1 ? '' : 's'} to make
          {criticalCount > 0 && (
            <>
              {' · '}
              <strong className={styles.criticalNote}>{criticalCount} critical</strong>
            </>
          )}
        </p>
      </div>

      <div className={styles.filters} role="tablist" aria-label="Filter by change type">
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'all'}
          className={styles.filterBtn}
          data-active={filter === 'all'}
          onClick={() => setFilter('all')}
        >
          All <span className={styles.count}>{items.length}</span>
        </button>
        {GROUPS.filter((g) => grouped[g.action].length > 0).map((g) => (
          <button
            key={g.action}
            type="button"
            role="tab"
            aria-selected={filter === g.action}
            className={styles.filterBtn}
            data-active={filter === g.action}
            onClick={() => setFilter(g.action)}
          >
            {g.title} <span className={styles.count}>{grouped[g.action].length}</span>
          </button>
        ))}
      </div>

      {visibleGroups.map((group) => (
        <div key={group.action} className={styles.group}>
          <h3 className={styles.groupTitle}>
            <span className={styles.symbol} data-action={group.action} aria-hidden="true">
              {group.symbol}
            </span>
            {group.title}
            <span className={styles.groupVerb}>{group.verb}</span>
          </h3>

          <div className={styles.cards}>
            {grouped[group.action].map((item, i) => (
              <ActionCard key={`${group.action}-${i}`} item={item} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
