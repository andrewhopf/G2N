/**
 * @fileoverview Trial guard helpers (easy to remove)
 *
 * Removal instructions:
 * 1) Delete this file: `99_TrialGuard.js`.
 * 2) Remove `99_TrialGuard.js` from `filePushOrder` in `.clasp.json`.
 * 3) No other edits required; entry points call the guard only if it exists.
 */

const G2N_TRIAL_GUARD_ENABLED = true;
const G2N_TRIAL_DAYS = 3;
const G2N_TRIAL_STARTED_AT_KEY = 'G2N_TRIAL_STARTED_AT';

/**
 * Return a trial-expired card if the trial has ended.
 * @returns {CardService.Card|null}
 */
function getTrialGuardCard_() {
  if (!G2N_TRIAL_GUARD_ENABLED) return null;
  const status = _getTrialStatus_();
  if (!status.expired) return null;
  return _buildTrialExpiredCard_(status);
}

/**
 * Return an ActionResponse if the trial has ended.
 * @returns {CardService.ActionResponse|null}
 */
function getTrialGuardActionResponse_() {
  const card = getTrialGuardCard_();
  if (!card) return null;
  return CardService.newActionResponseBuilder()
    .setNotification(
      CardService.newNotification().setText('❌ Trial expired')
    )
    .setNavigation(
      CardService.newNavigation().pushCard(card)
    )
    .build();
}

/**
 * Return a trial notice section while trial is active.
 * @returns {CardService.CardSection|null}
 */
function getTrialNoticeSection_() {
  if (!G2N_TRIAL_GUARD_ENABLED) return null;
  const status = _getTrialStatus_();
  if (status.expired) return null;
  const msLeft = status.expiresAt - Date.now();
  const daysLeft = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
  const expiresAt = new Date(status.expiresAt).toLocaleDateString();

  return CardService.newCardSection()
    .setHeader('⏳ Trial')
    .addWidget(
      CardService.newTextParagraph()
        .setText(`<b>Trial active.</b> ${daysLeft} day(s) remaining. Expires: ${expiresAt}.`)
    );
}

/**
 * Compute trial status and persist start time if needed.
 * @returns {{startedAt: number, expiresAt: number, expired: boolean}}
 */
function _getTrialStatus_() {
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty(G2N_TRIAL_STARTED_AT_KEY);
  let startedAt = Number(raw);
  if (!startedAt) {
    startedAt = Date.now();
    props.setProperty(G2N_TRIAL_STARTED_AT_KEY, String(startedAt));
  }

  const expiresAt = startedAt + (G2N_TRIAL_DAYS * 24 * 60 * 60 * 1000);
  return {
    startedAt: startedAt,
    expiresAt: expiresAt,
    expired: Date.now() > expiresAt
  };
}

/**
 * Build the trial expired card.
 * @param {{expiresAt: number}} status
 * @returns {CardService.Card}
 */
function _buildTrialExpiredCard_(status) {
  const expiresAt = new Date(status.expiresAt).toLocaleString();
  const card = CardService.newCardBuilder()
    .setHeader(
      CardService.newCardHeader()
        .setTitle('⏳ Trial Expired')
        .setSubtitle('Please contact the developer to renew access')
    );

  const section = CardService.newCardSection()
    .addWidget(
      CardService.newTextParagraph()
        .setText(`<b>Expiry:</b> ${expiresAt}`)
    );

  card.addSection(section);
  return card.build();
}
