/* Streaming fallback for every page in the app shell. Without this file,
   Next.js keeps the user frozen on the old page until the new page's server
   render (auth + all queries) completes; with it, navigation swaps instantly
   to this skeleton and the content streams in when ready. */
export default function Loading() {
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 28px 48px", width: "100%" }}>
      <div className="skel" style={{ height: 40, width: "40%", maxWidth: 320, marginBottom: 12 }} />
      <div className="skel" style={{ height: 16, width: "65%", maxWidth: 480, marginBottom: 30 }} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))",
          gap: 18,
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skel" style={{ height: 150, borderRadius: 16 }} />
        ))}
      </div>
    </div>
  );
}
