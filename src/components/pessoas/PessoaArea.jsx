import { useId, useState } from "react";

export default function PessoaArea({ title, summary, children }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <section className="pessoa-area" aria-label={title}>
    <h2><button type="button" className="pessoa-area-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>
      <span>{title}</span><span aria-hidden="true">{open ? "−" : "+"}</span>
    </button></h2>
    <p className="pessoa-area-summary" role="status">{summary}</p>
    <div id={id} hidden={!open} className="pessoa-area-content">{children}</div>
  </section>;
}
