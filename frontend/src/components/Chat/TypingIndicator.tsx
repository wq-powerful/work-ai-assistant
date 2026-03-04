export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-brand-blue"
          style={{
            animation: `pulse-dot 1.4s ${i * 0.2}s infinite ease-in-out`,
          }}
        />
      ))}
    </div>
  );
}
