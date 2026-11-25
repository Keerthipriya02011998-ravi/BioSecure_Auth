"use client";
import { useRef } from "react";

// Six single-digit boxes. Supports typing, backspace, arrow keys and pasting a whole code.
export default function CodeInput({ value, onChange, invalid, disabled, onComplete }) {
  const refs = useRef([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || "");

  function set(next) {
    const clean = next.replace(/\D/g, "").slice(0, 6);
    onChange(clean);
    if (clean.length === 6 && onComplete) onComplete(clean);
  }

  function handleChange(i, e) {
    const d = e.target.value.replace(/\D/g, "");
    if (!d) return;
    if (d.length > 1) {
      set(value.slice(0, i) + d);
      refs.current[Math.min(i + d.length, 5)]?.focus();
      return;
    }
    const arr = digits.slice();
    arr[i] = d;
    set(arr.join(""));
    if (i < 5) refs.current[i + 1]?.focus();
  }

  function handleKey(i, e) {
    if (e.key === "Backspace") {
      e.preventDefault();
      const arr = digits.slice();
      if (arr[i]) arr[i] = "";
      else if (i > 0) { arr[i - 1] = ""; refs.current[i - 1]?.focus(); }
      onChange(arr.join("").replace(/\s/g, ""));
    } else if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    else if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
  }

  function handlePaste(e) {
    const text = (e.clipboardData.getData("text") || "").replace(/\D/g, "");
    if (!text) return;
    e.preventDefault();
    set(text);
    refs.current[Math.min(text.length, 5)]?.focus();
  }

  return (
    <div className="code-row" role="group" aria-label="6-digit code" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={6}
          value={d}
          disabled={disabled}
          aria-label={`Digit ${i + 1}`}
          aria-invalid={invalid ? "true" : "false"}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}
