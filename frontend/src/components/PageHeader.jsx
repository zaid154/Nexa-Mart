// A reusable header shown at the top of many pages.
const PageHeader = ({ eyebrow, title, subtitle, children }) => {
  return (
    <header className="page-header">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        {children && <div className="page-header-actions">{children}</div>}
      </div>
    </header>
  );
};

export default PageHeader;
