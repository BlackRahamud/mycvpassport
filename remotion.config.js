// Remotion CLI config — investor walkthrough film.
// Assets (portal captures, audio) live in video-assets/, NOT the app's
// public/ (which deploys to production).
import { Config } from "@remotion/cli/config";

Config.setPublicDir("./video-assets");
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
