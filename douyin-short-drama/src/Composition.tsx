import { Composition, Folder } from "remotion";
import { ShortDrama, SHORT_DRAMA_DURATION } from "./ShortDrama";
import { DialogueScene } from "./scenes/DialogueScene";

const FPS = 30;
const WIDTH = 1080;
const HEIGHT = 1920;

export const MyComposition = () => {
  return (
    <>
      <Composition
        id="HearYourMindEP01"
        component={ShortDrama}
        durationInFrames={SHORT_DRAMA_DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Folder name="Scenes">
        <Composition
          id="Scene-BossHook"
          component={DialogueScene}
          durationInFrames={Math.round(5.2 * FPS)}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
          defaultProps={{
            image: "boss.png",
            audio: "boss.mp3",
            speaker: "周屿",
            speakerColor: "#7ad7ff",
            text: "别装了。我知道，你能听见我的心声。",
            title: "他知道我能听见心声",
            mood: "normal" as const,
          }}
        />
        <Composition
          id="Scene-GirlReply"
          component={DialogueScene}
          durationInFrames={Math.round(3.9 * FPS)}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
          defaultProps={{
            image: "heroine.png",
            audio: "girl.mp3",
            speaker: "林夏",
            speakerColor: "#ffe08a",
            text: "既然知道，你还敢把我单独留下？",
            mood: "normal" as const,
          }}
        />
        <Composition
          id="Scene-TwistCTA"
          component={DialogueScene}
          durationInFrames={Math.round(4.6 * FPS)}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
          defaultProps={{
            image: "heroine.png",
            audio: "cta.mp3",
            speaker: "旁白",
            speakerColor: "#ff8fb0",
            text: "下一集，她将拿回属于自己的一切。",
            title: "她才是真正的老板",
            mood: "cta" as const,
          }}
        />
      </Folder>
    </>
  );
};
