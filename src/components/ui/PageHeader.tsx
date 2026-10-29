interface PageHeaderProps {
  title: string
  subtitle?: string
}

/** Screen title block pattern used across screens 7/8/9 of the design. */
export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <section className="flex flex-col">
      <h1 className="font-title-lg text-title-lg tracking-tight text-text-primary">{title}</h1>
      {subtitle ? (
        <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">{subtitle}</p>
      ) : null}
    </section>
  )
}
