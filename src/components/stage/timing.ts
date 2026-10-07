// How long each step stays on screen in Auto mode at 1× speed (milliseconds). Tune freely.

/** IndicBERT steps 1–10. The last one ("Send to VITS") hands over to the packet animation. */
export const BERT_DWELL_MS = [1400, 2200, 2400, 2400, 3800, 2200, 2000, 2800, 2400, 0];

/** VITS steps 1–8. The last one ("Output voice") hands over to the robot. */
export const VITS_DWELL_MS = [2000, 2200, 3000, 2200, 2800, 2800, 3600, 0];

/** A process screen sliding over the robot, or away again. */
export const SLIDE_MS = 650;

/** "Send to VITS" stays on screen this long before the IndicBERT screen slides back to the robot. */
export const SEND_SHOW_MS = 1800;

/** "Output voice" stays on screen this long before the VITS screen slides back and the robot speaks. */
export const VOICE_SHOW_MS = 2600;

/** The gold packet's trip from IndicBERT to VITS (on the robot screen, once it has slid back). */
export const PACKET_MS = 1800;

/** The robot looks up and takes a breath before it speaks; the voice packet travels in this time. */
export const ROBOT_INTRO_MS = 900;

/**
 * The voice starts when the robot says it is ready (it may first have to pick the paper up). This is
 * the longest it waits for that, in case the 3D scene is stuck.
 */
export const ROBOT_WAIT_MAX_MS = 6000;
