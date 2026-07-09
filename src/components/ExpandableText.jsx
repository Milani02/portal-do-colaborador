import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Texto longo em células/cartões: mostra até `lines` linhas com quebra
 * normal e, quando o conteúdo passa disso, um "Ver mais" expande inline
 * ("Ver menos" recolhe). Funciona em desktop e touch — nada depende de hover.
 */
export function ExpandableText({ text, lines = 2, style }) {
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el) setClamped(el.scrollHeight > el.clientHeight + 1);
  }, [text, lines]);

  if (!text) return null;

  return (
    <div style={style}>
      <div
        ref={ref}
        className={expanded ? 'expandable-text' : 'expandable-text clamped'}
        style={expanded ? undefined : { WebkitLineClamp: lines }}
      >
        {text}
      </div>
      {(clamped || expanded) && (
        <button
          type="button"
          className="expandable-text-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Ver menos' : 'Ver mais'}
        </button>
      )}
    </div>
  );
}
