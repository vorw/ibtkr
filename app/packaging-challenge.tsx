"use client";

// Bridge between the embedded two-minute activity and the main contribution
// form. The activity uses the real weekly deadline and local attempt recovery.

import { useEffect, useMemo, useRef, useState } from "react";
import type { WeeklyChallenge } from "@/lib/weekly";
import { packagingGameHtml, packagingTasks } from "@/lib/packaging-game";
import { validDrawing } from "@/lib/drawing-policy";

export type PackagingResult = { id: string; task: number; drawing: string };
export default function PackagingChallenge({
  week,
  onComplete,
  timeLeft,
}: {
  week: WeeklyChallenge;
  onComplete: (result: PackagingResult) => void;
  timeLeft: string;
}) {
  const frame = useRef<HTMLIFrameElement>(null),
    complete = useRef(onComplete);
  const [height, setHeight] = useState(800);
  complete.current = onComplete;
  const html = useMemo(
    () =>
      packagingGameHtml
        .replace("__PACKAGING_TASKS__", JSON.stringify(packagingTasks))
        .replaceAll("__WEEK_ID__", week.id)
        .replaceAll("__WEEK_ENDS__", week.endsAt),
    [week.id, week.endsAt],
  );
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.source !== frame.current?.contentWindow ||
        event.origin !== window.location.origin
      )
        return;
      const value = event.data;
      if (
        value?.type === "ibtkr:packaging:height" &&
        Number.isFinite(value.height)
      ) {
        setHeight(Math.min(2400, Math.max(640, Math.ceil(value.height) + 8)));
        return;
      }
      if (
        value?.type !== "ibtkr:packaging:complete" ||
        typeof value.id !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          value.id,
        ) ||
        !Number.isInteger(value.task) ||
        !packagingTasks[value.task] ||
        !validDrawing(value.drawing)
      )
        return;
      complete.current({
        id: value.id,
        task: value.task,
        drawing: value.drawing,
      });
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);
  return (
    <section aria-label="تحدّي رموز التغليف">
      <div className="workspace-label">
        <span>الأسبوع {week.number} · تحدّي الرسم</span>
        <span>ينتهي الجمعة ١١:٥٩ م · {timeLeft}</span>
      </div>
      <iframe
        ref={frame}
        srcDoc={html}
        title="رسالة على علبة · دقيقتان للرسم"
        style={{
          display: "block",
          width: "100%",
          height,
          border: 0,
          background: "var(--background)",
        }}
      />
    </section>
  );
}
