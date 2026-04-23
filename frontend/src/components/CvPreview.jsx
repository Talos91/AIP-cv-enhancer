// HTML rendering of the canonical CV JSON. Used as the live preview pane.
// Styled to look like a white "paper" document inside the dark app.

const templateStyles = {
  minimal: { accent: '#1f2d3d', font: 'Calibri, system-ui' },
  classic: { accent: '#122e5b', font: 'Garamond, Georgia, serif' },
  modern:  { accent: '#2563eb', font: 'Inter, system-ui' },
};

function Section({ title, accent, children }) {
  return (
    <div className="mb-4">
      <div
        className="text-[10px] font-bold uppercase tracking-wider mb-1"
        style={{ color: accent, letterSpacing: '0.12em' }}
      >
        {title}
      </div>
      <div className="border-t border-slate-200 mb-2" />
      {children}
    </div>
  );
}

function dateRange(e) {
  const s = e.start || '', en = e.end || '';
  if (s && en) return `${s} – ${en}`;
  return s || en || '';
}

export default function CvPreview({ cv, template = 'minimal' }) {
  const style = templateStyles[template] || templateStyles.minimal;
  const skills = cv.skills || {};
  const buckets = [
    ['Technical', skills.technical],
    ['Tools', skills.tools],
    ['Languages', skills.languages],
    ['Soft Skills', skills.soft],
  ].filter(([, v]) => v && v.length);

  const contact = [cv.email, cv.phone, cv.location, cv.linkedin, cv.website].filter(Boolean);

  return (
    <div
      className="bg-white text-slate-800 shadow-xl mx-auto"
      style={{
        width: '100%',
        maxWidth: '720px',
        aspectRatio: '1 / 1.414',
        padding: '36px 44px',
        fontFamily: style.font,
        fontSize: '11px',
        lineHeight: 1.5,
        overflow: 'hidden',
      }}
    >
      <div className="text-center mb-1">
        <div
          className="font-bold"
          style={{ color: style.accent, fontSize: template === 'modern' ? 26 : 22 }}
        >
          {cv.full_name || 'Your Name'}
        </div>
        {cv.headline && (
          <div className="text-slate-500 mt-0.5" style={{ fontSize: 12 }}>
            {cv.headline}
          </div>
        )}
      </div>
      {contact.length > 0 && (
        <div className="text-center text-slate-500 mb-4" style={{ fontSize: 10 }}>
          {contact.join('  •  ')}
        </div>
      )}

      {cv.summary && (
        <Section title="Summary" accent={style.accent}>
          <p>{cv.summary}</p>
        </Section>
      )}

      {cv.experience?.length > 0 && (
        <Section title="Experience" accent={style.accent}>
          {cv.experience.map((e, i) => (
            <div key={i} className="mb-3">
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <span className="font-semibold">{e.title}</span>
                  {e.company && <span className="text-slate-500"> — {e.company}</span>}
                  {e.location && <span className="text-slate-500"> · {e.location}</span>}
                </div>
                <div className="text-slate-500 whitespace-nowrap" style={{ fontSize: 10 }}>
                  {dateRange(e)}
                </div>
              </div>
              {e.bullets?.length > 0 && (
                <ul className="list-disc ml-5 mt-1 space-y-0.5">
                  {e.bullets.map((b, j) => (
                    <li key={j}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </Section>
      )}

      {cv.education?.length > 0 && (
        <Section title="Education" accent={style.accent}>
          {cv.education.map((e, i) => (
            <div key={i} className="mb-2">
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <span className="font-semibold">{e.degree}</span>
                  {e.school && <span className="text-slate-500"> — {e.school}</span>}
                  {e.location && <span className="text-slate-500"> · {e.location}</span>}
                </div>
                <div className="text-slate-500 whitespace-nowrap" style={{ fontSize: 10 }}>
                  {dateRange(e)}
                </div>
              </div>
              {e.details && <div>{e.details}</div>}
            </div>
          ))}
        </Section>
      )}

      {buckets.length > 0 && (
        <Section title="Skills" accent={style.accent}>
          {buckets.map(([label, items]) => (
            <div key={label} className="mb-0.5">
              <span className="font-semibold">{label}: </span>
              <span>{items.join(', ')}</span>
            </div>
          ))}
        </Section>
      )}

      {cv.certifications?.length > 0 && (
        <Section title="Certifications" accent={style.accent}>
          <ul className="list-disc ml-5 space-y-0.5">
            {cv.certifications.map((c, i) => (
              <li key={i}>
                {c.name}
                {c.issuer && ` — ${c.issuer}`}
                {c.year && ` (${c.year})`}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {cv.projects?.length > 0 && (
        <Section title="Projects" accent={style.accent}>
          {cv.projects.map((p, i) => (
            <div key={i} className="mb-1.5">
              <div className="font-semibold">{p.name}</div>
              {p.description && <div>{p.description}</div>}
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}
