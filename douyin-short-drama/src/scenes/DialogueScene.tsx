import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { fontFamily } from "../fonts";

export type DialogueSceneProps = {
  image: string;
  audio: string;
  speaker: string;
  speakerColor: string;
  text: string;
  title?: string;
  mood?: "normal" | "mind" | "cta";
};

export const DialogueScene: React.FC<DialogueSceneProps> = ({
  image,
  audio,
  speaker,
  speakerColor,
  text,
  title,
  mood = "normal",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  const enter = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 120 },
  });

  const zoom = interpolate(frame, [0, durationInFrames], [1.04, 1.14], {
    extrapolateRight: "clamp",
  });

  const subtitleY = interpolate(enter, [0, 1], [40, 0]);
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 8, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const fadeIn = interpolate(frame, [0, 6], [0, 1], {
    extrapolateRight: "clamp",
  });

  const overlay =
    mood === "mind"
      ? "linear-gradient(180deg, rgba(40,0,55,0.35), rgba(8,10,24,0.55) 40%, rgba(0,0,0,0.78))"
      : mood === "cta"
        ? "linear-gradient(180deg, rgba(90,0,35,0.35), rgba(8,10,24,0.5) 35%, rgba(0,0,0,0.82))"
        : "linear-gradient(180deg, rgba(0,20,40,0.28), rgba(0,0,0,0.18) 35%, rgba(0,0,0,0.78))";

  return (
    <AbsoluteFill style={{ backgroundColor: "#05070d", opacity: fadeIn * fadeOut }}>
      <AbsoluteFill
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: "center center",
        }}
      >
        <Img
          src={staticFile(image)}
          style={{
            width,
            height,
            objectFit: "cover",
            objectPosition: "center 18%",
            filter:
              mood === "mind"
                ? "saturate(0.85) contrast(1.08) hue-rotate(12deg)"
                : "saturate(0.95) contrast(1.05)",
          }}
        />
      </AbsoluteFill>

      <AbsoluteFill style={{ background: overlay }} />

      {mood === "mind" ? (
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              width: 420,
              height: 420,
              borderRadius: "50%",
              border: "3px solid rgba(120, 230, 255, 0.35)",
              boxShadow: "0 0 80px rgba(90, 210, 255, 0.25)",
              opacity: interpolate(frame % 30, [0, 15, 30], [0.35, 0.7, 0.35]),
            }}
          />
        </AbsoluteFill>
      ) : null}

      <div
        style={{
          position: "absolute",
          top: 72,
          left: 48,
          right: 48,
          fontFamily,
          color: "rgba(255,255,255,0.88)",
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: 1,
          textShadow: "0 2px 10px rgba(0,0,0,0.7)",
        }}
      >
        《听见你的心声》· 第一集
      </div>

      {title ? (
        <div
          style={{
            position: "absolute",
            top: 140,
            left: 48,
            right: 48,
            fontFamily,
            color: "#fff",
            fontSize: 54,
            fontWeight: 900,
            lineHeight: 1.25,
            textShadow: "0 4px 18px rgba(0,0,0,0.75)",
            opacity: interpolate(frame, [0, 12, 55, 70], [0, 1, 1, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          {title}
        </div>
      ) : null}

      <div
        style={{
          position: "absolute",
          left: 42,
          right: 42,
          bottom: 150,
          transform: `translateY(${subtitleY}px)`,
          fontFamily,
        }}
      >
        <div
          style={{
            display: "inline-block",
            background: speakerColor,
            color: "#081018",
            fontSize: 30,
            fontWeight: 900,
            padding: "8px 18px",
            borderRadius: 14,
            marginBottom: 16,
          }}
        >
          {speaker}
        </div>
        <div
          style={{
            background: "rgba(8,12,22,0.72)",
            border: `2px solid ${speakerColor}`,
            borderRadius: 28,
            padding: "28px 30px",
            color: "#fff",
            fontSize: 52,
            fontWeight: 800,
            lineHeight: 1.35,
            textShadow: "0 2px 8px rgba(0,0,0,0.45)",
          }}
        >
          {text}
        </div>
      </div>

      <Audio src={staticFile(audio)} />
    </AbsoluteFill>
  );
};
