export const PARTICIPANT_BOX_HEIGHT = 36;
export const STEREOTYPE_SPACE = 20; // reserved above boxes when ANY participant has a stereotype
export const ACTOR_WIDTH = 48;
export const ACTOR_HEIGHT = 56; // stick-figure area
export const ACTOR_NAME_SPACE = 18; // reserved below the figure for the name, before the lifeline starts
export const COLUMN_GAP = 56; // horizontal gap between adjacent participant boxes
export const FIRST_MESSAGE_GAP = 48; // from box/figure bottom to first message line
export const ROW_HEIGHT = 32; // vertical advance per message
export const FRAGMENT_HEADER_GAP = 36; // extra vertical space inserted before a fragment's first message
export const FRAGMENT_PAD_X = 24; // fragment box extends this far beyond the outermost covered lifeline
export const FRAGMENT_TAB_HEIGHT = 24; // tab row at the top of the fragment box
export const ACTIVATION_WIDTH = 10; // width of the activation bar on a lifeline
export const LIFELINE_TAIL = 24; // lifeline extends this far below the last message
export const SELF_LOOP_WIDTH = 40; // self-message loopback extends this far to the right
export const SELF_LOOP_DROP = 20; // self-message loopback vertical drop
export const CHAR_WIDTH = 7; // approximate text width per char at font size 13

export function estimateParticipantWidth(name: string, stereotype?: string): number {
  const stereoLen = stereotype ? stereotype.length + 2 : 0; // +2 for the guillemets
  const maxTextLen = Math.max(name.length, stereoLen);
  return Math.max(64, maxTextLen * CHAR_WIDTH + 24);
}

// the actor's name is drawn below the figure, so the column must be wide enough for it
export function estimateActorWidth(name: string): number {
  return Math.max(ACTOR_WIDTH, name.length * CHAR_WIDTH + 16);
}
