import { useEffect, useRef } from "react";
import { PowerGlitch } from "powerglitch";
import { useI18n } from "../i18n";

/**
 * Centered loading text with PowerGlitch fault/glitch animation.
 * @see https://github.com/7PH/powerglitch (MIT, <2kb)
 */
export function LoadingHint() {
  const { t } = useI18n();
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    const { startGlitch, stopGlitch } = PowerGlitch.glitch(el, {
      playMode: "always",
      createContainers: true,
      hideOverflow: false,
      timing: {
        duration: 2200,
        iterations: Infinity,
        easing: "ease-in-out",
      },
      glitchTimeSpan: {
        start: 0.35,
        end: 0.72,
      },
      shake: {
        velocity: 12,
        amplitudeX: 0.12,
        amplitudeY: 0.08,
      },
      slice: {
        count: 5,
        velocity: 12,
        minHeight: 0.02,
        maxHeight: 0.18,
        hueRotate: true,
      },
      pulse: false,
    });

    startGlitch();
    return () => {
      stopGlitch();
    };
  }, []);

  return (
    <div className="loading-hint" role="status" aria-live="polite">
      <span ref={textRef} className="loading-hint__text">
        {t("loading")}
      </span>
    </div>
  );
}
