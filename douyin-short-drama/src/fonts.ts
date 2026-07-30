import { loadFont } from "@remotion/google-fonts/NotoSansSC";

export const { fontFamily } = loadFont("normal", {
  weights: ["700"],
  subsets: ["chinese-simplified"],
  ignoreTooManyRequestsWarning: true,
});
