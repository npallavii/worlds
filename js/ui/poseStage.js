// The "mirror" panel used by calibration and practice: live camera (or sim stage),
// skeleton overlay, a framing guide, and a hint banner for repositioning.
import { pose, ISSUE_HINTS } from '../core/pose/PoseService.js';
import { SIM_HELP } from '../core/pose/SimulatedPose.js';
import { drawSkeleton } from './poseOverlay.js';
import { getSettings } from '../core/settings.js';
import { icon } from './icons.js';

export function stageMarkup() {
  const sim = pose.source === 'sim';
  return `
    <div class="pose-stage ${sim ? 'is-sim' : 'is-camera'}" data-stage>
      <div class="stage-video" data-video></div>
      <svg class="stage-guide" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <path d="M50 14 a7 7 0 1 1 -0.01 0 Z M38 28 h24 a6 6 0 0 1 6 6 v26 h-6 v26 h-8 v-22 h-8 v22 h-8 v-26 h-6 v-26 a6 6 0 0 1 6 -6Z"/>
      </svg>
      <canvas class="stage-canvas" data-canvas></canvas>
      <span class="stage-badge">${sim ? `${icon('hand')} Practice mode (no camera)` : `<i class="rec-dot"></i> Camera on · only on this device`}</span>
      <div class="stage-hint" data-hint hidden><span data-hint-arrow></span><span data-hint-text></span></div>
      ${sim ? `<dl class="sim-help">${SIM_HELP.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>` : ''}
    </div>`;
}

export function mountStage(root) {
  const stage = root.querySelector('[data-stage]');
  pose.attachPreview(stage.querySelector('[data-video]'));
  const canvas = stage.querySelector('[data-canvas]');
  const hintEl = stage.querySelector('[data-hint]');
  const hintText = stage.querySelector('[data-hint-text]');
  const hintArrow = stage.querySelector('[data-hint-arrow]');
  let lastIssue = undefined;

  return {
    /** Call every animation frame with the latest pose frame. */
    render(frame, { good = frame?.inFrame } = {}) {
      drawSkeleton(canvas, frame, { good, show: getSettings().showSkeleton || pose.source === 'sim' });
      stage.classList.toggle('is-good', !!frame?.inFrame);
    },
    /** Shows a repositioning hint for an issue code (or hides it with null). Returns true if it changed. */
    hint(issue) {
      if (issue === lastIssue) return false;
      lastIssue = issue;
      hintEl.hidden = !issue;
      if (issue) {
        hintText.textContent = ISSUE_HINTS[issue];
        hintArrow.innerHTML = issue === 'moveLeft' ? '⟵' : issue === 'moveRight' ? '⟶' : '';
      }
      return true;
    },
    detach() { pose.parkPreview(); },
  };
}
