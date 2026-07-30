import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { DialogueScene } from "./scenes/DialogueScene";

const FPS = 30;

const scenes = [
  {
    id: "boss",
    durationInFrames: Math.round(5.2 * FPS),
    image: "boss.png",
    audio: "boss.mp3",
    speaker: "周屿",
    speakerColor: "#7ad7ff",
    text: "别装了。我知道，你能听见我的心声。",
    title: "他知道我能听见心声",
    mood: "normal" as const,
  },
  {
    id: "girl",
    durationInFrames: Math.round(3.9 * FPS),
    image: "heroine.png",
    audio: "girl.mp3",
    speaker: "林夏",
    speakerColor: "#ffe08a",
    text: "既然知道，你还敢把我单独留下？",
    mood: "normal" as const,
  },
  {
    id: "boss2",
    durationInFrames: Math.round(3.7 * FPS),
    image: "boss.png",
    audio: "boss2.mp3",
    speaker: "周屿",
    speakerColor: "#7ad7ff",
    text: "因为三年前，救你的人是我。",
    mood: "normal" as const,
  },
  {
    id: "girl2",
    durationInFrames: Math.round(3.35 * FPS),
    image: "heroine.png",
    audio: "girl2.mp3",
    speaker: "林夏",
    speakerColor: "#ffe08a",
    text: "不可能。他已经死了。",
    mood: "normal" as const,
  },
  {
    id: "boss3",
    durationInFrames: Math.round(3.8 * FPS),
    image: "boss.png",
    audio: "boss3.mp3",
    speaker: "周屿",
    speakerColor: "#7ad7ff",
    text: "死的，只是你关于我的记忆。",
    mood: "normal" as const,
  },
  {
    id: "mind",
    durationInFrames: Math.round(4.5 * FPS),
    image: "heroine.png",
    audio: "mind.mp3",
    speaker: "心声",
    speakerColor: "#9bffef",
    text: "她还不知道……她才是这家公司真正的老板。",
    mood: "mind" as const,
  },
  {
    id: "cta",
    durationInFrames: Math.round(4.6 * FPS),
    image: "heroine.png",
    audio: "cta.mp3",
    speaker: "旁白",
    speakerColor: "#ff8fb0",
    text: "下一集，她将拿回属于自己的一切。",
    title: "她才是真正的老板",
    mood: "cta" as const,
  },
];

const transitionFrames = 8;

export const SHORT_DRAMA_DURATION =
  scenes.reduce((sum, scene) => sum + scene.durationInFrames, 0) -
  transitionFrames * (scenes.length - 1);

export const ShortDrama: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#05070d" }}>
      <TransitionSeries>
        {scenes.flatMap((scene, index) => {
          const nodes = [
            <TransitionSeries.Sequence
              key={scene.id}
              durationInFrames={scene.durationInFrames}
              name={scene.id}
            >
              <DialogueScene
                image={scene.image}
                audio={scene.audio}
                speaker={scene.speaker}
                speakerColor={scene.speakerColor}
                text={scene.text}
                title={scene.title}
                mood={scene.mood}
              />
            </TransitionSeries.Sequence>,
          ];

          if (index < scenes.length - 1) {
            nodes.push(
              <TransitionSeries.Transition
                key={`${scene.id}-fade`}
                presentation={fade()}
                timing={linearTiming({ durationInFrames: transitionFrames })}
              />,
            );
          }

          return nodes;
        })}
      </TransitionSeries>
    </AbsoluteFill>
  );
};
