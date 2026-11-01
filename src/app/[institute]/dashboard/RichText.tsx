// Renders a teacher's review. The HTML is sanitized on the server (allowlist of
// formatting tags, no attributes), so it is safe to inject.
export default function RichText({ html }: { html: string }) {
  return (
    <div
      style={{ lineHeight: 1.5, wordBreak: "break-word" }}
      className="rich-text"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
