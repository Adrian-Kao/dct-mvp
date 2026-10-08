import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  focusOnMount?: boolean;
}

export function SceneHeading({ eyebrow, title, description, focusOnMount = true }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focusOnMount) headingRef.current?.focus({ preventScroll: true });
  }, [focusOnMount]);
  return (
    <header className="scene-heading" data-entry-target="true" data-entry-order="4" data-transition-item="true" data-transition-id="scene-heading" data-transition-role="chrome" data-transition-source="dom">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1 ref={headingRef} tabIndex={-1}>{title}</h1>
      {description && <div className="scene-description">{description}</div>}
    </header>
  );
}
